# Backend Wiring — Configuration Surface

Every file the bootstrap touches in `backend/`, in the order to touch it. Anything not listed
here is template code that stays exactly as shipped.

Legend: **Configure** = fill in values from the PRD · **Trim** = remove entries for unselected
packages · **Keep** = do not edit.

| # | File | Action |
| - | ---- | ------ |
| 1 | `package.json` | Trim |
| 2 | `.env` | Configure |
| 3 | `src/config/modules.config.ts` | Configure + Trim |
| 4 | `src/config/entities.config.ts` | Trim |
| 5 | `src/config/swagger.config.ts` | Trim |
| 6 | `src/app.module.ts` | Trim |
| 7 | `src/providers/auth-email.provider.ts` | Configure |
| 8 | `src/providers/iam-sync.provider.ts` | Trim |
| 9 | `src/providers/ai-assistant.provider.ts` | Trim |
| 10 | `src/modules/shared/app-datasource.provider.ts` | Rename |
| 11 | `src/modules/shared/swagger.config.ts` | Rename |
| 12 | `src/persistence/seed-admin.ts` | Trim |
| 13 | `src/persistence/seed-localization.ts` | Trim, or delete if localization unselected |
| — | `src/main.ts`, `src/app.controller.ts`, `src/app.service.ts`, `src/config/security.config.ts`, `src/persistence/migration.config.ts` | Keep |

---

## 1. `package.json`

**Database driver — keep exactly one:**

| `dbType` | Keep | Remove |
| -------- | ---- | ------ |
| `postgres` | `pg` | `mysql2` |
| `mysql` | `mysql2` | `pg` |

**FLUSYS packages — remove each unselected one:**

`@flusys/nestjs-ai-assistant` · `@flusys/nestjs-email` · `@flusys/nestjs-event-manager` ·
`@flusys/nestjs-form-builder` · `@flusys/nestjs-iam` · `@flusys/nestjs-localization` ·
`@flusys/nestjs-notification` · `@flusys/nestjs-storage` · `@flusys/nestjs-task-manager`

Always keep `@flusys/nestjs-auth`, `@flusys/nestjs-core`, `@flusys/nestjs-shared`.

**Transitive deps:** if notification is not selected, also remove `socket.io`,
`@nestjs/websockets`, `@nestjs/platform-socket.io`.

Leave the `scripts` block alone — `migration:*`, `seed:*`, and `start:*` are all still needed.

---

## 2. `.env`

| Key | Set to |
| --- | ------ |
| `PORT` | backend port (default `3002`) |
| `MODE` | the literal value `DEV` (case-insensitive) — **never** `development` (see note below) |
| `ALLOW_ORIGINS`, `FRONTEND_URL`, `APP_URL` | must match the frontend port |
| `DB_TYPE` | `postgres` or `mysql` — from the PRD |
| `DB_HOST` | from PRD, else `localhost` |
| `DB_PORT` | `5432` for PostgreSQL, `3306` for MySQL/MariaDB |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | from PRD, else safe local defaults |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | distinct random strings — never reuse the template values |
| `JWT_EXPIRATION`, `REFRESH_TOKEN_EXPIRATION` | keep template defaults unless the PRD says otherwise |
| `ENABLE_COMPANY_FEATURE` | must equal `bootstrapAppConfig.enableCompanyFeature` |
| `USE_TENANT_MODE` | `true` only when `databaseMode: 'multi-tenant'` |
| `TENANT_ID` | default tenant key; ignored when `USE_TENANT_MODE=false` |
| `REDIS_URL` | only if the PRD asks for a shared cache; otherwise leave the default |
| `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES` | only meaningful when storage is selected |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed admin credentials — from PRD, else safe defaults |

> The database name key is **`DB_NAME`**, not `DB_DATABASE`.

> `@flusys/nestjs-core`'s `envConfig.isProduction()` does
> `getValue('MODE').toUpperCase() !== 'DEV'` — any value other than `DEV` (including the
> intuitive-looking `development`) is treated as production. This silently disables Swagger doc
> generation with no error, and every `/api/docs/*` route 404s with no indication why.

---

## 3. `src/config/modules.config.ts`

The single most important file. It holds `bootstrapAppConfig` plus one
`getXxxModuleOptions()` factory per package.

**Set `bootstrapAppConfig` from Step 1.1 of the skill:**

```typescript
export const bootstrapAppConfig: IBootstrapAppConfig = {
  databaseMode: "single",          // 'single' | 'multi-tenant'
  enableCompanyFeature: true,      // from PRD
  permissionMode: "FULL",          // 'FULL' | 'RBAC' | 'DIRECT'
  enableEmailVerification: false,  // true only when the email package is selected
};
```

This object is the backend's source of truth — `entities.config.ts`, `seed-admin.ts`, and every
package's options factory read from it. Change it here and nowhere else.

**`defaultDatabaseConfig`** reads its `type` from env (`DB_TYPE`). No edit needed.

**`tenantList`** — set to `[]` when `databaseMode: 'single'`. The template ships example tenants;
leaving them in a single-DB project causes startup connection attempts to databases that
do not exist.

**Trim** the `getXxxModuleOptions()` function for every unselected package, plus its imports at
the top of the file: ai-assistant, email, event-manager, form-builder, iam, localization,
notification, storage, task-manager.

Each file also ships an async variant (`getXxxModuleAsyncOptions()` + a `XxxConfigFactory`
class) for config loaded over HTTP at boot. Unless the PRD asks for remote configuration,
delete the async variants — the template only registers the sync ones.

---

## 4. `src/config/entities.config.ts`

`getAllEntities()` spreads one `getXxxEntitiesByConfig()` per package. Remove the import and the
spread for each unselected package.

This function drives migration generation. An entity helper left in for a package you removed
from `package.json` breaks the build; one removed for a package you kept silently omits its
tables from the migration.

Always import entity helpers from the `/entities` subpath —
`@flusys/nestjs-auth/entities`, never `@flusys/nestjs-auth`.

---

## 5. `src/config/swagger.config.ts`

One `xxxSwaggerConfig()` entry per package, each served at its own `/api/docs/<module>` URL.
Remove entries for unselected packages. Always keep `authSwaggerConfig`.

---

## 6. `src/app.module.ts`

Remove the import and the `.forRoot(...)` registration for each unselected package.

**Registration order matters:**

1. `CacheModule`, `SharedPermissionCacheModule`, `ThrottlerModule` — always first, always kept
2. `NotificationModule` — **before** `AuthModule`, because it provides the
   `NOTIFICATION_ADAPTER` token that auth resolves optionally
3. everything else

`SharedPermissionCacheModule` has no `.forRoot()` and no PRD trigger — it backs permission
lookups for auth and IAM. Never remove it.

Every package in the template is registered here, `AiAssistantModule` included. If a package's
entity helper is in `entities.config.ts`, its module belongs in this file too — the two lists
must agree, or you get tables with no endpoints serving them.

---

## 7–9. `src/providers/`

| File | Rule |
| ---- | ---- |
| `auth-email.provider.ts` | Keep the real implementation when `enableEmailVerification: true`. Otherwise replace with the noop below. |
| `iam-sync.provider.ts` | Provides `PERMISSION_SYNC_ADAPTER` so deleting a company/branch revokes its permissions. Delete the file **only if IAM is unselected** — it imports from `@flusys/nestjs-iam`. |
| `ai-assistant.provider.ts` | Delete unless ai-assistant is selected. |

Update `src/providers/index.ts` to match whatever remains.

Noop email provider — required whenever email verification is off, because `AuthModule` still
resolves the token:

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

`authEmailProvider` belongs inside `AuthModule.forRoot({ providers: [...] })`, not
`AppModule.providers` — `AuthEmailService` resolves it from within its own module scope.

---

## 10–11. `src/modules/shared/`

| File | Change |
| ---- | ------ |
| `app-datasource.provider.ts` | Rename the class to `<AppName>DataSourceProvider`. It is referenced in five static field declarations plus the constructor call — update every one. |
| `swagger.config.ts` | Rename the exported function and update its `title` and `path` to the app name. |

The DataSource provider class name becomes a project-wide convention: every feature service
generated later injects it by name. Pick it once, here.

---

## 12–13. `src/persistence/`

`seed-admin.ts` — feature flags need no edit: they derive from `bootstrapAppConfig`
(`ENABLE_COMPANY_FEATURE`, `ENABLE_EMAIL`), so configuring `modules.config.ts` is enough. Admin
credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

**But it also seeds one IAM permission group per package.** For every unselected package, remove
its `<PKG>_PERMISSIONS` import and the permission group that references it — otherwise the seed
imports from a package that is no longer installed and fails at run time.

`seed-localization.ts` — if localization is **not** selected, delete the file and drop
`seed:localization` from the first-run steps. If localization **is** selected, trim it: each
package contributes a `<PKG>_MESSAGES` block, a `modules` registration entry, and a translated
copy of those keys in every language section. Remove all of them for unselected packages, or the
admin UI lists translation modules for features that do not exist.

`migration.config.ts` — keep as-is.

---

## Before declaring a package removed

The wiring files are not the whole footprint. Grep the backend for the package name and confirm
every remaining hit is intentional:

```bash
grep -rn "<package-name>" backend/src
```

Expect hits in `package.json`, `config/modules.config.ts`, `config/entities.config.ts`,
`config/swagger.config.ts`, `app.module.ts`, `providers/`, and both seed files. A clean grep is
the finish line; the table above is a guide, not a guarantee.

If migrations have already run, removing a package's entity helper does not drop its tables.
Either leave them (harmless) or generate a follow-up migration to drop them deliberately — never
hand-edit an existing migration.
