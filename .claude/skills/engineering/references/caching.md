# Performance & Caching

Loaded on demand from the `engineering` skill. Covers `HybridCache`, Angular `computed()`
memoization, and bundle-size discipline.

## HybridCache Architecture

FLUSYS uses `HybridCache` (NOT `@nestjs/cache-manager`) — two-tier cache:
- **L1** — in-process `CacheableMemory` (LRU)
- **L2** — Redis via `@keyv/redis`

| `USE_CACHE_LABEL` | L1 Memory | L2 Redis |
|-------------------|-----------|----------|
| `memory` (default) | ✅ | ❌ |
| `redis` | ❌ | ✅ |
| `hybrid` | ✅ | ✅ |

Read order: L1 → L2 (automatic L1 backfill on L2 hit).

```typescript
await cache.get<T>(key)           // T | undefined
await cache.set(key, value, ttl)  // ttl in ms — ALWAYS pass explicit TTL
await cache.del(key)              // removes from L1 + L2
```

> **Omitting `ttl` does not mean "use the default" for L2.** L1 falls back to the store's
> `memoryTtl` (60s by default), but Redis is handed `undefined` and stores the entry with **no
> expiry at all**. So under `redis`/`hybrid`, a `set` without a TTL never self-heals —
> invalidation becomes the only thing that can ever clear it. This is exactly why the entity-cache
> contract below is not optional.

## Module Setup

```typescript
// app.module.ts — register once, provides CACHE_INSTANCE globally
import { CacheModule } from '@flusys/nestjs-shared';

@Module({
  imports: [CacheModule.forRoot()],
  // CacheModule.forRoot(true, 120_000, 10_000) — isGlobal, memTTL (ms), LRU size
})
export class AppModule {}
```

```typescript
// Inject in any service
import { CACHE_INSTANCE } from '@flusys/nestjs-shared';

constructor(@Inject(CACHE_INSTANCE) private readonly cache: HybridCache) {}
```

## ApiService Entity Cache

`ApiService`'s 5th constructor arg is `isCacheable`. Passing `true` caches `getAll` and `findById`
responses — and commits you to invalidating them. It is a contract, not a free win.

Two **separate** tracking buckets per entity, and they are cleared by two different calls:

| Bucket | Filled by | Cleared by |
|--------|-----------|------------|
| `entity_<name>_keys` | `getAll()` — every filter/sort/page combination | `clearCacheForAll()` |
| `entity_<name>_id_<id>_keys` | `findById()` | `clearCacheForId([entities])` |

`insert`, `insertMany`, `update`, `updateMany`, `bulkUpsert` and `delete` clear **both**, after the
transaction commits. You get that for free. Nothing else does.

### The rule

> Any write that does not go through those base methods must clear both buckets itself, **after**
> the commit — and a partial clear is the bug, not a half-fix.

```typescript
// ✅ custom mutation on a cacheable service
async updateStatus(id: string, isActive: boolean): Promise<void> {
  await this.repository.update(id, { isActive });
  await Promise.all([this.clearCacheForAll(), this.clearCacheForId([{ id } as Entity])]);
}

// ❌ clears the detail entry but leaves every cached list page stale —
//    the list is what the UI reads after a create/update, so this looks like "my change vanished"
await this.clearCacheForId([{ id } as Entity]);
```

Four shapes that need this, all of them real bugs found in shipped FLUSYS services:

1. **An overridden `insert`/`update`** that runs its own `queryRunner` transaction instead of
   calling `super` — it skips the base invalidation entirely.
2. **A write to a child table whose rows are embedded in the parent's cached payload** — e.g. a
   participant status that the event query maps in via `leftJoinAndMapMany`. Clear the **parent**
   entity's buckets, keyed by the parent id.
3. **A row that leaves the result set**, not just one that changes — a soft-removed draft, or the
   language that just stopped being the default, still has a stale `_id_<id>_` entry. Read the
   affected ids *before* the write when you need them.
4. **A denormalized count on a cached parent** — if a board's cached row carries
   `(SELECT COUNT(*) FROM task …)`, then `TaskService` writes make the **board** cache wrong.
   The child service clears the parent by name, since buckets are keyed by entity-name string:

```typescript
// task.service.ts — boards cache total_tasks, so every write here invalidates them too
override async clearCacheForAll(): Promise<void> {
  await super.clearCacheForAll();
  await this.utilsService.clearCache('task_board', this.cacheManager);
}
```

Override `clearCacheForAll()` for that case rather than adding a hook to `ApiService` — the base
calls it after every mutation, so one override covers `insert`/`update`/`delete`/`bulkUpsert` and
your custom methods alike, and `nestjs-shared` stays free of a single-module abstraction.

### Membership joins deserve a second look

If a list query filters visibility by a join — `innerJoin('task_board_member', …,
{ currentUserId })` — then a **membership** write changes *which rows a user can see*, not just a
count. Adding a member without clearing the parent's cache leaves their list empty: a bug that
reads as a permission failure, not a cache one.

### Cross-package invalidation

A feature package must not reach into another package's entity cache by name — that breaks package
independence. When module A's writes invalidate module B's cached list (e.g. IAM role assignment
vs. a cached user list filtered by `actionCode`), pass an invalidation callback through an
injection token, the same way every other cross-module dependency is wired.

## Custom Cache Service

```typescript
@Injectable()
export class PermissionCacheService {
  private readonly TTL = 300_000;
  private readonly PREFIX = 'permission';

  constructor(@Inject(CACHE_INSTANCE) private readonly cache: HybridCache) {}

  private key(companyId: string, userId?: string): string {
    return userId
      ? `${this.PREFIX}:company:${companyId}:user:${userId}`
      : `${this.PREFIX}:company:${companyId}:list`;
  }

  async getOrSet<T>(key: string, loader: () => Promise<T>, ttl = this.TTL): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined) return cached;
    const fresh = await loader();
    await this.cache.set(key, fresh, ttl);
    return fresh;
  }

  async invalidate(companyId: string, userId?: string): Promise<void> {
    await Promise.all([
      this.cache.del(this.key(companyId, userId)),
      this.cache.del(this.key(companyId)),  // always invalidate list too
    ]);
  }
}
```

Key convention: `<entity>:company:<companyId>:<scope>:<id>` — always scope by tenant.

## Cache TTL Guidelines

These apply to caches **you** write via `cache.set(key, value, ttl)`. `ApiService`'s entity cache
sets no TTL of its own — see the contract above; correctness there comes from invalidation, not
expiry.

| Data Type | TTL (ms) | Reason |
|-----------|----------|--------|
| IAM permissions | `3_600_000` (1h) | Invalidate on role/user change |
| Translations | `600_000` (10min) | Only on admin update |
| Company settings | `600_000` (10min) | Rarely changed |
| User profile | `120_000` (2min) | Balance freshness vs DB |
| Single entity by ID | `300_000` (5min) | Invalidate on update/delete |
| Entity list | `60_000` (1min) | Mutated frequently |
| S3 presigned URLs | `3_500_000` | URLs expire at 3600s |

> TTL is always in **milliseconds** — no exceptions.

## Angular — computed() Memoization

```typescript
// In service — computed() recalculates only when dependencies change
readonly activeProducts = computed(() => this.items().filter(p => p.isActive));
readonly totalActive = computed(() => this.activeProducts().length);
readonly groupedByCategory = computed(() =>
  this.items().reduce((acc, p) => { (acc[p.categoryId] ??= []).push(p); return acc; }, {} as Record<string, IProduct[]>)
);

// effect() is for side effects ONLY (localStorage, DOM, logging)
// ❌ Never effect(() => { this.count.set(this.items().length); })
// ✅ readonly count = computed(() => this.items().length);
```

## Angular — Bundle Size

```typescript
// Lazy load every feature route — no eager imports
{
  path: 'products',
  loadChildren: () => import('./products/routes').then(m => m.PRODUCT_ROUTES),
  resolve: { translations: translationModuleResolver('products') },
}

// Import only used ng-ui components — see ui-design's component catalog intro for why
// UiModule's bulk import has no place in feature code.
import { TableComponent } from '@flusys/ng-ui';
import { ButtonComponent } from '@flusys/ng-ui';
```

## Performance Anti-Patterns

| Bad | Good |
|-----|------|
| `@nestjs/cache-manager` | `HybridCache` via `CacheModule.forRoot()` |
| TTL in seconds: `300` | Always milliseconds: `300_000` |
| `new HybridCache()` in constructor | Register via `CacheModule.forRoot()` |
| `@Inject('CACHE_INSTANCE')` string | `@Inject(CACHE_INSTANCE)` token |
| `cache.set(key, val)` without TTL | Always pass explicit TTL |
| Cache key without tenant scope | Always include `companyId` |
| `new HybridCache(...)` passed to `super()` in a `Scope.REQUEST` service | Inject `CACHE_INSTANCE` — a per-request cache never hits, and opens a Redis client per request |
| Custom mutation clearing only `clearCacheForId` | Clear **both** buckets: `clearCacheForAll()` + `clearCacheForId()` |
| Overriding `insert` with its own transaction, no invalidation | Invalidate after `commitTransaction`, or call `super.insert` |
| Child-table write leaving the cached parent (counts, mapped rows, membership joins) stale | Clear the parent entity's buckets too — override `clearCacheForAll()` |
| Eager route imports | `loadChildren` / `loadComponent` |
