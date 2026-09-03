---
paths:
  - "backend/src/modules/**/services/*.service.ts"
---

# Cacheable Services Must Invalidate What They Write

If this service's `super(...)` call passes `true` for `isCacheable` (the 5th arg), then `getAll`
and `findById` responses are cached — and only the base `insert`/`insertMany`/`update`/
`updateMany`/`bulkUpsert`/`delete` clear them. Every other write in this file has to do it itself,
**after** the commit:

```typescript
await Promise.all([this.clearCacheForAll(), this.clearCacheForId([entity])]);
```

Both calls, not one. `clearCacheForId` only clears the per-id detail bucket; the cached `getAll`
pages live in a separate bucket that only `clearCacheForAll` touches — and a stale list is exactly
what the UI shows right after a create or update, so a half-clear reads to the user as "my change
didn't save."

Three cases that are easy to miss, all of which shipped as real bugs:

- An **overridden `insert`/`update`** running its own `queryRunner` — it never reaches the base
  invalidation.
- A write to a **child table that the parent's cached payload embeds** — mapped rows, a
  denormalized `COUNT(*)`, or a membership join that decides which rows a user can even see. Clear
  the **parent** entity's buckets, keyed by the parent id.
- A row **leaving** the result set — a soft-removed draft, a language that just stopped being the
  default — still holds a stale per-id entry. Read the affected ids before the write.

Never pass `new HybridCache(...)` to `super()`: this service is `Scope.REQUEST`, so that builds a
private cache per request (never a hit, plus a new Redis client per request under
`redis`/`hybrid`). Inject `CACHE_INSTANCE`.

Under `USE_CACHE_LABEL=redis` or `hybrid` there is no TTL on L2, so a missed invalidation is
permanent, not a 60-second blip.

Full contract, the four failure shapes, the `clearCacheForAll()` override for denormalized parent
counts, and the injection-token pattern for cross-package invalidation:
`.claude/skills/engineering/references/caching.md`'s ApiService Entity Cache section.
