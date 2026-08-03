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
| Eager route imports | `loadChildren` / `loadComponent` |
