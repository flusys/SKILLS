# Feature Module Folder Structure

Loaded on demand from the `api-design` skill. This is the one place that defines where a
feature's files live — `crud-generation.md` and `develop-feature` both point here instead of
restating it. If a generated project needed a manual correction to its folder layout, fix it
here, not in the skill that produced it.

**The module folder name is the domain from the PRD's `## Feature Modules` list — never the
entity name.** A domain almost always outgrows its first entity: a `product` domain ends up
holding `Product`, `Category`, `Brand`, `Tag`, `Attribute`. Adding an entity to an existing
domain means adding one file to each existing subfolder and updating each barrel — it never
means creating a second module folder next to it. Match a new entity against the bootstrap
PRD's `## Feature Modules` list to decide which domain it belongs to before creating anything.

## Backend — `{backend}/src/modules/<domain>/`

**CRUD domain (has at least one entity with a lifecycle) — Path B:**

```
modules/<domain>/
  <domain>.module.ts
  constants/
    <domain>-permissions.constant.ts
  controllers/
    index.ts
    <entity-kebab>.controller.ts     ← one per entity in the domain
  dto/
    index.ts
    <entity-kebab>.dto.ts            ← Create + Update + Response DTOs together, one file per entity
  entities/
    index.ts
    <entity-kebab>.entity.ts
  enums/
    index.ts
    <entity-kebab>.enum.ts           ← only entities that have an enum column
  interfaces/
    i-<entity-kebab>.ts              ← plain interface, mirrors the ResponseDto
  services/
    index.ts
    <entity-kebab>.service.ts
  # optional — only when the PRD calls for them
  plugins/                          ← pluggable strategy pattern (e.g. a calculation or rules engine)
  decorators/                       ← domain-specific parameter/method decorators
  utils/                            ← pure helper functions, no DI
```

Every subfolder except `interfaces/` gets an `index.ts` barrel (`export * from './x.thing'` for
every file in it). `<domain>.module.ts` imports controllers and services from those barrels,
never from the individual files.

**Domain Action (no entity lifecycle) — Path A:** stays flat, no subfolders at all:

```
modules/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.dto.ts
  constants/                        ← optional
```

Register every module — CRUD or Domain Action — in `{backend}/src/app.module.ts` `imports[]`.

## Frontend — `{frontend}/src/app/modules/<domain>/`

```
modules/<domain>/
  <domain>.routes.ts                ← exports `<DOMAIN>_ROUTES`
  constants/
    <entity-kebab>-messages.ts      ← flat Record<string,string>, "<entity>." prefixed keys
  enums/                            ← optional, mirrors backend enums used in forms/filters
  interfaces/
    i-<entity-kebab>.ts             ← mirrors the entity's ResponseDto
  services/
    <entity-kebab>.service.ts       ← extends ApiResourceService, one per entity
  pages/
    <entity-kebab>-list/<entity-kebab>-list.component.ts
    <entity-kebab>-form/<entity-kebab>-form.component.ts     ← or -form-dialog, see Form Strategy
    <entity-kebab>-view/<entity-kebab>-view.component.ts     ← optional, read-only detail page
    <domain-kebab>-reports/<domain-kebab>-reports.component.ts  ← optional, aggregate/report page
  components/                       ← optional, shared UI reused across the domain's pages
```

The same rule as the backend applies: a second entity in the same domain gets its own file in
`services/`, `interfaces/`, `pages/`, and its own route block inside `<domain>.routes.ts` — it
never gets a sibling `app/modules/<entity>/`.

**`-view` and `-reports` pages** are optional siblings of `-list`/`-form`, not a third required
pair — add them only when the PRD calls for a read-only detail screen (an entity with enough
related data that the list row and the edit form both undersell it — an invoice, a purchase
order) or a cross-entity aggregate screen. Don't generate either speculatively.

**Extra per-entity services beyond the base `ApiResourceService` subclass** are the escape hatch
for a form or list that outgrows plain CRUD state — `<entity-kebab>-form.service.ts` for a
multi-step or multi-entity form (e.g. building a purchase order with line items before submit),
`<entity-kebab>-state.service.ts` for state shared across a form/list pair that plain component
signals can't hold (e.g. a running invoice total). Only add one when a single `ApiResourceService`
subclass and component-local signals genuinely can't hold the state — most entities need neither.

## App root — `{frontend}/src/app/`

Alongside `modules/`, the app root itself holds cross-domain files that no single domain owns.
`develop-feature` and `bootstrap` reference several of these by name (`app-menu.config.ts`,
`permission.guards.ts`, `app-init.guard.ts`) without saying where they live — this is that
answer:

```
src/app/
  app.routes.ts / app.config.ts / app.component.ts   ← framework entry points
  config/
    app-menu.config.ts              ← IMenuItem[] per domain, see Frontend § Routing above
  guards/
    app-init.guard.ts               ← session/auth/company/IAM restore on load, see bootstrap's Anti-Patterns
    permission.guards.ts            ← permissionGuard() used by every <domain>.routes.ts
  services/
    <cross-cutting>.service.ts      ← app-wide services with no single owning domain (session sync, search adapter)
  shared/
    pages/                          ← not-found, no-permission and other non-domain routes
    pipes/ utils/                   ← generic helpers with no domain owner
    pdf/                            ← optional, shared document/PDF builders reused by several domains
  modules/<domain>/                 ← everything above
```

Nothing here is generated per-feature; `develop-feature` only adds one menu entry and one guard
reference per domain to the existing `config/` and `guards/` files. Anything a feature needs that
doesn't belong to its own domain and isn't cross-cutting enough for `shared/` stays out of scope —
flag it rather than inventing a new app-root folder.

### Routing

`<domain>.routes.ts` is lazy-loaded once from the authenticated `AppLayout` children in
`app.routes.ts` — add this block the first time a domain gets a feature, never a flat
`loadComponent` route per entity:

```typescript
// app.routes.ts, inside the AppLayout route's `children: [...]`
{
  path: '<domain-kebab>',
  loadChildren: () =>
    import('./modules/<domain-kebab>/<domain-kebab>.routes').then((m) => m.<DOMAIN>_ROUTES),
},
```

Inside `<domain>.routes.ts`, resolve the domain's translation module once at the top and guard
each entity's routes by permission. `resolveTranslationModule` is imported from `@flusys/ng-shared`
— not `ng-localization` — and has two-mode behavior:

| Condition | What happens |
| --------- | ------------ |
| `@flusys/ng-localization` is wired | Registers fallbacks in `LocalizationStateService`, then fetches from API |
| No localization provider | Registers fallbacks in `FALLBACK_MESSAGES_REGISTRY` only — no API call |

**Always pass `fallbackMessages`** (merging the domain's message constants with `SHARED_MESSAGES`)
— this ensures the UI renders correctly even if the API translation fetch fails or
`ng-localization` is not wired at all:

```typescript
import { Routes } from '@angular/router';
import { resolveTranslationModule, SHARED_MESSAGES } from '@flusys/ng-shared';
import { permissionGuard } from '../../guards/permission.guards';
import { <ENTITY>_PERMISSIONS } from './constants';
import { <ENTITY>_MESSAGES } from './constants/<entity-kebab>-messages';

export const <DOMAIN>_ROUTES: Routes = [
  {
    path: '',
    resolve: {
      translations: resolveTranslationModule({
        modules: ['<domain>'],
        fallbackMessages: { ...<ENTITY>_MESSAGES, ...SHARED_MESSAGES },
      }),
    },
    children: [
      {
        path: '<entity-kebab>',
        canActivate: [permissionGuard(<ENTITY>_PERMISSIONS.READ)],
        loadComponent: () =>
          import('./pages/<entity-kebab>-list/<entity-kebab>-list.component').then(
            (m) => m.<Entity>ListComponent,
          ),
      },
      {
        path: '<entity-kebab>/create',
        canActivate: [permissionGuard(<ENTITY>_PERMISSIONS.CREATE)],
        loadComponent: () =>
          import('./pages/<entity-kebab>-form/<entity-kebab>-form.component').then(
            (m) => m.<Entity>FormComponent,
          ),
      },
      {
        path: '<entity-kebab>/edit/:id',
        canActivate: [permissionGuard(<ENTITY>_PERMISSIONS.UPDATE)],
        loadComponent: () =>
          import('./pages/<entity-kebab>-form/<entity-kebab>-form.component').then(
            (m) => m.<Entity>FormComponent,
          ),
      },
      // one block per entity in the domain, then:
      { path: '', redirectTo: '<first-entity-kebab>', pathMatch: 'full' },
    ],
  },
];
```

> Translations modules already loaded elsewhere are skipped — safe to declare the same module
> name in multiple routes' `modules` array. Translation keys are `module.section.key` in dot-case,
> e.g. `product.form.name_label`.

Add the menu entry for the domain (not per entity, unless the PRD's nav calls for sub-items) to
`app-menu.config.ts` **before** the `administrative` group, as an `IMenuItem` (`@flusys/ng-layout`):

```typescript
export const PRODUCT_MENU: IMenuItem[] = [
  {
    labelKey: 'product.menu.catalog', // use labelKey when ng-localization is wired
    // label: 'Catalog',              // use label (hardcoded string) when it is not — never omit both
    icon: 'box',
    routerLink: ['/products'],
    permission: 'product.read', // hides the entry if the user lacks it
  },
];
```

## Auto-detecting existing conventions

Before generating into a project that already has feature modules, read one existing domain
folder on each side (`{backend}/src/modules/<any-domain>/`,
`{frontend}/src/app/modules/<any-domain>/`) and match its conventions exactly — provider names,
permission-constant naming, whether interfaces have a barrel — rather than assuming the layout
above applies unmodified. This file describes the default for a domain that does not exist yet.
