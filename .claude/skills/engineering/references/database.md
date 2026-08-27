# Database Design

Loaded on demand from the `engineering` skill. Covers TypeORM entity, indexing, soft-delete,
pagination, and migration patterns, plus the Service Ownership pattern for larger domains.

## Column Patterns

```typescript
@Column({ name: 'name', length: 255 })
name: string;

@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
price: number;

@Column({ type: 'boolean', default: true })
isActive: boolean;

@Column({ type: 'enum', enum: Status, default: Status.DRAFT })
status: Status;

@Column({ type: 'json', nullable: true })  // MySQL: 'json' not 'jsonb'
metadata?: Record<string, unknown>;

@Column({ type: 'timestamp', nullable: true })
publishedAt?: Date;
```

## Relation Patterns (CRITICAL)

Always define BOTH the relation AND the FK column:

```typescript
@ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'category_id' })
category?: Category;

@Column({ name: 'category_id', nullable: true })
categoryId?: string;

@OneToMany(() => OrderItem, item => item.order, { cascade: true })
items: OrderItem[];

@ManyToMany(() => Tag, { cascade: ['insert'] })
@JoinTable({ name: 'product_tags', joinColumn: { name: 'product_id' }, inverseJoinColumn: { name: 'tag_id' } })
tags: Tag[];
```

`onDelete` options: `SET NULL` (nullable FK), `CASCADE` (delete children), `RESTRICT` (prevent parent delete)

## Indexing Strategy

```typescript
@Index(['companyId', 'isActive'])                         // Composite for common queries
@Index(['slug'], { unique: true })                        // Unique constraint
@Index(['email'], { where: 'deleted_at IS NULL', unique: true }) // Partial (PostgreSQL)
```

**Index:** Foreign keys, WHERE/ORDER BY columns, search fields, JOINs
**Skip:** Boolean flags (low cardinality), rarely queried columns, tables < 1K rows

## Soft Delete (CRITICAL)

```typescript
// ALWAYS filter in every query
const active = await this.repository.find({ where: { deletedAt: IsNull() } });

const query = this.repository.createQueryBuilder('p').where('p.deletedAt IS NULL');

await this.repository.softDelete(id);
await this.repository.restore(id);
const all = await this.repository.find({ withDeleted: true }); // admin only
```

## Pagination with Filters

```typescript
async findPaginated(filter: FilterDto): Promise<PaginatedResponse<Entity>> {
  const query = this.repository.createQueryBuilder('e').where('e.deletedAt IS NULL');

  if (filter.search) query.andWhere('e.name ILIKE :search', { search: `%${filter.search}%` });
  if (filter.status) query.andWhere('e.status = :status', { status: filter.status });

  // ALWAYS whitelist sortField — prevents SQL injection
  const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'];
  const sortField = ALLOWED_SORT_FIELDS.includes(filter.sortField) ? filter.sortField : 'createdAt';
  const sortOrder = filter.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  query.orderBy(`e.${sortField}`, sortOrder);

  const [data, total] = await query.skip(filter.page * filter.pageSize).take(filter.pageSize).getManyAndCount();
  return { data, total, page: filter.page, pageSize: filter.pageSize };
}
```

## N+1 Prevention

```typescript
// Bad — fires 1 query per row accessing relation in loop
const products = await this.repository.find({ where: { deletedAt: IsNull() } });

// Good — single JOIN
const products = await this.repository
  .createQueryBuilder('p')
  .leftJoinAndSelect('p.category', 'category')
  .leftJoinAndSelect('p.tags', 'tags')
  .where('p.deletedAt IS NULL')
  .getMany();
```

**Rule:** Accessing a relation inside a loop or `.map()` = N+1. Always load it upfront.

**In a raw `.where()`/`.andWhere()` string, never put a `::cast` directly after an
`alias.propertyName` with no separator.** TypeORM's alias/property-name substitution regex doesn't
fire across a cast glued straight onto the property name:

```typescript
// ❌ substitution doesn't fire — "messageThread" passes through unmapped and unquoted, Postgres
// case-folds it, and this throws `missing FROM-clause entry for table "messagethread"`
.andWhere('"messageThread".participantsJson::jsonb @> :param::jsonb', { param })

// ✅ spell out the real quoted alias and real snake_case column directly instead of relying on substitution
.andWhere('"messageThread"."participants_json"::jsonb @> :param::jsonb', { param })
```

## Bulk Operations

```typescript
await this.repository.insert(records);
await this.repository.update({ status: Status.PENDING }, { status: Status.PROCESSED, processedAt: new Date() });
await this.repository.softDelete({ categoryId });
```

## Transactions

```typescript
// Preferred for services
@Transactional()
async createWithRelations(dto: CreateDto): Promise<Entity> {
  const entity = await this.repository.save(dto);
  await this.historyService.log('created', entity.id);
  return entity;
}

// Manual
await this.dataSource.transaction(async manager => {
  await manager.decrement(Account, { id: fromId }, 'balance', amount);
  await manager.increment(Account, { id: toId }, 'balance', amount);
});
```

## Migration Best Practices

```bash
npm run migration:generate --name=AddProductSlug
npm run migration:run
npm run migration:revert
TENANT_ID=tenant1 npm run migration:run   # multi-tenant
npm run migration:run:all                  # all tenants
```

| Safe | Risky |
|------|-------|
| Add nullable column | Add NOT NULL without default |
| Add column with default | Drop column |
| Create index CONCURRENTLY | Rename column (breaks app) |
| Soft delete data | Hard delete data |

Safe migration pattern: add nullable → backfill → add constraint.

## Service Ownership Pattern

For a domain with several related entities and services touching each other's tables, give every
entity exactly one **owning service** — the single point of entry for all reads and writes on it.
No other service calls `getRepository`, `manager.save`, `manager.update`, `manager.delete`, or
`manager.find*` on an entity it doesn't own; it goes through the owning service's public methods
instead.

```typescript
// Table: which service owns which entity — keep this next to the module's other config
// <EntityA>, <EntityA's child>  → <EntityAService>
// <EntityB>                     → <EntityBService>
```

**Exception:** read-only reporting/aggregation services may query any entity directly across the
domain — they never mutate. When a caller needs an operation the owning service doesn't expose
yet, add a method to the owning service rather than reaching around it; if enforcing this removes
the last use of an entity import in the caller file, delete that import too.

This matters most once a domain has 3+ services that could plausibly touch the same table — for a
single-service module it's not worth the ceremony. **The rule applies across feature/module
boundaries too, not just within one feature's own multi-entity domain.** If feature B needs to
read-or-create a row belonging to an entity owned by feature A, add a small additive public method
to feature A's owning service (e.g. `FeeHeadService.findOrCreateByName`) instead of calling
`manager.findOne`/`manager.save`/`getRepository` on it directly from feature B — "the entity has no
extra validation beyond what I'm replicating here" is exactly the reasoning that erodes the
boundary the moment a second caller does the same thing.

**Never a mutual `forwardRef()` between two `Scope.REQUEST` owning services**, even when the
circular dependency is genuine (two entities in the same domain whose services need to call each
other). Nest resolves the cycle by silently handing a later request's resolution a stub instance
whose constructor never ran — every constructor-injected field is `undefined`, so the first
request after a reload can still succeed (masking it in a quick manual test) while every
subsequent request 500s with something like `Cannot read properties of undefined (reading
'getRepository')`. Instead: never constructor-inject the peer; inject `ModuleRef` (singleton, safe)
and `@Optional() @Inject(REQUEST) request?: Request`, then add a private `get<Peer>()` method that
resolves and memoizes `this.moduleRef.resolve(PeerType,
ContextIdFactory.getByRequest(this.request), { strict: false })` once per request instance. Reach
for this pattern by default on both sides whenever two request-scoped owning services need each
other — never `forwardRef()` for this case.

## DB Checklist

**Always:** Extend `Identity` from `@flusys/nestjs-shared`, define both relation + FK column, filter `deletedAt: IsNull()`, index FKs and search fields, use parameterized queries, use `@Transactional()` for multi-step ops, generate migrations (never sync in prod)

**Never:** Use `@InjectRepository` (use DataSource Provider), raw SQL without params, skip soft-delete filters, `synchronize: true` in production
