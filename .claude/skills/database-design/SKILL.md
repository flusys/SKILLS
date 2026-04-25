---
name: database-design
description: Load for migrations, transactions, bulk ops, N+1 fixes, indexing, soft-delete queries, or relation design — NOT for basic CRUD generation (use /crud instead)
---

# Database Design

## When to Apply This Skill

Load this skill when the task involves **any of the following** — do NOT load for basic CRUD generation (use `/crud` instead):

| Trigger | Example |
|---|---|
| Writing or modifying a migration | "add a slug column", "rename this field" |
| Multi-step operations needing atomicity | "create order and deduct stock" |
| Bulk insert / update / delete | "import 10k records", "mark all as processed" |
| Adding or reviewing indexes | "this query is slow", "add index to…" |
| Debugging soft-delete leaking deleted rows | "deleted records showing up" |
| Complex paginated/filtered queries | "filter by date range and status" |
| Relation design decisions | "should this be ManyToMany or OneToMany?" |
| N+1 query problems | "too many queries being fired" |

## Column Patterns

Always use `name: 'snake_case'` on every `@Column` — TypeORM defaults to camelCase which causes DB inconsistency:

```typescript
// String with constraints
@Column({ name: 'name', length: 255 })
name: string;

@Column({ type: 'text', nullable: true })
description?: string;

// Numeric types
@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
price: number;

@Column({ type: 'int', default: 0 })
quantity: number;

// Boolean with default
@Column({ type: 'boolean', default: true })
isActive: boolean;

// Enum (prefer string for readability)
@Column({ type: 'enum', enum: Status, default: Status.DRAFT })
status: Status;

// JSON columns (MySQL: use 'json' not 'jsonb' — 'jsonb' is PostgreSQL only)
@Column({ type: 'json', nullable: true })
metadata?: Record<string, unknown>;

// Date/timestamp
@Column({ type: 'timestamp', nullable: true })
publishedAt?: Date;

// Unique slug with snake_case DB name
@Column({ name: 'slug', length: 255, unique: true })
slug: string;
```

## Relation Patterns (CRITICAL)

**Always define BOTH the relation AND the ID column:**

```typescript
// ManyToOne - ALWAYS include both
@ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'category_id' })
category?: Category;

@Column({ name: 'category_id', nullable: true })
categoryId?: string;

// OneToMany - inverse side
@OneToMany(() => OrderItem, item => item.order, { cascade: true })
items: OrderItem[];

// ManyToMany with join table
@ManyToMany(() => Tag, { cascade: ['insert'] })
@JoinTable({
  name: 'product_tags',
  joinColumn: { name: 'product_id' },
  inverseJoinColumn: { name: 'tag_id' },
})
tags: Tag[];
```

**onDelete options:**

- `SET NULL` - Set FK to null (use with `nullable: true`)
- `CASCADE` - Delete child when parent deleted
- `RESTRICT` - Prevent parent deletion if children exist

## Indexing Strategy

```typescript
// Composite index for common queries
@Index(['companyId', 'isActive'])

// Unique constraint
@Index(['slug'], { unique: true })

// Partial index (PostgreSQL)
@Index(['email'], { where: 'deleted_at IS NULL', unique: true })

// Full-text search (PostgreSQL)
@Index(['name', 'description'], { synchronize: false }) // Create via migration
```

**Index these:** Foreign keys, WHERE/ORDER BY columns, search fields, JOINs
**Skip indexing:** Boolean flags (low cardinality), rarely queried columns, small tables (<1K rows)

## Soft Delete (CRITICAL)

```typescript
// Repository queries - ALWAYS filter
const active = await this.repository.find({
  where: { deletedAt: IsNull() },
});

// QueryBuilder - ALWAYS add filter
const query = this.repository
  .createQueryBuilder("p")
  .where("p.deletedAt IS NULL");

// Soft delete operation
await this.repository.softDelete(id);

// Restore deleted record
await this.repository.restore(id);

// Include deleted (admin/audit)
const all = await this.repository.find({ withDeleted: true });
```

## Query Patterns

### Pagination with Filters

```typescript
async findPaginated(filter: FilterDto): Promise<PaginatedResponse<Entity>> {
  const query = this.repository.createQueryBuilder('e')
    .where('e.deletedAt IS NULL');

  // Dynamic filters
  if (filter.search) {
    query.andWhere('e.name ILIKE :search', { search: `%${filter.search}%` });
  }
  if (filter.status) {
    query.andWhere('e.status = :status', { status: filter.status });
  }
  if (filter.fromDate) {
    query.andWhere('e.createdAt >= :fromDate', { fromDate: filter.fromDate });
  }

  // Sorting — ALWAYS whitelist sortField to prevent SQL injection
  const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'];
  const sortField = ALLOWED_SORT_FIELDS.includes(filter.sortField) ? filter.sortField : 'createdAt';
  const sortOrder = filter.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  query.orderBy(`e.${sortField}`, sortOrder);

  // Pagination
  const [data, total] = await query
    .skip(filter.page * filter.pageSize)
    .take(filter.pageSize)
    .getManyAndCount();

  return { data, total, page: filter.page, pageSize: filter.pageSize };
}
```

### N+1 Prevention

```typescript
// Bad — fires 1 query per row to load category
const products = await this.repository.find({ where: { deletedAt: IsNull() } });
// Then product.category accessed in loop → N queries

// Good — single JOIN query
const products = await this.repository
  .createQueryBuilder('p')
  .leftJoinAndSelect('p.category', 'category')
  .leftJoinAndSelect('p.tags', 'tags')
  .where('p.deletedAt IS NULL')
  .getMany();

// Good — relations option (simple cases)
const products = await this.repository.find({
  where: { deletedAt: IsNull() },
  relations: { category: true, tags: true },
});
```

**Rule:** If you access a relation inside a loop or `.map()`, you have an N+1. Always load it upfront.

### Bulk Operations

```typescript
// Bulk insert
await this.repository.insert(records);

// Bulk update
await this.repository.update(
  { status: Status.PENDING },
  { status: Status.PROCESSED, processedAt: new Date() },
);

// Bulk soft delete
await this.repository.softDelete({ categoryId });
```

## Transactions

```typescript
// Decorator (preferred for services)
@Transactional()
async createWithRelations(dto: CreateDto): Promise<Entity> {
  const entity = await this.repository.save(dto);
  await this.historyService.log('created', entity.id);
  return entity;
}

// Manual transaction
async transfer(fromId: string, toId: string, amount: number): Promise<void> {
  await this.dataSource.transaction(async manager => {
    await manager.decrement(Account, { id: fromId }, 'balance', amount);
    await manager.increment(Account, { id: toId }, 'balance', amount);
  });
}
```

## Migration Best Practices

```bash
# Generate migration from entity changes
npm run migration:generate --name=AddProductSlug

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Check migration status
npm run migration:status

# Multi-tenant: specific tenant
TENANT_ID=tenant1 npm run migration:run

# Multi-tenant: all tenants
npm run migration:run:all
```

### Safe vs Risky Operations

| Safe                      | Risky                        |
| ------------------------- | ---------------------------- |
| Add nullable column       | Add NOT NULL without default |
| Add column with default   | Drop column                  |
| Create index CONCURRENTLY | Create index (locks table)   |
| Add foreign key           | Rename column (breaks app)   |
| Soft delete data          | Hard delete data             |

### Migration Template

```typescript
export class AddProductSlug1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add nullable first
    await queryRunner.addColumn(
      "products",
      new TableColumn({
        name: "slug",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
    );

    // Backfill data
    await queryRunner.query(`
      UPDATE products SET slug = LOWER(REPLACE(name, ' ', '-'))
      WHERE slug IS NULL
    `);

    // Then add constraint
    await queryRunner.changeColumn(
      "products",
      "slug",
      new TableColumn({
        name: "slug",
        type: "varchar",
        length: "255",
        isNullable: false,
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("products", "slug");
  }
}
```

> For caching, N+1 prevention patterns, and query optimization, see [performance](../performance/SKILL.md).

## Checklist

### Always Do

- Extend `Identity` from `@flusys/nestjs-shared` for all entities
- Define both relation AND ID column for FKs
- Filter `deletedAt: IsNull()` in all queries
- Index foreign keys and search fields
- Use parameterized queries (never string concat)
- Use `findAndCount()` for pagination
- Load relations to prevent N+1
- Use `@Transactional()` for multi-step operations
- Generate migrations, never sync in production

### Never Do

- Use `@InjectRepository` (use DataSource Provider)
- Write raw SQL without parameters
- Forget soft delete filters
- Use `SELECT *` when few columns needed
- Skip FK indexes
- Run `synchronize: true` in production
- Delete data without soft delete
- Create migrations manually (generate from diff)
