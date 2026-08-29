# Frontend Wiring — Configuration Surface

Every file the bootstrap touches in `dashboard/`, in the order to touch it. Anything not listed
here is template code that stays exactly as shipped.

Legend: **Configure** = fill in values from the PRD · **Trim** = remove entries for unselected
packages · **Keep** = do not edit.

| # | File | Action |
| - | ---- | ------ |
| 1 | `package.json` | Trim |
| 2 | `src/environments/environment.base.ts` | Configure |
| 3 | `src/environments/environment.ts` | Configure + Trim |
| 4 | `src/environments/environment.prod.ts` | Configure |
| 5 | `src/app/app.config.ts` | Trim |
| 6 | `src/app/app.routes.ts` | Trim |
| 7 | `src/app/config/app-menu.config.ts` | Configure |
| 8 | `src/app/app.component.ts` + `.html` | Trim |
| 9 | `src/app/config/app-launcher.config.ts` | Placeholder |
| 10 | `src/app/services/search-adapter.service.ts` | Placeholder |
| 11 | `src/app/pages/dashboard/dashboard.component.ts` | Placeholder |
| — | `src/main.ts`, `app.config.server.ts`, `app.routes.server.ts`, `src/server.ts`, `guards/app-init.guard.ts`, `services/auth-layout-sync.service.ts`, `services/app-update.service.ts` | Keep |

---

## 1. `package.json`

Remove each unselected `@flusys/ng-*` package:

`@flusys/ng-ai-assistant` · `@flusys/ng-email` · `@flusys/ng-event-manager` ·
`@flusys/ng-form-builder` · `@flusys/ng-iam` · `@flusys/ng-localization` ·
`@flusys/ng-notification` · `@flusys/ng-storage` · `@flusys/ng-task-manager`

Always keep `@flusys/ng-auth`, `@flusys/ng-core`, `@flusys/ng-shared`, `@flusys/ng-layout`,
and `@flusys/ng-ui`.

**Transitive deps:** remove `socket.io-client` if notification is not selected.

`@angular/service-worker` stays — the template ships a PWA (see `app.config.ts` below).

---

## 2. `src/environments/environment.base.ts`

Cross-environment identity and feature flags. Everything here is a value to fill in, not a
package to trim.

| Key | Set to |
| --- | ------ |
| `appName` | product name from the PRD |
| `appLogo` | filename in `public/` (default `logo-icon.svg`) |
| `author.name`, `author.url` | brand attribution shown in the footer |
| `layoutConfig.preset` | `@flusys/ng-ui` theme preset (default `Aura`) |
| `layoutConfig.primary` | primary colour name |
| `layoutConfig.darkTheme`, `menuMode` | default UI state |
| `enableCompanyFeature` | must equal the backend's `bootstrapAppConfig.enableCompanyFeature` |
| `multiTenant.enabled` | `true` only when `databaseMode: 'multi-tenant'` |
| `multiTenant.tenantHeader` | keep `x-tenant-id` unless the backend was changed |
| `permissionMode` | lowercase form of the backend value — `'full'` \| `'rbac'` \| `'direct'` |
| `storage.maxFileSize`, `storage.allowedMimeTypes` | client-side validation only; the real limit is enforced server-side |

The three flags `enableCompanyFeature`, `multiTenant.enabled`, and `permissionMode` must mirror
the backend exactly. A mismatch produces a UI that renders company/branch selectors the API will
reject, or hides permissions the user actually has.

---

## 3. `src/environments/environment.ts`

`apiBaseUrl` plus one entry per service under `services`. Point every `baseUrl` at the backend
port.

**For an unselected package, set `enabled: false` — do not delete the entry.** Feature detection
uses `isServiceEnabled(appConfig, 'iam')` at runtime; a missing key is not the same as a disabled
one and throws instead of degrading.

| Entry | Notes |
| ----- | ----- |
| `auth`, `administration` | always `enabled: true` |
| `iam`, `storage`, `formBuilder`, `email`, `eventManager`, `taskManager`, `localization`, `aiAssistant` | `enabled` mirrors package selection |
| `notification` | also set `socketUrl` to the backend origin (no path suffix) |
| `storage.defaultStorageConfigId` | leave `''` — it is filled in from the admin UI after the first storage config is created |

The valid keys are fixed by the `ServiceName` union in `@flusys/ng-shared` — `auth`,
`administration`, `iam`, `storage`, `formBuilder`, `email`, `eventManager`, `notification`,
`localization`, `taskManager`, `aiAssistant`. Do not invent a key; a package resolves its base
URL through `getServiceUrl(config, '<name>')` and a missing entry throws.

Keep `environment.prod.ts` in step with `environment.ts` — the two service lists must hold the
same keys, or a package works in development and breaks in production.

---

## 4. `src/environments/environment.prod.ts`

Replace the single `PROD_API` constant at the top with the production URL from the PRD. Every
service URL derives from it, so there is nothing else to change.

```typescript
const PROD_API = "https://api.yourapp.com"; // from PRD
```

---

## 5. `src/app/app.config.ts`

Remove `...provideXxxProviders()` and its import for each unselected package
(`provideIamProviders`, `provideStorageProviders`, `provideNotificationProviders`, …).

**Translation providers — exactly one of these two arrangements:**

| Localization selected | Keep |
| --------------------- | ---- |
| Yes | `provideFallbackMessagesRegistry({...})` **and** `...provideLocalization(getLocalizationConfig({...}), {...})` |
| No | `provideFallbackMessagesRegistry({...})` only — delete the `provideLocalization` block and its imports |

Never leave neither: without a registry, every `| translate` renders its raw key.

**Never remove:**

| Provider | Why |
| -------- | --- |
| `provideZonelessChangeDetection()` | Angular 22 zoneless — signals depend on it |
| `provideNgUI({ theme: ... })` | `@flusys/ng-ui` theme; every package's components need it |
| `{ provide: APP_CONFIG, useValue: environment }` | pass the **whole** environment object, not a sub-key |
| the four HTTP interceptors | order is load-bearing: `auth` → `tokenRefresh` → `errorCatching` → `apiLoader` |
| `MessageService`, `ConfirmationService` | toast + confirm dialog singletons |
| `provideServiceWorker('ngsw-worker.js', ...)` | PWA registration, paired with `AppUpdateService` and `ngsw-config.json` |
| `LAYOUT_SEARCH_ADAPTER` / `AuthLayoutSyncService` / `AppUpdateService` | app shell wiring |

If the PRD does not want a PWA, remove `provideServiceWorker`, `AppUpdateService`,
`ngsw-config.json`, and the `serviceWorker` key in `angular.json` together — not just one.

---

## 6. `src/app/app.routes.ts`

Remove the `XXX_ROUTES` import and its route entry for each unselected package. The auth route
and the `AppLayout` shell route stay untouched.

Package routes use `children: XXX_ROUTES` — never `loadChildren`. They are already lazy inside
the package.

Removing a package's route is not optional cleanup: the route survives in the bundle and fails to
resolve its lazy chunk at run time, so the app compiles and then 404s on navigation.

---

## 7. `src/app/config/app-menu.config.ts`

Rebuild to match the PRD's navigation.

- Always keep the `dashboard` item and the `administrative` parent group (Administration + IAM)
- Use `labelKey` (translation key) when localization is selected; use `label` (plain English
  string) when it is not — never mix, never omit both
- Set `iconType: 1` on every item
- Put `email` and `notification` inside the `administrative` group when selected
- Remove items for unselected packages
- Feature modules added later by `/develop-feature` are inserted **before** the `administrative`
  group
- **A parent item with `children` never navigates on its own click** — the layout component only
  expands/collapses it. If the parent's own `routerLink` is a real page (e.g. the `administrative`
  group's own link to `/administration`, ng-auth's Users/Company/Branch admin page), that page is
  unreachable from the sidebar unless one child (conventionally the first) repeats the exact same
  `routerLink`. Every multi-child group must satisfy this — add a same-path child (e.g. a
  "Configuration" entry under `administrative`) rather than assuming the parent link works by
  itself.
- **Every menu item whose target route has a `canActivate: [permissionGuard(...)]` guard needs the
  matching `permission`/`permissionLogic` on the menu item too — including a vendored package's
  route with no local `constants` re-export barrel.** Skipping it doesn't make the item safe, it
  makes it *inconsistent*: every authenticated user sees that sidebar link regardless of role and
  only discovers they lack access after clicking through to the guarded route, unlike every
  correctly-configured item which hides itself outright. For a vendored package with no
  app-authored `constants` barrel, import the permission constant straight from
  `@flusys/ng-shared` (e.g. `EVENT_PERMISSIONS`, `ROLE_PERMISSIONS`, `EMAIL_TEMPLATE_PERMISSIONS`)
  rather than leaving the item ungated — grep the package's compiled `fesm2022/*.mjs` for the exact
  `permissionGuard(...)` action id used on that route if it isn't obvious from the route path.
- **`IMenuItem.separator` (`@flusys/ng-layout`) renders as a bare divider line only — it has no
  section-header/caption support in the installed version.** Confirmed by grepping the compiled
  `flusys-ng-layout.mjs`: `separator` is referenced exactly once, only to skip permission-checking
  on that item, never to render a `label`. Use `{ separator: true }` freely to visually break a
  long flat top-level menu into clusters, but don't set a `label` on one expecting a section title
  to appear — it won't render.

---

## 8. `src/app/app.component.ts` + `app.component.html`

The root shell is not inert — some packages mount a **global widget** here rather than behind a
route, so removing the package without editing these two files leaves an import of a dependency
that no longer exists and the build fails.

| Package | Remove from `app.component.ts` | Remove from `app.component.html` |
| ------- | ------------------------------ | -------------------------------- |
| `ng-ai-assistant` | `ChatWidgetHostComponent` import + its `imports` entry | `<flusys-ai-chat-widget-host />` |

Anything left in the `imports` array after trimming stays — `RouterOutlet` and
`LibAppConfigComponent` are always required.

---

## 9–11. Placeholders

These three ship with dummy content and are meant to be replaced by the developer, not by
bootstrap. Configure them only if the PRD specifies content.

| File | Ships with |
| ---- | ---------- |
| `config/app-launcher.config.ts` | example launcher apps |
| `services/search-adapter.service.ts` | dummy global-search results behind `LAYOUT_SEARCH_ADAPTER` |
| `pages/dashboard/dashboard.component.ts` | placeholder dashboard |

---

## Files that look trimmable but are not

| File | Why it stays intact |
| ---- | ------------------- |
| `guards/app-init.guard.ts` | Already runtime-conditional — `if (appConfig.enableCompanyFeature && …)` and `if (isServiceEnabled(appConfig, 'iam') && …)`. Removing the blocks breaks the app the moment a feature is re-enabled and buys nothing at runtime. Only drop the `PermissionStateService` inject if `ng-iam` is genuinely uninstalled. |
| `services/auth-layout-sync.service.ts` | Uses `inject(NotificationStateService, { optional: true })` — already safe without notification. |
| `services/app-update.service.ts` | Service-worker update prompt; tied to `provideServiceWorker`. |

`app.component.ts` / `.html` used to be listed here. They are **not** safe to skip — see step 9.
A package can mount a global widget in the root shell, and leaving that import behind after
removing the package is a compile error.

---

## Before declaring a package removed

Package footprints are wider than the wiring files. Grep for the package name across the whole
frontend and confirm every hit is either gone or intentional:

```bash
grep -rn "<package-name>" dashboard/src
```

Expect hits in `package.json`, `app.routes.ts`, `app-menu.config.ts`, and — for widget-mounting
packages — `app.component.ts` and `app.component.html`. A clean grep is the only reliable
finish line; the file list above is a guide, not a guarantee.
