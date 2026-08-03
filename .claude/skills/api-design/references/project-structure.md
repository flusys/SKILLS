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
  components/                       ← optional, shared UI reused across the domain's pages
```

The same rule as the backend applies: a second entity in the same domain gets its own file in
`services/`, `interfaces/`, `pages/`, and its own route block inside `<domain>.routes.ts` — it
never gets a sibling `app/modules/<entity>/`.

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
