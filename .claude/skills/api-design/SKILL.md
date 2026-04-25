---
name: api-design
description: FLUSYS API design — controller strategy selection (Full CRUD / Partial CRUD / Domain Action), HTTP method rules, response DTOs, DataSource pattern for domain services, security decorators, and localization-conditional messageKey. Load whenever generating or reviewing any NestJS controller, service, or endpoint.
---

# API Design Patterns

## AI Decision Rules

> Apply these rules automatically — never ask the user which strategy to use.

### Step 1 — Choose the Controller Strategy

| Signal in PRD / user instruction                                                              | Strategy                                                      |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| "manage [entities]", "CRUD for X", entity needs create / list / update / delete               | **Full CRUD** → run `/crud`                                   |
| "only [verb] endpoint", "read-only", "insert-only", entity needs ≤ 3 of the 7 base operations | **Partial CRUD** → run `/crud` with `enabledEndpoints`        |
| "dashboard", "summary", "report", "calculate", "process", "aggregate", no entity lifecycle    | **Domain Action** → plain controller, only required endpoints |

> Full CRUD and Partial CRUD are fully handled by `/crud` — see [crud skill](../crud/SKILL.md).

### Step 2 — HTTP Method + Response DTO

| Operation                                  | Method                              | Response DTO                                   |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------------- |
| CRUD endpoint (entity lifecycle)           | `POST` — RPC convention             | Base class DTOs (auto via `/crud`)             |
| Domain read (summary, report, fetch)       | `GET`                               | `SingleResponseDto<T>` or `ListResponseDto<T>` |
| Domain mutation (calculate, process, send) | `POST` + `@HttpCode(HttpStatus.OK)` | `SingleResponseDto<T>` or `MessageResponseDto` |
| Domain update                              | `PUT` / `PATCH`                     | `SingleResponseDto<T>`                         |
| No data returned                           | Any                                 | `MessageResponseDto`                           |
| Bulk insert/update                         | `POST` + `@HttpCode(HttpStatus.OK)` | `BulkResponseDto<T>`                           |
| Webhook receiver                           | `POST`                              | — (raw or void)                                |
| External integration                       | Match their API spec                | —                                              |

> `@HttpCode(HttpStatus.OK)` is required on all `@Post` domain actions — NestJS defaults POST to 201, but domain mutations must return 200.

---

## Domain Action — Controller, Service, DTOs

Use when there is **no entity lifecycle** — only business actions: summaries, calculations, reports, processing.

**Hard rules for Domain Action:**

- Do NOT extend any base class
- Declare ONLY the endpoints the PRD explicitly requires — no extras
- `messageKey` on responses — only if localization (`nestjs-localization`) is listed in the PRD/project config

---

### Controller

#### Imports

All controller symbols come from `@flusys/nestjs-shared`. Import only what the controller actually uses — never include unused symbols.

**Always include** (every authenticated Domain Action controller):

| Symbol                            | Role                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `JwtAuthGuard`, `PermissionGuard` | Applied via `@UseGuards` at the controller class level        |
| `CurrentUser`, `ILoggedUserInfo`  | Extract authenticated user in every handler                   |
| `ApiResponseDto`                  | Swagger decorator — required on every data-returning endpoint |

**Include only when used:**

| Symbol                   | Include when                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RequirePermission`      | Endpoint has a single permission check (most common)                                                                                                              |
| `RequireAnyPermission`   | Endpoint is accessible by any one of multiple roles (OR logic)                                                                                                    |
| `RequirePermissionLogic` | Endpoint needs a compound AND/OR permission tree                                                                                                                  |
| `Public`                 | An endpoint skips JWT entirely (health checks, public routes)                                                                                                     |
| `LogAction`              | A controller handler must write to the audit log — **controller handler only, never on service methods** (requires HTTP request context to write the audit entry) |
| `SingleResponseDto<T>`   | Any handler returns a single object                                                                                                                               |
| `ListResponseDto<T>`     | Any handler returns a collection                                                                                                                                  |
| `BulkResponseDto<T>`     | Any handler performs a bulk insert/update                                                                                                                         |

```typescript
// Import only what your controller actually uses.
// This block shows all available symbols for reference.
import {
  ApiResponseDto,
  JwtAuthGuard,
  PermissionGuard,
  CurrentUser,
  RequirePermission, // single permission check
  RequireAnyPermission, // OR across multiple roles
  RequirePermissionLogic, // AND/OR permission tree
  Public, // skips JWT entirely
  LogAction, // audit log — controller handler only
  SingleResponseDto,
  ListResponseDto,
  BulkResponseDto,
  ILoggedUserInfo,
} from "@flusys/nestjs-shared";
```

---

#### Decorator Order on Every Handler

Always apply decorators in this order — order matters for NestJS interceptor/guard resolution:

```typescript
@Get('route') | @Post('route') | @Put('route') | @Patch('route')
@HttpCode(HttpStatus.OK)           // POST domain actions only
@ApiResponseDto(Dto)               // every data-returning endpoint
@RequirePermission('x')            // or @RequireAnyPermission / @RequirePermissionLogic if prd mention
@LogAction('action.name')          // sensitive mutations only
async methodName(...)
```

---

#### Guard Placement

Apply `@UseGuards(JwtAuthGuard, PermissionGuard)` at the **controller class level** — this guards all methods by default. Use `@Public()` on individual handlers to opt out of JWT for specific routes.

```typescript
@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionGuard) // ← class level: guards all handlers
export class DashboardController { ... }
```

If all endpoints are public, omit `@UseGuards` from the class and use `@Public()` or no guard at all.

---

#### Guards & Decorators Reference

| Decorator / Guard                           | Purpose                                   | Rule                                                                                             |
| ------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@UseGuards(JwtAuthGuard, PermissionGuard)` | Validates JWT + enforces permissions      | Apply at controller **class level** — covers all handlers                                        |
| `@CurrentUser()`                            | Extracts `ILoggedUserInfo` from JWT token | Every handler that needs user context — never read user from body or params                      |
| `@RequirePermission('x')`                   | ALL listed permissions must pass (AND)    | Single permission check — most common case                                                       |
| `@RequireAnyPermission('x','y')`            | ANY one permission passes (OR)            | Endpoint accessible by multiple roles                                                            |
| `@RequirePermissionLogic(...)`              | Compound AND/OR permission tree           | Complex multi-role conditions only — accepts a single string OR an `ILogicNode` tree (see below) |
| `@Public()`                                 | Skips JWT and permission checks entirely  | Health checks, public-facing endpoints — handler level                                           |
| `@LogAction('x')`                           | Writes to audit log                       | Sensitive mutations needing audit trail — **controller handler only, not service**               |

#### `@RequirePermissionLogic` — Permission Logic Reference

Accepts either a **single string** (shorthand) or an **`ILogicNode` tree** (AND/OR groups).

**Form 1 — single permission string (shorthand):**

```typescript
@RequirePermissionLogic('users.read')
```

**Form 2 — compound AND/OR tree (`ILogicNode`):**

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

**`ILogicNode` shape:**

| Field  | Type       | Value                                                                                           |
| ------ | ---------- | ----------------------------------------------------------------------------------------------- |
| `type` | `'action'` | Leaf node — a single permission check. Requires `actionId: string`                              |
| `type` | `'group'`  | Group node — combines children. Requires `operator: 'AND' \| 'OR'` and `children: ILogicNode[]` |

**When to use each form:**

| Situation                    | Use                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Single permission            | `@RequirePermission('x')` — simpler, prefer this                                         |
| OR across flat list of roles | `@RequireAnyPermission('x', 'y')` — simpler, prefer this                                 |
| Mixed AND + OR conditions    | `@RequirePermissionLogic({ type: 'group', ... })` — only when the above can't express it |

---

#### `@ApiResponseDto` — Swagger Decorator

Makes Swagger render the full nested response shape instead of `{}`. Required on every data-returning endpoint.

| Form                                    | Swagger renders                              | Return type                       |
| --------------------------------------- | -------------------------------------------- | --------------------------------- |
| `@ApiResponseDto(Dto)`                  | `SingleResponseDto<Dto>`                     | `Promise<SingleResponseDto<Dto>>` |
| `@ApiResponseDto(Dto, true)`            | `ListResponseDto<Dto>` + `PaginationMetaDto` | `Promise<ListResponseDto<Dto>>`   |
| `@ApiResponseDto(Dto, true, 'bulk')`    | `BulkResponseDto<Dto>` + `BulkMetaDto`       | `Promise<BulkResponseDto<Dto>>`   |
| `@ApiResponseDto(Dto, false, 'single')` | same as first form (explicit)                | `Promise<SingleResponseDto<Dto>>` |

**Rules:**

- Place directly above the permission decorator (`@RequirePermission` etc.), after `@HttpCode` if present
- Match the form to the actual return type — single / list / bulk must align
- Omit on `MessageResponseDto` endpoints — no nested data DTO to document
- CRUD controllers from `/crud` include this automatically — Domain Actions must add it manually

---

#### Controller Examples

```typescript
// dashboard.controller.ts
@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionGuard) // guards all handlers by default
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // Read action → GET + SingleResponseDto
  @Get("summary")
  @ApiResponseDto(DashboardSummaryResponseDto)
  @RequirePermission("dashboard:read")
  @LogAction("dashboard.view") // audit — sensitive read
  async getSummary(
    @Query() dto: DashboardFilterDto,
    @CurrentUser() user: ILoggedUserInfo,
  ): Promise<SingleResponseDto<DashboardSummaryResponseDto>> {
    const data = await this.service.getSummary(dto, user);
    return {
      success: true,
      message: "Summary loaded",
      // messageKey: DASHBOARD_MESSAGES.SUMMARY_LOADED, — add only if localization active
      data: plainToInstance(DashboardSummaryResponseDto, data),
    };
  }

  // Read action → GET + ListResponseDto (OR permission)
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
      // messageKey: ORDER_MESSAGES.LIST_LOADED, — add only if localization active
      data: plainToInstance(OrderResponseDto, result.data),
      meta: {
        total: result.total,
        page,
        pageSize,
        count: result.data.length,
        hasMore: page < totalPages - 1,
        totalPages,
      },
    };
  }

  // Public endpoint — opt out of class-level JWT guard
  @Get("health")
  @Public()
  async health() {
    return { success: true, message: "OK" };
  }
}

// calculation.controller.ts
@Controller("calculation")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CalculationController {
  constructor(private readonly service: CalculationService) {}

  // Mutation → POST + HttpCode(200) + SingleResponseDto
  @Post("trigger")
  @HttpCode(HttpStatus.OK)
  @ApiResponseDto(CalculationResponseDto)
  @RequirePermission("calculation:run")
  @LogAction("calculation.triggered")
  async trigger(
    @Body() dto: TriggerCalculationDto,
    @CurrentUser() user: ILoggedUserInfo,
  ): Promise<SingleResponseDto<CalculationResponseDto>> {
    const result = await this.service.trigger(dto, user);
    return {
      success: true,
      message: "Calculation complete",
      // messageKey: CALCULATION_MESSAGES.TRIGGERED, — add only if localization active
      data: plainToInstance(CalculationResponseDto, result),
    };
  }

  // Bulk mutation → POST + HttpCode(200) + BulkResponseDto + compound permission
  @Post("bulk-import")
  @HttpCode(HttpStatus.OK)
  @ApiResponseDto(OrderResponseDto, true, "bulk")
  @RequirePermissionLogic({
    // order:create AND (admin OR manager)
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
      // messageKey: ORDER_MESSAGES.BULK_IMPORTED, — add only if localization active
      data,
      meta: {
        count: data.length,
        total: dto.items.length,
        failed: dto.items.length - data.length,
      },
    };
  }
}
```

---

### Service

Do **not** extend `RequestScopedApiService` — that is CRUD-only.

**`@InjectRepository` is forbidden in all feature services (CRUD and Domain Action).**
FLUSYS package entities are registered only inside their package's `DataSourceProvider` — NOT in a global TypeORM module. Using `@InjectRepository` fails at runtime because TypeORM has no global knowledge of those entities. Always use `DataSourceProvider`.

**Service scope decision:**

| Scenario               | Scope                     | Pattern                                                                                 |
| ---------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| Service queries the DB | `Scope.REQUEST`           | Inject `PackageDataSourceProvider` — resolves the tenant-correct DataSource per request |
| Pure logic, no DB      | singleton `@Injectable()` | No DataSource needed                                                                    |

**DataSource method choice:**

| Use                                        | When                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| `dataSourceProvider.getRepository(Entity)` | Simple queries — find, save, count, TypeORM query builder     |
| `dataSourceProvider.getDataSource()`       | Raw SQL, transactions, complex joins across multiple entities |

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
    const orders = await repo.find({ where: { companyId: user.companyId } });

    // Option B — getDataSource for raw SQL or cross-entity transactions
    const dataSource = await this.dataSourceProvider.getDataSource();
    const rows = await dataSource.query(`SELECT ...`, [user.companyId]);
  }
}
```

**Tenant context rules:**

- `companyId` / `branchId` come from `@CurrentUser()` in the controller — forwarded as method parameters to the service
- Pass them only when `enableCompanyFeature` / `enableBranchFeature` is active in the project config
- No auto-injection of tenant context in Domain Action services — it is always explicit

**What Domain Action services must NOT have:**

- `resolveEntity`, `getFilterQuery`, or any CRUD hook methods — those belong to `RequestScopedApiService` only
- `@LogAction` on service methods — audit logging belongs on the controller handler

---

### DTOs

**Request DTO:**

- Plain class-validator class — do NOT extend any CRUD DTO
- Declare only the fields the endpoint actually needs
- Never include `companyId` / `branchId` — those come from the JWT via `@CurrentUser()`

**Response DTO:**

- Plain class — do NOT extend any CRUD DTO
- Annotate fields with `@Expose()` — always used with `plainToInstance(ResponseDto, data)`
- No `[key: string]: unknown` index signature unless the shape is genuinely dynamic

---

## Response DTO Reference

| DTO                    | Shape                                                                                                       | Use when                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `SingleResponseDto<T>` | `{ success, message, messageKey?, data: T }`                                                                | Single record or object returned                  |
| `ListResponseDto<T>`   | `{ success, message, messageKey?, data: T[], meta: { total, page, pageSize, count, hasMore, totalPages } }` | Paginated or full collection returned             |
| `BulkResponseDto<T>`   | `{ success, message, messageKey?, data: T[], meta: { count, total, failed } }`                              | Bulk insert or update result                      |
| `MessageResponseDto`   | `{ success, message, messageKey?, messageVariables? }`                                                      | Action with no data payload                       |
| `ErrorResponseDto`     | `{ success: false, message, code?, errors?: ValidationErrorDto[] }`                                         | Exception responses (thrown by exception helpers) |

**Meta field reference:**

`ListResponseDto` meta:

| Field        | Type      | Value                                                 |
| ------------ | --------- | ----------------------------------------------------- |
| `total`      | `number`  | Total records matching the filter (for pagination UI) |
| `page`       | `number`  | Current page index (`pagination.currentPage ?? 0`)    |
| `pageSize`   | `number`  | Page size (`pagination.pageSize ?? data.length`)      |
| `count`      | `number`  | Records returned in this response (`data.length`)     |
| `hasMore`    | `boolean` | `page < totalPages - 1`                               |
| `totalPages` | `number`  | `Math.ceil(total / pageSize)`                         |

`BulkResponseDto` meta:

| Field    | Type     | Value                                          |
| -------- | -------- | ---------------------------------------------- |
| `count`  | `number` | Successfully processed records (`data.length`) |
| `total`  | `number` | Total records submitted in the request         |
| `failed` | `number` | `total - count`                                |

**`messageKey` rule:** Include only when `nestjs-localization` is listed in the PRD or project config. When active, it is **required** — omitting it is a bug. When inactive, omit it entirely.

---

## HTTP Status Codes

| Code | Use                                                                            |
| ---- | ------------------------------------------------------------------------------ |
| 200  | Read, update, delete, all Domain Action mutations (`@HttpCode(HttpStatus.OK)`) |
| 201  | Insert / create (CRUD only — set automatically by NestJS)                      |
| 400  | Validation errors                                                              |
| 401  | Missing or invalid JWT                                                         |
| 403  | Insufficient permissions                                                       |
| 404  | Resource not found                                                             |
| 409  | Conflict (duplicate key)                                                       |

---

## Anti-Patterns

```typescript
// WRONG: returning a raw entity — always map through a response DTO
return await this.repo.findOne({ where: { id } });

// WRONG: missing messageKey when localization is active
return { success: true, message: 'Done' };

// WRONG: GET/PUT/DELETE on a CRUD entity endpoint — CRUD always uses POST (RPC convention)
@Get('products') // ← use POST('/get-all') via base class instead

// WRONG: constructing a file URL manually
return { url: `https://bucket.s3.amazonaws.com/${file.key}` };
// → always call FileUrlService

// WRONG: @InjectRepository in any feature service (CRUD or domain)
constructor(@InjectRepository(Product) private repo: Repository<Product>) {}
// → use DataSourceProvider — entities are not globally registered

// WRONG: @LogAction on a service method — it has no HTTP request context
@LogAction("calculation.triggered")
async trigger(dto, user) { ... } // ← belongs on the controller handler

// WRONG: @UseGuards per-method when all handlers need auth
@Get("a") @UseGuards(JwtAuthGuard, PermissionGuard) async a() {}
@Get("b") @UseGuards(JwtAuthGuard, PermissionGuard) async b() {}
// → apply once at class level, use @Public() to opt specific handlers out
```

---

## Generation Checklist

**Full CRUD or Partial CRUD** → run `/crud` — see [crud skill](../crud/SKILL.md) for the full checklist.

**Domain Action:**

- [ ] Controller does NOT extend any base class
- [ ] Only endpoints required by the PRD are declared — no extras
- [ ] `@UseGuards(JwtAuthGuard, PermissionGuard)` applied at controller **class level**
- [ ] Correct HTTP method per operation (`@Get` reads / `@Post` mutations / `@Put`/`@Patch` updates)
- [ ] `@HttpCode(HttpStatus.OK)` on every `@Post` domain action
- [ ] Decorator order: route → `@HttpCode` → `@ApiResponseDto` → permission → `@LogAction` → handler
- [ ] `@ApiResponseDto` applied — form matches return type (single / list / bulk)
- [ ] Response mapped through standard DTO + `plainToInstance`
- [ ] `messageKey` included only if localization is active in project config
- [ ] `@LogAction` on controller handler only — never on service methods
- [ ] Service uses `Scope.REQUEST` + `DataSourceProvider` (if DB access needed)
- [ ] `companyId` / `branchId` forwarded from `@CurrentUser()` — only if company/branch feature active

**Always:**

- [ ] `@CurrentUser()` used to extract user — never from request body or params
- [ ] No raw entity returned — always map through a response DTO + `plainToInstance`
- [ ] `@InjectRepository` not used anywhere — always `DataSourceProvider`
- [ ] Exceptions use `nestjs-shared` exception helpers with `messageKey` (if localization active)

---

## Related Skills

| Skill                                                      | What it covers                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [crud](../crud/SKILL.md)                                   | Full + Partial CRUD generation — entity, service, controller, DTOs, Angular pages          |
| [nestjs-shared](../../nest/nestjs-shared/SKILL.md)         | `RequestScopedApiService`, `createApiController`, `IDataSourceProvider`, all response DTOs |
| [nestjs-iam](../../nest/nestjs-iam/SKILL.md)               | `@RequirePermission`, `PermissionGuard`, RBAC modes                                        |
| [nestjs-auth](../../nest/nestjs-auth/SKILL.md)             | `@CurrentUser()`, `ILoggedUserInfo`, JWT guards                                            |
| [nestjs-patterns](../../patterns/nestjs-patterns/SKILL.md) | Exception handling, messageKey constants, DTO validation                                   |
| [database-design](../database-design/SKILL.md)             | Entity base class, migrations, soft delete, N+1 prevention                                 |
