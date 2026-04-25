---
name: crud
description: Full-stack CRUD generation skill — entity, service, controller (full or partial via enabledEndpoints), DTOs, Angular component, routes, migrations, and translations. Load when generating any CRUD feature.
---

# Full-Stack CRUD Orchestrator

Generate complete backend + frontend CRUD for a new entity following the FLUSYS flat-module pattern.

---

## Phase 0: Auto-Detect Project Roots

**NEVER hardcode paths.** Run these globs first:

| What                 | Glob                       | Result                      |
| -------------------- | -------------------------- | --------------------------- |
| Backend modules root | `**/src/modules/`          | `{backend}/src/modules/`    |
| Frontend pages root  | `**/src/app/pages/`        | `{frontend}/src/app/pages/` |
| Backend app module   | `**/src/app.module.ts`     | for registration            |
| Frontend routes file | `**/src/app/app.routes.ts` | for registration            |

**If existing modules are present** — read one folder under `{backend}/src/modules/` to extract:

- The `DataSourceProvider` class name used in that module
- The app-slug string passed to `super(...)` in the service
- Confirm the base entity class is `Identity` from `@flusys/nestjs-shared`
- The existing import paths for `@flusys/nestjs-shared`, guards, etc.

Match those conventions exactly — do not invent new ones.

**If this is a brand-new project (no existing modules)** — use these safe defaults:

| Convention         | Default value                                 |
| ------------------ | --------------------------------------------- |
| DataSourceProvider | `AppDataSourceProvider` (ask user to confirm) |
| App slug           | derive from `package.json` `name` field       |
| Base entity import | `Identity` from `@flusys/nestjs-shared`       |
| Shared imports     | `@flusys/nestjs-shared`                       |

Ask the user to confirm the `DataSourceProvider` name before generating — it cannot be inferred without an existing module.

---

## Phase 1: Gather Requirements

`$ARGUMENTS` — Expected format: `[EntityName] [--fields "field:type,..."] [--endpoints "..."] [--relations "..."]`

```
/crud Product
/crud Invoice --fields "number:string:unique,amount:decimal,status:enum(DRAFT|SENT|PAID)"
/crud Invoice --fields "number:string,date:date,total:decimal,status:enum(DRAFT|SENT|PAID)" --relations "OneToMany:InvoiceItem"
```

Use AskUserQuestion for any missing required item:

| Requirement              | Example                                    | Default      |
| ------------------------ | ------------------------------------------ | ------------ |
| Entity name (PascalCase) | `Product`                                  | **Required** |
| Fields with types        | `name:string,price:decimal`                | **Required** |
| Relations                | `ManyToOne:Category,OneToMany:InvoiceItem` | None         |
| Partial CRUD endpoints   | `insert,getAll,getById`                    | All 10       |
| Custom endpoints         | `getByCategory,updateStatus`               | None         |
| Parent-child?            | yes/no + child entity name                 | No           |

### Field Type Reference

| Input type       | TypeORM `@Column` type         | class-validator decorator             |
| ---------------- | ------------------------------ | ------------------------------------- |
| `string`         | `varchar` (length 255)         | `@IsString()`                         |
| `text`           | `text`                         | `@IsString()`                         |
| `number` / `int` | `int`                          | `@IsNumber()`                         |
| `decimal`        | `decimal` precision:10 scale:2 | `@IsNumber()` + `@Type(() => Number)` |
| `boolean`        | `boolean`                      | `@IsBoolean()`                        |
| `date`           | `date`                         | `@IsDateString()`                     |
| `datetime`       | `timestamp`                    | `@IsDateString()`                     |
| `uuid` (FK)      | `uuid` name:'x_id'             | `@IsUUID()`                           |
| `enum(A\|B\|C)`  | `enum`, enum: MyEnum           | `@IsEnum(MyEnum)`                     |
| `json`           | `json`                         | `@IsObject()`                         |

Modifiers: `:unique` → `@Index({ unique: true })` · `:nullable` → `nullable: true` · `:true` / `:false` → `default: value`

### Naming Convention

| Input            | Transformation    | Example        |
| ---------------- | ----------------- | -------------- |
| `EntityName`     | PascalCase        | `CostEntry`    |
| `{entity}`       | camelCase         | `costEntry`    |
| `{entity-kebab}` | kebab-case        | `cost-entry`   |
| `{entity_table}` | snake_case plural | `cost_entries` |
| `I{Entity}`      | Interface name    | `ICostEntry`   |
| `{ENTITY}_`      | SCREAMING_SNAKE   | `COST_ENTRY_`  |

---

## Phase 2: Load Pattern Skills

Read before generating:

```
.claude/skills/patterns/nestjs-patterns/SKILL.md   → Entity, DTO, module patterns
.claude/skills/patterns/angular-patterns/SKILL.md  → Signal component, template patterns
.claude/skills/code-quality/SKILL.md          → Type safety, naming, signal patterns, error handling
```

Apply code-quality rules throughout all generated code:

- Explicit return types on every function/method
- `??` not `||` for nullable defaults
- Named constants for enum/status values (not magic numbers in filters)
- `computed()` for all derived signal state — never imperative `set()`
- `#private` signals with `readonly` public accessors
- Guard clauses in `convertSingleDtoToEntity` for custom field validation
- `{ message, messageKey }` object on all exceptions — never plain string throws
- Import order: Node → Third-party → @flusys → Relative

---

## Phase 3: Generate Backend

Generate all backend files directly using the templates below. Apply: entity name, fields, relations, detected roots, DataSourceProvider name, app-slug, and import paths gathered in Phase 0.

### Identity Base Class — What You Get for Free

Every entity extends `Identity`. These fields are already on every table — **never redeclare them**:

```typescript
id: string; // UUID primary key — auto generated
createdAt: Date; // auto set on insert
updatedAt: Date; // auto set on every save
deletedAt: Date | null; // soft delete — set by delete operation
createdById: string | null;
updatedById: string | null;
deletedById: string | null;
```

### File Structure

```
{backend}/src/modules/{entity-kebab}/
  {entity-kebab}.module.ts
  index.ts
  entities/
    {entity-kebab}.entity.ts
    index.ts
  dtos/
    {entity-kebab}.dto.ts          ← Create + Update + Response in ONE file
    index.ts
  interfaces/
    {entity-kebab}.interface.ts
    index.ts
  services/
    {entity-kebab}.service.ts
    index.ts
  controllers/
    {entity-kebab}.controller.ts
    index.ts
```

### 3.1 Entity

```typescript
import { Identity } from '@flusys/nestjs-shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('{entity_table}')
@Index(['{fkColumn}'])
export class {Entity} extends Identity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'boolean', default: false })
  isActive: boolean = false;

  // FK pattern — always define BOTH the FK column AND the relation
  @Column({ type: 'uuid', name: 'category_id', nullable: true })
  categoryId: string | null = null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  // Enum pattern
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus = ProductStatus.DRAFT;

}
```

Rules:

- Extends `Identity` from `@flusys/nestjs-shared` — always this, never another base
- `@Index` on every FK column and every frequently-filtered column
- Nullable columns default to `null` in the initializer, required columns use `!`

### 3.2 DTOs

All three classes in **one file**: `dtos/{entity-kebab}.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class Create{Entity}Dto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

}

export class Update{Entity}Dto extends Create{Entity}Dto {
  @ApiProperty({ description: '{Entity} ID' })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

// Nested relation shape — one per related entity (reuse if already exists in its own module)
export class CategoryResponseDto {
  id!: string;
  name!: string;
}

export class {Entity}ResponseDto {
  id!: string;
  name!: string;
  price!: number;
  isActive!: boolean;
  categoryId?: string;
  category?: CategoryResponseDto;   // ← relation returned as nested object, not flat fields
  createdAt!: Date;
  updatedAt!: Date;
}
```

### 3.3 Interface

```typescript
export interface ICategory {
  id: string;
  name: string;
}

export interface I{Entity} {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  categoryId?: string | null;
  category?: ICategory;           // ← relation as nested object, mirrors ResponseDto
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdById?: string | null;
  updatedById?: string | null;
}
```

Mirrors ResponseDto exactly — plain TypeScript, no decorators.

### 3.4 Service

#### `getAll` Query Pipeline (order matters)

The base `getAll` method applies hooks in this exact order:

```
filter → search (q param) → select → sort → [withDeleted] → extra (JOINs) → paginate
```

Each hook returns `{ query, isRaw: boolean }`. Once any hook sets `isRaw: true`, all subsequent hooks must also stay raw. **Use `isRaw: false` for normal TypeORM entity results. Use `isRaw: true` only when doing raw SQL aggregations or custom aliases.**

#### `convertSingleDtoToEntity` — Base Behavior

The base class already handles the update-vs-create split:

- If dto has `id` → finds the existing entity from DB → merges with `Object.assign(existing, dto)`
- If dto has no `id` → creates a new entity instance

So always call `super.convertSingleDtoToEntity(dto, user)` first, then override only the fields that need custom mapping:

```typescript
override async convertSingleDtoToEntity(dto, user) {
  const entity = await super.convertSingleDtoToEntity(dto, user); // handles load or create
  entity.name = dto.name;                                          // your custom mappings
  entity.companyId = user?.companyId ?? null;
  return entity;
}
```

#### Full Service Template

```typescript
import { FilterAndPaginationDto, HybridCache, ILoggedUserInfo, RequestScopedApiService, UtilsService } from '@flusys/nestjs-shared';
import { applyCompanyFilter } from '@flusys/nestjs-shared/utils';
import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { EntityTarget, QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';
import { {DataSourceProvider} } from '../../providers';
import { Create{Entity}Dto, Update{Entity}Dto } from '../dtos';
import { {Entity} } from '../entities';
import { I{Entity} } from '../interfaces';

@Injectable({ scope: Scope.REQUEST })
export class {Entity}Service extends RequestScopedApiService<
  Create{Entity}Dto,
  Update{Entity}Dto,
  I{Entity},
  {Entity},
  Repository<{Entity}>
> {
  protected resolveEntity(): EntityTarget<{Entity}> { return {Entity}; }
  protected getDataSourceProvider() { return this.dataSourceProvider; }

  constructor(
    @Inject('CACHE_INSTANCE') protected override cacheManager: HybridCache,
    @Inject(UtilsService) protected override utilsService: UtilsService,
    @Inject({DataSourceProvider}) private readonly dataSourceProvider: {DataSourceProvider},
  ) {
    super(
      '{entity_table}',        // entityName — used as QueryBuilder alias
      null as any,
      cacheManager,
      utilsService,
      {Entity}Service.name,
      true,                    // isCacheable
      '{app-slug}',            // moduleName e.g. 'meal-management'
    );
  }

  // ── DTO → Entity ──────────────────────────────────────────────────────────
  // Base: if dto.id exists → loads entity from DB and merges; else creates new.
  // Override to map custom fields AFTER calling super.
  // [CQ] Use guard clauses for field validation; ?? not || for nullable defaults.
  override async convertSingleDtoToEntity(
    dto: Create{Entity}Dto | Update{Entity}Dto,
    user: ILoggedUserInfo | null,
  ): Promise<{Entity}> {
    const entity = await super.convertSingleDtoToEntity(dto, user);
    entity.name = dto.name;
    entity.price = dto.price;
    if ('isActive' in dto && dto.isActive !== undefined) entity.isActive = dto.isActive;
    if ('categoryId' in dto) entity.categoryId = dto.categoryId ?? null; // ?? not ||
    entity.companyId = user?.companyId ?? null;
    return entity;
  }

  // ── Entity → Response ─────────────────────────────────────────────────────
  protected override convertEntityToResponseDto(entity: {Entity}, _isRaw: boolean): I{Entity} {
    return {
      id: entity.id,
      name: entity.name,
      price: entity.price,
      isActive: entity.isActive,
      categoryId: entity.categoryId,
      category: entity.category           // nested object — available only after JOIN
        ? { id: entity.category.id, name: entity.category.name }
        : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      createdById: entity.createdById,
      updatedById: entity.updatedById,
    };
  }

  override convertEntityListToResponseListDto(entities: {Entity}[], isRaw: boolean): I{Entity}[] {
    return entities.map((e) => this.convertEntityToResponseDto(e, isRaw));
  }

  // ── Default SELECT fields ─────────────────────────────────────────────────
  override async getSelectQuery(
    query: SelectQueryBuilder<{Entity}>,
    _user: ILoggedUserInfo | null,
    select?: string[],
  ) {
    if (!select?.length) select = ['id', 'name', 'price', 'isActive', 'categoryId', 'createdAt'];
    query.select(select.map((f) => `{entity_table}.${f}`));
    return { query, isRaw: false };
  }

  // ── Per-column filters ────────────────────────────────────────────────────
  protected override async getFilterQuery(
    query: SelectQueryBuilder<{Entity}>,
    filter: Record<string, unknown>,
    _user: ILoggedUserInfo | null,
  ) {
    if (filter?.categoryId)
      query.andWhere('{entity_table}.categoryId = :categoryId', { categoryId: filter.categoryId });
    if (filter?.isActive !== undefined)
      query.andWhere('{entity_table}.isActive = :isActive', { isActive: filter.isActive });
    return { query, isRaw: false };
  }

  // ── Global search (drives the ?q= param) ─────────────────────────────────
  protected override async getGlobalSearchQuery(
    query: SelectQueryBuilder<{Entity}>,
    search: string,
  ) {
    query.andWhere('{entity_table}.name LIKE :search', { search: `%${search}%` });
    return { query, isRaw: false };
  }

  // ── Sort (whitelist valid columns) ────────────────────────────────────────
  // [CQ] Use a named constant for the whitelist — never magic strings inline.
  protected override async getSortQuery(
    query: SelectQueryBuilder<{Entity}>,
    sort: Record<string, 'ASC' | 'DESC'>,
    _user: ILoggedUserInfo | null,
  ) {
    const SORTABLE_FIELDS = ['name', 'price', 'createdAt'] as const;
    const valid = SORTABLE_FIELDS as readonly string[];
    Object.entries(sort ?? {}).forEach(([field, dir]) => {
      if (valid.includes(field)) query.addOrderBy(`{entity_table}.${field}`, dir);
    });
    return { query, isRaw: false };
  }

  // ── JOINs + company isolation ─────────────────────────────────────────────
  protected override async getExtraManipulateQuery(
    query: SelectQueryBuilder<{Entity}>,
    _dto: FilterAndPaginationDto,
    _user: ILoggedUserInfo | null,
  ) {
    query.leftJoinAndSelect('{entity_table}.category', 'category');
    applyCompanyFilter(
      query,
      { isCompanyFeatureEnabled: true, entityAlias: '{entity_table}' },
      _user,
    );
    return { query, isRaw: false };
  }
}
```

#### All Lifecycle Hooks (override only what you need)

Every hook runs inside an open transaction — use `queryRunner.manager` for all DB writes within hooks.

```typescript
// ── INSERT hooks ──────────────────────────────────────────────────────────────
// Called with dto BEFORE entities are saved — throw here to abort entire transaction.
// [CQ] This is the boundary — validate here with guard clauses; never inside helper methods.
// [CQ] Always throw { message, messageKey } object — never plain string throws.
override async beforeInsertOperation(
  dto: Create{Entity}Dto | Array<Create{Entity}Dto>,
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  const arr = Array.isArray(dto) ? dto : [dto];
  for (const d of arr) {
    // Guard clause pattern:
    // if (!d.name?.trim()) throw new BadRequestException({ message: 'Name required', messageKey: '{entity}.error.nameRequired' });
    // if (quota exceeded)  throw new BadRequestException({ message: 'Quota exceeded', messageKey: '{entity}.error.quotaExceeded' });
  }
}

// Called with SAVED entities AFTER save — for side effects (inventory, credits, events)
override async afterInsertOperation(
  entities: {Entity}[],
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  for (const entity of entities) {
    // await queryRunner.manager.save(SomeOtherEntity, ...)
    // await this.otherService.doSomething(...)
  }
}

// ── UPDATE hooks ──────────────────────────────────────────────────────────────
override async beforeUpdateOperation(
  dto: Update{Entity}Dto | Array<Update{Entity}Dto>,
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> { }

override async afterUpdateOperation(
  entities: {Entity}[],
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> { }

// ── DELETE hooks ──────────────────────────────────────────────────────────────
// dto.type: 'delete' (soft) | 'restore' | 'permanent'
// dto.id: string | string[]
override async beforeDeleteOperation(
  dto: DeleteDto,
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> { }

override async afterDeleteOperation(
  entities: Array<{ id: string }>,
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> { }
```

#### Extra Service Utilities

```typescript
// Get additional repositories (beyond primary entity) — use in hooks or custom methods
const [childRepo] = await this.initializeAdditionalRepositories([ChildEntity]);

// Get raw DataSource for complex queries or manual transactions
const ds = await this.getDataSourceForService();
const result = await ds.query("SELECT ...", [params]);
```

**Exception pattern** (always use object syntax):

```typescript
throw new NotFoundException({
  message: "Human-readable message",
  messageKey: "{entity}.error.not-found",
  messageParams: { resource: "{EntityName}" }, // optional if localization active
});
```

### 3.5 Controller

The `createApiController` factory exposes **10 POST-only endpoints**:

| Method name   | HTTP                  | When to use                                 |
| ------------- | --------------------- | ------------------------------------------- |
| `insert`      | POST `/insert`        | Create one                                  |
| `insertMany`  | POST `/insert-many`   | Create array                                |
| `getById`     | POST `/get/:id`       | Fetch one by UUID                           |
| `getByIds`    | POST `/get-by-ids`    | Fetch array by UUIDs                        |
| `getAll`      | POST `/get-all`       | Paginated list with filter/search/sort      |
| `getByFilter` | POST `/get-by-filter` | Get first match by filter object            |
| `bulkUpsert`  | POST `/bulk-upsert`   | Items without id → insert, with id → update |
| `update`      | POST `/update`        | Update one (id in body)                     |
| `updateMany`  | POST `/update-many`   | Update array                                |
| `delete`      | POST `/delete`        | Soft delete / restore / permanent delete    |

**Delete types:** `{ id: ['uuid1', 'uuid2'], type: 'delete' | 'restore' | 'permanent' }`

```typescript
import { createApiController, SingleResponseDto } from '@flusys/nestjs-shared';
import { CurrentUser } from '@flusys/nestjs-shared/decorators';
import { JwtAuthGuard } from '@flusys/nestjs-shared/guards';
import { ILoggedUserInfo } from '@flusys/nestjs-shared/interfaces';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { {Entity}ResponseDto, Create{Entity}Dto, Update{Entity}Dto } from '../dtos';
import { I{Entity} } from '../interfaces';
import { {Entity}Service } from '../services';

@ApiTags('{Entity}')
@Controller('{entity-kebab}')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class {Entity}Controller extends createApiController<
  Create{Entity}Dto,
  Update{Entity}Dto,
  {Entity}ResponseDto,
  I{Entity},
  {Entity}Service
>(Create{Entity}Dto, Update{Entity}Dto, {Entity}ResponseDto, {
  security: 'jwt',              // global security for all 10 endpoints
  entityName: '{entity_table}', // drives auto-generated messageKeys
}) {
  constructor(private readonly {entity}Service: {Entity}Service) {
    super({entity}Service);
  }
}
```

**Security options:**

`EndpointSecurity` shape — what each endpoint config can contain:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `level` | `'public' \| 'jwt' \| 'permission'` | yes | Auth level for this endpoint |
| `permissions` | `string[]` | when `level: 'permission'` (no `logic`) | Simple permission strings |
| `operator` | `'AND' \| 'OR'` | no (default `AND`) | How `permissions` are evaluated — ignored when `logic` is set |
| `logic` | `IPermissionLogic` (ILogicNode tree) | no | Compound AND/OR tree — **takes precedence over `permissions` when set** |

> When `level: 'permission'` and `logic` is set, `permissions` and `operator` are ignored — `logic` is the sole permission check.

```typescript
// Option A — uniform JWT for all endpoints (most common)
{ security: 'jwt', entityName: '...' }

// Option B — uniform permission guard for all endpoints
{ security: { level: 'permission', permissions: ['{entity}.read'] }, entityName: '...' }

// Option C — per-endpoint security (different permissions per action)
{
  entityName: '...',
  security: {
    insert:     { level: 'permission', permissions: ['{entity}.create'] },
    update:     { level: 'permission', permissions: ['{entity}.update'] },
    delete:     { level: 'permission', permissions: ['{entity}.delete'] },
    getAll:     'jwt',      // any authenticated user can list
    getById:    'jwt',
    getByIds:   'jwt',
    getByFilter:'jwt',
    insertMany: { level: 'permission', permissions: ['{entity}.create'] },
    updateMany: { level: 'permission', permissions: ['{entity}.update'] },
    bulkUpsert: { level: 'permission', permissions: ['{entity}.create', '{entity}.update'], operator: 'OR' },
  },
}

// Option D — partial CRUD (disable unwanted endpoints)
{
  security: 'jwt',
  entityName: '...',
  enabledEndpoints: ['insert', 'getAll', 'getById', 'update', 'delete'],
}

// Option E — compound AND/OR permission logic on a specific endpoint
// Use when simple permissions[] + operator can't express the requirement
{
  entityName: '...',
  security: {
    insert: {
      level: 'permission',
      logic: {
        // {entity}.create AND (admin OR manager)
        type: 'group',
        operator: 'AND',
        children: [
          { type: 'action', actionId: '{entity}.create' },
          {
            type: 'group',
            operator: 'OR',
            children: [
              { type: 'action', actionId: 'admin' },
              { type: 'action', actionId: 'manager' },
            ],
          },
        ],
      },
    },
    getAll: 'jwt',
    // ...other endpoints
  },
}
```

**Custom endpoint** (add inside the class body):

```typescript
@Post('by-category')
@ApiOperation({ summary: 'Get {entities} by category' })
async getByCategory(
  @CurrentUser() user: ILoggedUserInfo,
  @Body() body: { categoryId: string },
): Promise<SingleResponseDto<I{Entity}[]>> {
  const data = await this.{entity}Service.getByCategory(body.categoryId, user?.companyId);
  return { success: true, message: 'Fetched', messageKey: '{entity}.fetched', data };
}
```

### 3.6 Module

```typescript
import { Global, Module } from '@nestjs/common';
import { {DataSourceProvider} } from '../../providers';
import { {Entity}Controller } from './controllers';
import { {Entity}Service } from './services';

@Module({
  controllers: [{Entity}Controller],
  providers: [{DataSourceProvider}, {Entity}Service],
  exports: [{Entity}Service],
})
export class {Entity}Module {}
```

### 3.7 Barrel Exports

Every subdirectory `index.ts` re-exports all named exports from its files.

**Root `index.ts`:**

```typescript
export * from "./entities";
export * from "./dtos";
export * from "./interfaces";
export * from "./services";
export * from "./controllers";
export * from "./{entity-kebab}.module";
```

### 3.8 Register in App Module

**Update:** `{backend}/src/app.module.ts`

```typescript
imports: [
  // ...existing modules
  {Entity}Module,
],
```

---

## Parent-Child CRUD Pattern

Use when one entity **owns a collection** of child entities (e.g., `Invoice → InvoiceItem[]`, `MealConfig → Session[]`).

### Choose an approach first

|                        | Option A — Cascade                                     | Option B — After-hooks                         |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| **Use when**           | No computed parent field                               | Parent has computed field (e.g. `total`)       |
| **How**                | `cascade: true` + assign in `convertSingleDtoToEntity` | `cascade: false` + `_pendingDto` + after-hooks |
| **TypeORM handles FK** | Yes — automatically                                    | No — you set `invoiceId` manually              |
| **Update children**    | Still needs after-hook for soft-delete                 | After-hook: soft-delete old, re-insert new     |

---

### Shared: Entities (same for both options)

```typescript
// Parent entity
@Entity("invoices")
export class Invoice extends Identity {
  @Column({ type: "varchar", length: 100 })
  number!: string;

  @Column({ type: "date" })
  date!: Date;

  // Option A: cascade: true  |  Option B: cascade: false
  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items?: InvoiceItem[];
}

// Child entity
@Entity("invoice_items")
@Index(["invoiceId"])
export class InvoiceItem extends Identity {
  @Column({ type: "uuid", name: "invoice_id" })
  invoiceId!: string;

  @ManyToOne(() => Invoice, { nullable: false })
  @JoinColumn({ name: "invoice_id" })
  invoice?: Invoice;

  @Column({ type: "varchar", length: 255 })
  description!: string;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice!: number;
}
```

### Shared: DTOs + Interface (same for both options)

```typescript
export class CreateInvoiceItemDto {
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsNumber() @Type(() => Number) quantity!: number;
  @ApiProperty() @IsNumber() @Type(() => Number) unitPrice!: number;
}

export class UpdateInvoiceItemDto extends CreateInvoiceItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;
}

export class CreateInvoiceDto {
  @ApiProperty() @IsString() number!: string;
  @ApiProperty() @IsDateString() date!: string;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}

export class UpdateInvoiceDto extends CreateInvoiceDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() id!: string;

  @ApiProperty({ type: [UpdateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceItemDto)
  override items!: UpdateInvoiceItemDto[];
}
```

```typescript
export interface IInvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface IInvoice {
  id: string;
  number: string;
  date: Date;
  items: IInvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Option A — Cascade (no computed field)

Set `cascade: true` on the relation. Assign children in `convertSingleDtoToEntity` — TypeORM inserts parent first, then children, wiring the FK automatically.

```typescript
override async convertSingleDtoToEntity(
  dto: CreateInvoiceDto | UpdateInvoiceDto,
  user: ILoggedUserInfo | null,
): Promise<Invoice> {
  const entity = await super.convertSingleDtoToEntity(dto, user);
  entity.number = dto.number;
  entity.date = new Date(dto.date);

  // TypeORM cascade handles inserting children and setting invoiceId automatically
  entity.items = dto.items.map((itemDto) => {
    const item = new InvoiceItem();
    item.description = itemDto.description;
    item.quantity = itemDto.quantity;
    item.unitPrice = itemDto.unitPrice;
    return item;
  });

  return entity;
}

// Still need afterUpdateOperation to soft-delete old children and re-insert
override async afterUpdateOperation(
  invoices: Invoice[],
  _user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  for (const invoice of invoices) {
    const dto = this._pendingDto as UpdateInvoiceDto;
    await queryRunner.manager.softDelete(InvoiceItem, { invoiceId: invoice.id });
    const items = dto.items.map((itemDto) => {
      const item = new InvoiceItem();
      if ((itemDto as any).id) item.id = (itemDto as any).id;
      item.invoiceId = invoice.id;
      item.description = itemDto.description;
      item.quantity = itemDto.quantity;
      item.unitPrice = itemDto.unitPrice;
      return item;
    });
    await queryRunner.manager.save(InvoiceItem, items);
  }
}

private _pendingDto: CreateInvoiceDto | UpdateInvoiceDto | null = null;
override async beforeUpdateOperation(dto, _user, _qr) {
  this._pendingDto = Array.isArray(dto) ? dto[0] : dto;
}
```

---

### Option B — After-hooks (with computed field, e.g. `total`)

Set `cascade: false`. Map only parent scalar fields in `convertSingleDtoToEntity`. Save children manually in after-hooks so you can compute `total` after they exist.

Add `total` to entity and interface when using this option:

```typescript
// In Invoice entity — add:
@Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
total: number = 0;

// In IInvoice — add:
total: number;
```

```typescript
override async convertSingleDtoToEntity(
  dto: CreateInvoiceDto | UpdateInvoiceDto,
  user: ILoggedUserInfo | null,
): Promise<Invoice> {
  const entity = await super.convertSingleDtoToEntity(dto, user);
  entity.number = dto.number;
  entity.date = new Date(dto.date);
  // total computed in afterInsertOperation — leave as 0
  return entity;
}

override async afterInsertOperation(
  invoices: Invoice[],
  _user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  for (const invoice of invoices) {
    const dto = this._pendingDto as CreateInvoiceDto;
    const items = dto.items.map((itemDto) => {
      const item = new InvoiceItem();
      item.invoiceId = invoice.id;
      item.description = itemDto.description;
      item.quantity = itemDto.quantity;
      item.unitPrice = itemDto.unitPrice;
      return item;
    });
    await queryRunner.manager.save(InvoiceItem, items);
    const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    await queryRunner.manager.update(Invoice, invoice.id, { total });
    invoice.total = total;
  }
}

override async afterUpdateOperation(
  invoices: Invoice[],
  _user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  for (const invoice of invoices) {
    const dto = this._pendingDto as UpdateInvoiceDto;
    await queryRunner.manager.softDelete(InvoiceItem, { invoiceId: invoice.id });
    const items = dto.items.map((itemDto) => {
      const item = new InvoiceItem();
      if ((itemDto as any).id) item.id = (itemDto as any).id;
      item.invoiceId = invoice.id;
      item.description = itemDto.description;
      item.quantity = itemDto.quantity;
      item.unitPrice = itemDto.unitPrice;
      return item;
    });
    await queryRunner.manager.save(InvoiceItem, items);
    const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    await queryRunner.manager.update(Invoice, invoice.id, { total });
  }
}

private _pendingDto: CreateInvoiceDto | UpdateInvoiceDto | null = null;
override async beforeInsertOperation(dto, _user, _qr) {
  this._pendingDto = Array.isArray(dto) ? dto[0] : dto;
}
override async beforeUpdateOperation(dto, _user, _qr) {
  this._pendingDto = Array.isArray(dto) ? dto[0] : dto;
}
```

---

### Shared: Response mapping + query hooks (same for both options)

```typescript
protected override convertEntityToResponseDto(entity: Invoice, _isRaw: boolean): IInvoice {
  return {
    id: entity.id,
    number: entity.number,
    date: entity.date,
    items: (entity.items ?? []).map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

override convertEntityListToResponseListDto(entities: Invoice[], isRaw: boolean): IInvoice[] {
  return entities.map((e) => this.convertEntityToResponseDto(e, isRaw));
}

protected override async getExtraManipulateQuery(
  query: SelectQueryBuilder<Invoice>,
  _dto: FilterAndPaginationDto,
  _user: ILoggedUserInfo | null,
) {
  query.leftJoinAndSelect("invoices.items", "items");
  return { query, isRaw: false };
}

protected override async getGlobalSearchQuery(query, search) {
  query.andWhere("(invoices.number LIKE :s OR items.description LIKE :s)", {
    s: `%${search}%`,
  });
  return { query, isRaw: false };
}
```

### Module

```typescript
@Module({
  controllers: [InvoiceController],
  providers: [{ DataSourceProvider }, InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
```

> **Note:** Child entity (`InvoiceItem`) does not need its own module or controller unless it has independent CRUD. It is fully managed through the parent service.

---

## Phase 4: Generate Frontend

Generate all frontend files directly using the templates below. Apply: entity name, interface shape (from 3.3), detected frontend root, API base path (`{entity-kebab}`), and import paths from a nearby component.

### File: `{frontend}/src/app/services/{entity-kebab}/{entity-kebab}.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResourceService } from '@flusys/ng-shared';
import { I{Entity} } from '../../models';

export interface Create{Entity}Dto {
  // mirror backend CreateDto fields here
  name: string;
  // add all required fields
}

export interface Update{Entity}Dto extends Partial<Create{Entity}Dto> {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class {Entity}ApiService extends ApiResourceService<Create{Entity}Dto, I{Entity}> {
  constructor() {
    super('{entity-kebab}', inject(HttpClient));
  }

  // Override getAll if you need custom filters or make properly in component and pass as filter param, otherwise the default getAll from ApiResourceService is sufficient for basic pagination/filtering/sorting.
  getAll{Entity}List(
    currentPage = 0,
    pageSize = 100,
    filter: Record<string, unknown> = {},
  ): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/get-all`, {
      pagination: { currentPage, pageSize },
      filter,
    });
  }

  // Add any extra API methods if needed (e.g., getByCategory) — otherwise the default 10 endpoints from ApiResourceService cover most use cases.
}
```

Rules:

- Extends `ApiResourceService<CreateDto, ResponseModel>` from `@flusys/ng-shared`
- Constructor calls `super('{entity-kebab}', inject(HttpClient))` — the first arg is the API resource path
- DTOs defined inline in the service file (no separate file needed for frontend)
- Only add extra methods when the default `insert / update / delete / getAll / getById` from `ApiResourceService` are not sufficient
- `filter` shape mirrors the backend `getAll` filter object

### Form strategy — decide before generating

| Condition                                                     | Strategy                  | Structure                                                            |
| ------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| ≤ 5 fields, simple types                                      | **Dialog form** (default) | `components/{entity-kebab}/{entity-kebab}-form/` as dialog component |
| > 5 fields, nested sections, file uploads, parent-child items | **Separate page**         | `pages/{entity-kebab}/{entity-kebab}-form/` as routed page           |

**Dialog form (same file)**: form is inline in the list component file — use `<p-dialog>` directly in the template.

**Dialog form (separate component file)**: form extracted to `components/{entity-kebab}-form/` — use PrimeNG `DialogService` to open it dynamically (`dialogService.open({Entity}FormComponent, { ... })`). Do NOT embed `<p-dialog>` in the list template in this case.

**Separate page**: list page navigates to `/{entity-kebab}/create` or `/{entity-kebab}/:id/edit`. Form component is a full page with its own route.

> **Rule:** The page component owns data loading and delete. The form component owns field state, validation, and save. They communicate via `input` / `output` (dialog) or router params (separate page).

---

### Component structure

```
{frontend}/src/app/
  components/
    {entity-kebab}/
      {entity-kebab}-form/
        {entity-kebab}-form.component.ts   ← dialog form (short forms only)
  pages/
    {entity-kebab}/
      {entity-kebab}.component.ts          ← list page (always)
      {entity-kebab}-form/
        {entity-kebab}-form.component.ts   ← page form (long forms only, own route)
```

---

### File: `{frontend}/src/app/components/{entity-kebab}/{entity-kebab}-form/{entity-kebab}-form.component.ts`

Reusable create/edit form — no service calls from the page needed for form logic:

```typescript
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TranslateService } from '@flusys/ng-localization';
import { TranslatePipe } from '@flusys/ng-shared';
import { {Entity}ApiService, Create{Entity}Dto } from '../../../services/{entity-kebab}/{entity-kebab}.service';
import { I{Entity} } from '../../../models';

@Component({
  selector: 'app-{entity-kebab}-form',
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, TranslatePipe],
  template: `
    <p-dialog [visible]="visible()" (onHide)="cancel.emit()"
      [header]="(editRow() ? '{entity}.form.edit' : '{entity}.form.create') | translate"
      [modal]="true" [style]="{ width: '40vw' }">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ "{entity}.field.name" | translate }} *</label>
          <input pInputText [ngModel]="form().name" (ngModelChange)="setField('name', $event)" class="w-full" />
        </div>
        <!-- add form fields per entity -->
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" icon="pi pi-times"
          [label]="'action.cancel' | translate"
          (click)="cancel.emit()" class="p-button-text">
        </button>
        <button pButton type="button" icon="pi pi-check"
          [label]="'action.save' | translate"
          (click)="save()" [loading]="saving()">
        </button>
      </ng-template>
    </p-dialog>
  `,
})
export class {Entity}FormComponent {
  readonly #service = inject({Entity}ApiService);
  readonly #messageService = inject(MessageService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  // ── Inputs / Outputs ───────────────────────────────────────────────────────
  readonly visible = input.required<boolean>();
  readonly editRow = input<I{Entity} | null>(null);

  readonly saved = output<void>();
  readonly cancel = output<void>();

  // ── State ──────────────────────────────────────────────────────────────────
  // [CQ] Private writable signal → public readonly accessor. Never expose writable signal.
  #form = signal<Create{Entity}Dto>({ name: '' /* add fields */ });
  readonly form = this.#form.asReadonly();

  #saving = signal(false);
  readonly saving = this.#saving.asReadonly();

  constructor() {
    // [CQ] effect() syncs form state from input — correct pattern for reactive side-effects.
    // Do NOT use ngOnChanges or manual subscription for this.
    effect(() => {
      const row = this.editRow();
      this.#form.set(row ? { name: row.name /* map all fields */ } : { name: '' });
    });
  }

  setField(field: keyof Create{Entity}Dto, value: unknown): void {
    this.#form.set({ ...this.#form(), [field]: value });
  }

  save(): void {
    const f = this.#form();
    if (!f.name?.trim()) {
      this.#messageService.add({
        severity: 'warn',
        summary: this.#translate.instant('toast.validationError'),
        detail: this.#translate.instant('validation.required.fields'),
      });
      return;
    }
    this.#saving.set(true);
    const id = this.editRow()?.id;
    const call = id ? this.#service.update({ id, ...f }) : this.#service.insert(f);

    call.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.#messageService.add({
          severity: 'success',
          summary: this.#translate.instant('toast.success'),
          detail: this.#translate.instant(id ? '{entity}.message.updated' : '{entity}.message.created'),
        });
        this.#saving.set(false);
        this.saved.emit();
      },
      error: () => this.#saving.set(false),
    });
  }
}
```

---

### File: `{frontend}/src/app/pages/{entity-kebab}/{entity-kebab}.component.ts`

Lean list page — owns data + delete only, delegates form to the shared component:

```typescript
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TranslateService } from '@flusys/ng-localization';
import { TranslatePipe } from '@flusys/ng-shared';
import { {Entity}ApiService } from '../../services/{entity-kebab}/{entity-kebab}.service';
import { {Entity}FormComponent } from '../../components/{entity-kebab}/{entity-kebab}-form/{entity-kebab}-form.component';
import { I{Entity} } from '../../models';

@Component({
  selector: 'app-{entity-kebab}',
  imports: [TableModule, ButtonModule, CardModule, ToastModule, TranslatePipe, {Entity}FormComponent],
  providers: [MessageService],
  template: `
    <p-toast position="top-right"></p-toast>
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">{{ "{entity}.title" | translate }}</h1>
        <button pButton type="button" icon="pi pi-plus"
          [label]="'{entity}.add' | translate"
          (click)="openForm()">
        </button>
      </div>

      <p-table [value]="data()" [loading]="loading()" [paginator]="true" [rows]="20">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ "{entity}.field.name" | translate }}</th>
            <!-- add columns per field -->
            <th>{{ "action.actions" | translate }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.name }}</td>
            <td>
              <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm" (click)="openForm(row)"></button>
              <button pButton icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm" (click)="confirmDelete(row.id)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <app-{entity-kebab}-form
      [visible]="showForm()"
      [editRow]="editingRow()"
      (saved)="onSaved()"
      (cancel)="closeForm()">
    </app-{entity-kebab}-form>
  `,
})
export class {Entity}Component {
  readonly #service = inject({Entity}ApiService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  // ── State ──────────────────────────────────────────────────────────────────
  #data = signal<I{Entity}[]>([]);
  readonly data = this.#data.asReadonly();

  #loading = signal(false);
  readonly loading = this.#loading.asReadonly();

  #showForm = signal(false);
  readonly showForm = this.#showForm.asReadonly();

  #editingRow = signal<I{Entity} | null>(null);
  readonly editingRow = this.#editingRow.asReadonly();

  // ── Derived ───────────────────────────────────────────────────────────────
  // [CQ] All derived state uses computed() — never set() a signal based on another signal's value.
  readonly isEmpty = computed(() => this.#data().length === 0 && !this.#loading());
  readonly totalCount = computed(() => this.#data().length);

  constructor() { this.loadAll(); }

  // ── Data loading ──────────────────────────────────────────────────────────
  private loadAll(): void {
    this.#loading.set(true);
    this.#service.getAll('', { pagination: { currentPage: 0, pageSize: 100 } })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => { this.#data.set(res.data ?? []); this.#loading.set(false); },
        error: () => this.#loading.set(false),
      });
  }

  // ── Form dialog ────────────────────────────────────────────────────────────
  openForm(row?: I{Entity}): void {
    this.#editingRow.set(row ?? null);
    this.#showForm.set(true);
  }

  closeForm(): void {
    this.#showForm.set(false);
    this.#editingRow.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.loadAll();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  confirmDelete(id: string): void {
    if (!confirm(this.#translate.instant('{entity}.confirm.delete'))) return;
    this.#service.delete(id).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => this.loadAll(),
    });
  }
}
```

Signal rules — strictly enforced:

- Private signal: `#s = signal(val)` → public via `readonly s = this.#s.asReadonly()`
- All DI via `inject()` — no constructor parameter injection
- `computed()` for all derived state — never imperative `set()` for derived values
- `@if / @for / @switch` in templates — never `*ngIf / *ngFor`
- All text via `| translate` with dot-case keys — never hardcoded strings
- Subscriptions use `takeUntilDestroyed(this.#destroyRef)` — never manual `unsubscribe()`
- Errors fall through to the FLUSYS `errorCatchingInterceptor` — no `console.error`
- Form component uses `input.required<boolean>()` / `input<T | null>(null)` / `output<void>()` — never `@Input()` / `@Output()` decorators

### 4.1 Register Route

**Update:** `{frontend}/src/app/app.routes.ts`

**Dialog form** (simple — list + dialog on same route):

```typescript
{
  path: '{entity-kebab}',
  loadComponent: () =>
    import('./pages/{entity-kebab}/{entity-kebab}.component')
      .then(m => m.{Entity}Component),
  canActivate: [authGuard],
  resolve: { translations: translationModuleResolver('{entity}') },
},
```

**Separate page form** (long/complex form — list and form on child routes):

```typescript
{
  path: '{entity-kebab}',
  canActivate: [authGuard],
  resolve: { translations: translationModuleResolver('{entity}') },
  children: [
    {
      path: '',
      loadComponent: () =>
        import('./pages/{entity-kebab}/{entity-kebab}.component')
          .then(m => m.{Entity}Component),
    },
    {
      path: 'create',
      loadComponent: () =>
        import('./pages/{entity-kebab}/{entity-kebab}-form/{entity-kebab}-form.component')
          .then(m => m.{Entity}FormComponent),
    },
    {
      path: ':id/edit',
      loadComponent: () =>
        import('./pages/{entity-kebab}/{entity-kebab}-form/{entity-kebab}-form.component')
          .then(m => m.{Entity}FormComponent),
    },
  ],
},
```

---

## Phase 5: Migration

```bash
cd {backend} && npm run migration:generate -- --name=Create{Entity}Table
# ← Review the generated file before running! Check column types, indexes, FKs.
cd {backend} && npm run migration:run
# Multi-tenant project? Run: npm run migration:run:all
```

---

## Phase 6: Register Translation Keys

> **Skip this phase if the project does not use `@flusys/ng-localization`.** Check for `translationModuleResolver` in the existing routes — if absent, the project has no localization and this step does not apply.

```
POST /localization/keys/bulk-create
{
  "keys": [
    { "key": "{entity}.title",            "module": "{entity}", "description": "Page title" },
    { "key": "{entity}.add",              "module": "{entity}", "description": "Add button label" },
    { "key": "{entity}.form.create",      "module": "{entity}", "description": "Create dialog header" },
    { "key": "{entity}.form.edit",        "module": "{entity}", "description": "Edit dialog header" },
    { "key": "{entity}.field.name",       "module": "{entity}", "description": "Name field label" },
    { "key": "{entity}.confirm.delete",   "module": "{entity}", "description": "Delete confirmation message" },
    { "key": "{entity}.message.created",  "module": "{entity}", "description": "Create success toast" },
    { "key": "{entity}.message.updated",  "module": "{entity}", "description": "Update success toast" },
    { "key": "{entity}.message.deleted",  "module": "{entity}", "description": "Delete success toast" },
    { "key": "{entity}.error.not-found",  "module": "{entity}", "description": "Not found error" }
  ]
}

POST /localization/translations/bulk-upsert
{
  "languageId": "<english-lang-uuid>",
  "translations": [
    { "key": "{entity}.title",            "value": "{EntityName}s" },
    { "key": "{entity}.add",              "value": "Add {EntityName}" },
    { "key": "{entity}.form.create",      "value": "New {EntityName}" },
    { "key": "{entity}.form.edit",        "value": "Edit {EntityName}" },
    { "key": "{entity}.field.name",       "value": "Name" },
    { "key": "{entity}.confirm.delete",   "value": "Delete this {entityName}?" },
    { "key": "{entity}.message.created",  "value": "{EntityName} created successfully" },
    { "key": "{entity}.message.updated",  "value": "{EntityName} updated successfully" },
    { "key": "{entity}.message.deleted",  "value": "{EntityName} deleted" },
    { "key": "{entity}.error.not-found",  "value": "{EntityName} not found" }
  ]
}
```

---

## Phase 7: Completion Report

```
## CRUD Complete: {EntityName}

### Backend  ({backend}/src/modules/{entity-kebab}/)
| File | Status |
|------|--------|
| entities/{entity-kebab}.entity.ts         | ✅ Created |
| dtos/{entity-kebab}.dto.ts                | ✅ Created |
| interfaces/i-{entity-kebab}.interface.ts  | ✅ Created |
| services/{entity-kebab}.service.ts        | ✅ Created |
| controllers/{entity-kebab}.controller.ts  | ✅ Created |
| {entity-kebab}.module.ts                  | ✅ Created |
| index.ts + all barrel index.ts            | ✅ Created |
| src/app.module.ts                         | ✅ Updated |

### Frontend  ({frontend}/src/app/)
| File | Status |
|------|--------|
| services/{entity-kebab}/{entity-kebab}.service.ts                                      | ✅ Created |
| pages/{entity-kebab}/{entity-kebab}.component.ts                                       | ✅ Created |
| components/{entity-kebab}/{entity-kebab}-form/{entity-kebab}-form.component.ts *(if dialog)* | ✅ Created |
| pages/{entity-kebab}/{entity-kebab}-form/{entity-kebab}-form.component.ts *(if page)*  | ✅ Created |
| app.routes.ts                                                                          | ✅ Updated |

### Pending (manual steps)
| Task | Status |
|------|--------|
| Migration reviewed & run                                   | ⬜ Pending |
| Translation keys registered *(if localization is active)*  | ⬜ Pending |
| Backend build (`npm run build`)                            | ⬜ Pending |
| Frontend build (`npm run build:libs`)                      | ⬜ Pending |
```

---

## Quality Gates

Run these checks before reporting complete.

### Code Quality (applies to all generated files)

- [ ] Every method/function has an explicit return type declared
- [ ] No `any` type — use specific types, generics, or `unknown`
- [ ] Nullable defaults use `??` not `||`
- [ ] No magic numbers or inline string arrays — use named `const` arrays (e.g. `SORTABLE_FIELDS`)
- [ ] All exceptions use `{ message, messageKey }` object syntax — never plain string throws
- [ ] Angular: all private signals are `#private = signal()` with `readonly public = this.#private.asReadonly()`
- [ ] Angular: all derived state uses `computed()` — no imperative `set()` of derived values
- [ ] Angular: `effect()` used only for side-effects reacting to signal changes (e.g. form sync from `editRow`)
- [ ] Angular: `takeUntilDestroyed(this.#destroyRef)` on every subscription — no manual `unsubscribe()`
- [ ] Import order: Node built-ins → Framework/third-party → `@flusys/*` → Relative

### Backend

- [ ] Entity: extends `Identity` from `@flusys/nestjs-shared`, `@Index` on all FKs
- [ ] Entity: FK columns have BOTH `@Column({ name: 'x_id' })` AND `@ManyToOne` relation — never one without the other
- [ ] Entity: no redeclaration of `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`, `deletedById` — those come from `Identity`
- [ ] Service: `@Injectable({ scope: Scope.REQUEST })`, no `@InjectRepository`
- [ ] Service: `convertSingleDtoToEntity` calls `super.convertSingleDtoToEntity()` first, then maps custom fields
- [ ] Service: `convertEntityToResponseDto` includes all fields including joined relation properties
- [ ] Service: `getExtraManipulateQuery` has `applyCompanyFilter` if entity has `companyId`
- [ ] Service: `beforeInsertOperation` / `beforeUpdateOperation` validate business rules and throw if invalid
- [ ] Service: `afterInsertOperation` / `afterUpdateOperation` run side-effects using `queryRunner.manager` (not direct repo)
- [ ] Service: `getSortQuery` whitelists valid column names — never blindly trusts sort input
- [ ] Controller: uses `createApiController`, `JwtAuthGuard` on class, `@ApiBearerAuth()`
- [ ] Controller: partial CRUD uses `enabledEndpoints` — never manual override of base methods
- [ ] Controller: per-endpoint security uses `ApiSecurityConfig` object — not a duplicate `@UseGuards`
- [ ] All exceptions: `{ message, messageKey }` object — never plain string throws
- [ ] Module: no `@Global()` unless other modules need to inject the service without importing this module; `DataSourceProvider` in providers, service in exports
- [ ] Parent-child: children saved via `queryRunner.manager.save` inside `afterInsertOperation`
- [ ] Parent-child: update replaces children (soft-delete old → insert new) inside `afterUpdateOperation`
- [ ] App module: new module added to imports

### Frontend

- [ ] API service: extends `ApiResourceService<CreateDto, I{Entity}>`, constructor calls `super('{entity-kebab}', inject(HttpClient))`
- [ ] API service: DTOs defined inline in service file — no separate frontend DTO file
- [ ] API service: only adds custom methods when default 10 endpoints are not enough
- [ ] Form strategy chosen: dialog (`<p-dialog>` same file OR `DialogService` separate component) vs. separate page
- [ ] Form component (dialog): uses `input.required<boolean>()`, `input<I{Entity} | null>(null)`, `output<void>()` — never `@Input()` / `@Output()` decorators
- [ ] Form component (dialog): `effect()` syncs form state from `editRow` input on open
- [ ] Form component (separate page): reads `:id` from `ActivatedRoute`, loads existing record for edit mode
- [ ] Page component: owns only data loading, `showForm`/`editingRow` signals, and delete — no form state
- [ ] Component is standalone (no `standalone: true` flag in Angular 21 — it is the default)
- [ ] All signals: private `#s = signal()` with `readonly s = this.#s.asReadonly()`
- [ ] All DI: `inject()` in field declarations — no constructor params
- [ ] All subscriptions: `takeUntilDestroyed(this.#destroyRef)`
- [ ] Template: `@if / @for` — no `*ngIf / *ngFor`
- [ ] Template: all text via `| translate` — no hardcoded strings
- [ ] Route: `loadComponent` + `authGuard` + `translationModuleResolver('{entity}')` if localization active; child routes for create/edit if separate page form
- [ ] Errors delegate to interceptor — no `catch` blocks that swallow silently

### Infrastructure

- [ ] Migration reviewed before run (column types, indexes, nullable matches entity) and confirm from user that it has been run
- [ ] Translation keys registered _(skip if `@flusys/ng-localization` is not active in this project)_
- [ ] Backend and frontend builds both succeed with no type errors
