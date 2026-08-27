---
name: develop-feature
description: Build one full-stack FLUSYS feature from a feature PRD — entities, DTOs, service, controller, Angular UI, migration and translations. Use for /develop-feature or when a docs/prd-feature-*.md is ready to build.
---

# /develop-feature

Build one complete feature module from a feature PRD.

```
/develop-feature docs/prd-feature-01-invoice.md
```

If the path is missing or the file does not exist, stop and ask for the correct one. Features
must be built in the order listed under `## Feature Modules (development order)` in the bootstrap
PRD — a module that depends on another cannot be built first.

## Skills

Load each at the step that needs it, not all up front.

| Step | Skill |
| ---- | ----- |
| 1 — a feature that extends the user record | `user-enricher` — **instead of** steps 2–5 below |
| 2 — entities and schema | `engineering` → [references/database.md](../engineering/references/database.md) |
| 3 — endpoint design | `api-design` |
| 4 — backend code | `api-design` → [references/crud-generation.md](../api-design/references/crud-generation.md) |
| 5 — Angular UI | `api-design` → crud-generation.md (Phase 4), `ui-design` (component/styling choices) |
| 6 — review | `engineering` (Code Quality) → [references/caching.md](../engineering/references/caching.md), [references/security.md](../engineering/references/security.md) |

## Execution

### 1. Read the PRD and confirm

Read every section. Then print the plan and wait for confirmation:

```
Feature Plan — <Feature Name>
────────────────────────────────────────
Strategy:      Full CRUD | Partial CRUD | Domain Action
Entities:      <names>
Enums:         <names>
Endpoints:     <operations or action names>
Permissions:   <feature>.read, <feature>.create, …
Soft delete:   yes/no
Localization:  yes/no
Caching:       <list endpoint TTL, or none>
UI:            list page + form <+ special behaviour>
────────────────────────────────────────
Proceed? (confirm or adjust)
```

Skip this confirmation only when `/bootstrap` is running features in batch and the user already
approved the batch.

**Before printing the plan, decide whether this is a user extension.** It is one if the PRD says
any of:

- the entity is one-to-one with the user, or "the employee/member/customer record *is* the user
  record"
- the fields must appear on registration, the profile page, the admin user list, **and** the
  admin user create/edit form
- the module has no list route of its own because the directory is the existing user screen

If so, load `user-enricher` and follow it — the steps below do not apply. A user extension has
no `createApiController()` module, no `/feature` route, no menu entry and no list page; building
those produces a second people directory beside the package's user list, and the fields never
reach registration or the profile. Say so in the plan:

```
Shape: user extension — no standalone module, route or menu entry
Surfaces: registration, profile, admin user list, admin user form
```

Everything else follows steps 2–6.

### 2. Entities and schema

Before modeling anything, confirm this module isn't really a `@flusys/*` package's own domain —
`prd-generator` should already have routed calendars, boards, dynamic forms, notifications, and
file handling to their package instead of a feature PRD. If a PRD nonetheless describes custom
entities that duplicate a package's domain, stop and flag it rather than building the duplicate;
fix the PRD, don't silently reinvent the package.

The module folder is the **domain** from the bootstrap PRD's `## Feature Modules` list, not the
entity — check `modules/<domain>/` for an existing folder before creating one. Adding an entity
to a domain that already has others means adding a file to each existing subfolder and barrel,
never a second module. Full layout:
[api-design/references/project-structure.md](../api-design/references/project-structure.md).

From the PRD's `## Entities`. Generate in order — enums, interfaces, entities — then register.

| Artifact | Path | Base |
| -------- | ---- | ---- |
| Enum | `modules/<domain>/enums/<entity>.enum.ts` | — |
| Interface | `modules/<domain>/interfaces/i-<entity>.ts` | extends `IIdentity` |
| Entity | `modules/<domain>/entities/<entity>.entity.ts` | extends `Identity` |

Barrel-export each folder (`entities/index.ts`, `enums/index.ts` — `interfaces/` does not need
one), then add every new entity to `config/entities.config.ts`. Column names are explicit
`snake_case`; TypeORM's camelCase default is wrong for this codebase.

If the root `CLAUDE.md`'s Project Conventions table has `Company feature: true` and the PRD marks
this entity company-scoped, declare `companyId`/`branchId` columns on it now, at generation time —
see crud-generation.md's entity section. Skipping this step is what produces a service in step 4
that calls `applyCompanyFilter` against a column that was never declared.

### 3. Endpoint design

From the PRD's `## API Strategy` and `## Endpoints`. Use the strategy the PRD names — do not
substitute your own. Decide and note, before writing code: the response DTO per endpoint, which
endpoints carry which permission, and any query that needs a `QueryBuilder` join.

### 4. Backend

**Base first, then hooks, then custom — in that order, for every requirement.**

Before writing any method, resolve it against this ladder and stop at the first rung that works:

| Rung | Ask | Example |
| ---- | --- | ------- |
| 1. Base method | Does `ApiService` already do this? | list, get, create, update, delete, bulk — all inherited |
| 2. Override hook | Does a hook shape it? | filters, sort, search, joins, tenant scope, side effects |
| 3. Custom method | Only if neither fits | a genuine domain action the PRD names |

Requirements map to hooks far more often than they look like they do:

| PRD says | Hook — not a custom method |
| -------- | -------------------------- |
| "search on <fields>" | `getGlobalSearchQuery` — the only hook wired to the search term |
| "filter by <field>" | `getFilterQuery` |
| "sort by <field>" | `getSortQuery` |
| "show related <entity>" | `getSelectQuery` (join) — **not** `getExtraManipulateQuery`, see below |
| company-scoped rows | `getSelectQuery` + `applyCompanyFilter` — **not** `getExtraManipulateQuery` |
| "on create, also …" | `afterInsertOperation` |
| "cannot delete when …" | `beforeDeleteOperation` |
| default values, derived columns | `convertSingleDtoToEntity` |

The full hook table with exact signatures is in
[api-design/references/crud-generation.md](../api-design/references/crud-generation.md). Read it
before deciding a requirement needs custom code — a custom `searchProducts()` next to an
unimplemented `getGlobalSearchQuery` is the failure this ladder exists to prevent. That reference
also explains why tenant scoping and relation JOINs belong in `getSelectQuery`, not
`getExtraManipulateQuery` — the generated `getById`/`getByIds` endpoints call the former only, so
putting scoping in the latter leaves single-record reads completely unscoped.

| # | File | Notes |
| - | ---- | ----- |
| 1 | `dto/<entity>.dto.ts` | Create + Update + Response DTOs together in one file; validators from the PRD's `## Validation`; no `id`, no `companyId` — a field the PRD marks "required, default X" means optional-with-server-default (`@IsOptional()` on the DTO, defaulted to X in `convertSingleDtoToEntity` on INSERT only, left `undefined` on UPDATE so an omission there doesn't overwrite the existing value), never a plain required validator — the create form's own default will always send a value and mask the bug from UI testing, but any other API caller hits it immediately |
| 2 | `services/<entity>.service.ts` | extends `ApiService`; overrides hooks only; injects the DataSource provider |
| 3 | `controllers/<entity>.controller.ts` | `createApiController()` factory; domain actions as extra methods |
| 4 | `<domain>.module.ts` | new domain: create it with this controller + service; existing domain: add both to its arrays alongside what's already there |

The controller uses the factory even for Partial CRUD — narrow it with `enabledEndpoints`, do not
hand-write the handlers. Barrel-export the new files in `dto/index.ts`, `services/index.ts`,
`controllers/index.ts`, then register the module in `app.module.ts` (new domain only) and add its
barrel export to `modules/index.ts`.

Every entity/DTO/interface TypeScript property is **camelCase, always** — snake_case is reserved
exclusively for the DB column name inside `@Column({ name: "..." })`. This is easy to get
internally-consistently wrong (all-snake_case properties still compile and `tsc` never flags it),
so it silently ships mismatched JSON keys against the rest of the app. Check this on sight when
writing or reviewing a new entity, not only when something fails.

**Register the feature's permissions or every endpoint 403s regardless of correct guards.**
`seed-admin.ts`'s `buildActionTree()` only knows about `@flusys/*` package permissions by default —
a new feature module's own permission constants (its `<FEATURE>_PERMISSIONS` object) must be
imported and added as a new branch there via `createCrudActions(...)`, or the `Action` rows backing
`@RequirePermission` never exist. Do this as part of the build, not as a follow-up: add the branch,
then re-run `npm run seed:admin` (idempotent) before the feature is considered done. Separately,
under `permissionMode: 'RBAC'`, direct `USER_ACTION` grants are ignored entirely — an admin needs a
`Role` with matching `ROLE_ACTION` grants, not just direct grants; `seed-admin.ts`'s existing
"Super Admin" role covers this for the seeded admin automatically once the branch above is added.
Live-testing any of this — including as the seeded admin — needs one more step first:
[references/rbac-live-testing.md](references/rbac-live-testing.md).

### 5. Angular UI

The same ladder applies. `ApiResourceService` already owns the list's reactive state — `data`,
`total`, `isLoading`, `hasMore`, `pageInfo`, `error`, plus `fetchList()`, `setPagination()`,
`nextPage()` and `reload()`.

**The list component must bind to those signals, not mirror them.** A component that declares its
own `items` / `isLoading` signal and hand-writes `loadData()` has two sources of truth and a list
that goes stale after writes. Refresh with `reload()`. Keep component-local signals for genuine UI
state only — dialog visibility, the selected row.

Same domain-not-entity rule as the backend: files live in `modules/<domain>/`
(`{frontend}/src/app/modules/<domain>/`) alongside every other entity in that domain — see
[api-design/references/project-structure.md](../api-design/references/project-structure.md).

| # | File | Notes |
| - | ---- | ----- |
| 1 | `interfaces/i-<entity>.ts` | interface matching the response DTO |
| 2 | `constants/<entity>-messages.ts` | flat `Record<string,string>`, `<entity>.` prefixed keys |
| 3 | `services/<entity>.service.ts` | extends `ApiResourceService`; `super("<api-path>")` only |
| 4 | `pages/<entity>-list/<entity>-list.component.ts` | standalone, binds base signals, `@flusys/ng-ui` table |
| 5 | `pages/<entity>-form/<entity>-form.component.ts` (or `components/<entity>-form/` for a ≤5-field dialog) | standalone form |

Two more files are optional escape hatches, not a default part of every entity — see
[api-design/references/project-structure.md](../api-design/references/project-structure.md)
for when each earns its place:

| # | File | Only when |
| - | ---- | --------- |
| 6 | `pages/<entity>-view/<entity>-view.component.ts` | the PRD calls for a read-only detail screen the list row and edit form both undersell |
| 7 | `services/<entity>-form.service.ts` or `services/<entity>-state.service.ts` | a form or list needs state a plain `ApiResourceService` subclass and component-local signals can't hold |

Then: export from the `interfaces/` and `services/` barrels, add this entity's routes to
`modules/<domain>/<domain>.routes.ts` (create it and lazy-load it once from the authenticated
`AppLayout` children in `app.routes.ts` if this is the domain's first feature), merge the entity's
messages into that routes file's `resolveTranslationModule` fallbacks, and add the menu entry to
`app-menu.config.ts` **before** the `administrative` group — one entry per domain, not per entity,
unless the PRD's nav explicitly calls for sub-items.

### 6. Review

Apply the `engineering` skill to every file written in steps 2–5 — code quality, then
performance, then security. Fix what it flags before moving on. Apply caching and indexes only
where the PRD's `## Non-Functional` section calls for them; do not cache speculatively.

Two rules are worth restating because violating them is silent rather than loud:

- `companyId` and `branchId` come from `@CurrentUser()`, never from a DTO.
- Every list and get query on a company-scoped entity must be filtered by company. Use
  `applyCompanyFilter(query, { isCompanyFeatureEnabled, entityAlias }, user)` from
  `@flusys/nestjs-shared` — a missing filter is a cross-tenant data leak, not a bug report.

This is self-review — you check your own work in the same pass. Before committing, optionally
delegate to the `code-reviewer` agent for an independent, read-only second pass over the files
this step touched; it can only report, not fix, which catches what self-review misses.

### 7. Migrate and verify

```bash
cd backend && npm run migration:generate --name=<feature> && npm run migration:run
npm run start:dev
```

Review the generated migration before running it — check column types, indexes, and foreign
keys against the PRD.

Verify, and report honestly on anything that fails:

- [ ] Backend starts; Swagger shows the new endpoints
- [ ] Frontend builds with `ng build` — `tsc --noEmit` alone does not catch Angular template
      type errors (it never checks an inline `template:` string's bindings against the
      component's declared `@Input()` types, e.g. `style="width: 600px"` on an `@flusys/ng-ui`
      component that types `style` as `Record<string, string>` compiles under `tsc --noEmit` but
      fails `ng build`). A build agent self-reporting clean against `tsc --noEmit` has not
      actually verified this — run `ng build` yourself before considering the feature done.
- [ ] List page loads, paginates, filters, and searches
- [ ] Create and update submit and persist
- [ ] Delete removes the record from the list
- [ ] Domain actions return what the PRD specifies, against real seeded data — check actual
      values/math, not just a 200 status
- [ ] A user with the permission succeeds and a user without it gets `403` — read
      `references/rbac-live-testing.md` first if this is a live curl test, not a browser session:
      the permission cache needs an explicit warm-up call after every backend restart, and
      provisioning a test user under RBAC has a specific schema shape, both documented there
- [ ] No browser console errors

## Output

```
Feature Complete — <Name>
────────────────────────────────────────
Backend:   modules/<domain>/ (<N> files added), 1 migration
           entities.config.ts updated, app.module.ts updated (new domain only)
Frontend:  modules/<domain>/interfaces, services, pages/ (<N> files added)
           <domain>.routes.ts updated, app.routes.ts + app-menu.config.ts updated (new domain only)
Translations: <N> keys
Review:    quality / performance / security — passed or <open items>

Next:
  1. Add translation values in the admin UI (if localization is enabled)
  2. Assign the new permissions to roles in IAM
────────────────────────────────────────
```

## Out of scope

Does not bootstrap the project (`/bootstrap`), write tests, deploy, or hand-edit migrations.
