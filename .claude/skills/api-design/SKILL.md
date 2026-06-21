---
name: api-design
description: FLUSYS API design and full-stack generation — strategy selection (Domain Action / Full CRUD / Partial CRUD), HTTP rules, guards, response DTOs, and complete backend + frontend generation with quality gates. Load for any NestJS controller, service, endpoint, or CRUD feature.
---

# FLUSYS API Design & Generation

## Step 1 — Choose a Strategy

> Apply automatically — never ask the user which strategy to use.

| Signal | Strategy |
|--------|----------|
| "manage [entities]", "CRUD for X", entity needs create / list / update / delete | **Full CRUD** → follow [Path B — Full CRUD Generation](#path-b--full-crud-generation) |
| "only [verb] endpoint", "read-only", "insert-only", ≤ 3 of the 10 base operations | **Partial CRUD** → follow [Path B](#path-b--full-crud-generation) with `enabledEndpoints` |
| "dashboard", "summary", "report", "calculate", "process", "aggregate", no entity lifecycle | **Domain Action** → follow [Path A — Domain Action](#path-a--domain-action) |

---

## Shared Rules

These apply to **both paths**.

### HTTP Method + Response DTO

| Operation | Method | Response DTO |
|-----------|--------|--------------|
| CRUD endpoint (entity lifecycle) | `POST` — RPC convention | Base class DTOs (auto via `createApiController`) |
| Domain read (summary, report, fetch) | `GET` | `SingleResponseDto<T>` or `ListResponseDto<T>` |
| Domain mutation (calculate, process, send) | `POST` + `@HttpCode(HttpStatus.OK)` | `SingleResponseDto<T>` or `MessageResponseDto` |
| Domain update | `PUT` / `PATCH` | `SingleResponseDto<T>` |
| No data returned | Any | `MessageResponseDto` |
| Bulk insert/update | `POST` + `@HttpCode(HttpStatus.OK)` | `BulkResponseDto<T>` |
| Webhook receiver | `POST` | — (raw or void) |
| External integration | Match their API spec | — |

> `@HttpCode(HttpStatus.OK)` is required on all `@Post` domain actions — NestJS defaults POST to 201.

### Response DTO Shapes

| DTO | Shape | Use when |
|-----|-------|----------|
| `SingleResponseDto<T>` | `{ success, message, messageKey?, data: T }` | Single record |
| `ListResponseDto<T>` | `{ success, message, messageKey?, data: T[], meta: { total, page, pageSize, count, hasMore, totalPages } }` | Collection |
| `BulkResponseDto<T>` | `{ success, message, messageKey?, data: T[], meta: { count, total, failed } }` | Bulk insert/update |
| `MessageResponseDto` | `{ success, message, messageKey?, messageVariables? }` | No data payload |
| `ErrorResponseDto` | `{ success: false, message, code?, errors?: ValidationErrorDto[] }` | Exception responses |

**`messageKey` rule:** Include only when `nestjs-localization` is in the PRD/project config. When active it is required; when inactive omit entirely.

**`ListResponseDto` meta fields:**

| Field | Value |
|-------|-------|
| `total` | Total records matching the filter |
| `page` | `pagination.currentPage ?? 0` |
| `pageSize` | `pagination.pageSize ?? data.length` |
| `count` | `data.length` |
| `hasMore` | `page < totalPages - 1` |
| `totalPages` | `Math.ceil(total / pageSize)` |

**`BulkResponseDto` meta fields:**

| Field | Value |
|-------|-------|
| `count` | `data.length` (successfully processed) |
| `total` | Total submitted |
| `failed` | `total - count` |

### Guards & Decorators

All controller symbols come from `@flusys/nestjs-shared`. Import only what the controller actually uses.

**Always include** (every authenticated controller):

| Symbol | Role |
|--------|------|
| `JwtAuthGuard`, `PermissionGuard` | `@UseGuards` at class level |
| `CurrentUser`, `ILoggedUserInfo` | Extract authenticated user in every handler |
| `ApiResponseDto` | Swagger decorator on every data-returning endpoint |

**Include only when used:**

| Symbol | Include when |
|--------|-------------|
| `RequirePermission` | Single permission check (most common) |
| `RequireAnyPermission` | OR across multiple roles |
| `RequirePermissionLogic` | Compound AND/OR permission tree |
| `Public` | Endpoint skips JWT (health checks, public routes) — handler level |
| `LogAction` | Controller handler writes to audit log — **never on service methods** |
| `SingleResponseDto<T>` | Handler returns a single object |
| `ListResponseDto<T>` | Handler returns a collection |
| `BulkResponseDto<T>` | Handler performs bulk insert/update |

```typescript
// Import only what your controller actually uses
import {
  ApiResponseDto,
  JwtAuthGuard,
  PermissionGuard,
  CurrentUser,
  RequirePermission,
  RequireAnyPermission,
  RequirePermissionLogic,
  Public,
  LogAction,
  SingleResponseDto,
  ListResponseDto,
  BulkResponseDto,
  ILoggedUserInfo,
} from "@flusys/nestjs-shared";
```

#### Guard Placement

Apply `@UseGuards(JwtAuthGuard, PermissionGuard)` at the **controller class level**. Use `@Public()` on individual handlers to opt out.

```typescript
@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionGuard) // guards all handlers
export class DashboardController { ... }
```

#### Decorator Order on Every Handler

```typescript
@Get('route') | @Post('route') | @Put('route') | @Patch('route')
@HttpCode(HttpStatus.OK)          // POST domain actions only
@ApiResponseDto(Dto)              // every data-returning endpoint
@RequirePermission('x')           // or @RequireAnyPermission / @RequirePermissionLogic
@LogAction('action.name')         // sensitive mutations only
async methodName(...)
```

#### `@ApiResponseDto` Forms

| Form | Swagger renders | Return type |
|------|----------------|-------------|
| `@ApiResponseDto(Dto)` | `SingleResponseDto<Dto>` | `Promise<SingleResponseDto<Dto>>` |
| `@ApiResponseDto(Dto, true)` | `ListResponseDto<Dto>` + pagination meta | `Promise<ListResponseDto<Dto>>` |
| `@ApiResponseDto(Dto, true, 'bulk')` | `BulkResponseDto<Dto>` + bulk meta | `Promise<BulkResponseDto<Dto>>` |

- Place directly above the permission decorator, after `@HttpCode` if present
- Omit on `MessageResponseDto` endpoints
- CRUD controllers via `createApiController` include this automatically — Domain Action must add it manually

#### `@RequirePermissionLogic` Reference

**Single string:**
```typescript
@RequirePermissionLogic('users.read')
```

**Compound AND/OR tree:**
```typescript
// users.read AND (admin OR manager)
@RequirePermissionLogic({
  type: 'group',
  operator: 'AND',
  children: [
    { type: 'action', actionId: 'users.read' },
    {
      type: 'group',
      operator: 'OR',
      children: [
        { type: 'action', actionId: 'admin' },
        { type: 'action', actionId: 'manager' },
      ],
    },
  ],
})
```

| Situation | Use |
|-----------|-----|
| Single permission | `@RequirePermission('x')` — prefer |
| OR across flat list | `@RequireAnyPermission('x','y')` — prefer |
| Mixed AND + OR | `@RequirePermissionLogic({ type: 'group', ... })` — only when above can't express it |

### HTTP Status Codes

| Code | Use |
|------|-----|
| 200 | Read, update, delete, all domain action mutations |
| 201 | Insert / create (CRUD only — set automatically by NestJS) |
| 400 | Validation errors |
| 401 | Missing or invalid JWT |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate key) |

### DataSource Rules

`@InjectRepository` is **forbidden** in all feature services. FLUSYS entities are registered only inside their package's `DataSourceProvider` — NOT in a global TypeORM module.

| Use | When |
|-----|------|
| `dataSourceProvider.getRepository(Entity)` | Simple queries — find, save, count, query builder |
| `dataSourceProvider.getDataSource()` | Raw SQL, transactions, complex joins |

| Scenario | Scope | Pattern |
|----------|-------|---------|
| Service queries the DB | `Scope.REQUEST` | Inject `DataSourceProvider` |
| Pure logic, no DB | singleton | No DataSource needed |

Tenant context rules:
- `companyId` / `branchId` always come from `@CurrentUser()` in the controller — forwarded as method parameters to the service
- Pass them only when `enableCompanyFeature` / `enableBranchFeature` is active
- Never read tenant context from request body or params

---

## Path A — Domain Action

Use when there is **no entity lifecycle** — business actions only: summaries, calculations, reports, processing.

**Hard rules:**
- Controller does NOT extend any base class
- Declare ONLY the endpoints the PRD explicitly requires — no extras
- Service does NOT extend `ApiService`
- No `resolveEntity`, `getFilterQuery`, or any CRUD hook methods in the service
- `@LogAction` on controller handler only — never on service methods

### Controller

```typescript
@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // Read → GET + SingleResponseDto
  @Get("summary")
  @ApiResponseDto(DashboardSummaryResponseDto)
  @RequirePermission("dashboard:read")
  @LogAction("dashboard.view")
  async getSummary(
    @Query() dto: DashboardFilterDto,
    @CurrentUser() user: ILoggedUserInfo,
  ): Promise<SingleResponseDto<DashboardSummaryResponseDto>> {
    const data = await this.service.getSummary(dto, user);
    return {
      success: true,
      message: "Summary loaded",
      // messageKey: DASHBOARD_MESSAGES.SUMMARY_LOADED, — only if localization active
      data: plainToInstance(DashboardSummaryResponseDto, data),
    };
  }

  // Read → GET + ListResponseDto + OR permission
  @Get("orders")
  @ApiResponseDto(OrderResponseDto, true)
  @RequireAnyPermission("order:read", "admin:read")
  async getOrders(
    @Query() dto: OrderFilterDto,
    @CurrentUser() user: ILoggedUserInfo,
  ): Promise<ListResponseDto<OrderResponseDto>> {
    const result = await this.service.getOrders(dto, user);
    const page = dto.pagination?.currentPage ?? 0;
    const pageSize = dto.pagination?.pageSize ?? result.data.length;
    const totalPages = pageSize > 0 ? Math.ceil(result.total / pageSize) : 1;
    return {
      success: true,
      message: "Orders loaded",
      data: plainToInstance(OrderResponseDto, result.data),
      meta: { total: result.total, page, pageSize, count: result.data.length, hasMore: page < totalPages - 1, totalPages },
    };
  }

  // Public endpoint — opt out of class-level guard
  @Get("health")
  @Public()
  async health() {
    return { success: true, message: "OK" };
  }

  // Mutation → POST + HttpCode(200) + BulkResponseDto + compound permission
  @Post("bulk-import")
  @HttpCode(HttpStatus.OK)
  @ApiResponseDto(OrderResponseDto, true, "bulk")
  @RequirePermissionLogic({
    type: "group",
    operator: "AND",
    children: [
      { type: "action", actionId: "order:create" },
      {
        type: "group",
        operator: "OR",
        children: [
          { type: "action", actionId: "admin" },
          { type: "action", actionId: "manager" },
        ],
      },
    ],
  })
  async bulkImport(
    @Body() dto: BulkImportDto,
    @CurrentUser() user: ILoggedUserInfo,
  ): Promise<BulkResponseDto<OrderResponseDto>> {
    const result = await this.service.bulkImport(dto, user);
    const data = plainToInstance(OrderResponseDto, result.items);
    return {
      success: true,
      message: "Import complete",
      data,
      meta: { count: data.length, total: dto.items.length, failed: dto.items.length - data.length },
    };
  }
}
```

### Service

```typescript
@Injectable({ scope: Scope.REQUEST })
export class DashboardService {
  constructor(
    @Inject(PackageDataSourceProvider)
    private readonly dataSourceProvider: PackageDataSourceProvider,
  ) {}

  async getSummary(dto: DashboardFilterDto, user: ILoggedUserInfo) {
    // Option A — getRepository (preferred for simple queries)
    const repo = await this.dataSourceProvider.getRepository(Order);
    return repo.find({ where: { companyId: user.companyId } });

    // Option B — getDataSource for raw SQL or cross-entity transactions
    // const ds = await this.dataSourceProvider.getDataSource();
    // return ds.query(`SELECT ...`, [user.companyId]);
  }
}
```

### DTOs

**Request DTO** — plain class-validator class, no base class extension, no `companyId`/`branchId` (those come from JWT):
```typescript
export class DashboardFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}
```

**Response DTO** — plain class, `@Expose()` on every field, always used with `plainToInstance`:
```typescript
export class DashboardSummaryResponseDto {
  @ApiProperty() @Expose() total!: number;
  @ApiProperty() @Expose() active!: number;
}
```

---

## Path B — Full CRUD Generation

Generate complete backend + frontend CRUD for a new entity.

### Phase 0 — Auto-Detect Project Roots

**NEVER hardcode paths.** Run these globs first:

| What | Glob | Result |
|------|------|--------|
| Backend modules root | `**/src/modules/` | `{backend}/src/modules/` |
| Frontend pages root | `**/src/app/pages/` | `{frontend}/src/app/pages/` |
| Backend app module | `**/src/app.module.ts` | for registration |
| Frontend routes file | `**/src/app/app.routes.ts` | for registration |

**If existing modules are present** — read one folder under `{backend}/src/modules/` to extract:
- The `DataSourceProvider` class name used in that module
- The app-slug string passed to `super(...)`
- Base entity class is `Identity` from `@flusys/nestjs-shared`
- Import paths for guards, shared utilities, etc.

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

Read before generating:
```
.claude/skills/patterns/nestjs-patterns/SKILL.md
.claude/skills/patterns/angular-patterns/SKILL.md
.claude/skills/engineering/SKILL.md
```

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
import { DeleteDto, FilterAndPaginationDto, ILoggedUserInfo } from "@flusys/nestjs-shared";
import { ApiService, HybridCache } from "@flusys/nestjs-shared/classes";
import { UtilsService } from "@flusys/nestjs-shared/modules";
import { Inject, Injectable, Scope } from "@nestjs/common";
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

  protected override async getSelectQuery(
    query: SelectQueryBuilder<{Entity}>,
    _user: ILoggedUserInfo | null,
    _select?: string[],
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    query.addSelect(["{entity}.createdAt", "{entity}.updatedAt"]);
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

  // JOINs + tenant isolation — always scope to companyId + branchId from JWT
  protected override async getExtraManipulateQuery(
    query: SelectQueryBuilder<{Entity}>,
    _dto: FilterAndPaginationDto,
    user: ILoggedUserInfo | null,
  ): Promise<{ query: SelectQueryBuilder<{Entity}>; isRaw: boolean }> {
    query.leftJoinAndSelect("{entity}.category", "category");
    query.andWhere("{entity}.companyId = :companyId", { companyId: user?.companyId });
    query.andWhere("{entity}.branchId = :branchId", { branchId: user?.branchId });
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

**Lifecycle hooks** (override only what you need — every hook runs inside an open transaction):

```typescript
// After insert — side effects (linked records, events)
protected override async afterInsertOperation(
  entities: {Entity}[],
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
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> { }

// Before delete — dto.type: 'delete' | 'restore' | 'permanent'
protected override async beforeDeleteOperation(
  dto: DeleteDto,
  user: ILoggedUserInfo | null,
  queryRunner: QueryRunner,
): Promise<void> {
  if (dto.type !== "permanent") return;
  await queryRunner.manager.delete(LinkedEntity, { entityId: dto.id });
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
import { Create{Entity}Dto, Update{Entity}Dto, {Entity}ResponseDto } from "../dtos/{entity-kebab}.dto";
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
export class {Entity}Module {}
```

#### 3.7 Barrel Exports

Every subdirectory `index.ts` re-exports all named exports. Root `index.ts`:

```typescript
export * from "./entities";
export * from "./dtos";
export * from "./interfaces";
export * from "./services";
export * from "./controllers";
export * from "./{entity-kebab}.module";
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

override convertEntityListToResponseListDto(entities, isRaw) {
  return entities.map((e) => this.convertEntityToResponseDto(e, isRaw));
}

protected override async getExtraManipulateQuery(query, _dto, _user) {
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
// {frontend}/src/app/services/{module}/{entity-kebab}/{entity-kebab}.service.ts
import { Injectable } from "@angular/core";
import { ApiResourceService } from "@flusys/ng-shared";
import { I{Entity} } from "../../models";

@Injectable({ providedIn: "root" })
export class {Entity}Service extends ApiResourceService<I{Entity}, Partial<I{Entity}>> {
  constructor() {
    super("{api-path}"); // matches backend @Controller path exactly
  }
  // Add custom methods only when default 5 (getAll/getById/insert/update/delete) aren't enough
}
```

Rules:
- Extends `ApiResourceService<IModel, Partial<IModel>>` — no `HttpClient` injection
- All built-in methods return Promises — use `await`, never `.subscribe()`

#### Form Strategy — Decide Before Generating

| Condition | Strategy | Structure |
|-----------|----------|-----------|
| ≤ 5 fields, simple types | **Dialog form** | `components/{entity-kebab}/{entity-kebab}-form/` |
| > 5 fields, nested sections, file uploads, parent-child | **Separate page** | `pages/{entity-kebab}/{entity-kebab}-form/` |

> The **page component** owns data loading and delete. The **form component** owns field state, validation, and save.

#### List Component

```typescript
// {frontend}/src/app/pages/{entity-kebab}/{entity-kebab}-list.component.ts
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
  imports: [CommonModule, TableModule, ButtonModule, ToastModule, TooltipModule, ConfirmDialogModule, {Entity}FormDialogComponent],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">{EntityName}s</h1>
        <p-button label="Add {EntityName}" icon="pi pi-plus" (onClick)="openCreateDialog()" />
      </div>
      <p-table [value]="items()" [loading]="isLoading()" [paginator]="true" [rows]="10" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr>
            <th>Name</th>
            <th class="text-center">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td>{{ item.name }}</td>
            <td class="text-center">
              <div class="flex justify-center gap-1">
                <p-button icon="pi pi-pencil" [text]="true" severity="secondary" pTooltip="Edit" (onClick)="openEditDialog(item)" />
                <p-button icon="pi pi-trash" [text]="true" severity="danger" pTooltip="Delete" (onClick)="confirmDelete(item)" />
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

  ngOnInit(): void { this.loadData(); }

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

  openCreateDialog(): void { this.selectedItem.set(null); this.dialogVisible.set(true); }
  openEditDialog(item: Partial<I{Entity}>): void { this.selectedItem.set(item); this.dialogVisible.set(true); }

  onSaved(): void {
    this.messageService.add({
      severity: "success", summary: "Success",
      detail: this.selectedItem()?.id ? "{EntityName} updated." : "{EntityName} added.",
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

#### Form Dialog Component

```typescript
// {frontend}/src/app/pages/{entity-kebab}/{entity-kebab}-form-dialog.component.ts
import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject, input, output, signal, untracked } from "@angular/core";
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { I{Entity} } from "../../models";
import { {Entity}Service } from "../../services/{module}/{entity-kebab}/{entity-kebab}.service";

@Component({
  selector: "app-{entity-kebab}-form-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog
      [header]="isEditMode() ? 'Edit {EntityName}' : 'Add {EntityName}'"
      [(visible)]="dialogVisible"
      [modal]="true" [draggable]="false" [resizable]="false" [closable]="!isSaving()"
      styleClass="w-full sm:w-[600px]"
      (onHide)="onClose()"
    >
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
          <input pInputText formControlName="name" placeholder="Name" class="w-full" />
          @if (isFieldInvalid("name")) { <small class="text-red-500">Name is required.</small> }
        </div>
        <!-- add fields per entity -->
      </form>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Cancel" [text]="true" severity="secondary" (onClick)="onClose()" [disabled]="isSaving()" />
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

**Component rules:**
- All DI via `inject()` — no constructor parameter injection
- `computed()` for derived booleans like `isEditMode`
- `effect()` in constructor syncs inputs — use `untracked()` inside effect body
- `input()` / `output()` — never `@Input()` / `@Output()` decorators
- `@if / @for / @switch` in templates — never `*ngIf / *ngFor`

#### 4.1 Register Route

**Dialog form:**
```typescript
{
  path: "{entity-kebab}",
  loadComponent: () => import("./pages/{entity-kebab}/{entity-kebab}-list.component").then(m => m.{Entity}ListComponent),
  canActivate: [authGuard],
},
```

**Separate page form:**
```typescript
{
  path: "{entity-kebab}",
  canActivate: [authGuard],
  children: [
    { path: "", loadComponent: () => import("./pages/{entity-kebab}/{entity-kebab}-list.component").then(m => m.{Entity}ListComponent) },
    { path: ":id/edit", loadComponent: () => import("./pages/{entity-kebab}/{entity-kebab}-form.component").then(m => m.{Entity}FormComponent) },
  ],
},
```

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

### Backend  ({backend}/src/modules/{entity-kebab}/)
| File | Status |
|------|--------|
| entities/{entity-kebab}.entity.ts        | ✅ Created |
| dtos/{entity-kebab}.dto.ts               | ✅ Created |
| interfaces/i-{entity-kebab}.ts           | ✅ Created |
| services/{entity-kebab}.service.ts       | ✅ Created |
| controllers/{entity-kebab}.controller.ts | ✅ Created |
| {entity-kebab}.module.ts                 | ✅ Created |
| src/app.module.ts                        | ✅ Updated |

### Frontend  ({frontend}/src/app/)
| File | Status |
|------|--------|
| services/{module}/{entity-kebab}/{entity-kebab}.service.ts   | ✅ Created |
| pages/{entity-kebab}/{entity-kebab}-list.component.ts        | ✅ Created |
| pages/{entity-kebab}/{entity-kebab}-form-dialog.component.ts | ✅ Created |
| app.routes.ts                                                 | ✅ Updated |

### Pending (manual steps)
| Task | Status |
|------|--------|
| Migration generated & reviewed           | ⬜ Pending |
| Migration run (`npm run migration:run`)   | ⬜ Pending |
| Backend build (`npm run build`)          | ⬜ Pending |
```

---

## Anti-Patterns

```typescript
// WRONG: raw entity returned — always map through a response DTO + plainToInstance
return await this.repo.findOne({ where: { id } });

// WRONG: missing messageKey when localization is active
return { success: true, message: 'Done' };

// WRONG: GET/PUT/DELETE on CRUD entity endpoints — always POST (RPC convention)
@Get('products')

// WRONG: @InjectRepository in any feature service
constructor(@InjectRepository(Product) private repo: Repository<Product>) {}
// → use DataSourceProvider

// WRONG: @LogAction on a service method — no HTTP request context
@LogAction("calculation.triggered")
async trigger(dto, user) { ... }
// → belongs on the controller handler

// WRONG: @UseGuards per-method when all handlers need auth
@Get("a") @UseGuards(JwtAuthGuard, PermissionGuard) async a() {}
// → apply once at class level; use @Public() to opt specific handlers out

// WRONG: createApiController inline on extends clause
export class ProductController extends createApiController(...) {}
// → const BaseController = createApiController(...); then class extends BaseController
```

---

## Quality Gates

### Code Quality (all files)

- [ ] Every method/function has explicit return type
- [ ] No `any` — use specific types, generics, or `unknown`
- [ ] `??` not `||` for nullable defaults
- [ ] All exceptions: `{ message, messageKey }` — never plain string throws
- [ ] Angular: `#private = signal()` with `readonly public = this.#private.asReadonly()`
- [ ] Angular: `computed()` for all derived state — no imperative `set()` of derived values
- [ ] Angular: `takeUntilDestroyed(this.#destroyRef)` on every subscription
- [ ] Import order: Node → Third-party → `@flusys/*` → Relative

### Domain Action Checklist

- [ ] Controller does NOT extend any base class
- [ ] Only endpoints required by PRD are declared
- [ ] `@UseGuards(JwtAuthGuard, PermissionGuard)` at class level
- [ ] Correct HTTP method per operation (`@Get` reads / `@Post` mutations / `@Put`/`@Patch` updates)
- [ ] `@HttpCode(HttpStatus.OK)` on every `@Post` domain action
- [ ] Decorator order: route → `@HttpCode` → `@ApiResponseDto` → permission → `@LogAction`
- [ ] `@ApiResponseDto` applied — form matches return type (single / list / bulk)
- [ ] Response mapped through standard DTO + `plainToInstance`
- [ ] `messageKey` included only if localization active
- [ ] `@LogAction` on controller handler only — never on service methods
- [ ] Service uses `Scope.REQUEST` + `DataSourceProvider` (if DB needed)

### CRUD Checklist

**Backend:**
- [ ] Entity extends `Identity`, `@Index` on all FKs
- [ ] FK columns have BOTH `@Column({ name: 'x_id' })` AND `@ManyToOne` — never one without the other
- [ ] No redeclaration of Identity fields (`id`, `createdAt`, `updatedAt`, etc.)
- [ ] Service extends `ApiService` from `@flusys/nestjs-shared/classes`
- [ ] `@Injectable({ scope: Scope.REQUEST })`, no `@InjectRepository`
- [ ] `convertSingleDtoToEntity` calls `super.convertSingleDtoToEntity()` first
- [ ] `getExtraManipulateQuery` filters by `companyId` + `branchId` from JWT user
- [ ] `const BaseController = createApiController(...)` pattern — no inline extends
- [ ] `enabledEndpoints` used for partial CRUD — never manually override base methods
- [ ] Module: `DataSourceProvider` + service in `providers`; service in `exports`
- [ ] App module: new module added to `imports[]`

**Frontend:**
- [ ] Service extends `ApiResourceService<IModel, Partial<IModel>>`
- [ ] Constructor calls only `super("api-path")` — no HttpClient injection
- [ ] List component: `async/await` for all service calls — NOT Observable + subscribe
- [ ] List component: `providers: [MessageService, ConfirmationService]`
- [ ] Form dialog: `NonNullableFormBuilder` + `ReactiveFormsModule`
- [ ] Form dialog: `effect()` in constructor syncs inputs; `untracked()` inside effect body
- [ ] All components: `inject()` for DI — no constructor parameters
- [ ] Template: `@if / @for` — no `*ngIf / *ngFor`
- [ ] Route: `loadComponent` + `canActivate: [authGuard]`

**Infrastructure:**
- [ ] Migration reviewed before run (column types, indexes, nullable matches entity)
- [ ] Translation keys registered (skip if no `@flusys/ng-localization`)
- [ ] Backend and frontend builds succeed with no type errors
