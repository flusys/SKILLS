---
name: api-design
description: FLUSYS API design and full-stack generation — strategy selection (Domain Action / Full CRUD / Partial CRUD), HTTP rules, guards, response DTOs, and complete backend + frontend generation with quality gates. Load for any NestJS controller, service, endpoint, or CRUD feature.
---

# FLUSYS API Design & Generation

## Folder Structure

Every generated file — Domain Action or CRUD — lands in a **domain module**, never a per-entity
one. Read [references/project-structure.md](references/project-structure.md) before creating any
new `modules/` or `app/modules/` folder; it defines the backend and frontend layout and the rule
for adding an entity to an existing domain vs opening a new one.

Choosing an Angular component or making a Tailwind styling decision? Load the `ui-design` skill —
it has the full `@flusys/ng-ui` component catalog, design tokens, and Tailwind v4 conventions.

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

There is **no `ErrorResponseDto`** — never declare one as a return type. Errors are raised as
exceptions and serialised by `GlobalExceptionFilter`. Throw one of the typed exceptions from
`@flusys/nestjs-shared`: `ValidationException`, `NotFoundException`, `ConflictException`,
`ForbiddenException`, `UnauthorizedException`, `InsufficientPermissionsException`,
`InternalServerException`, `ServiceUnavailableException`. All extend `BaseAppException`, which
carries `messageKey`, optional `messageVariables`, `errors`, and `metadata`.

`IdentityResponseDto` is available as a base for response DTOs — it already exposes `id`,
`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`, and `deletedById`, so a
response DTO that extends it should not redeclare them.

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

### Integration Adapters

Cross-package side effects — call from an `afterInsertOperation`/`afterUpdateOperation` hook or
from a Domain Action service. Every token lives on `@flusys/nestjs-shared`; always inject with
`@Optional()` so the service still works when the corresponding package is not selected.

**`@Optional()` must always be paired with an explicit `@Inject(Token)` — never rely on
`@Optional()` alone with a bare TypeScript type, even for a same-project cross-module class (not
just these token-based adapters).** The same best-effort shape shows up whenever one feature
module wants to call another feature module's service without a hard dependency — e.g. a
`PaymentService` that best-effort posts into an `AccountingService` if that module happens to be
selected. `@Optional() private readonly accountingService: AccountingService | null` (no
`@Inject()`) silently resolves to `null` at runtime with **zero errors or logs anywhere**, even
when the providing module correctly exports and the consuming module correctly imports it — the
only symptom is the expected side effect quietly never happening. Always write it as
`@Optional() @Inject(AccountingService) private readonly accountingService: AccountingService |
null`.

This list is not exhaustive by construction — grep
`node_modules/@flusys/nestjs-shared/interfaces` for `*_ADAPTER` before assuming a cross-package
capability needs custom code. Three are confirmed as of this writing:

**`NOTIFICATION_ADAPTER`** — provided by `nestjs-notification`:

```typescript
import { NOTIFICATION_ADAPTER, INotificationAdapter } from '@flusys/nestjs-shared';

constructor(
  @Optional() @Inject(NOTIFICATION_ADAPTER)
  private readonly notif: INotificationAdapter | null,
) {}

await this.notif?.send({
  userId: entity.assignedUserId,
  title: 'New order assigned',
  message: `Order #${entity.code} assigned to you`, // optional
  data: { orderId: entity.id },                     // optional
  companyId: entity.companyId,                      // optional, company-scoped delivery
});

await this.notif?.sendToMany({ userIds: [...], title: 'Stock alert' });
await this.notif?.broadcastToCompany?.(entity.companyId, 'Stockout alert'); // optional method
```

**`EVENT_MANAGER_ADAPTER`** — provided by `nestjs-event-manager`:

```typescript
import { EVENT_MANAGER_ADAPTER, IEventManagerAdapter } from '@flusys/nestjs-shared';
import { ParticipantStatus, RecurrenceType } from '@flusys/nestjs-event-manager';

constructor(
  @Optional() @Inject(EVENT_MANAGER_ADAPTER)
  private readonly events: IEventManagerAdapter | null,
) {}

const event = await this.events?.createEvent({
  title: 'Sprint Planning',
  eventDate: '2025-06-01', // 'YYYY-MM-DD'
  startTime: '10:00',      // 'HH:mm'
  endTime: '11:00',
  participantIds: dto.attendeeIds, // optional
  organizerId: user.id,            // optional
  companyId: user.companyId,       // optional
});

await this.events?.updateParticipantStatus(participantId, ParticipantStatus.ACCEPTED);
```

**`PERMISSION_SYNC_ADAPTER`** — flows the opposite direction from the two above: the *app*
implements it and `nestjs-iam`/`nestjs-auth` call it, so IAM state stays in sync when company/branch
access changes. Only needed if the app has its own permission-cache or revocation logic to keep
consistent; skip it otherwise.

```typescript
import { PERMISSION_SYNC_ADAPTER, IPermissionSyncAdapter } from '@flusys/nestjs-shared/interfaces';

// Registered in the Options surface — getAuthModuleOptions()'s `providers` array
// (config/modules.config.ts), not injected into a feature service.
export const permissionSyncProvider: Provider = {
  provide: PERMISSION_SYNC_ADAPTER,
  useFactory: (permissionService: PermissionService): IPermissionSyncAdapter => ({
    onCompanyDeleted: (companyId) => permissionService.revokeCompanyPermissions(companyId),
    onBranchDeleted: (branchId, companyId) =>
      permissionService.revokeBranchPermissions(branchId, companyId),
    onUserCompanyAccessRevoked: (userId, companyId) =>
      permissionService.revokeUserCompanyAccess(userId, companyId),
    onUserBranchAccessRevoked: (userId, branchId, companyId) =>
      permissionService.revokeUserBranchAccess(userId, branchId, companyId),
  }),
  inject: [PermissionService],
};
```

### API Documentation

Every module gets its own Swagger page via `setupSwaggerDocs` — full option reference (tag/path/
schema/query-param/example exclusions, multi-tenant global headers) in
[references/swagger.md](references/swagger.md).

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

  // A `@Query()` DTO field of any non-string type needs an explicit `@Transform` before its
  // class-validator decorator — the template's global `ValidationPipe` sets
  // `transformOptions: { enableImplicitConversion: false }`, so query params (always strings on
  // the wire) are never auto-coerced. A plain `@IsInt() page?: number` or
  // `@IsBoolean() active?: boolean` rejects every real request with that param set.
  //   @Transform(({ value }) => (value === undefined ? value : Number(value)))
  //   @IsOptional() @IsInt() page?: number;
  //   @Transform(({ value }) => value === 'true')
  //   @IsOptional() @IsBoolean() active?: boolean;

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

**Adding a field to an already-shipped domain action's return shape later is a two-file change,
not one.** Adding a field to the service method's return type/interface is not enough on its own —
the matching response DTO class above must also declare that field with `@Expose()`, or
`plainToInstance` silently strips it on the way out. Neither `tsc --noEmit` nor `ng build` catches
the mismatch, because nothing type-checks a response DTO's field list against the interface it's
meant to mirror — the frontend just renders `undefined` where the new field should be. Whenever a
field is added to a domain action's return interface after the fact, grep for its response DTO
class and add the field there too in the same change.

### Composable Domain Actions

Only reach for this when Path A's flat controller/service stops fitting — the action is really an
**ordered sequence of independent business-rule steps** (e.g. a pricing/calculation engine that
applies base price, promotions, tax, rounding, and commission in turn). Do not use it for a
Domain Action with one or two straightforward branches; that's still plain Path A.

```typescript
export interface StepRuntime {
  user: ILoggedUserInfo;
  manager: EntityManager; // caller's transaction, so side-effecting steps share one commit
}

export interface PipelineStep<TContext> {
  name: string;
  priority: number; // lower runs first
  execute(context: TContext, runtime: StepRuntime): void | Promise<void>;
}
```

Build the pipeline as a **fixed, explicit list in the service constructor** — inject each step
class by name and sort once — not a dynamic multi-provider registry. NestJS request-scoped
providers (required here since steps typically depend on other request-scoped owning services)
have no generic "collect every provider matching a token" mechanism; only singleton-scoped
`APP_*` tokens get that treatment. Adding a step later is a pure addition to the constructor list,
never a reorder of what already exists:

```typescript
@Injectable({ scope: Scope.REQUEST })
export class OrderCalculationEngine {
  private readonly steps: PipelineStep<OrderContext>[];

  constructor(basePrice: BasePriceStep, promotion: PromotionStep, tax: TaxStep, rounding: RoundingStep) {
    this.steps = [basePrice, promotion, tax, rounding].sort((a, b) => a.priority - b.priority);
  }

  async run(context: OrderContext, runtime: StepRuntime): Promise<OrderContext> {
    for (const step of this.steps) await step.execute(context, runtime);
    return context;
  }
}
```

If a step genuinely needs to be optional/pluggable per company rather than fixed at compile time,
that's a different, open-ended shape (a singleton-scoped custom-plugin registry) — don't force the
fixed-list pattern above onto it.

---
## Path B — Full CRUD Generation

Generating a full or partial CRUD entity is a long, mechanical procedure. It lives in a
separate file so this skill stays cheap to load for design questions.

**Read [references/crud-generation.md](references/crud-generation.md) now** if the strategy is
Full CRUD or Partial CRUD. It covers, in order:

| Phase | Contents |
| ----- | -------- |
| 0 | Auto-detect project roots — never hardcode `backend/` or `dashboard/` |
| 1 | Gather requirements — field types, naming conventions |
| 2 | Code-quality rules for every generated file |
| 3 | Backend — enum, interface, entity, DTOs, service, controller, module |
| 3b | Parent-child CRUD pattern |
| 4 | Frontend — model, messages, service, list page, form page, routes, menu |
| 5 | Migration |
| 6 | Translation key registration |
| 7 | Completion report |

Building a form field that needs a select, user picker, or file upload? Check
[references/ng-components.md](references/ng-components.md) for the shared component before
hand-rolling one.

Everything under **Shared Rules** above still applies to generated CRUD code.

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

Base code quality — return types, `any`, `??` vs `||`, exception shape, signal patterns, import
order — is the `engineering` skill's Code Quality section; check against that instead of
re-deriving it here. The two checklists below cover what's specific to API generation and aren't
stated there.

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
- [ ] `getSelectQuery` (not `getExtraManipulateQuery`) filters by `companyId` + `branchId` from JWT user and carries any relation JOIN a single-record response needs — `getById`/`getByIds` never call `getExtraManipulateQuery`, see [api-design/references/crud-generation.md](references/crud-generation.md)
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
