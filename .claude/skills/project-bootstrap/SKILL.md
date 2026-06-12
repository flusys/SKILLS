---
name: project-bootstrap
description: "Bootstrap a new FLUSYS project from a PRD — select only needed packages, generate all wiring files, configure environment"
---

# Project Bootstrap

Generates the **wiring files** that connect FLUSYS packages into a running application based on what a PRD requires. Does NOT scaffold the entire monorepo — the package source code already exists. This skill produces only the files that wire packages together.

The files at `backend/` and `frontend/` in the project root are **full-featured templates** with all packages included. This skill instructs you to edit them in place and trim based on PRD selection.

---

## Step 1 — Read the PRD and Select Packages

### 1.1 PRD Analysis Checklist

Read the **entire** PRD before selecting any package. Ask these questions:

**App identity:**

- What is the product name? → `appName`
- What ports do backend / frontend use?
- Is there one database or per-tenant databases?
- Do users belong to companies / organizations?

**Config values to extract before writing any file:**

| Config                    | PRD Signal                                                                     | Default                          |
| ------------------------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `enableCompanyFeature`    | Company accounts, per-company data, org management                             | `true`                           |
| `permissionMode`          | "role-based only" → `RBAC`; "direct only" → `DIRECT`; "both/flexible" → `FULL` | `'FULL'`                         |
| `enableEmailVerification` | "verify email", "confirm account"                                              | `true` if email package included |
| `databaseMode`            | Single DB → `'single'`; per-tenant DBs → `'multi-tenant'`                      | `'single'`                       |
| `dbType`                  | "MySQL / MariaDB" → `mysql`; "PostgreSQL / Postgres" → `postgres`              | `'mysql'`                        |
| `appName`                 | Product name                                                                   | from PRD                         |
| Backend `PORT`            | From PRD or convention                                                         | `3002`                           |
| Frontend `PORT`           | From PRD or convention                                                         | `3001`                           |

### 1.2 Package Selection Matrix

| PRD Mentions                                          | Backend                     | Frontend                |
| ----------------------------------------------------- | --------------------------- | ----------------------- |
| login / register / user / auth                        | `nestjs-auth` ✅ **always** | `ng-auth` ✅ **always** |
| role / permission / access control / RBAC             | `nestjs-iam`                | `ng-iam`                |
| file / upload / document / attachment / image / media | `nestjs-storage`            | `ng-storage`            |
| dynamic form / survey / questionnaire                 | `nestjs-form-builder`       | `ng-form-builder`       |
| email / SMTP / template / password reset              | `nestjs-email`              | `ng-email`              |
| calendar / event / schedule / appointment             | `nestjs-event-manager`      | `ng-event-manager`      |
| notification / real-time / bell / push / alert        | `nestjs-notification`       | `ng-notification`       |
| task / board / kanban / ticket / project tracking     | `nestjs-task-manager`       | `ng-task-manager`       |
| language / i18n / translation / multilingual          | `nestjs-localization`       | `ng-localization`       |

**Always included regardless of PRD:**

- Backend: `nestjs-core`, `nestjs-shared`, `nestjs-auth`
- Frontend: `ng-core`, `ng-shared`, `ng-layout`, `ng-auth`

---

## Step 2 — Generate Backend Files

The full-featured backend already exists at `backend/`. Apply the customizations below in place.

### Project config files — keep as-is, then trim `package.json`

- `nest-cli.json`, `tsconfig.json`, `tsconfig.app.json`, `package.json`, `package-lock.json`

**In `package.json`, remove every entry that is not needed:**

**DB driver — keep one, remove the other:**

| `dbType`   | Keep     | Remove   |
| ---------- | -------- | -------- |
| `mysql`    | `mysql2` | `pg`     |
| `postgres` | `pg`     | `mysql2` |

**FLUSYS packages — remove each package whose feature is NOT selected:**

| Package                        | Remove if…                 |
| ------------------------------ | -------------------------- |
| `@flusys/nestjs-email`         | email not selected         |
| `@flusys/nestjs-event-manager` | event-manager not selected |
| `@flusys/nestjs-form-builder`  | form-builder not selected  |
| `@flusys/nestjs-iam`           | iam not selected           |
| `@flusys/nestjs-localization`  | localization not selected  |
| `@flusys/nestjs-notification`  | notification not selected  |
| `@flusys/nestjs-storage`       | storage not selected       |
| `@flusys/nestjs-task-manager`  | task-manager not selected  |

**Always keep:** `@flusys/nestjs-auth`, `@flusys/nestjs-core`, `@flusys/nestjs-shared`

**socket.io / websocket packages** — remove `socket.io`, `@nestjs/websockets`, `@nestjs/platform-socket.io` if notification not selected.

### Complete File Structure

```
backend/
  .env
  src/
    main.ts
    app.module.ts
    app.controller.ts
    app.service.ts
    config/
      modules.config.ts
      entities.config.ts
      swagger.config.ts
      security.config.ts
    modules/
      shared/
        app-datasource.provider.ts  ← rename class to match appName (e.g. IspDataSourceProvider)
        swagger.config.ts           ← rename function + update title/path per appName
    providers/
      auth-email.provider.ts  ← full version if email selected; noop version otherwise
      index.ts
    persistence/
      migration.config.ts
      seed-admin.ts        ← keep; set feature flags from PRD
      seed-localization.ts ← delete if localization not selected
```

---

### 2.1 `.env` — `backend/.env`

Customize all values from PRD:

- `PORT` → backend port (default `3002`)
- `ALLOW_ORIGINS`, `FRONTEND_URL`, `APP_URL` → match ports
- `DB_TYPE` → from PRD analysis: `mysql` (MySQL/MariaDB) or `postgres` (PostgreSQL)
- `DB_HOST` → from PRD or `localhost`
- `DB_PORT` → `3306` for MySQL/MariaDB, `5432` for PostgreSQL
- `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` → from PRD or safe defaults
- `ENABLE_COMPANY_FEATURE` → from PRD analysis
- `USE_TENANT_MODE` → `true` only if `databaseMode = 'multi-tenant'`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` → from PRD or safe defaults

---

### 2.2 `src/config/modules.config.ts` — `backend/src/config/modules.config.ts`

**Set `bootstrapAppConfig` from PRD analysis:**

```typescript
export const bootstrapAppConfig: IBootstrapAppConfig = {
  databaseMode: "single", // 'single' | 'multi-tenant'
  enableCompanyFeature: true, // from PRD
  permissionMode: "FULL", // 'FULL' | 'RBAC' | 'DIRECT'
  enableEmailVerification: false, // true only if email package selected
};
```

**`defaultDatabaseConfig`** reads `type` from `_db.type` (env-driven) — no change needed here. Database type is controlled by `DB_TYPE` in `.env`.

**Single DB mode:** clear `tenantList` to empty array `[]` (remove the template's example tenants).

**Remove** module option functions for unselected packages:

- Remove `getLocalizationModuleOptions` if localization not selected
- Remove `getNotificationModuleOptions` if notification not selected
- Remove `getIAMModuleOptions` if iam not selected
- Remove `getStorageModuleOptions` if storage not selected
- Remove `getFormBuilderModuleOptions` if form-builder not selected
- Remove `getEmailModuleOptions` if email not selected
- Remove `getEventManagerModuleOptions` if event-manager not selected
- Remove `getTaskManagerModuleOptions` if task-manager not selected

Also remove all unused imports from removed functions.

---

### 2.3 `src/app.module.ts` — `backend/src/app.module.ts`

The template includes ALL modules. Remove what's not needed:

- For each unselected package: remove its import and `.forRoot()` registration

**Always keep:** `CacheModule`, `ThrottlerModule`, `AuthModule`

**NotificationModule order:** if notification selected, keep it **before** `AuthModule` — provides `NOTIFICATION_ADAPTER` token.

---

### 2.4 `src/config/entities.config.ts` — `backend/src/config/entities.config.ts`

- Remove entity helper imports and spreads for unselected packages

---

### 2.5 `src/persistence/migration.config.ts` — keep as-is

---

### 2.6 `src/persistence/seed-admin.ts` — `backend/src/persistence/seed-admin.ts`

Keep as-is. Then set feature flags at the top to match PRD selection:

```typescript
const ENABLE_STORAGE = false; // set true if storage selected
const ENABLE_FORM_BUILDER = false; // set true if form-builder selected
const ENABLE_EMAIL = false; // set true if email selected
const ENABLE_EVENT_MANAGER = false; // set true if event-manager selected
const ENABLE_LOCALIZATION = false; // true if localization selected
const ENABLE_NOTIFICATION = false; // set true if notification selected
const ENABLE_TASK_MANAGER = false; // set true if task-manager selected
```

> Keep `seed-localization.ts` only if localization is selected — delete it otherwise.

---

### 2.7 `src/config/swagger.config.ts` — `backend/src/config/swagger.config.ts`

Comment out swagger entries for unselected packages. Always keep `authSwaggerConfig`.

---

### 2.8 `src/config/security.config.ts` — keep as-is

---

### 2.9 `src/main.ts` — keep as-is

---

### 2.10 `src/providers/auth-email.provider.ts` — `backend/src/providers/auth-email.provider.ts`

Keep as-is if enableEmailVerification is true.

If enableEmailVerification is **false** selected, replace with the noop version:

```typescript
import { AUTH_EMAIL_PROVIDER, IAuthEmailProvider } from "@flusys/nestjs-auth";
import { Provider } from "@nestjs/common";

export const authEmailProvider: Provider = {
  provide: AUTH_EMAIL_PROVIDER,
  useValue: {
    async sendPasswordResetEmail(): Promise<void> {},
    async sendVerificationEmail(): Promise<void> {},
  } as IAuthEmailProvider,
};
```

`src/providers/index.ts` — keep as-is.

---

### 2.11 `src/app.controller.ts`, `src/app.service.ts` — keep as-is

---

## Step 3 — Generate Frontend Files

The full-featured frontend already exists at `frontend/`. Apply the customizations below in place.

### Project config files — keep as-is, then trim `package.json`

- `angular.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `.postcssrc.json`
- `src/index.html`, `src/styles.scss`
- `src/main.server.ts`, `src/server.ts`
- `src/app/app.config.server.ts`, `src/app/app.routes.server.ts`, `src/app/app.component.spec.ts`
- `public/` folder (favicon, logos)

**In `package.json`, remove every entry that is not needed:**

**FLUSYS packages — remove each package whose feature is NOT selected:**

| Package                    | Remove if…                 |
| -------------------------- | -------------------------- |
| `@flusys/ng-email`         | email not selected         |
| `@flusys/ng-event-manager` | event-manager not selected |
| `@flusys/ng-form-builder`  | form-builder not selected  |
| `@flusys/ng-iam`           | iam not selected           |
| `@flusys/ng-localization`  | localization not selected  |
| `@flusys/ng-notification`  | notification not selected  |
| `@flusys/ng-storage`       | storage not selected       |
| `@flusys/ng-task-manager`  | task-manager not selected  |

**Always keep:** `@flusys/ng-auth`, `@flusys/ng-core`, `@flusys/ng-shared`, `@flusys/ng-layout`

**`socket.io-client`** — remove if notification not selected.

### Complete File Structure

```
frontend/src/
  main.ts
  environments/
    environment.base.ts
    environment.ts
    environment.prod.ts
  app/
    app.component.ts/html/scss
    app.config.ts
    app.routes.ts
    config/
      app-menu.config.ts
      app-launcher.config.ts
    guards/
      app-init.guard.ts
    services/
      auth-layout-sync.service.ts
      search-adapter.service.ts
    pages/
      home/home.component.ts
```

---

### 3.1 `src/main.ts` — keep as-is

---

### 3.2 `src/environments/environment.base.ts` — `frontend/src/environments/environment.base.ts`

Customize:

- `appName` → from PRD
- `author.name`, `author.url` → from PRD
- `enableCompanyFeature` → match `bootstrapAppConfig`
- `multiTenant.enabled` → `true` only if `databaseMode = 'multi-tenant'`
- `permissionMode` → lowercase match of `bootstrapAppConfig.permissionMode` (`'full'` | `'rbac'` | `'direct'`)

---

### 3.3 `src/environments/environment.ts` — `frontend/src/environments/environment.ts`

Customize:

- `apiBaseUrl` → match backend port
- For each service NOT selected: set `enabled: false` (do **not** remove the entry)
- `storage.defaultStorageConfigId`: clear to `''` unless known

---

### 3.4 `src/environments/environment.prod.ts` — `frontend/src/environments/environment.prod.ts`

Replace the `PROD_API` constant at the top with the real production URL from the PRD:

```typescript
const PROD_API = "https://api.yourapp.com"; // from PRD
```

All service URLs inherit from this constant — no need to update them individually.

---

### 3.5 `src/app/app.config.ts` — `frontend/src/app/app.config.ts`

Remove providers for unselected packages:

- Remove `provideIamProviders()` if iam not selected
- Remove `provideStorageProviders()` if storage not selected
- Remove `provideNotificationProviders()` if notification not selected
- Remove their imports

**Translation provider — pick exactly one:**

| Localization selected | Replace the `provideLocalization(...)` block with                      |
| --------------------- | ---------------------------------------------------------------------- |
| **Yes**               | Keep `...provideLocalization(getLocalizationConfig(...), {...})` as-is |
| **No**                | `provideFallbackMessagesRegistry()` from `@flusys/ng-core`             |

Never leave both in the file. Never leave neither — one is always required for translation keys to resolve correctly in the UI.

Keep `LAYOUT_SEARCH_ADAPTER`/`SearchAdapterService` — placeholder search, developer fills in.

---

### 3.6 `src/app/app.routes.ts` — `frontend/src/app/app.routes.ts`

Remove each unselected package's `*_ROUTES` import and route entry. Auth and main layout routes are already correct — no changes needed.

---

### 3.7 `src/app/app.component.ts/html/scss` — keep as-is

---

### 3.8 `src/app/guards/app-init.guard.ts` — `frontend/src/app/guards/app-init.guard.ts`

**Keep as-is. Do NOT remove any blocks.** The guard already uses runtime conditional checks:

- `if (appConfig.enableCompanyFeature && ...)` — safe when company feature is disabled
- `if (isServiceEnabled(appConfig, 'iam') && ...)` — safe when IAM is not selected

Removing these blocks causes runtime errors if the feature is later enabled, and offers no runtime benefit since the conditions already guard execution. Only exception: if `ng-iam` is truly not installed (not just disabled), remove the `PermissionStateService` inject and its IAM block.

---

### 3.9 `src/app/services/auth-layout-sync.service.ts` — `frontend/src/app/services/auth-layout-sync.service.ts`

Keep as-is. Uses `inject(NotificationStateService, { optional: true })` — safe when notification is not selected.

---

### 3.10 `src/app/services/search-adapter.service.ts` — keep as-is

Placeholder with dummy data. Developer replaces with real search logic.

---

### 3.11 `src/app/config/app-menu.config.ts` — `frontend/src/app/config/app-menu.config.ts`

Replace menu items to match PRD navigation spec. Rules:

- **Always keep** `dashboard` and the `administrative` parent group (contains Administration + IAM)
- Use **`label`** (hardcoded English string) — never `labelKey` unless `ng-localization` is selected
- Use `iconType: 1` on every item
- Feature modules added by `/develop-feature` are inserted **before** the `administrative` group
- If `ng-email` or `ng-notification` are selected, add them as children inside the `administrative` group alongside Administration/IAM
- Remove menu items for packages not selected in the PRD

---

### 3.12 `src/app/config/app-launcher.config.ts` — keep as-is

Placeholder launcher apps. Developer replaces with real entries from PRD.

---

### 3.13 `src/app/pages/home/home.component.ts` — keep as-is

Placeholder dashboard. Developer replaces with real implementation.

---

## Step 4 — Install Dependencies

All `@flusys/*` packages are installed from npm — no local library builds needed.

```bash
cd backend && npm install
cd frontend && npm install
```

---

## Step 5 — First-Run Commands

```bash
# 1. Generate initial migration
npm run migration:generate --name=init

# 2. Run migrations (creates all tables)
npm run migration:run

# 3. Seed admin user and initial data
npx ts-node -r tsconfig-paths/register src/persistence/seed-admin.ts

# 4. Start backend
npm run start:dev

# 5. Start frontend (separate terminal)
npm start
```

---

## Step 6 — Verification Checklist

- [ ] `http://localhost:PORT/api/docs/auth` loads Swagger UI without 500 error
- [ ] `POST /v1/auth/login` returns `{ success: true, data: { accessToken } }` and sets `fsn_refresh_token` cookie
- [ ] Frontend loads at `http://localhost:FRONTEND_PORT` without console errors
- [ ] Login flow completes: login → dashboard, no infinite redirect
- [ ] Page refresh restores session (`appInitGuard` + refresh cookie working)
- [ ] (If localization selected) `| translate` shows real values, not raw keys
- [ ] Auth routes (`/auth/*`) redirect to dashboard when already logged in
- [ ] Protected routes redirect to `/auth/login?returnUrl=...` when not authenticated
- [ ] Sidebar menu renders with correct items after login
- [ ] Each selected module's Swagger doc loads at its `/api/docs/xxx` URL
- [ ] User profile appears in layout header after login
- [ ] (If notification selected) socket connects after login, disconnects after logout

---

## Anti-Patterns

| Anti-Pattern                                               | Correct Approach                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Include all packages by default                            | Read PRD — include only what's needed                                                                                           |
| `getAuthEntitiesByConfig` from `@flusys/nestjs-auth`       | `getEntitiesByConfig` from `@flusys/nestjs-auth/entities`                                                                       |
| Entity helpers without `/entities` subpath                 | Always `@flusys/nestjs-xxx/entities`                                                                                            |
| Register `NotificationModule` after `AuthModule`           | NotificationModule MUST come first — provides `NOTIFICATION_ADAPTER` token                                                      |
| Import `appInitGuard` from `@flusys/ng-auth`               | **`appInitGuard` is a local file** at `./guards/app-init.guard` — always generate it                                            |
| Use `effect()` in `AuthLayoutSyncService`                  | Use `toObservable` + `takeUntilDestroyed` pattern                                                                               |
| Omit `PermissionStateService` from guard when iam selected | Guard imports `PermissionStateService` from `@flusys/ng-iam` — conditional on iam                                               |
| No resolver on auth routes                                 | Auth routes need `resolveTranslationModule({ modules: ['shared'] })`                                                            |
| `APP_INITIALIZER` for session restore                      | Use `appInitGuard` — handles session restore, auth check, company, and IAM                                                      |
| `translationModuleResolver('module')`                      | `resolveTranslationModule({ modules: [...], fallbackMessages: {...} })`                                                         |
| `loadChildren` for FLUSYS feature routes                   | Use `children: FEATURE_ROUTES` — they are already lazy inside the package                                                       |
| `{ provide: APP_CONFIG, useValue: environment.apiConfig }` | `{ provide: APP_CONFIG, useValue: environment }` — pass the whole object                                                        |
| `standalone: true` on component                            | Angular 21 — all components standalone by default, no decorator needed                                                          |
| Skip `CacheModule` and `ThrottlerModule`                   | Always include — required infrastructure                                                                                        |
| Single `setupSwaggerDocs(app, {...})` for all modules      | Per-module: `xxxSwaggerConfig()` from `@flusys/nestjs-xxx/docs`                                                                 |
| Hardcode `DB_TYPE` without reading the PRD                 | Read `dbType` from PRD — use `mysql` (port `3306`) or `postgres` (port `5432`); remove the unused DB driver from `package.json` |
| Omit excluded services from `environment.ts`               | Set `enabled: false` — omitting breaks feature detection at runtime                                                             |
| Missing `x-loader-tag` from CORS `allowedHeaders`          | Include `x-loader-tag` in `allowedHeaders` in `main.ts`                                                                         |
| Use `effect()` for RxJS-based subscription in services     | Use `toObservable(signal).pipe(takeUntilDestroyed())` for proper cleanup                                                        |
