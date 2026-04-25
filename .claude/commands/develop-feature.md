---
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(npm run *), Bash(git diff*), Bash(git status*), AskUserQuestion, TodoWrite
description: Develop a full-stack FLUSYS feature from a modular PRD — entity, API, service, Angular UI, migrations, translations, performance, and security
---

# /develop-feature

Develop a complete FLUSYS feature from a module PRD. Orchestrates all skills in the correct order: database → API design → backend generation → Angular UI → quality → performance → security.

## Usage

```
/develop-feature <path-to-module-prd>
/develop-feature docs/modules/invoice.md
/develop-feature prd/modules/user-management.md
```

---

## Skills Loaded for This Command

Load each skill at the step it is first needed — do not preload all at once:

| Skill             | When loaded                           |
| ----------------- | ------------------------------------- |
| `database-design` | Step 3 — entity & migration design    |
| `api-design`      | Step 4 — controller & endpoint design |
| `crud`            | Step 5 — full-stack CRUD generation   |
| `flusys-nest`     | Step 5 — NestJS wiring & providers    |
| `flusys-ng`       | Step 6 — Angular UI generation        |
| `code-quality`    | Step 7 — post-generation review       |
| `performance`     | Step 8 — caching & signal memoization |
| `security-review` | Step 9 — security audit               |

---

## Execution Steps

### Step 1 — Read the Module PRD

Read the PRD file provided as `$ARGUMENTS`. Extract:

- **Feature name** and purpose
- **Entities** with fields, types, relations, enums, and constraints
- **Endpoints** required (list, get, create, update, delete, or domain actions)
- **Permissions** needed (roles, guards)
- **UI requirements** (list views, forms, filters, nested data, bulk actions)
- **Localization** — is multi-language content required?
- **Performance** — are cache or pagination requirements mentioned?
- **Special rules** — soft-delete, audit log, file upload, notifications, events

If the PRD path is missing or the file does not exist, stop and ask the user for the correct path.

---

### Step 2 — Confirm Feature Plan

Before writing any code, output a feature plan for the user to review:

```
Feature Development Plan
────────────────────────────────────────
Feature:       Invoice Management
Module path:   backend/src/modules/invoice/
Entities:      Invoice, InvoiceItem
Enums:         InvoiceStatusEnum
Interfaces:    IInvoice, IInvoiceItem
Controller:    Full CRUD + domain actions: [submit, void]
Permissions:   INVOICE_READ, INVOICE_WRITE, INVOICE_VOID
Soft-delete:   yes
Localization:  yes
Caching:       list endpoint (TTL 60s)
Angular UI:    list page + detail form + status badge

Backend files:  enums, interfaces, entities, DTOs, service, controller, module, migration
Frontend files: model, service, component, routes entry, menu entry, translation constants
────────────────────────────────────────
Proceed? (confirm or adjust)
```

Wait for user confirmation before writing any files.

---

### Step 3 — Database Design

Load skill: **database-design** — follow all its rules for column types, relations, indexes, and migrations.

Generate in this order:

**Enums** — one file per constrained value set:
`backend/src/modules/<module>/enums/<name>.enum.ts`
Export all from `enums/index.ts`.

**Interfaces** — one per entity, must extend `IIdentity` from `@flusys/nestjs-shared`:
`backend/src/modules/<module>/interfaces/i-<entity>.ts`
Export all from `interfaces/index.ts`.

**Entities** — one per entity, must extend `Identity` from `@flusys/nestjs-shared/entities`:
`backend/src/modules/<module>/entities/<entity>.entity.ts`
Export all from `entities/index.ts`.

**Registration:**
- Add every new entity to `backend/src/config/entities.config.ts`

**Migration** — one migration file covering all new tables for this feature:
`backend/src/persistence/migrations/default/<timestamp>-<feature-name>.ts`
- Register in `backend/src/persistence/migration.config.ts`

---

### Step 4 — API Design

Load skill: **api-design** — follow all its rules for controller strategy, HTTP methods, response DTOs, and `messageKey` constants.

For each controller, decide and document before generating any code:

1. **Strategy** — Full CRUD / Partial CRUD (`enabledEndpoints`) / Domain Action
2. **Endpoints** — method, route, response DTO, `messageKey`
3. **Guards** — which endpoints need `@RequirePermission`
4. **Query complexity** — any joins or aggregations that need `QueryBuilder` in the service

---

### Step 5 — Backend Generation

Load skills: **crud**, **flusys-nest** — follow all their rules for DTOs, service overrides, controller wiring, and module setup.

Use the **crud** skill as the primary generator for standard endpoints. Hand-write domain actions (submit, approve, void) as additional `@Post()` methods in the same controller class.

Generate files in this order:

| # | File | Notes |
|---|------|-------|
| 1 | `dtos/create-<entity>.dto.ts` | Validation decorators, no `id` field |
| 2 | `dtos/update-<entity>.dto.ts` | Extends Create, adds `id: string` |
| 3 | `dtos/<entity>-response.dto.ts` | Only fields safe to expose |
| 4 | `<module>.service.ts` | Extends `RequestScopedApiService`, injects project DataSource provider |
| 5 | `<module>.controller.ts` | Uses `createApiController()` factory, domain actions as extra methods |
| 6 | `<module>.module.ts` | `@Global()`, registers DataSource provider + service, exports service |

**Registration:**
- Import the new module in `backend/src/app.module.ts`
- Add barrel export to `backend/src/modules/index.ts`

---

### Step 6 — Angular UI Generation

Load skill: **flusys-ng** — follow all its rules for signals, control flow, subscriptions, and service patterns.

Generate files in this order:

| # | File | Notes |
|---|------|-------|
| 1 | `models/<feature>.ts` | Plain interfaces + type unions matching backend response |
| 2 | `constants/<feature>-messages.ts` | Flat `Record<string,string>`, keys follow `feature.action.context` pattern |
| 3 | `services/<feature>/<feature>.service.ts` | Extends `ApiResourceService`, domain action methods as extra HTTP calls |
| 4 | `pages/<feature>/<feature>.component.ts` | Standalone component, signal-based state, PrimeNG table + dialog |

**Registration:**
- Export model from `models/index.ts`
- Export service from `services/<feature>/index.ts`
- Add lazy route inside the authenticated `AppLayout` children in `app.routes.ts`
- Merge feature messages into the layout route's `resolveTranslationModule` `fallbackMessages`
- Add menu entry to `config/app-menu.config.ts` (`labelKey`, `icon`, `routerLink`)

---

### Step 7 — Code Quality Review

Load skill: **code-quality** — apply to every file generated in Steps 3–6. Fix all issues before proceeding.

- [ ] No `any` — use concrete types or generics
- [ ] No unchecked nulls — `??`, optional chaining, or explicit guards at system boundaries
- [ ] Naming: `IEntityName` interfaces, `EntityNameEnum` enums, kebab-case files, PascalCase classes
- [ ] Signal patterns enforced: private `#signal`, public `.asReadonly()`, `computed()` for derived state
- [ ] `@if` / `@for` only — no `*ngIf` / `*ngFor`
- [ ] `input()` / `output()` only — no `@Input()` / `@Output()`
- [ ] Subscriptions use `takeUntilDestroyed()` or `firstValueFrom()`
- [ ] All user-visible strings use `| translate`
- [ ] No unused imports, methods, or variables
- [ ] `companyId` always sourced from `user` context — never accepted from DTO

---

### Step 8 — Performance Patterns

Load skill: **performance** — apply only where the PRD or data volume warrants; do not cache speculatively.

**Backend:**
- `HybridCache` is already wired — use it on list endpoints when PRD indicates read-heavy access
- Invalidate cache in write operation hooks (`beforeUpdateOperation`, `beforeDeleteOperation`)
- Resolve any N+1 risks from Step 3 with `QueryBuilder` joins in `getExtraManipulateQuery()`
- Always paginate list endpoints — never return unbounded collections

**Frontend:**
- `computed()` for all derived state — never recompute inside template expressions
- Do not call `service.fetchList()` more than once on init — use `service.reload()` for refresh

---

### Step 9 — Security Review

Load skill: **security-review** — audit every generated file. Fix all critical findings before Step 10.

- [ ] `@UseGuards(JwtAuthGuard)` on every controller class
- [ ] `@RequirePermission(...)` on every protected endpoint
- [ ] `applyCompanyFilter(qb, alias, user?.companyId)` in every list/get query — no cross-tenant reads
- [ ] Every DTO field has `class-validator` decorators — no raw objects to repository
- [ ] No string interpolation in queries — `QueryBuilder` parameterized values only
- [ ] No `[innerHTML]` with user data in Angular templates
- [ ] Sensitive fields (`password`, `refreshToken`) never in response DTOs
- [ ] File upload MIME + size validation if PRD includes uploads

---

### Step 10 — Run Migrations & Verify

Run in order — do not skip:

```bash
cd backend && npm run migration:run && npm run start:dev
```

```bash
# separate terminal
cd frontend && npm start
```

Verify before declaring done:

- [ ] Backend starts without errors; Swagger shows all new endpoints
- [ ] Frontend compiles without type errors
- [ ] List page loads, paginates, and search works
- [ ] Create and update forms submit correctly
- [ ] Delete (soft-delete) removes record from list
- [ ] Domain actions return correct responses
- [ ] Unauthorized roles receive `403`
- [ ] No browser console errors

---

## Output Summary

```
Feature Complete: <FeatureName>
────────────────────────────────────────
Backend:   modules/<feature>/ — enums, interfaces, entities, DTOs, service, controller, module
           persistence/migrations/ — 1 migration
           entities.config.ts + app.module.ts updated

Frontend:  models/, services/<feature>/, pages/<feature>/
           constants/<feature>-messages.ts
           app.routes.ts + app-menu.config.ts updated

Translation keys: X keys added
Security:         PASSED / [open issues]
Performance:      cache applied / not needed

Next steps:
  1. npm run migration:run
  2. Add translation values in admin UI (if localization enabled)
  3. Assign permissions to roles in IAM module
────────────────────────────────────────
```

---

## What This Command Does NOT Do

- Does not bootstrap the project — use `/bootstrap`
- Does not generate the DataSource provider — already in `backend/src/providers/`
- Does not deploy or push to any environment
- Does not write tests
