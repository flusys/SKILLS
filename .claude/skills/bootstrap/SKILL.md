---
name: bootstrap
description: Turn a freshly cloned FLUSYS template into a named, configured project in one run — stamp identity and regenerate secrets the first time (auto-detected, never asked about), then select packages from a bootstrap PRD, wire backend and frontend, migrate and seed. Use for /bootstrap, or whenever a completed docs/prd-bootstrap.md exists and the project hasn't been fully set up yet.
---

# Bootstrap

```
/bootstrap docs/prd-bootstrap.md
```

If no path is given, look for `docs/prd-bootstrap.md`. If that does not exist either, stop and say
the `prd-generator` skill should run first — this skill needs the PRD for identity values (on a
still-fresh template) as much as for package selection.

Runs in two phases:

- **Phase A (identity & secrets)** — only on a still-fresh template, auto-detected below, never
  asked about. Runs once, ever, per project.
- **Phase B (packages & wiring)** — every run, including a later run against an updated PRD (e.g.
  adding a package that wasn't in scope the first time).

The `backend/` and `dashboard/` folders are a **full-featured template with every FLUSYS package
already wired**. This skill does not scaffold a monorepo and does not write feature code — it
**stamps identity once, then turns things off and fills in names**.

Every FLUSYS package is a published npm package. You never need to read package internals. Each
exposes exactly three configuration surfaces:

| Surface | Backend | Frontend |
| ------- | ------- | -------- |
| Registration | `XxxModule.forRoot(getXxxModuleOptions())` in `app.module.ts` | `...provideXxxProviders()` in `app.config.ts` |
| Options | `getXxxModuleOptions()` in `config/modules.config.ts` | `services.xxx` in `environments/environment.ts` |
| Routes / entities | `getXxxEntitiesByConfig()` in `config/entities.config.ts` | `XXX_ROUTES` in `app.routes.ts` |
| Domain events | that module's entry in `moduleEventsConfig` (`config/modules.config.ts`) | — (backend only) |

Phase B walks those four surfaces once per package and keeps or removes. The events entry is the
one most easily forgotten, because leaving it behind fails at *startup* — it imports from a
package that is no longer installed.

---

## Step 0 — Detect Project State

Confirm `backend/` and `dashboard/` exist (glob for `**/src/app.module.ts` and
`**/src/app/app.config.ts` rather than assuming the folder names). If either is missing, stop:
this skill configures the FLUSYS template and cannot run without it.

Run `git log --oneline -1` and check the root `CLAUDE.md`'s title:

- History still belongs to the template, or `CLAUDE.md` still opens with `# FLUSYS Template` →
  **fresh template**. If git history is still the template's, tell the user to
  `rm -rf .git && git init` before continuing — otherwise their first commit inherits the
  template's history. Then run **Phase A**, followed by Phase B in the same session.
- Otherwise → **already stamped**. Skip straight to **Phase B**.

---

## Phase A — Identity & Secrets (fresh template only)

### A1. Read the PRD for identity values

Read `docs/prd-bootstrap.md`'s `## App Identity` and `## Config Values` sections fully — app
name, purpose, `dbType`, ports, and production API URL all come from there. Don't re-ask for
anything the PRD already answers.

Derive two more values, and fold them into **Step 2**'s single confirmation below (identity and
package selection are confirmed together, not in two separate prompts):

| Value | Derived from |
| ----- | ------------ |
| App slug (kebab-case, used in API paths and module names) | app name |
| `DataSourceProvider` class name | `<AppName>DataSourceProvider` (PascalCase, no spaces) — every feature service generated later injects it by this name, so it is expensive to change afterwards |

### A2. Stamp identity (after Step 2's confirmation)

| File | Change |
| ---- | ------ |
| `dashboard/src/environments/environment.base.ts` | `appName`, `author.name`, `author.url` |
| `dashboard/package.json` | `name` → app slug |
| `backend/package.json` | `name` → app slug |
| `backend/.env` | `PORT`, `ALLOW_ORIGINS`, `FRONTEND_URL`, `APP_URL`, `DB_TYPE`, `DB_PORT`, `DB_NAME`, and fresh random `JWT_SECRET` / `REFRESH_TOKEN_SECRET` |
| `backend/src/app.module.ts` | `EventBusModule.forRoot({ serviceName: ... })` → app slug — it names this process's broker queue / Kafka client |
| `backend/src/modules/shared/app-datasource.provider.ts` | rename the class — five static field declarations plus the constructor call |
| `backend/src/modules/shared/swagger.config.ts` | rename the exported function; update `title` and `path` |
| `dashboard/src/index.html` | `<title>` |

Generate genuinely random JWT secrets. Shipping the template's values into a new project is a
real vulnerability, not a placeholder.

### A3. Remove template-only content

| Target | Reason |
| ------ | ------ |
| `.DS_Store` files anywhere in the repo | macOS noise |
| any `docs/prd-*.md` other than the ones just used, left over from the template | they describe a different product |
| any demo or showcase route still present under `dashboard/src/app/pages/` | component-library samples, not part of an app |

### A4. Rewrite `CLAUDE.md`

Edit the existing root `CLAUDE.md` in place — it is the project's instruction file, and after
this step it describes an app rather than a template.

**Delete** the two sections marked *Template-only*: `## Using This Template` and
`## Maintaining the Kit`. Neither applies once the project exists.

**Retitle** from `# FLUSYS Template` to the app name, and replace the opening paragraph with one
sentence describing what the app does (the PRD's `## App Identity` purpose line).

**Update** the Tech Stack table with the real database engine and ports.

**Insert** a `## Project Conventions` section after Tech Stack:

```markdown
## Project Conventions

| Convention          | Value                       |
| -------------------- | --------------------------- |
| App slug             | <app-slug>                  |
| DataSource provider  | <AppName>DataSourceProvider |
| Database             | <postgres \| mysql>         |
| Localization         | TBD — set by Phase B below  |
| Company feature      | TBD — set by Phase B below  |
| Database mode        | TBD — set by Phase B below  |
| Permission mode      | TBD — set by Phase B below  |
```

Leave the four `TBD` rows — **Step 4** below fills them in during this same run.

Keep `## Working Model`, `## Skills & Agents`, `## Proactive Behavior`, `## Hard Rules`, and
`## Learned Rules` as they are — they describe the kit and stay true for every project built on
it. Add any project-specific rules (service ownership, domain invariants) at the end of
`## Hard Rules`, never in `.claude/skills/`, which is shared and gets replaced when the kit is
updated.

---

## Phase B — Packages & Wiring (every run)

## Step 1 — Read the PRD and Decide

Read the **entire** PRD before changing any file. (If Phase A already ran this session, its
identity values came from the same PRD — this step is about the rest of it: config values and
package selection.)

### 1.1 Config values

| Config | PRD signal | Default |
| ------ | ---------- | ------- |
| `appName` | Product name | from PRD |
| `dbType` | "MySQL / MariaDB" → `mysql`; "PostgreSQL / Postgres" → `postgres` | `postgres` |
| `enableCompanyFeature` | Multiple companies / branches / orgs sharing ONE database with `company_id` on every table → `true`. Single-company app, or per-tenant separate DBs → `false` | `false` |
| `databaseMode` | Each tenant has its OWN separate database → `'multi-tenant'`. Everything else → `'single'`. **Never infer `multi-tenant` from the word "SaaS" alone.** | `'single'` |
| `permissionMode` | "role-based only" → `RBAC`; "direct only" → `DIRECT`; "both / flexible" → `FULL` | `'FULL'` |
| `enableEmailVerification` | "verify email", "confirm account" | `true` only if the email package is selected |
| `enableSignUp` | "invite-only", "admin creates all accounts", "no public registration" → `false`. Otherwise omit | `true` |
| `ENABLE_DOMAIN_EVENTS` | "audit trail", "activity log", "webhook", "react when X happens", "another service consumes", "event-driven" | `false` |
| `USE_EVENT_LABEL` | Only one process → `memory`. Several services must see each other's events → `rabbitmq` (or `kafka` if the PRD names it), which also needs `npm i amqplib` / `kafkajs` | `memory` |
| Backend `PORT` | from PRD or convention | `3002` |
| Frontend `PORT` | from PRD or convention | `3001` |

`enableCompanyFeature` and `databaseMode` are independent. Multiple companies in one shared
database is `databaseMode: 'single'` **plus** `enableCompanyFeature: true` — not multi-tenant.

Domain events stay **off** unless the PRD asks for something that consumes them. The template
ships the wiring either way — `EventBusModule` in `app.module.ts`, a per-module `events` block in
`moduleEventsConfig`, and a sample consumer in `src/consumers/` — so turning them on later is one
env flag, not a re-wire. Leave the wiring in place even when the answer is `false`.

### 1.2 Package selection

| PRD mentions | Backend | Frontend |
| ------------ | ------- | -------- |
| login / register / user / auth | `nestjs-auth` ✅ always | `ng-auth` ✅ always |
| role / permission / access control / RBAC | `nestjs-iam` | `ng-iam` |
| file / upload / document / attachment / image / media | `nestjs-storage` | `ng-storage` |
| dynamic form / survey / questionnaire | `nestjs-form-builder` | `ng-form-builder` |
| email / SMTP / template / password reset | `nestjs-email` | `ng-email` |
| calendar / event / schedule / appointment | `nestjs-event-manager` | `ng-event-manager` |
| notification / real-time / bell / push / alert | `nestjs-notification` | `ng-notification` |
| task / board / kanban / ticket / project tracking | `nestjs-task-manager` | `ng-task-manager` |
| language / i18n / translation / multilingual | `nestjs-localization` | `ng-localization` |
| AI chat / assistant / copilot / LLM | `nestjs-ai-assistant` | `ng-ai-assistant` |

**Always kept, never removed:**

- Backend — `nestjs-core`, `nestjs-shared`, `nestjs-auth`
- Frontend — `ng-core`, `ng-shared`, `ng-layout`, `ng-auth`, `ng-ui`

> `@flusys/ng-ui` is the component library every other `ng-*` package renders through
> (`provideNgUI`, `f-button`, tables, dialogs). It has no PRD trigger and is never optional.

> `nestjs-auth` / `ng-auth` also ship Google, Facebook, LinkedIn and Microsoft sign-in built in —
> no package to select, no bootstrap flag. The login page already renders the buttons and the
> `/administration/social-config` screen already exists; both stay inert until an administrator
> saves a provider's client id/secret there. Nothing to wire in this skill beyond `enableSignUp`
> above, which also governs whether an unrecognized social sign-in may create a new account.

---

## Step 2 — Confirm Before Writing

Print the selection and wait for the user. Include the Phase A identity block only when Phase A
is running this session (fresh template):

```
Project Setup — <App Name>
────────────────────────────────────────
Identity (first run only):
  App slug:            <app-slug>
  DataSource provider: <AppName>DataSourceProvider
  JWT secrets:         will be regenerated

Always:   nestjs-core, nestjs-shared, nestjs-auth
          ng-core, ng-shared, ng-layout, ng-auth, ng-ui

Selected from PRD:
  [x] iam            — roles and permissions
  [x] storage        — file upload
  [ ] email          — not mentioned
  ...

Config:
  appName:                 <name>
  dbType:                  postgres
  databaseMode:            single
  enableCompanyFeature:    true
  permissionMode:          FULL
  enableEmailVerification: false
  domainEvents:            off  (transport: memory)
  ports:                   backend 3002 · frontend 3001
────────────────────────────────────────
Proceed? (confirm or adjust)
```

---

## Step 3 — Configure the Files

If Phase A is running this session, do **A2 → A3 → A4** first (identity, cleanup, `CLAUDE.md`),
then continue below. Backend first, then frontend. Each reference lists every file, in the order
to touch it, with the exact knobs it exposes.

- **[references/backend-wiring.md](references/backend-wiring.md)** — `.env`, `modules.config.ts`,
  `entities.config.ts`, `app.module.ts`, swagger, providers, seeds, DataSource provider rename
- **[references/frontend-wiring.md](references/frontend-wiring.md)** — `environment*.ts`,
  `app.config.ts`, `app.routes.ts`, menu and launcher config, guards, services

Rule for both: **disable before deleting.** Most FLUSYS integration points are already
runtime-conditional (`isServiceEnabled(...)`, `inject(X, { optional: true })`). Removing a package
means removing its dependency, its registration, and its routes — not gutting guards and services
that already handle its absence.

---

## Step 4 — Record the Conventions

Fill in the `TBD` rows of `## Project Conventions` in the root `CLAUDE.md` — localization,
company feature, database mode, permission mode — with the values just applied. Every later
`/develop-feature` run reads them from there.

---

## Step 5 — Install and First Run

All `@flusys/*` packages come from npm. There is nothing to build locally.

```bash
cd backend   && npm install
cd dashboard && npm install

# Only for a broker transport — USE_EVENT_LABEL=rabbitmq (or hybrid with EVENT_BROKER=rabbitmq)
cd backend && npm i amqplib
# Only for USE_EVENT_LABEL=kafka (or hybrid with EVENT_BROKER=kafka)
cd backend && npm i kafkajs
```

Skip both for `memory`. Getting this wrong is silent: the driver loads at runtime, so a missing
one logs an error and degrades to in-process delivery rather than failing boot — Step 6's
`was requested but is unavailable` check is what catches it.

```bash
# backend/
npm run migration:generate --name=init   # generate schema from selected packages
npm run migration:run                    # multi-tenant: npm run migration:run:all
npm run seed:admin                       # admin user + feature flags
npm run seed:localization                # only if localization selected
npm run start:dev

# dashboard/ (separate terminal)
npm start
```

**Known package issue — check this once, right after install.** `@flusys/nestjs-shared`'s
`createApiController()` has shipped, in at least one version, with the generated `insert`/`update`
endpoints' body-parameter reflection metadata pointing at the generic type parameters
(`CreateDtoT`/`UpdateDtoT`) instead of the real DTO classes. Generics are erased at compile time,
so NestJS's `ValidationPipe` sees a generic `Object` metatype and **silently skips validation
entirely** on `insert`/`update`/`insertMany`/`updateMany`/`bulkUpsert`/`getByFilter` for every
entity in the app — missing/invalid required fields pass straight through instead of a clean 400.
This is invisible unless specifically tested for (a valid payload still round-trips correctly).

Diagnose it directly: after the first `insert` endpoint exists (even a placeholder entity),
`POST` a payload missing a `@IsNotEmpty()` field and confirm you get a `400`, not a `200`/`500`.
If validation is bypassed, open
`node_modules/@flusys/nestjs-shared/{cjs,fesm}/**/*.js` for the file backing
`createApiController` and look for the DTO metatype the generated method's parameter decorator
references — if it resolves the generic type param instead of the closure's real
`createDtoClass`/`updateDtoClass`, fix it with `patch-package`:
`npx patch-package @flusys/nestjs-shared` after hand-editing the file in `node_modules`, then add
`"postinstall": "patch-package"` to `backend/package.json`'s `scripts` (or append to an existing
postinstall) and commit the generated `backend/patches/*.patch` file. Confirm the postinstall step
also runs in any Docker/CI image, or the fix silently reverts on the next clean install.

Fixing this also requires `forbidNonWhitelisted: false` (keep `whitelist: true`) in `main.ts`'s
global `ValidationPipe` — the package's own `SetCreatedByOnBody`/`SetUpdateByOnBody`/`Slug`
interceptors inject `createdById`/`updatedById`/`slug` into the request body before the pipe runs,
and no DTO whitelists those fields (correctly — they come from `@CurrentUser()`, never the body).
With `forbidNonWhitelisted: true` every insert/update fails regardless of the metatype fix. Note
`insertMany`/`updateMany`/`bulkUpsert` still won't get per-item validation even after this fix —
NestJS's `ValidationPipe` excludes a bare `Array` metatype by design, not something a patch can
touch — prefer the singular `insert`/`update` endpoints when validation matters.

---

## Optional — Database MCP Server

Once `dbType` is decided and real credentials exist in `backend/.env`, you can wire a database MCP
server so Claude can query the live schema instead of inferring it from entity files. This is
per-project, not part of the template — do not commit credentials.

- **`postgres`** — the official `@modelcontextprotocol/server-postgres` package is maintained by
  Anthropic. Add to the project's `.mcp.json`:
  ```json
  {
    "mcpServers": {
      "postgres": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"]
      }
    }
  }
  ```
- **`mysql`** — there is no Anthropic-maintained equivalent. Community packages exist but are
  single-maintainer and unaudited; vet one yourself before granting it live DB credentials rather
  than taking a template default.

Either way, reference credentials with `${VAR}` env syntax so they never land in the committed
file, and prefer a read-only DB user if the server doesn't distinguish read/write itself.

---

## Step 6 — Verify

Report each item honestly. Do not mark one passed that you did not actually observe.

- [ ] `http://localhost:<backend>/api/docs/auth` loads Swagger without a 500
- [ ] `POST /v1/auth/login` returns `{ success: true, data: { accessToken } }` and sets the `fsn_refresh_token` cookie
- [ ] Frontend loads at `http://localhost:<frontend>` with no console errors
- [ ] Login completes: login → dashboard, no redirect loop
- [ ] Page refresh restores the session (`appInitGuard` + refresh cookie)
- [ ] `/auth/*` redirects to dashboard when already logged in
- [ ] Protected routes redirect to `/auth/login?returnUrl=...` when logged out
- [ ] Sidebar menu renders the expected items after login
- [ ] Each selected module's Swagger doc loads at its `/api/docs/<module>` URL
- [ ] `/administration/social-config` loads, behind `social-config.read` — the four providers
      list as disabled until credentials are saved for one
- [ ] The login page shows no social buttons yet — expected with no provider configured, not a bug
- [ ] Every selected package's route (`/iam`, `/storage`, …) resolves — no chunk-load errors
- [ ] (localization selected) `| translate` shows real values, not raw keys
- [ ] (notification selected) socket connects after login and disconnects after logout
- [ ] (domain events on) a login logs one `auth.session.logged-in` line from `DomainEventConsumer`,
      and startup logs `Bound N domain event handler(s)` — no handler bound means `EventBusModule`
      is missing or `ENABLE_DOMAIN_EVENTS` is not `true`
- [ ] (domain events on, broker transport) startup does **not** log `was requested but is
      unavailable` — that message means it silently degraded to in-process delivery and nothing
      reaches another service
- [ ] An `insert` call missing a required field returns `400`, not `200`/`500` — the known
      `createApiController` validation-bypass issue above is silent otherwise

A route that 404s or fails to load a chunk means a package was removed from `package.json` but
its `XXX_ROUTES` entry is still in `app.routes.ts`. Check both sides.

---

## Step 7 — Offer Feature Development

If the PRD has a `## Feature Modules (development order)` section, list the feature PRDs and ask
for one confirmation to run them all. On confirm, run the `develop-feature` skill for each file
in order, skipping its per-feature confirmation since the user approved the batch.

**Batch mode raises, not lowers, the bar for verification.** With no per-feature confirmation, the
user has no natural checkpoint to catch a stub or a regression — self-review and an independent
`code-reviewer` pass over that feature's changed files (`develop-feature`'s Step 6) are both
**mandatory** per feature in a batch run, not optional, and must include actually reading the
generated frontend files rather than trusting a build-subagent's own "complete" report. A build
subagent has been observed reporting a feature "complete" with basic scaffolding while the actual
files still had `// TODO: Implement` handlers, empty dropdown option arrays, and a file-upload
field rendered as a disabled text input — none of that failed a compile check. Before moving to the
next feature, grep the ones just written for `TODO`, `FIXME`, a handler body that is only a
`console.log`, or a list/dropdown bound to a literal empty array.

**A systemic bug or new Hard Rule discovered mid-batch applies to every feature already built in
this batch, not just the ones still ahead.** Fixing it prospectively and moving on has shipped
real bugs in earlier "verified" features before — a validation-bypass affecting every entity was
found at feature 11 of 23, after ten earlier features had already been marked verified without it.
The moment a fix is generalized into a rule (via `rules-writer` or otherwise), stop and check
whether every already-completed feature in this batch needs the same fix, not only the next one.
If a full re-sweep isn't practical mid-batch, at minimum list every earlier feature that needs
re-verification against the new rule in the final summary below, by name — never let it go
unmentioned on the assumption someone will remember.

Then summarise: what was stamped (first run only), what was wired, which features were built, any
earlier features flagged above for re-verification against a rule discovered later in the run, and
the manual follow-ups — translation values, role permissions, and the search-adapter and launcher
placeholders.

---

## Out of Scope

Does not scaffold the monorepo (the template already exists), deploy, write tests, or set up
CI/CD.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
| ------------ | ---------------- |
| Re-stamping identity on a project that's already named | Step 0's detection is the only gate — never re-run Phase A on an already-stamped project |
| Shipping the template's default JWT secrets into a real project | Phase A always generates fresh random secrets |
| Include every package by default | Read the PRD — include only what it asks for |
| `databaseMode: 'multi-tenant'` for any SaaS/multi-company PRD | Multi-tenant = each tenant has its OWN database. Shared DB = `'single'` + `enableCompanyFeature: true` |
| `enableCompanyFeature: false` when the PRD has companies or branches | Multiple companies/branches sharing one DB → `true` |
| `company_id` taken from a DTO | Always injected from `@CurrentUser()` (`user.companyId`) — never accepted from the request body |
| Entity helpers imported from the package root | Use the `/entities` subpath: `@flusys/nestjs-auth/entities` |
| Registering `NotificationModule` after `AuthModule` | Notification must come first — it provides the `NOTIFICATION_ADAPTER` token |
| Importing `appInitGuard` from `@flusys/ng-auth` | It is a **local file**: `./guards/app-init.guard` |
| `APP_INITIALIZER` for session restore | Use `appInitGuard` — it handles session, auth, company, and IAM |
| `effect()` for RxJS subscriptions in services | `toObservable(signal).pipe(takeUntilDestroyed())` |
| `loadChildren` for FLUSYS package routes | `children: XXX_ROUTES` — they are already lazy inside the package |
| `{ provide: APP_CONFIG, useValue: environment.apiConfig }` | Pass the whole object: `useValue: environment` |
| Omitting an unselected service from `environment.ts` | Set `enabled: false` — omitting breaks runtime feature detection |
| One `setupSwaggerDocs(app, {...})` for all modules | One call per module using each package's `xxxSwaggerConfig()` from `@flusys/nestjs-xxx/docs` |
| Dropping `CacheModule` / `ThrottlerModule` | Always required infrastructure |
| Deleting `EventBusModule` / `src/consumers/` because events are off | The switch is `ENABLE_DOMAIN_EVENTS`; with it off the module creates no transport and binds no handler |
| An `events` block left armed for a package that was removed | Trim its entry from `moduleEventsConfig` along with the rest of the package's wiring |
| Broker transport without its driver | `rabbitmq` needs `npm i amqplib`, `kafka` needs `npm i kafkajs` — otherwise it logs an error and degrades to in-process |
| Removing `x-loader-tag` from CORS `allowedHeaders` | Keep it in `main.ts` — the loader interceptor depends on it |
| `standalone: true` on a component | Angular 22 — standalone is the default, the flag is noise |
