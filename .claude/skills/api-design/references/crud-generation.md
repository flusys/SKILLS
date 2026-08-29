# Full CRUD Generation (Path B)

Loaded on demand from the `api-design` skill. Generate complete backend + frontend CRUD for a new entity.

### Phase 0 — Auto-Detect Project Roots

**NEVER hardcode paths.** Run these globs first:

| What | Glob | Result |
|------|------|--------|
| Backend modules root | `**/src/modules/` | `{backend}/src/modules/` |
| Frontend modules root | `**/src/app/modules/` | `{frontend}/src/app/modules/` |
| Backend app module | `**/src/app.module.ts` | for registration |
| Frontend routes file | `**/src/app/app.routes.ts` | for registration |

Files land in a **domain module** (`{backend}/src/modules/<domain>/`,
`{frontend}/src/app/modules/<domain>/`) — see
[references/project-structure.md](project-structure.md) for the full layout. `<domain>` is the
name from the PRD's `## Feature Modules` list, not the entity being generated; check whether the
domain module already exists before deciding to create one.

**If existing modules are present** — read one folder under `{backend}/src/modules/` and one
under `{frontend}/src/app/modules/` to extract:
- The `DataSourceProvider` class name used in that module
- The app-slug string passed to `super(...)`
- Base entity class is `Identity` from `@flusys/nestjs-shared`
- Import paths for guards, shared utilities, etc.
- Whether the target domain module already exists — if it does, add this entity's files into its
  existing subfolders and barrels instead of creating a new module folder

Match those conventions exactly — do not invent new ones.

**If brand-new project (no existing modules):**

| Convention | Default |
|-----------|---------|
| DataSourceProvider | `AppDataSourceProvider` (ask user to confirm) |
| App slug | derive from `package.json` `name` |
| Base entity | `Identity` from `@flusys/nestjs-shared` |

### Phase 1 — Gather Requirements

`$ARGUMENTS` format: `[EntityName] [--fields "field:type,..."] [--endpoints "..."] [--relations "..."]`

```
/api-design Product
/api-design Invoice --fields "number:string:unique,amount:decimal,status:enum(DRAFT|SENT|PAID)"
/api-design Invoice --fields "number:string,date:date,total:decimal" --relations "OneToMany:InvoiceItem"
```

Use AskUserQuestion for any missing required item:

| Requirement | Example | Default |
|-------------|---------|---------|
| Entity name (PascalCase) | `Product` | **Required** |
| Fields with types | `name:string,price:decimal` | **Required** |
| Relations | `ManyToOne:Category` | None |
| Partial CRUD endpoints | `insert,getAll,getById` | All 10 |
| Custom endpoints | `getByCategory` | None |
| Parent-child? | yes/no + child name | No |

#### Field Type Reference

| Input type | TypeORM `@Column` type | class-validator |
|-----------|----------------------|----------------|
| `string` | `varchar` length 255 | `@IsString()` |
| `text` | `text` | `@IsString()` |
| `number` / `int` | `int` | `@IsNumber()` |
| `decimal` | `decimal` precision:10 scale:2 | `@IsNumber()` + `@Type(() => Number)` |
| `boolean` | `boolean` | `@IsBoolean()` |
| `date` | `date` | `@IsDateString()` |
| `datetime` | `timestamp` | `@IsDateString()` |
| `uuid` (FK) | `uuid` name:`x_id` | `@IsUUID()` |
| `enum(A\|B\|C)` | `enum`, enum: MyEnum | `@IsEnum(MyEnum)` |
| `json` | `json` | `@IsObject()` |

Modifiers: `:unique` → `@Index({ unique: true })` · `:nullable` → `nullable: true`

#### Naming Convention

| Input | Transformation | Example |
|-------|---------------|---------|
| `EntityName` | PascalCase | `CostEntry` |
| `{entity}` | camelCase | `costEntry` |
| `{entity-kebab}` | kebab-case | `cost-entry` |
| `{entity_table}` | snake_case plural | `cost_entries` |

### Phase 2 — Load Pattern Skills

Load before generating:

| Skill | For |
| ----- | --- |
| `engineering` | Code quality, TypeORM patterns, caching, security |

`ApiService` and `ApiResourceService` — the backend and frontend CRUD base classes this whole
file generates against — are documented in full below (Phase 3.4 and Phase 4).

Code-quality rules for all generated files:
- Explicit return types on every function/method
- `??` not `||` for nullable defaults
- Named constants for enum/status values — no magic numbers
- `computed()` for all derived signal state — never imperative `set()`
- `#private` signals with `readonly` public accessors
- `{ message, messageKey }` on all exceptions — never plain string throws
- Import order: Node → Third-party → `@flusys` → Relative

### Phase 3 — Generate Backend

#### File Structure

Full layout is in [project-structure.md](project-structure.md). Summary for one entity inside its
domain module `{backend}/src/modules/{domain}/`:

```
modules/{domain}/
  {domain}.module.ts
  entities/{entity-kebab}.entity.ts     (+ entities/index.ts barrel)
  dto/{entity-kebab}.dto.ts             (+ dto/index.ts barrel)     ← Create + Update + Response in ONE file
  interfaces/i-{entity-kebab}.ts
  services/{entity-kebab}.service.ts    (+ services/index.ts barrel)
  controllers/{entity-kebab}.controller.ts (+ controllers/index.ts barrel)
```

If `{domain}` already exists, add these files to its existing subfolders and barrels — do not
create `modules/{entity-kebab}/`.

#### 3.1 Entity

`Identity` base already provides: `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`, `deletedById` — **never redeclare them**.

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

  // FK — always define BOTH the FK column AND the relation
  @Column({ type: 'uuid', name: 'category_id', nullable: true })
  categoryId: string | null = null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  // Enum
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus = ProductStatus.DRAFT;
}
```

**`<if enableCompanyFeature>`** — every company-scoped entity (per the feature PRD) also declares
these two columns. Neither comes from `Identity`; both are hand-declared here, the same as any
other FK column:

```typescript
@Index(['companyId'])
@Entity('{entity_table}')
export class {Entity} extends Identity {
  @Column({ type: 'uuid', name: 'company_id', nullable: true })
  companyId: string | null = null;

  @Column({ type: 'uuid', name: 'branch_id', nullable: true })
  branchId: string | null = null;
  // ...other columns
}
```

Skip both columns entirely when the project has `enableCompanyFeature: false` — an entity that
will never be filtered by company doesn't carry the column.

Rules:
- Extends `Identity` from `@flusys/nestjs-shared` — always this, never another base
- `@Index` on every FK column and every frequently-filtered column
- Nullable columns default to `null`, required columns use `!`

#### 3.2 DTOs — All Three in One File

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class Create{Entity}Dto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() price!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
}

export class Update{Entity}Dto extends Create{Entity}Dto {
  @ApiProperty({ description: '{Entity} ID' }) @IsUUID() @IsNotEmpty() id!: string;
}

// Nested relation shape — one per related entity
export class CategoryResponseDto {
  @ApiProperty() @Expose() id!: string;
  @ApiProperty() @Expose() name!: string;
}

export class {Entity}ResponseDto {
  @ApiProperty() @Expose() id!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty() @Expose() price!: number;
  @ApiProperty() @Expose() isActive!: boolean;
  @ApiPropertyOptional() @Expose() categoryId?: string;
  @ApiPropertyOptional({ type: () => CategoryResponseDto }) @Expose() @Type(() => CategoryResponseDto) category?: CategoryResponseDto;
  @ApiProperty() @Expose() createdAt!: Date;
  @ApiProperty() @Expose() updatedAt!: Date;
}
```

#### 3.3 Interface

Mirrors `ResponseDto` exactly — plain TypeScript, no decorators.

```typescript
export interface ICategory { id: string; name: string; }

export interface I{Entity} {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  categoryId?: string | null;
  category?: ICategory;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdById?: string | null;
  updatedById?: string | null;
}
```

#### 3.4 Service

**`getAll` query pipeline order (never change this order):**
```
filter → search (q param) → select → sort → [withDeleted] → extra (JOINs) → paginate
```

Each hook returns `{ query, isRaw: boolean }`. Once any hook sets `isRaw: true`, all subsequent hooks must stay raw.

**`convertSingleDtoToEntity` — always call super first:**
- If dto has `id` → loads entity from DB and merges
- If dto has no `id` → creates a new entity instance

```typescript
import { applyCompanyFilter, DeleteDto, FilterAndPaginationDto, ILoggedUserInfo } from "@flusys/nestjs-shared";
import { ApiService, HybridCache } from "@flusys/nestjs-shared/classes";
import { UtilsService } from "@flusys/nestjs-shared/modules";
import { Inject, Injectable, Scope } from "@nestjs/common";
import { QueryRunner, SelectQueryBuilder } from "typeorm";
import { bootstrapAppConfig } from "../../../config/modules.config";
import { {DataSourceProvider} } from "../../shared/{datasource-provider-file}";
import { Create{Entity}Dto, Update{Entity}Dto } from "../dto/{entity-kebab}.dto";
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
    // The FIRST arg here is the query-builder root alias — `getAll`/`getById` build their query
    // via `this.repository.createQueryBuilder(this.entityName)`. Every alias string in every hook
    // below (getSelectQuery/getFilterQuery/getSortQuery/getGlobalSearchQuery/applyCompanyFilter's
    // entityAlias) must reuse this EXACT string, byte-for-byte — not a snake_case or camelCase
    // guess at it. A mismatch (e.g. `super("learning-material", ...)` here but
    // `"learning_material."` in a hook) throws `QueryFailedError: "X" alias was not found` on the
    // first real `getAll`/`getById` call — silent until then, since `insert`/`update` never touch
    // these hooks.
    super("{entity}", new HybridCache(60000), utilsService, {Entity}Service.name, true, "{app-slug}", {Entity}, dataSourceProvider);
  }

  protected override async convertSingleDtoToEntity(
    dto: Create{Entity}Dto | Update{Entity}Dto,
    user: ILoggedUserInfo | null,
  ): Promise<{Entity}> {
    const entity = await super.convertSingleDtoToEntity(dto, user); // load or create
    entity.companyId = user?.companyId ?? null;
    entity.branchId = user?.branchId ?? null;
    // map custom fields here
    return entity;
  }

  // Tenant isolation + relation JOINs the response needs — belongs HERE, not in
  // getExtraManipulateQuery (see the warning below the hook table for why).
  protected override async getSelectQuery(
    query: SelectQueryBuilder<{Entity}>,
    user: ILoggedUserInfo | null,
    _select?: string[],
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    // NOT optional boilerplate — required the moment this method has ANY join below, on ANY
    // entity whose SORTABLE_FIELDS (in getSortQuery) includes createdAt/updatedAt. Those two
    // columns are `select: false` on the shared Identity base entity; TypeORM's paginated
    // getManyAndCount() wraps a joined query in an internal "distinctAlias" subquery that must
    // project every ORDER BY column, and a select:false column is never in that projection —
    // producing `QueryFailedError: column distinctAlias.<alias>_created_at does not exist` the
    // first time a client sorts by it. This one line prevents that for every sort combination up
    // front; see docs/CLAUDE.RULES.md's getSortQuery/addSelect rule for the live-reproduced
    // incident (confirmed on two independent modules) that happens when this line is dropped —
    // it is easy to drop, since without this comment it looks like arbitrary, skippable
    // boilerplate rather than a load-bearing fix. Never remove it from a joined getSelectQuery.
    query.addSelect(["{entity}.createdAt", "{entity}.updatedAt"]);
    query.leftJoinAndSelect("{entity}.category", "category");
    // <if enableCompanyFeature> — never hand-write `andWhere("{entity}.companyId = ...")`.
    // The helper reads bootstrapAppConfig so a single-company project (isCompanyFeatureEnabled:
    // false) doesn't filter to companyId = NULL and silently return zero rows.
    applyCompanyFilter(
      query,
      { isCompanyFeatureEnabled: bootstrapAppConfig.enableCompanyFeature, entityAlias: "{entity}" },
      user,
    );
    if (user?.branchId) query.andWhere("{entity}.branchId = :branchId", { branchId: user.branchId });
    return { query, isRaw: false };
  }

  protected override async getFilterQuery(
    query: SelectQueryBuilder<{Entity}>,
    filter: Record<string, unknown>,
    _user: ILoggedUserInfo | null,
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    if (filter.status)
      query.andWhere("{entity}.status = :status", { status: filter.status });
    return { query, isRaw: false };
  }

  // getAll-only extras (e.g. a list-view-only aggregate JOIN). Leave this hook out entirely
  // unless you have something that must NOT apply to getById/getByIds — see the warning below.
  protected override async getExtraManipulateQuery(
    query: SelectQueryBuilder<{Entity}>,
    _dto: FilterAndPaginationDto,
    _user: ILoggedUserInfo | null,
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    return { query, isRaw: false };
  }
}
```

**Repository access patterns:**
```typescript
// Primary entity — call ensureDataSourceRepository() then use this.repository
await this.ensureDataSourceRepository();
const item = await this.repository.findOne({ where: { id } });

// Cross-entity (other entities)
const otherRepo = await this.dataSourceProvider.getRepository(OtherEntity);

// Raw SQL or transactions
const ds = await this.dataSourceProvider.getDataSource();
const rows = await ds.query("SELECT ...", [params]);
```

**Lifecycle hooks** — override only what you need. Order of preference: base method → hook →
custom method; write a custom public method only when no hook covers the need. Every hook is
optional, and every write hook runs inside the operation's open transaction — use
`queryRunner.manager`, never an injected repository, or the work lands outside the transaction.

| Hook | Signature | Use for |
| ---- | --------- | ------- |
| `beforeInsertOperation` | `(dto \| dto[], user, queryRunner)` | validate or reserve before create |
| `afterInsertOperation` | `(entity[], dto \| dto[], user, queryRunner)` | linked records, events, notifications |
| `beforeUpdateOperation` | `(dto \| dto[], user, queryRunner)` | guard state transitions |
| `afterUpdateOperation` | `(entity[], dto \| dto[], user, queryRunner)` | cascade changes |
| `beforeDeleteOperation` | `(DeleteDto, user, queryRunner)` | block or clean up before delete |
| `afterDeleteOperation` | `({ id }[], DeleteDto, user, queryRunner)` | post-delete cleanup |
| `getFilterQuery` | `(query, filter, user)` | per-column filters |
| `getSortQuery` | `(query, sort, user)` | custom sort columns |
| `getSelectQuery` | `(query, user, select?)` | default SELECT columns, relation JOINs, and tenant isolation (`applyCompanyFilter`) |
| `getGlobalSearchQuery` | `(query, search, user)` | **the search box** — free-text across columns |
| `getExtraManipulateQuery` | `(query, dto, user)` | `getAll`-only extras (pagination-context manipulation) — never scoping or JOINs a single-record response needs, see warning below |
| `convertRequestDtoToEntity` | `(dto \| dto[], user)` | rarely — dispatches to the two below |
| `convertSingleDtoToEntity` | `(dto, user)` | DTO → entity mapping — **always** set `entity.companyId`/`entity.branchId` here, see warning below |
| `convertArrayDtoToEntities` | `(dtos[], user)` | bulk DTO → entity mapping |

**`getSelectQuery` vs `getExtraManipulateQuery` — do not swap these.** The generated `getById`/
`getByIds` endpoints call `getSelectQuery` only; `getExtraManipulateQuery` fires for `getAll`
alone. Put `applyCompanyFilter` and any relation `JOIN` a single-record response needs in
`getSelectQuery` — putting either one only in `getExtraManipulateQuery` leaves `getById`/`getByIds`
completely unscoped (any authenticated user holding `.read` can fetch another company's row by
UUID) and silently drops the joined relation from single-record responses. Verify a new CRUD
feature with at least one live `getAll` call AND one live `getById` call before considering it
done — `insert`/`update` alone never exercise either hook and won't surface this.

**`convertSingleDtoToEntity` must set `entity.companyId`/`entity.branchId` explicitly, every
time.** The base class's DTO→entity conversion only auto-copies fields that exist on the DTO, and
`companyId`/`branchId` deliberately never do (a client must never supply them) — an override that
forgets this line compiles fine, every other field looks correct in the create response, but the
row silently gets `companyId: null` and becomes permanently invisible to `getAll`/`getById` once
`applyCompanyFilter` scopes by the real company id. Grep every new service for this line before
calling it done.

**Any join in `getSelectQuery` requires `query.addSelect(["{entity}.createdAt", "{entity}.updatedAt"])` (already in the template above) — never drop it.** `createdAt`/`updatedAt` are `select: false`
on the shared `Identity` base entity, so they're excluded from the default SELECT. That's invisible
until a client paginates AND sorts by one of them: TypeORM's paginated `getManyAndCount()` wraps a
joined query in an internal `distinctAlias` subquery that must project every `ORDER BY` column, and
a `select: false` column is never in that projection — `QueryFailedError: column
distinctAlias.<alias>_created_at does not exist`. Confirmed live across two independently-built
modules whose `getSelectQuery` had a join but omitted this exact line (see
`docs/CLAUDE.RULES.md`'s getSortQuery/addSelect rule for the incident and the 41-file sweep it
took to fix every other module already missing it). Do **not** instead blanket-`addSelect` every
sortable field as a "safer" fix — a normal, already-selected field colliding by name with a column
on the joined entity (e.g. two entities that both happen to have an `entityType` column) produces a
second, separate failure: `column reference "..." is ambiguous`. `createdAt`/`updatedAt` are the
only columns that need this, precisely because they're the only ones excluded from the default
SELECT.
| `convertEntityToResponseDto` | `(entity, isRaw)` | shape a single response |
| `convertEntityListToResponseListDto` | `(entities[], isRaw)` | shape a list response |

The `after*` hooks take the originating dto as their **second** parameter — writing the
three-parameter form puts `user` where the dto belongs:

```typescript
// After insert — side effects (linked records, events)
protected override async afterInsertOperation(
  entities: {Entity}[],
  _dto: Create{Entity}Dto | Create{Entity}Dto[],
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  for (const entity of entities) {
    await queryRunner.manager.save(LinkedEntity, { entityId: entity.id, userId: user?.id });
  }
}

// After update
protected override async afterUpdateOperation(
  entities: {Entity}[],
  _dto: Update{Entity}Dto | Update{Entity}Dto[],
  _user: ILoggedUserInfo | null,
  _queryRunner: QueryRunner,
): Promise<void> { }

// Before delete — dto.type: 'delete' | 'restore' | 'permanent'
protected override async beforeDeleteOperation(
  dto: DeleteDto,
  _user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  if (dto.type !== "permanent") return;
  await queryRunner.manager.delete(LinkedEntity, { entityId: dto.id });
}
```

**If the PRD asks for a search box**, override `getGlobalSearchQuery` — it is the only hook wired
to the search term. Putting search logic in `getFilterQuery` leaves the search box matching
nothing:

```typescript
protected override async getGlobalSearchQuery(
  query: SelectQueryBuilder<{Entity}>,
  search: string,
  _user: ILoggedUserInfo | null,
): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
  query.andWhere("({entity}.name ILIKE :search OR {entity}.code ILIKE :search)", {
    search: `%${search}%`,
  });
  return { query, isRaw: false };
}
```

**Exception pattern — always object syntax:**
```typescript
throw new NotFoundException({ message: "Human-readable message", messageKey: "{entity}.error.not-found" });
```

#### 3.5 Controller

`createApiController` exposes **10 POST-only endpoints**. **Always use the `const BaseController` pattern — never call `createApiController` inline on the `extends` clause.**

Import from `@flusys/nestjs-shared/classes`.

| Method | HTTP | Use |
|--------|------|-----|
| `insert` | POST `/insert` | Create one |
| `insertMany` | POST `/insert-many` | Create array |
| `getById` | POST `/get/:id` | Fetch one by UUID |
| `getByIds` | POST `/get-by-ids` | Fetch array by UUIDs |
| `getAll` | POST `/get-all` | Paginated list with filter/search/sort |
| `getByFilter` | POST `/get-by-filter` | First match by filter object |
| `bulkUpsert` | POST `/bulk-upsert` | No id → insert, with id → update |
| `update` | POST `/update` | Update one (id in body) |
| `updateMany` | POST `/update-many` | Update array |
| `delete` | POST `/delete` | Soft delete / restore / permanent |

Delete types: `{ id: ['uuid1', 'uuid2'], type: 'delete' | 'restore' | 'permanent' }`

```typescript
import { createApiController } from "@flusys/nestjs-shared/classes";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Create{Entity}Dto, Update{Entity}Dto, {Entity}ResponseDto } from "../dto/{entity-kebab}.dto";
import { {Entity}Service } from "../services/{entity-kebab}.service";

// Step 1 — build the base class
const BaseController = createApiController(
  Create{Entity}Dto,
  Update{Entity}Dto,
  {Entity}ResponseDto,
  {
    entityName: "{entity}",
    security: "jwt",
    // enabledEndpoints: ["insert", "getAll", "getById", "update", "delete"], // omit = all 10
  },
);

// Step 2 — extend it
@ApiTags("Section {Entity}")
@Controller("{entity-kebab}")
export class {Entity}Controller extends BaseController {
  constructor(private readonly {entity}Service: {Entity}Service) {
    super({entity}Service);
  }
  // Custom endpoints go here — see Shared Rules for decorator order
}
```

**Security options:**

```typescript
// Option A — uniform JWT (most common)
{ security: "jwt", entityName: "..." }

// Option B — uniform permission guard
{ security: { level: "permission", permissions: ["{entity}.read"] }, entityName: "..." }

// Option C — partial CRUD
{
  security: "jwt",
  entityName: "...",
  enabledEndpoints: ["insert", "getAll", "getById", "update", "delete"],
}

// Option D — per-endpoint security
{
  entityName: "...",
  security: {
    insert:      { level: "permission", permissions: ["{entity}.create"] },
    update:      { level: "permission", permissions: ["{entity}.update"] },
    delete:      { level: "permission", permissions: ["{entity}.delete"] },
    getAll:      "jwt",
    getById:     "jwt",
    getByIds:    "jwt",
    getByFilter: "jwt",
    insertMany:  { level: "permission", permissions: ["{entity}.create"] },
    updateMany:  { level: "permission", permissions: ["{entity}.update"] },
    bulkUpsert:  { level: "permission", permissions: ["{entity}.create", "{entity}.update"], operator: "OR" },
  },
}
```

#### 3.6 Module

**New domain** — create the module:

```typescript
import { Module } from '@nestjs/common';
import { {DataSourceProvider} } from '../../providers';
import { {Entity}Controller } from './controllers';
import { {Entity}Service } from './services';

@Module({
  controllers: [{Entity}Controller],
  providers: [{DataSourceProvider}, {Entity}Service],
  exports: [{Entity}Service],
})
export class {Domain}Module {}
```

**Existing domain** — add the new controller and service to its arrays, do not touch the ones
already there:

```typescript
@Module({
  controllers: [...existingControllers, {Entity}Controller],
  providers: [{DataSourceProvider}, ...existingServices, {Entity}Service],
  exports: [...existingExports, {Entity}Service],
})
export class {Domain}Module {}
```

#### 3.7 Barrel Exports

Every subdirectory (`entities/`, `dto/`, `services/`, `controllers/`) gets an `index.ts` that
re-exports all named exports for every file in it — `interfaces/` does not need one. When adding
an entity to an existing domain, append its export to each barrel rather than creating a new one.

```typescript
// dto/index.ts
export * from "./{entity-kebab}.dto";
```

#### 3.8 Register in App Module

```typescript
// {backend}/src/app.module.ts
imports: [
  // ...existing modules
  {Entity}Module,
],
```

---

### Parent-Child CRUD Pattern

Use when one entity owns a collection (e.g., `Invoice → InvoiceItem[]`).

**Choose an approach first:**

| | Option A — Cascade | Option B — After-hooks |
|--|--|--|
| **Use when** | No computed parent field | Parent has computed field (e.g. `total`) |
| **How** | `cascade: true` + assign children in `convertSingleDtoToEntity` | `cascade: false` + `_pendingDto` + after-hooks |
| **TypeORM handles FK** | Yes — automatically | No — set `invoiceId` manually |

**Entities (same for both options):**

```typescript
// Parent
@Entity("invoices")
export class Invoice extends Identity {
  @Column({ type: "varchar", length: 100 }) number!: string;
  @Column({ type: "date" }) date!: Date;
  // cascade: true for Option A, cascade: false for Option B
  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items?: InvoiceItem[];
}

// Child
@Entity("invoice_items")
@Index(["invoiceId"])
export class InvoiceItem extends Identity {
  @Column({ type: "uuid", name: "invoice_id" }) invoiceId!: string;
  @ManyToOne(() => Invoice, { nullable: false }) @JoinColumn({ name: "invoice_id" }) invoice?: Invoice;
  @Column({ type: "varchar", length: 255 }) description!: string;
  @Column({ type: "int" }) quantity!: number;
  @Column({ type: "decimal", precision: 10, scale: 2 }) unitPrice!: number;
}
```

**DTOs (same for both options):**

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
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}

export class UpdateInvoiceDto extends CreateInvoiceDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() id!: string;
  @ApiProperty({ type: [UpdateInvoiceItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateInvoiceItemDto)
  override items!: UpdateInvoiceItemDto[];
}
```

**Option A — Cascade (no computed field):**

```typescript
override async convertSingleDtoToEntity(dto, user): Promise<Invoice> {
  const entity = await super.convertSingleDtoToEntity(dto, user);
  entity.number = dto.number;
  entity.date = new Date(dto.date);
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
override async afterUpdateOperation(invoices, _user, queryRunner): Promise<void> {
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

**Option B — After-hooks (with computed `total`):**

Add `@Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) total: number = 0;` to the entity.

```typescript
override async convertSingleDtoToEntity(dto, user): Promise<Invoice> {
  const entity = await super.convertSingleDtoToEntity(dto, user);
  entity.number = dto.number;
  entity.date = new Date(dto.date);
  // total computed in afterInsertOperation — leave as 0
  return entity;
}

override async afterInsertOperation(invoices, _user, queryRunner): Promise<void> {
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

override async afterUpdateOperation(invoices, _user, queryRunner): Promise<void> {
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
override async beforeInsertOperation(dto, _user, _qr) { this._pendingDto = Array.isArray(dto) ? dto[0] : dto; }
override async beforeUpdateOperation(dto, _user, _qr) { this._pendingDto = Array.isArray(dto) ? dto[0] : dto; }
```

**Shared — response mapping + query hooks (same for both options):**

```typescript
// A manually-built response object for an entity extending `Identity`/`IIdentity` must include
// all six base fields — `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`,
// `deletedById` — not just the two or three an entity's own doc comment usually calls out.
// `IIdentity` requires all six as non-optional; spread the source entity (`...entity`) plus
// overrides, or list all six explicitly, so `tsc` doesn't fail with "missing properties:
// deletedAt, createdById, updatedById, deletedById" the moment strict checking runs.
protected override convertEntityToResponseDto(entity: Invoice, _isRaw: boolean): IInvoice {
  return {
    ...entity,
    items: (entity.items ?? []).map((item) => ({
      ...item,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

override convertEntityListToResponseListDto(entities, isRaw) {
  return entities.map((e) => this.convertEntityToResponseDto(e, isRaw));
}

// The `items` JOIN belongs in getSelectQuery, not getExtraManipulateQuery — getById/getByIds
// only call the former, so a JOIN placed only here silently vanishes from single-record responses.
protected override async getSelectQuery(query, _user, _select?) {
  query.leftJoinAndSelect("invoices.items", "items");
  return { query, isRaw: false };
}

protected override async getGlobalSearchQuery(query, search) {
  query.andWhere("(invoices.number LIKE :s OR items.description LIKE :s)", { s: `%${search}%` });
  return { query, isRaw: false };
}
```

> Child entity (`InvoiceItem`) does not need its own module or controller unless it has independent CRUD.

---

### Phase 4 — Generate Frontend

#### Angular Service

```typescript
// {frontend}/src/app/modules/{domain}/services/{entity-kebab}.service.ts
import { Injectable } from "@angular/core";
import { ApiResourceService } from "@flusys/ng-shared";
import { I{Entity} } from "../interfaces";

@Injectable({ providedIn: "root" })
export class {Entity}Service extends ApiResourceService<I{Entity}, Partial<I{Entity}>> {
  constructor() {
    super("{api-path}"); // matches backend @Controller path exactly
  }
  // Add a custom method only when the built-ins below don't fit.
}
```

**Built-in reactive state** — do NOT recreate these in the component. `ApiResourceService` owns a
`resource()`-backed list whose state is already exposed as signals; a list component that
declares its own `items`, `isLoading`, or `total` signal and hand-writes a `loadData()` is
reimplementing all of this:

| Signal | Type | Meaning |
| ------ | ---- | ------- |
| `data` | `Signal<T[]>` | current page of rows |
| `total` | `Signal<number>` | total matching records |
| `isLoading` | `Signal<boolean>` | request in flight |
| `hasMore` | `Signal<boolean>` | another page exists |
| `pageInfo` | `Signal<IPaginationMeta \| undefined>` | page, pageSize, totalPages |
| `error` | `Signal<Error \| undefined>` | last failure |
| `status` | `Signal<ResourceStatus>` | resource lifecycle state |
| `searchTerm` | `WritableSignal<string>` | bound to the search box |
| `filterData` | `WritableSignal<IFilterData>` | active filter + pagination |

| Control method | Effect |
| -------------- | ------ |
| `fetchList(search?, filter?)` | load the first page with the given search/filter |
| `setPagination(pagination)` | change page or page size, refetch |
| `nextPage()` | advance one page |
| `resetPagination()` | back to the first page |
| `reload()` | refetch the current query — use after create, update, or delete |

**Built-in Promise methods** — for one-off reads and writes. All return Promises — `await`, never
`.subscribe()`:

| Method | Signature |
| ------ | --------- |
| `insert` | `(dto) => Promise<ISingleResponse<T>>` |
| `insertMany` | `(dtos[]) => Promise<IBulkResponse<T>>` |
| `update` | `(dto)` — the `id` must be inside the payload |
| `updateMany` | `(dtos[])` |
| `bulkUpsert` | `(toInsert[], toUpdate[])` |
| `findById` | `(id, select?) => Promise<ISingleResponse<T>>` |
| `findByIds` | `(ids[], select?) => Promise<IListResponse<T>>` |
| `getAll` | `(filter, search?) => Promise<IListResponse<T>>` — prefer `fetchList()` for list pages |
| `getByFilter` | `(filter) => Promise<ISingleResponse<T>>` — first match |
| `delete` | `({ id, type })` — `type` is `'delete'` \| `'restore'` \| `'permanent'` |

> It is `findById` — not `getById`.

Rules:
- Extends `ApiResourceService<IModel, Partial<IModel>>` — no `HttpClient` injection
- Constructor calls only `super("api-path")` — API path matches the backend `@Controller(...)` path exactly
- **Bind to the base's signals; never mirror them into local component signals**
- Refresh after a write with `reload()` — never by calling `getAll()` and re-`set()`ting a signal
- All built-in methods return Promises — use `await`, never `.subscribe()`

#### Form Strategy — Decide Before Generating

| Condition | Strategy | Structure |
|-----------|----------|-----------|
| ≤ 5 fields, simple types | **Dialog form** | `modules/{domain}/components/{entity-kebab}-form/` |
| > 5 fields, nested sections, file uploads, parent-child | **Separate page** | `modules/{domain}/pages/{entity-kebab}-form/` |

> The **page component** owns data loading and delete. The **form component** owns field state, validation, and save.

> **This table is a decision you make, not background reading.** Before scaffolding any entity's create/edit UI, count its real fields and check for a `FormArray`/file upload/parent-child relationship, then commit to one row — don't default to a page out of habit. A prior full run of this skill generated 49 entities and applied the page structure to 46 of them regardless of field count, including 3-field forms; the fix was a large after-the-fact conversion sweep. Getting the row right the first time is far cheaper than that sweep.

#### List Component

```typescript
// {frontend}/src/app/modules/{domain}/pages/{entity-kebab}-list/{entity-kebab}-list.component.ts
import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { ButtonComponent, ConfirmationService, ConfirmDialog, MessageService, TableComponent, ToastComponent, TooltipDirective } from "@flusys/ng-ui";
import { I{Entity} } from "../../interfaces";
import { {Entity}Service } from "../../services/{entity-kebab}.service";
import { {Entity}FormDialogComponent } from "../../components/{entity-kebab}-form/{entity-kebab}-form-dialog.component";

@Component({
  selector: "app-{entity-kebab}-list",
  standalone: true,
  providers: [MessageService, ConfirmationService],
  imports: [CommonModule, TableComponent, ButtonComponent, ToastComponent, TooltipDirective, ConfirmDialog, {Entity}FormDialogComponent],
  template: `
    <f-toast />
    <f-confirmdialog />
    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">{EntityName}s</h1>
        <f-button label="Add {EntityName}" icon="plus" (onClick)="openCreateDialog()" />
      </div>
      <f-table [value]="items()" [loading]="isLoading()" [paginator]="true" [rows]="10">
        <ng-template #header>
          <tr>
            <th>Name</th>
            <th class="text-center">Actions</th>
          </tr>
        </ng-template>
        <ng-template #body let-item>
          <tr>
            <td>{{ item.name }}</td>
            <td class="text-center">
              <div class="flex justify-center gap-1">
                <f-button icon="pencil" [text]="true" severity="secondary" fTooltip="Edit" (onClick)="openEditDialog(item)" />
                <f-button icon="trash-2" [text]="true" severity="danger" fTooltip="Delete" (onClick)="confirmDelete(item)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="2" class="text-center py-10 text-surface-400">No {entityName}s found.</td></tr>
        </ng-template>
      </f-table>
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

  // Bound straight to the base service's resource signals — no local copies,
  // no manual loading flag, no hand-written loadData().
  readonly items = this.{entity}Service.data;
  readonly isLoading = this.{entity}Service.isLoading;
  readonly total = this.{entity}Service.total;

  // Genuinely local UI state only.
  readonly selectedItem = signal<Partial<I{Entity}> | null>(null);
  readonly dialogVisible = signal(false);

  ngOnInit(): void { this.{entity}Service.fetchList(); }

  onSearch(term: string): void { this.{entity}Service.fetchList(term); }
  onPagination(pagination: IPagination): void { this.{entity}Service.setPagination(pagination); }

  openCreateDialog(): void { this.selectedItem.set(null); this.dialogVisible.set(true); }
  openEditDialog(item: Partial<I{Entity}>): void { this.selectedItem.set(item); this.dialogVisible.set(true); }

  onSaved(): void {
    this.messageService.add({
      severity: "success", summary: "Success",
      detail: this.selectedItem()?.id ? "{EntityName} updated." : "{EntityName} added.",
    });
    this.{entity}Service.reload();
  }

  confirmDelete(item: Partial<I{Entity}>): void {
    this.confirmationService.confirm({
      message: `Delete <strong>${item.name}</strong>?`,
      header: "Delete Confirmation",
      icon: "alert-triangle",
      accept: () => this.deleteItem(item),
    });
  }

  private async deleteItem(item: Partial<I{Entity}>): Promise<void> {
    if (!item.id) return;
    try {
      await this.{entity}Service.delete({ id: item.id, type: "delete" });
      this.messageService.add({ severity: "success", summary: "Deleted", detail: "{EntityName} removed." });
      this.{entity}Service.reload();
    } catch {
      this.messageService.add({ severity: "error", summary: "Error", detail: "Could not delete {entityName}." });
    }
  }
}
```

> The component declares no `items` or `isLoading` signal of its own and has no `loadData()`.
> `ApiResourceService` already owns that state; mirroring it into the component means two sources
> of truth and a list that silently goes stale. Refresh with `reload()`, never by re-fetching into
> a local signal.

#### Filter Row — when the entity has filterable fields

Insert this between the header row and the `<f-table>`, exactly this shape:

```html
<div class="filter-bar flex flex-wrap items-center gap-2 mb-4">
  <input
    type="text"
    class="w-64 rounded-md border border-surface px-3 py-2 text-sm"
    placeholder="Search by name..."
    [value]="searchTerm()"
    (input)="onSearch($any($event.target).value)"
  />
  <f-select [options]="statusOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" [formControl]="statusFilterControl" />
  <f-datepicker placeholder="From" [showIcon]="true" [showClear]="true" [formControl]="dateFromFilterControl" />
</div>
```

The `filter-bar` class is load-bearing, not decorative — `dashboard/src/tailwind.css` has a rule
keyed off it (`.filter-bar > .w-full { width: auto; min-width: 180px; max-width: 240px; }`) that
overrides the `block w-full` host class every ng-ui form component (`f-select`, `f-datepicker`,
`f-multiselect`, `f-autocomplete`, `f-treeselect`, `f-cascadeselect`, `f-iftalabel`, ...) defaults
to. Without it, each filter control stretches to 100% of the row and stacks one-per-line instead
of sitting side by side. Never add a `[style]="{ width: '...' }"` binding to a filter control
instead — the CSS rule already handles every current and future one; a per-instance override is
redundant at best and drifts from the shared width the next time someone tweaks the CSS rule.

#### Form Dialog Component

```typescript
// {frontend}/src/app/modules/{domain}/components/{entity-kebab}-form/{entity-kebab}-form-dialog.component.ts
import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject, input, output, signal, untracked } from "@angular/core";
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ButtonComponent, DialogComponent, InputTextDirective } from "@flusys/ng-ui";
import { I{Entity} } from "../../interfaces";
import { {Entity}Service } from "../../services/{entity-kebab}.service";

@Component({
  selector: "app-{entity-kebab}-form-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogComponent, ButtonComponent, InputTextDirective],
  template: `
    <f-dialog
      [header]="isEditMode() ? 'Edit {EntityName}' : 'Add {EntityName}'"
      [(visible)]="dialogVisible"
      [modal]="true" [resizable]="false" [closable]="!isSaving()"
      style="width: 600px; max-width: 100%"
      (onHide)="onClose()"
    >
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
          <input fInputText formControlName="name" placeholder="Name" class="w-full" />
          @if (isFieldInvalid("name")) { <small class="text-red-500">Name is required.</small> }
        </div>
        <!-- add fields per entity -->
      </form>
      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <f-button label="Cancel" [text]="true" severity="secondary" (onClick)="onClose()" [disabled]="isSaving()" />
          <f-button
            [label]="isEditMode() ? 'Update {EntityName}' : 'Add {EntityName}'"
            icon="check" [loading]="isSaving()"
            (onClick)="onSubmit()" [disabled]="isSaving()" />
        </div>
      </ng-template>
    </f-dialog>
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
    // add controls matching CreateDto fields
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

  onClose(): void { this.visibleChange.emit(false); }
}
```

**Any `f-select`, `f-multiselect`, `f-autocomplete`, `f-treeselect`, `f-cascadeselect`, `f-menu`, or
`f-password` added under `<!-- add fields per entity -->` (or into any other `f-dialog`/`f-drawer`
body) must set `[appendTo]="'body'"`.** These components default `appendTo` to `'self'` — the
overlay panel renders as an absolutely-positioned sibling inside the dialog's own DOM subtree
instead of portaling to `<body>`. `f-dialog`'s content area clips overflow, so the panel gets cut
off exactly where the dialog's edge is, instead of floating above it — invisible or truncated
options, not a crash, so it's easy to ship without noticing in a quick manual check. `f-datepicker`,
`f-colorpicker`, `f-popover`, and `f-splitbutton` already default to `'body'` and need no override.
When unsure which way a given component defaults, grep its `appendTo = input(` line in
`node_modules/@flusys/ng-ui/fesm2022/flusys-ng-ui.mjs` rather than assuming.

**Component rules:**
- All DI via `inject()` — no constructor parameter injection
- `computed()` for derived booleans like `isEditMode`
- `effect()` in constructor syncs inputs — use `untracked()` inside effect body
- `input()` / `output()` — never `@Input()` / `@Output()` decorators
- `@if / @for / @switch` in templates — never `*ngIf / *ngFor`

#### Form Page Component

For entities routed to the **Separate page** strategy (> 5 fields, nested sections, file uploads,
parent-child — see the Form Strategy table above). Same field-state/validation/save
responsibilities as the Dialog form above, but as a routed page instead of an `f-dialog`, and
loading/patching its own entity from the route param instead of an `item` input.

```typescript
// {frontend}/src/app/modules/{domain}/pages/{entity-kebab}-form/{entity-kebab}-form.component.ts
import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ButtonComponent, InputTextDirective, MessageService } from "@flusys/ng-ui";
import { {Entity}Service } from "../../services/{entity-kebab}.service";

@Component({
  selector: "app-{entity-kebab}-form",
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputTextDirective],
  template: `
    <div class="card p-4">
      <h1 class="text-2xl font-bold mb-4">{{ isEditMode() ? "Edit {EntityName}" : "Add {EntityName}" }}</h1>
      <form [formGroup]="form" class="flex flex-col gap-4" (ngSubmit)="onSubmit()">
        <!--
          Pair 2 (or 3, for a tightly related trio) fields per row in a responsive grid; a field
          that doesn't pair naturally (long text/textarea, file upload, a lone leftover field)
          stays a standalone full-width block directly inside the form, outside any grid. Never
          wrap the outer card in max-w-* — a full-page form spans the available page width, unlike
          the width-capped f-dialog above.
        -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
            <input fInputText formControlName="name" class="w-full" />
            @if (isFieldInvalid("name")) { <small class="text-red-500">Name is required.</small> }
          </div>
          <!-- add fields per entity, grouped into further grid rows or standalone blocks -->
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <f-button label="Cancel" [text]="true" severity="secondary" type="button" (onClick)="onCancel()" [disabled]="isSaving()" />
          <f-button [label]="isEditMode() ? 'Update' : 'Create'" icon="check" type="submit" [loading]="isSaving()" [disabled]="isSaving()" />
        </div>
      </form>
    </div>
  `,
})
export class {Entity}FormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly {entity}Service = inject({Entity}Service);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSaving = signal(false);
  private readonly entityId = signal<string | null>(null);
  readonly isEditMode = computed(() => !!this.entityId());

  readonly form = this.fb.group({
    name: this.fb.control("", [Validators.required, Validators.maxLength(255)]),
    // add controls matching CreateDto fields
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) return;
    this.entityId.set(id);
    this.loadEntity(id);
  }

  private async loadEntity(id: string): Promise<void> {
    try {
      const response = await this.{entity}Service.findById(id);
      if (response.data) this.form.patchValue(response.data as any);
    } catch {
      this.messageService.add({ severity: "error", summary: "Error", detail: "Could not load {entityName}." });
    }
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
      const data = this.form.getRawValue();
      const id = this.entityId();
      if (id) {
        await this.{entity}Service.update({ ...data, id });
      } else {
        await this.{entity}Service.insert(data);
      }
      this.messageService.add({ severity: "success", summary: "Success", detail: id ? "{EntityName} updated." : "{EntityName} created." });
      this.router.navigate(["/{entity-kebab}s"]);
    } catch {
      this.messageService.add({ severity: "error", summary: "Error", detail: "Could not save {entityName}." });
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(["/{entity-kebab}s"]);
  }
}
```

**Page-form rules — the same drift bit 17 generated files across this project once already:**
- The outer wrapper is always `class="card p-4"` — **never** append `max-w-*` (`max-w-2xl`,
  `max-w-3xl`, ...). A dialog form legitimately caps its width (it's a modal, capped via
  `f-dialog`'s own `style="width: ..."`); a page form is not a modal and must fill the page like
  every list page does. Copying the dialog template's width instinct onto a page wrapper is exactly
  the mistake to avoid.
- The field body is never one flat `flex flex-col gap-4` stack of single-column fields. Wrap
  logically related fields in `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">` (or
  `sm:grid-cols-3` for a genuine 3-field trio) rows; a field with no natural pair (textarea, file
  upload, a lone leftover) stays a standalone full-width block as a direct child of the form.
- If the entity has clear sections (Personal Info / Employment / Contact, etc.), keep each
  section's fields grouped in their own grid(s) rather than mixing fields across sections in one
  grid.

#### 4.1 Register Route

Add this entity's routes to the domain's `modules/{domain}/{domain}.routes.ts` — do not create a
route file per entity. If `{domain}.routes.ts` does not exist yet, create it and lazy-load it
once from `app.routes.ts` (see [project-structure.md](project-structure.md#routing)).

```typescript
// inside modules/{domain}/{domain}.routes.ts, in the `children` array
{
  path: "{entity-kebab}",
  canActivate: [permissionGuard({ENTITY}_PERMISSIONS.READ)],
  loadComponent: () =>
    import("./pages/{entity-kebab}-list/{entity-kebab}-list.component").then(m => m.{Entity}ListComponent),
},
{
  path: "{entity-kebab}/create",
  canActivate: [permissionGuard({ENTITY}_PERMISSIONS.CREATE)],
  loadComponent: () =>
    import("./pages/{entity-kebab}-form/{entity-kebab}-form.component").then(m => m.{Entity}FormComponent),
},
{
  path: "{entity-kebab}/edit/:id",
  canActivate: [permissionGuard({ENTITY}_PERMISSIONS.UPDATE)],
  loadComponent: () =>
    import("./pages/{entity-kebab}-form/{entity-kebab}-form.component").then(m => m.{Entity}FormComponent),
},
```

Dialog-form entities (see Form Strategy above) only need the first block — the dialog opens from
the list page itself, it has no `create` / `edit/:id` route.

### Phase 5 — Migration

```bash
cd {backend} && npm run migration:generate -- --name=Create{Entity}Table
# Review the generated file before running — check column types, indexes, FKs
cd {backend} && npm run migration:run
# Multi-tenant project? Run: npm run migration:run:all
```

### Phase 6 — Register Translation Keys

> Skip if project does not use `@flusys/ng-localization`. Check for `translationModuleResolver` in existing routes — if absent, no localization.

```
POST /localization/keys/bulk-create
{
  "keys": [
    { "key": "{entity}.title",           "module": "{entity}", "description": "Page title" },
    { "key": "{entity}.add",             "module": "{entity}", "description": "Add button label" },
    { "key": "{entity}.form.create",     "module": "{entity}", "description": "Create dialog header" },
    { "key": "{entity}.form.edit",       "module": "{entity}", "description": "Edit dialog header" },
    { "key": "{entity}.field.name",      "module": "{entity}", "description": "Name field label" },
    { "key": "{entity}.confirm.delete",  "module": "{entity}", "description": "Delete confirmation" },
    { "key": "{entity}.message.created", "module": "{entity}", "description": "Create success toast" },
    { "key": "{entity}.message.updated", "module": "{entity}", "description": "Update success toast" },
    { "key": "{entity}.message.deleted", "module": "{entity}", "description": "Delete success toast" },
    { "key": "{entity}.error.not-found", "module": "{entity}", "description": "Not found error" }
  ]
}

POST /localization/translations/bulk-upsert
{
  "languageId": "<english-lang-uuid>",
  "translations": [
    { "key": "{entity}.title",           "value": "{EntityName}s" },
    { "key": "{entity}.add",             "value": "Add {EntityName}" },
    { "key": "{entity}.form.create",     "value": "New {EntityName}" },
    { "key": "{entity}.form.edit",       "value": "Edit {EntityName}" },
    { "key": "{entity}.field.name",      "value": "Name" },
    { "key": "{entity}.confirm.delete",  "value": "Delete this {entityName}?" },
    { "key": "{entity}.message.created", "value": "{EntityName} created successfully" },
    { "key": "{entity}.message.updated", "value": "{EntityName} updated successfully" },
    { "key": "{entity}.message.deleted", "value": "{EntityName} deleted" },
    { "key": "{entity}.error.not-found", "value": "{EntityName} not found" }
  ]
}
```

### Phase 7 — Completion Report

```
## CRUD Complete: {EntityName}

### Backend  ({backend}/src/modules/{domain}/)
| File | Status |
|------|--------|
| entities/{entity-kebab}.entity.ts        | ✅ Created |
| dto/{entity-kebab}.dto.ts                | ✅ Created |
| interfaces/i-{entity-kebab}.ts           | ✅ Created |
| services/{entity-kebab}.service.ts       | ✅ Created |
| controllers/{entity-kebab}.controller.ts | ✅ Created |
| {domain}.module.ts                       | ✅ Created / Updated |
| src/app.module.ts                        | ✅ Updated (new domain only) |

### Frontend  ({frontend}/src/app/modules/{domain}/)
| File | Status |
|------|--------|
| services/{entity-kebab}.service.ts                          | ✅ Created |
| interfaces/i-{entity-kebab}.ts                              | ✅ Created |
| pages/{entity-kebab}-list/{entity-kebab}-list.component.ts  | ✅ Created |
| pages/{entity-kebab}-form/{entity-kebab}-form.component.ts  | ✅ Created |
| {domain}.routes.ts                                          | ✅ Created / Updated |
| app.routes.ts                                                | ✅ Updated (new domain only) |

### Pending (manual steps)
| Task | Status |
|------|--------|
| Migration generated & reviewed           | ⬜ Pending |
| Migration run (`npm run migration:run`)   | ⬜ Pending |
| Backend build (`npm run build`)          | ⬜ Pending |
```

