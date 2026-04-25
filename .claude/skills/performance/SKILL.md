---
name: performance
description: FLUSYS performance patterns — HybridCache (L1 memory + L2 Redis), CacheModule setup, custom cache services, TTL guidelines, Angular signal memoization, bundle lazy loading
---

# Performance & Caching

> For query patterns (pagination, indexing, soft delete, relations) see [database-design](../database-design/SKILL.md).
> For ApiService cache-aside (`isCacheable`, `clearCacheForAll`, `clearCacheForId`) see [crud](../crud/SKILL.md).

---

## NestJS — HybridCache Architecture

FLUSYS uses a custom `HybridCache` class (NOT `@nestjs/cache-manager`). It provides a two-tier cache:

- **L1** — in-process `CacheableMemory` (LRU, configurable size/TTL)
- **L2** — Redis via `@keyv/redis`

Both tiers are controlled by the `USE_CACHE_LABEL` env var:

| `USE_CACHE_LABEL`  | L1 Memory | L2 Redis |
| ------------------ | --------- | -------- |
| `memory` (default) | ✅        | ❌       |
| `redis`            | ❌        | ✅       |
| `hybrid`           | ✅        | ✅       |

Read order: L1 → L2 (automatic L1 backfill on L2 hit).

```typescript
// HybridCache low-level API — use via CacheModule, not directly in most cases
await cache.get<T>(key)            // T | undefined
await cache.set(key, value, ttl?)  // ttl in ms — always pass explicit TTL
await cache.del(key)               // remove from L1 + L2
await cache.reset()                // clear L1 only
await cache.resetL2()              // clear L2 (Redis) only
```

---

## NestJS — Module Setup

Register once in `AppModule` via `CacheModule.forRoot()` — it provides `CACHE_INSTANCE` globally:

```typescript
// app.module.ts
import { CacheModule } from '@flusys/nestjs-shared';

@Module({
  imports: [
    CacheModule.forRoot(),
    // CacheModule.forRoot(true, 120_000, 10_000) — custom isGlobal, memoryTtl (ms), LRU size
  ],
})
export class AppModule {}
```

Inject in any service using the `CACHE_INSTANCE` token:

```typescript
import { CACHE_INSTANCE } from '@flusys/nestjs-shared';

@Injectable()
export class SomeService {
  constructor(@Inject(CACHE_INSTANCE) private readonly cache: HybridCache) {}
}
```

---

## NestJS — Custom Cache Service

For services NOT extending `ApiService`, inject `HybridCache` and manage keys yourself:

```typescript
import { CACHE_INSTANCE } from '@flusys/nestjs-shared';

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
      this.cache.del(this.key(companyId)), // always invalidate list too
    ]);
  }
}
```

Key naming convention: `<entity>:company:<companyId>:<scope>:<id>` — always scope by tenant.

---

## Cache TTL Guidelines

| Data Type           | TTL (ms)          | Reason                                              |
| ------------------- | ----------------- | --------------------------------------------------- |
| IAM permissions     | `3_600_000` (1h)  | Roles change rarely; invalidate on role/user change |
| Translations        | `600_000` (10min) | Only change on admin update                         |
| Company settings    | `600_000` (10min) | Very rarely changed                                 |
| User profile        | `120_000` (2min)  | Balance freshness vs DB load                        |
| Single entity by ID | `300_000` (5min)  | Invalidate on update/delete                         |
| Product/entity list | `60_000` (1min)   | Mutated frequently                                  |
| File presigned URLs | `3_500_000`       | S3 URLs expire at 3600s — cache just under          |

> HybridCache TTL is always in **milliseconds** — no exceptions.

---

## Angular — Signal Memoization

### computed() — Free Memoization

`computed()` recalculates ONLY when its signal dependencies change. Use it aggressively for derived state.

```typescript
@Injectable({ providedIn: 'root' })
export class ProductApiService extends ApiResourceService<IProduct> {
  protected override readonly resourcePath = 'products';

  readonly activeProducts = computed(() => this.items().filter(p => p.isActive));
  readonly totalActive = computed(() => this.activeProducts().length);
  readonly groupedByCategory = computed(() =>
    this.items().reduce((acc, p) => {
      (acc[p.categoryId] ??= []).push(p);
      return acc;
    }, {} as Record<string, IProduct[]>)
  );
}

// In component — cheap signal reads, not function calls
readonly products = this.productApi.activeProducts;  // Signal<IProduct[]>
readonly count = this.productApi.totalActive;         // Signal<number>
```

### Effects vs computed()

```typescript
// ❌ effect() for derived state — re-runs imperatively on every change
effect(() => {
  const items = this.items();
  this.filtered = items.filter(i => i.isActive);
  this.count = this.filtered.length;
});

// ✅ computed() — reactive, memoized, lazy
readonly filtered = computed(() => this.items().filter(i => i.isActive));
readonly count = computed(() => this.filtered().length);

// effects are for side effects ONLY: localStorage, DOM, logging
effect(() => {
  localStorage.setItem('lastSearch', this.searchTerm());
});
```

### rxResource — Deduplication + HTTP Cache

```typescript
@Component({...})
export class ProductListComponent {
  private readonly productApi = inject(ProductApiService);

  readonly page = signal(1);
  readonly searchTerm = signal('');

  // Re-fetches only when page or searchTerm changes
  readonly productsResource = rxResource({
    request: () => ({ page: this.page(), search: this.searchTerm() }),
    loader: ({ request }) => this.productApi.getAll(request),
  });

  readonly products = this.productsResource.value;
  readonly isLoading = this.productsResource.isLoading;
}
```

### linkedSignal — Derived Writable State

```typescript
readonly selectedId = signal<string | null>(null);
readonly formData = linkedSignal<IProductForm>(() => ({
  name: '',
  price: 0,
  categoryId: this.selectedId() ?? '',
}));

formData.update(f => ({ ...f, name: 'Updated' }));
```

---

## Angular — Bundle Size

### Lazy Load Every Feature Route

```typescript
// ❌ Eager — entire component in main bundle
import { ProductListComponent } from './products/list.component';
{ path: 'products', component: ProductListComponent }

// ✅ Single lazy component
{
  path: 'products',
  loadComponent: () => import('./products/list.component').then(m => m.ProductListComponent),
}

// ✅ Lazy route file (preferred for multi-page features)
{
  path: 'products',
  loadChildren: () => import('./products/routes').then(m => m.PRODUCT_ROUTES),
  resolve: { translations: translationModuleResolver('products') },
}
```

### Import Only What You Need from PrimeNG

```typescript
// ❌ Pulls entire PrimeNG into the bundle
import { PrimeNGModule } from './primeng.module';

// ✅ Import only what the component uses
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  imports: [TableModule, ButtonModule, DialogModule],
})
```

---

## Anti-Patterns

| Bad                                        | Good                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| Using `@nestjs/cache-manager`              | Use `HybridCache` via `CacheModule.forRoot()`             |
| HybridCache TTL in seconds                 | Always **milliseconds** — `300_000` not `300`             |
| `new HybridCache()` in service constructor | Register once via `CacheModule.forRoot()` in AppModule    |
| `@Inject('CACHE_INSTANCE')` string literal | Use `@Inject(CACHE_INSTANCE)` token from nestjs-shared    |
| `cache.set(key, val)` without TTL          | Always pass explicit TTL — avoids indefinite stale data   |
| Cache key without tenant scope             | Always include `companyId` in every cache key             |
| `effect()` for derived state               | Use `computed()` — memoized, no side effects              |
| Eager route imports                        | `loadChildren` / `loadComponent` for every feature route  |
