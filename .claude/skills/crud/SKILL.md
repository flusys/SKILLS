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
.claude/skills/engineering/SKILL.md           → Type safety, naming, signal patterns, error handling
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
import { Expose, Type } from 'class-transformer';
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
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;
}

export class {Entity}ResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  price!: number;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional()
  @Expose()
  categoryId?: string;

  @ApiPropertyOptional({ type: () => CategoryResponseDto })
  @Expose()
  @Type(() => CategoryResponseDto)
  category?: CategoryResponseDto;   // ← relation returned as nested object, not flat fields

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
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
import { DeleteDto, FilterAndPaginationDto, ILoggedUserInfo } from "@flusys/nestjs-shared";
import { ApiService, HybridCache } from "@flusys/nestjs-shared/classes";
import { UtilsService } from "@flusys/nestjs-shared/modules";
import { Inject, Injectable, NotFoundException, Scope } from "@nestjs/common";
import { QueryRunner, SelectQueryBuilder } from "typeorm";
import { {DataSourceProvider} } from "../../shared/{datasource-provider-file}";
import { Create{Entity}Dto, Update{Entity}Dto } from "../dtos/{entity-kebab}.dto";
import { {Entity} } from "../entities/{entity-kebab}.entity";
import { I{Entity} } from "../interfaces/i-{entity-kebab}";

@Injectable({ scope: Scope.REQUEST })
export class {Entity}Service extends ApiService<
  Create{Entity}Dto,
  Update{Entity}Dto,
  I{Entity},
  {Entity}
> {
  constructor(
    private readonly dataSourceProvider: {DataSourceProvider},
    @Inject(UtilsService) protected readonly utilsService: UtilsService,
  ) {
    //         entityName        cache                utilsService  serviceName           cacheable  slug        EntityClass  provider
    super("{entity}", new HybridCache(60000), utilsService, {Entity}Service.name, true, "{app-slug}", {Entity}, dataSourceProvider);
  }

  // ── DTO → Entity ──────────────────────────────────────────────────────────
  // Base: if dto.id exists → loads entity from DB and merges; else creates new.
  // Override to map custom fields AFTER calling super.
  // [CQ] Use guard clauses for field validation; ?? not || for nullable defaults.
  protected override async convertSingleDtoToEntity(
    dto: Create{Entity}Dto | Update{Entity}Dto,
    user: ILoggedUserInfo | null,
  ): Promise<{Entity}> {
    const entity = await super.convertSingleDtoToEntity(dto, user);
    entity.companyId = user?.companyId ?? null;
    entity.branchId = user?.branchId ?? null;
    // map custom fields here
    return entity;
  }

  // ── Default SELECT fields ─────────────────────────────────────────────────
  protected override async getSelectQuery(
    query: SelectQueryBuilder<{Entity}>,
    _user: ILoggedUserInfo | null,
    select?: string[],
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    query.addSelect(["{entity}.createdAt", "{entity}.updatedAt"]);
    return { query, isRaw: false };
  }

  // ── Per-column filters ────────────────────────────────────────────────────
  protected override async getFilterQuery(
    query: SelectQueryBuilder<{Entity}>,
    filter: Record<string, unknown>,
    _user: ILoggedUserInfo | null,
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    if (filter.status)
      query.andWhere("{entity}.status = :status", { status: filter.status });
    return { query, isRaw: false };
  }

  // ── JOINs + tenant isolation ──────────────────────────────────────────────
  // Always scope to companyId + branchId from the JWT user — never trust body
  protected override async getExtraManipulateQuery(
    query: SelectQueryBuilder<{Entity}>,
    _dto: FilterAndPaginationDto,
    user: ILoggedUserInfo | null,
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    query.leftJoinAndSelect("{entity}.relation", "relation");
    query.andWhere("{entity}.companyId = :companyId", { companyId: user.companyId });
    query.andWhere("{entity}.branchId = :branchId", { branchId: user.branchId });
    return { query, isRaw: false };
  }
}
```

**Repository access patterns:**

```typescript
// Primary entity — call ensureDataSourceRepository() then use this.repository
await this.ensureDataSourceRepository();
const item = await this.repository.findOne({ where: { id } });

// Cross-entity (other entities) — use dataSourceProvider
const otherRepo = await this.dataSourceProvider.getRepository(OtherEntity);
const related = await otherRepo.findOne({ where: { id: dto.otherId } });

// Raw DataSource for complex queries
const ds = await this.dataSourceProvider.getDataSource();
const rows = await ds.query("SELECT ...", [params]);
```

#### All Lifecycle Hooks (override only what you need)

Every hook runs inside an open transaction — use `queryRunner.manager` for all DB writes within hooks.

```typescript
// ── INSERT hooks ──────────────────────────────────────────────────────────────
// Called with SAVED entities AFTER save — for side effects (create linked records, send events)
protected override async afterInsertOperation(
  entities: {Entity}[],
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  for (const entity of entities) {
    await queryRunner.manager.save(LinkedEntity, { entityId: entity.id, userId: user?.id });
  }
}

// ── UPDATE hooks ──────────────────────────────────────────────────────────────
protected override async afterUpdateOperation(
  entities: {Entity}[],
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> { }

// ── DELETE hooks ──────────────────────────────────────────────────────────────
// dto.type: 'delete' (soft) | 'restore' | 'permanent'
// dto.id: string | string[]
protected override async beforeDeleteOperation(
  dto: DeleteDto,
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  if (dto.type !== "permanent") return;
  // cleanup related records before hard delete
  await queryRunner.manager.delete(LinkedEntity, { entityId: dto.id });
}
```

**Exception pattern** (always use object syntax):

```typescript
throw new NotFoundException({
  message: "Human-readable message",
  messageKey: "{entity}.error.not-found",
});
```

### 3.5 Controller

The `createApiController` factory exposes **10 POST-only endpoints**. **Always use the `const BaseController` pattern — do NOT call `createApiController` inline on the `extends` clause.**

Import from `@flusys/nestjs-shared/classes`.

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
import { createApiController } from "@flusys/nestjs-shared/classes";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Create{Entity}Dto, Update{Entity}Dto, {Entity}ResponseDto } from "../dtos/{entity-kebab}.dto";
import { {Entity}Service } from "../services/{entity-kebab}.service";

// ── STEP 1: build the base class ──────────────────────────────────────────────
const BaseController = createApiController(
  Create{Entity}Dto,
  Update{Entity}Dto,
  {Entity}ResponseDto,
  {
    entityName: "{entity}",   // QueryBuilder alias, drives messageKey prefixes
    security: "jwt",          // uniform JWT for all endpoints
    // enabledEndpoints: ["insert", "getAll", "getById", "update", "delete"], // omit = all 10
  },
);

// ── STEP 2: extend it ─────────────────────────────────────────────────────────
@ApiTags("Section {Entity}")
@Controller("{entity-kebab}")
export class {Entity}Controller extends BaseController {
  constructor(private readonly {entity}Service: {Entity}Service) {
    super({entity}Service);
  }

  // ── Custom endpoints go here ──────────────────────────────────────────────
  // @Patch("activate")
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: "Activate {entity}" })
  // @ApiResponseDto({Entity}ResponseDto)
  // async activate(@Body() dto: ActivateDto, @CurrentUser() user: ILoggedUserInfo) {
  //   const data = await this.{entity}Service.activate(dto, user);
  //   return { success: true, message: "Activated", data };
  // }
}
```

**Security options:**

```typescript
// Option A — uniform JWT for all endpoints (most common)
{ security: "jwt", entityName: "..." }

// Option B — uniform permission guard
{ security: { level: "permission", permissions: ["{entity}.read"] }, entityName: "..." }

// Option C — partial CRUD (disable endpoints not needed)
{
  security: "jwt",
  entityName: "...",
  enabledEndpoints: ["insert", "getAll", "getById", "update", "delete"],
}

// Option D — per-endpoint security
{
  entityName: "...",
  security: {
    insert:     { level: "permission", permissions: ["{entity}.create"] },
    update:     { level: "permission", permissions: ["{entity}.update"] },
    delete:     { level: "permission", permissions: ["{entity}.delete"] },
    getAll:     "jwt",
    getById:    "jwt",
    getByIds:   "jwt",
    getByFilter:"jwt",
    insertMany: { level: "permission", permissions: ["{entity}.create"] },
    updateMany: { level: "permission", permissions: ["{entity}.update"] },
    bulkUpsert: { level: "permission", permissions: ["{entity}.create", "{entity}.update"], operator: "OR" },
  },
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

### File: `{frontend}/src/app/services/{module}/{entity-kebab}/{entity-kebab}.service.ts`

```typescript
import { Injectable } from "@angular/core";
import { ApiResourceService } from "@flusys/ng-shared";
import { I{Entity} } from "../../models";

@Injectable({ providedIn: "root" })
export class {Entity}Service extends ApiResourceService<I{Entity}, Partial<I{Entity}>> {
  constructor() {
    super("{api-path}"); // matches backend @Controller path exactly, e.g. "module/entity-name"
  }

  // Add custom methods only when the default 5 (getAll/getById/insert/update/delete) aren't enough
  // async myCustomAction(dto: MyDto) {
  //   return this.httpPost("my-endpoint", dto);
  // }
}
```

Rules:

- Extends `ApiResourceService<IModel, Partial<IModel>>` from `@flusys/ng-shared`
- Constructor calls only `super("{api-path}")` — NO `HttpClient` injection
- API path matches the backend `@Controller(...)` path exactly (check project PRD for prefix conventions)
- All built-in methods (`getAll`, `getById`, `insert`, `update`, `delete`) return **Promises** — use `await`, not `.subscribe()`
- No separate DTO interfaces for frontend — use `Partial<IModel>` from the model file
- Only add custom methods when the default 5 endpoints are insufficient

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

### File: `{frontend}/src/app/pages/{entity-kebab}/{entity-kebab}-list.component.ts`

Lean list page — owns data loading and delete, delegates form to the dialog component:

```typescript
import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal, WritableSignal } from "@angular/core";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { I{Entity} } from "../../models";
import { {Entity}Service } from "../../services/{module}/{entity-kebab}/{entity-kebab}.service";
import { {Entity}FormDialogComponent } from "./{entity-kebab}-form-dialog.component";

@Component({
  selector: "app-{entity-kebab}-list",
  standalone: true,
  providers: [MessageService, ConfirmationService],
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    {Entity}FormDialogComponent,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">{EntityName}s</h1>
        <p-button label="Add {EntityName}" icon="pi pi-plus" (onClick)="openCreateDialog()" />
      </div>

      <p-table
        [value]="items()"
        [loading]="isLoading()"
        [paginator]="true"
        [rows]="10"
        responsiveLayout="scroll"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Name</th>
            <!-- add columns per field -->
            <th class="text-center">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td>{{ item.name }}</td>
            <td class="text-center">
              <div class="flex justify-center gap-1">
                <p-button icon="pi pi-pencil" [text]="true" severity="secondary"
                  pTooltip="Edit" (onClick)="openEditDialog(item)" />
                <p-button icon="pi pi-trash" [text]="true" severity="danger"
                  pTooltip="Delete" (onClick)="confirmDelete(item)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="2" class="text-center py-10 text-surface-400">No {entityName}s found.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <app-{entity-kebab}-form-dialog
      [visible]="dialogVisible()"
      [item]="selectedItem()"
      (visibleChange)="dialogVisible.set($event)"
      (saved)="onSaved()"
    />
  `,
})
export class {Entity}ListComponent implements OnInit {
  private readonly {entity}Service = inject({Entity}Service);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly items: WritableSignal<Partial<I{Entity}>[]> = signal([]);
  readonly isLoading = signal(false);
  readonly selectedItem = signal<Partial<I{Entity}> | null>(null);
  readonly dialogVisible = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const resp = await this.{entity}Service.getAll({});
      this.items.set(resp.data ?? []);
    } catch {
      this.messageService.add({ severity: "error", summary: "Error", detail: "Failed to load {entityName}s." });
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateDialog(): void {
    this.selectedItem.set(null);
    this.dialogVisible.set(true);
  }

  openEditDialog(item: Partial<I{Entity}>): void {
    this.selectedItem.set(item);
    this.dialogVisible.set(true);
  }

  onSaved(): void {
    const isEdit = !!this.selectedItem()?.id;
    this.messageService.add({
      severity: "success",
      summary: "Success",
      detail: isEdit ? "{EntityName} updated successfully." : "{EntityName} added successfully.",
    });
    this.loadData();
  }

  confirmDelete(item: Partial<I{Entity}>): void {
    this.confirmationService.confirm({
      message: `Delete <strong>${item.name}</strong>?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: () => this.deleteItem(item),
    });
  }

  private async deleteItem(item: Partial<I{Entity}>): Promise<void> {
    if (!item.id) return;
    try {
      await this.{entity}Service.delete({ id: item.id, type: "delete" });
      this.messageService.add({ severity: "success", summary: "Deleted", detail: "{EntityName} removed." });
      this.loadData();
    } catch {
      this.messageService.add({ severity: "error", summary: "Error", detail: "Could not delete {entityName}." });
    }
  }
}
```

### File: `{frontend}/src/app/pages/{entity-kebab}/{entity-kebab}-form-dialog.component.ts`

Dialog form — owns field state, validation, and save:

```typescript
import { CommonModule } from "@angular/common";
import {
  Component, computed, effect, inject, input, output, signal, untracked,
} from "@angular/core";
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { I{Entity} } from "../../models";
import { {Entity}Service } from "../../services/{module}/{entity-kebab}/{entity-kebab}.service";

@Component({
  selector: "app-{entity-kebab}-form-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <p-dialog
      [header]="isEditMode() ? 'Edit {EntityName}' : 'Add {EntityName}'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closable]="!isSaving()"
      styleClass="w-full sm:w-[600px]"
      (onHide)="onClose()"
    >
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
          <input pInputText formControlName="name" placeholder="Name" class="w-full" />
          @if (isFieldInvalid("name")) {
            <small class="text-red-500">Name is required.</small>
          }
        </div>
        <!-- add fields here -->
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Cancel" [text]="true" severity="secondary"
            (onClick)="onClose()" [disabled]="isSaving()" />
          <p-button
            [label]="isEditMode() ? 'Update {EntityName}' : 'Add {EntityName}'"
            [icon]="isSaving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
            (onClick)="onSubmit()" [disabled]="isSaving()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class {Entity}FormDialogComponent {
  readonly visible = input<boolean>(false);
  readonly item = input<Partial<I{Entity}> | null>(null);
  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly {entity}Service = inject({Entity}Service);

  readonly isSaving = signal(false);
  protected dialogVisible = false;

  readonly form = this.fb.group({
    name: this.fb.control("", [Validators.required, Validators.maxLength(255)]),
    // add form controls matching CreateDto fields
  });

  readonly isEditMode = computed(() => !!this.item()?.id);

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      this.dialogVisible = isVisible;
      if (!isVisible) return;
      untracked(() => {
        const current = this.item();
        if (current) this.form.patchValue(current as any);
        else this.form.reset();
      });
    });
  }

  isFieldInvalid(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.isSaving.set(true);
    try {
      const data = this.form.getRawValue() as unknown as I{Entity};
      if (this.isEditMode()) {
        await this.{entity}Service.update({ ...data, id: this.item()!.id! });
      } else {
        await this.{entity}Service.insert(data);
      }
      this.saved.emit();
      this.onClose();
    } catch (err) {
      console.error("{EntityName} save error:", err);
    } finally {
      this.isSaving.set(false);
    }
  }

  onClose(): void {
    this.visibleChange.emit(false);
  }
}
```

Signal / component rules:

- All DI via `inject()` — no constructor parameter injection
- `computed()` for derived booleans like `isEditMode`
- `effect()` in constructor syncs `visible` + `item` inputs — use `untracked()` for side effects inside effects
- `input()` / `output()` — never `@Input()` / `@Output()` decorators
- `@if / @for / @switch` in templates — never `*ngIf / *ngFor`
- `isSaving` signal guards the submit button and closes the dialog only on success
- No `TranslatePipe` / `TranslateService` — this project has no localization

### 4.1 Register Route

**Update:** `{frontend}/src/app/app.routes.ts`

**Dialog form** (simple — list + dialog on same route):

```typescript
{
  path: "{entity-kebab}",
  loadComponent: () =>
    import("./pages/{entity-kebab}/{entity-kebab}-list.component")
      .then(m => m.{Entity}ListComponent),
  canActivate: [authGuard],
},
```

**Separate page form** (long/complex form — list and form on child routes):

```typescript
{
  path: "{entity-kebab}",
  canActivate: [authGuard],
  children: [
    {
      path: "",
      loadComponent: () =>
        import("./pages/{entity-kebab}/{entity-kebab}-list.component")
          .then(m => m.{Entity}ListComponent),
    },
    {
      path: ":id/bills",
      loadComponent: () =>
        import("./pages/{entity-kebab}/{entity-kebab}-detail.component")
          .then(m => m.{Entity}DetailComponent),
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
| entities/{entity-kebab}.entity.ts       | ✅ Created |
| dtos/{entity-kebab}.dto.ts              | ✅ Created |
| interfaces/i-{entity-kebab}.ts          | ✅ Created |
| services/{entity-kebab}.service.ts      | ✅ Created |
| controllers/{entity-kebab}.controller.ts | ✅ Created |
| {entity-kebab}.module.ts               | ✅ Created |
| src/app.module.ts                       | ✅ Updated (added under ISP Modules) |

### Frontend  ({frontend}/src/app/)
| File | Status |
|------|--------|
| services/{module}/{entity-kebab}/{entity-kebab}.service.ts           | ✅ Created |
| pages/{entity-kebab}/{entity-kebab}-list.component.ts                | ✅ Created |
| pages/{entity-kebab}/{entity-kebab}-form-dialog.component.ts *(dialog)* | ✅ Created |
| models/{model-file}.ts                                               | ✅ Updated (added interface) |
| app.routes.ts                                                        | ✅ Updated |

### Pending (manual steps)
| Task | Status |
|------|--------|
| Migration generated & reviewed                     | ⬜ Pending |
| Migration run (`npm run migration:run`)             | ⬜ Pending |
| Backend build (`npm run build`)                    | ⬜ Pending |
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
- [ ] Service: extends `ApiService` from `@flusys/nestjs-shared/classes` — NOT `RequestScopedApiService`
- [ ] Service: `@Injectable({ scope: Scope.REQUEST })`, no `@InjectRepository`
- [ ] Service: constructor injects `dataSourceProvider` directly + `@Inject(UtilsService)`
- [ ] Service: `super(entityName, new HybridCache(ttl), utilsService, ServiceName, true, "APP_SLUG", EntityClass, dataSourceProvider)`
- [ ] Service: `convertSingleDtoToEntity` calls `super.convertSingleDtoToEntity()` first, then maps custom fields
- [ ] Service: `getExtraManipulateQuery` filters by `companyId` + `branchId` from JWT user — never from body
- [ ] Service: `afterInsertOperation` / `afterUpdateOperation` use `queryRunner.manager` for side-effect DB writes
- [ ] Service: `beforeDeleteOperation` guards permanent delete — cleans up related records first
- [ ] Service: cross-entity repos via `await this.dataSourceProvider.getRepository(OtherEntity)`
- [ ] Service: primary repo accessed after `await this.ensureDataSourceRepository()` via `this.repository`
- [ ] Controller: uses `const BaseController = createApiController(...)` from `@flusys/nestjs-shared/classes`, then class extends it
- [ ] Controller: `enabledEndpoints` for partial CRUD — never manually override base methods
- [ ] All exceptions: `{ message, messageKey }` object — never plain string throws
- [ ] Module: `{DataSourceProvider}` + service in `providers`; service in `exports`
- [ ] Parent-child: children saved via `queryRunner.manager.save` inside `afterInsertOperation`
- [ ] App module: new module added to `imports[]` in `app.module.ts`

### Frontend

- [ ] Service: extends `ApiResourceService<IModel, Partial<IModel>>` from `@flusys/ng-shared`
- [ ] Service: constructor calls only `super("isp/{entity-kebab}")` — no HttpClient injection
- [ ] Service: file at `services/{module}/{entity-kebab}/{entity-kebab}.service.ts` (check project PRD for module folder name)
- [ ] Service: only adds custom methods when default 5 (`getAll/getById/insert/update/delete`) aren't enough
- [ ] List component: uses `async/await` (Promise) for all service calls — NOT Observable + subscribe
- [ ] List component: `implements OnInit`, loads data in `ngOnInit()` (or `async loadData()`)
- [ ] List component: `providers: [MessageService, ConfirmationService]` for toast and confirm dialog
- [ ] List component: `WritableSignal<Partial<IModel>[]>` for items, `signal(false)` for loading/dialog flags
- [ ] Form dialog component: uses `NonNullableFormBuilder` + `ReactiveFormsModule`
- [ ] Form dialog component: `input<boolean>(false)` for `visible`, `input<Partial<IModel> | null>(null)` for `item`
- [ ] Form dialog component: `effect()` in constructor syncs `visible` + `item` inputs; uses `untracked()` inside effect body
- [ ] Form dialog component: `isSaving` signal guards submit; `onClose()` emits `visibleChange.emit(false)`
- [ ] All components: `inject()` for DI — no constructor parameters
- [ ] Template: `@if / @for` — no `*ngIf / *ngFor`
- [ ] Template: `| translate` with dot-case keys if project uses `@flusys/ng-localization`; otherwise hardcode labels (check project PRD)
- [ ] Route: `loadComponent` + `canActivate: [authGuard]` + `resolve: { translations: resolveTranslationModule(...) }` if localization active (check project PRD)
- [ ] Models location follows project PRD convention (e.g. `models/isp.ts`, `models/index.ts`, or per-feature)

### Infrastructure

- [ ] Migration reviewed before run (column types, indexes, nullable matches entity) and confirm from user that it has been run
- [ ] Translation keys registered _(skip if `@flusys/ng-localization` is not active in this project)_
- [ ] Backend and frontend builds both succeed with no type errors
