---
name: prd-generator
description: Turn raw requirements into reviewable PRDs — one docs/prd-bootstrap.md plus one docs/prd-feature-<nn>-<name>.md per module. Use for /prd-generator, or whenever the user describes project requirements and no PRD exists yet.
---

# PRD Generator

Turn requirements into machine-ready PRD files that `/bootstrap` and `/develop-feature` can
execute without asking questions.

You write exactly two kinds of file:

| File | Consumed by | Describes |
| ---- | ----------- | --------- |
| `docs/prd-bootstrap.md` | `/bootstrap` | which packages the app needs, and its config values |
| `docs/prd-feature-<nn>-<name>.md` | `/develop-feature` | one feature module — entities, endpoints, UI |

**Scope rule — the one thing that keeps these PRDs correct:** a PRD states *what the product
needs*, never *how to build it*. Module registration order, decorator names, guard classes,
import paths, and anti-patterns all belong to the skills, which are versioned against the actual
packages. A PRD that restates them drifts out of sync and starts contradicting the code.

Never generate code, edit source, or run migrations. This skill writes PRD files only.

---

## Step 1 — Intake

Accept a file path (read it fully), inline text, or a vague description.

### 1.1 Auto-derive from signals

Resolve as much as possible before asking anything.

| Signal in the input | Resolved decision |
| ------------------- | ----------------- |
| login / register / user / auth / account | `auth` — always included regardless |
| role / permission / access / RBAC / policy | `iam` |
| file / upload / document / image / attachment / media | `storage` |
| email / SMTP / password reset / verify email / mail template | `email` |
| notification / alert / bell / real-time / push / websocket | `notification` |
| calendar / event / schedule / appointment / booking | `event-manager` |
| form / survey / questionnaire / dynamic fields | `form-builder` |
| task / board / kanban / ticket / sprint / project tracking | `task-manager` |
| language / i18n / translation / multilingual / locale | `localization` |
| AI chat / assistant / copilot / LLM | `ai-assistant` |
| multiple companies / branches sharing one database | `enableCompanyFeature = true`, `databaseMode = single` |
| each tenant gets its OWN separate database | `databaseMode = multi-tenant`, `enableCompanyFeature = false` |
| single company, no branches | `enableCompanyFeature = false`, `databaseMode = single` |
| role-based only / RBAC only | `permissionMode = RBAC` |
| direct permission only | `permissionMode = DIRECT` |
| both / flexible permission | `permissionMode = FULL` |
| postgres / postgresql | `dbType = postgres`, `DB_PORT = 5432` |
| mysql / mariadb | `dbType = mysql`, `DB_PORT = 3306` |

### 1.2 Ask once, grouped

Ask only for what signals could not resolve, in a **single** message — never in rounds.

```
Before I write the PRDs:

1. App name?
2. Primary purpose, one sentence?
3. Main entities and their key fields? Any status/state machine?
4. Features not already mentioned? (files, email, calendar, forms, notifications, i18n, AI)
5. Database structure:
   a) one shared database, multiple companies/branches (row isolation via company_id)
   b) a separate database per tenant
   c) single company, no branching
6. Production API URL? (or leave as TODO)
```

---

## Step 2 — Analysis

Do this before writing anything.

**Group entities into modules.** Parent and child entities that share a lifecycle (Invoice +
InvoiceItem) go in one module and one PRD. Unrelated domains get separate modules.

**Check package coverage before scoping a custom module.** Before writing a feature PRD, check
whether the whole capability is already covered by a selectable `@flusys/*` package rather than
custom entities — calendars/scheduling → `event-manager`, kanban/boards/tickets → `task-manager`,
dynamic/versioned forms → `form-builder`, alerts/real-time messages → `notification`, file
handling → `storage`. If it is, select the package pair in the bootstrap PRD's Package Selection
table instead of writing a feature PRD that duplicates its entities — write a feature PRD only for
the app's own logic that *uses* the package (typically through its adapter), not for the package's
own domain.

**Spot user extensions.** When an entity is really extra fields on the person who logs in —
employee, member, customer, patient — it extends the user record instead of becoming a second
directory. The auth package already ships the user list, profile and user form; a parallel
module duplicates them and the two drift. Give such a module a `## Module Shape` section
directly after `## Purpose`, stating that it extends the user record, that it has no list route
or menu entry of its own, and that its fields must reach all four user surfaces —
registration, profile, admin user list, admin user create/edit. Do not give it a navigation
entry in the bootstrap PRD; note instead that the existing user screen gains the fields.

**Order the modules.** Modules with no dependencies first, dependents after. `/develop-feature`
runs one PRD at a time in sequence, so a module can never be built before something it imports
entities from. This order drives both the `nn` filename prefix and the development-order list in
the bootstrap PRD.

**Pick an API strategy per module:**

| Module shape | Strategy |
| ------------ | -------- |
| Entity with a create/read/update/delete lifecycle | Full CRUD |
| Entity needing only a few of the ten base operations | Partial CRUD |
| Report, summary, calculation, process — no entity lifecycle | Domain Action |

**Propagate package needs upward.** If any feature module needs notifications, file attachments,
or translated content, the matching package must be selected in the bootstrap PRD.

---

## Step 3 — Write `docs/prd-bootstrap.md`

````markdown
# Bootstrap PRD — <App Name>

## App Identity

- **App name:** <name>
- **Purpose:** <one sentence>
- **Backend port:** 3002
- **Frontend port:** 3001
- **Production API URL:** <https://api.example.com | TODO>

## Config Values

| Key | Value | Derived from |
| --- | ----- | ------------ |
| appName | <value> | PRD |
| dbType | postgres \| mysql | <signal> |
| databaseMode | single \| multi-tenant | <signal> |
| enableCompanyFeature | true \| false | <signal> |
| permissionMode | FULL \| RBAC \| DIRECT | <signal> |
| enableEmailVerification | true \| false | email package selected? |
| ADMIN_EMAIL | admin@<appname>.com | default |
| ADMIN_PASSWORD | <TODO: set before first run> | must be changed |

## Package Selection

| Package pair | Selected | Reason |
| ------------ | -------- | ------ |
| nestjs-iam / ng-iam | yes/no | <signal> |
| nestjs-storage / ng-storage | yes/no | <signal> |
| nestjs-email / ng-email | yes/no | <signal> |
| nestjs-notification / ng-notification | yes/no | <signal> |
| nestjs-event-manager / ng-event-manager | yes/no | <signal> |
| nestjs-form-builder / ng-form-builder | yes/no | <signal> |
| nestjs-task-manager / ng-task-manager | yes/no | <signal> |
| nestjs-localization / ng-localization | yes/no | <signal> |
| nestjs-ai-assistant / ng-ai-assistant | yes/no | <signal> |

**Always included:** nestjs-core, nestjs-shared, nestjs-auth / ng-core, ng-shared, ng-layout,
ng-auth, ng-ui

## Seed Data

- Default admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- <if iam> Roles to seed: Admin, <Role2>, <Role3>
- <if localization> Default language: <code>; additional languages: <codes>

## Navigation Menu

In display order. Icons are [Lucide](https://lucide.dev) names.

| Label | Icon | Route | Notes |
| ----- | ---- | ----- | ----- |
| Dashboard | layout-dashboard | `/` | always present |
| <Module 1> | <lucide-name> | `/<route>` | |
| Administration | settings | `/administration` | always present, parent group |

## Feature Modules (development order)

Dependencies first — `/develop-feature` runs these in order.

1. `docs/prd-feature-01-<name>.md` — no dependencies
2. `docs/prd-feature-02-<name>.md` — depends on <name1>
````

---

## Step 4 — Write one `docs/prd-feature-<nn>-<name>.md` per module

Prefix `nn` with the two-digit development order resolved in Step 2.

````markdown
# Feature PRD — <Feature Name>

## Purpose

One paragraph: what this does, who uses it, why it exists.

## API Strategy

- **Strategy:** Full CRUD | Partial CRUD | Domain Action
- <if Partial CRUD> Operations needed: insert, getAll, getById, update
- <if Domain Action> Actions: <list each, and what it does>

## Entities

### <EntityName>

| Field | Type | Nullable | Notes |
| ----- | ---- | -------- | ----- |
| <fieldName> | string(255) / text / int / decimal(10,2) / boolean / date / timestamp / uuid / enum / json | yes/no | unique, default, constraints |

`id`, `createdAt`, `updatedAt`, and `deletedAt` come from the `Identity` base class — do not
list them.

<if enableCompanyFeature> `companyId` is present on this entity and always comes from the
authenticated user, never from a request payload.

**Enums:**

| Enum | Values | Default |
| ---- | ------ | ------- |
| <EntityStatusEnum> | DRAFT, ACTIVE, ARCHIVED | DRAFT |

**Relations:**

| Type | To | On delete |
| ---- | -- | --------- |
| ManyToOne | <OtherEntity> | SET NULL |
| OneToMany | <ChildEntity> | CASCADE |

**Indexes:** <columns filtered or joined frequently, plus any composite pairs>

## Endpoints

For Full or Partial CRUD, list only the operations needed — the controller factory provides them:

| Operation | Permission |
| --------- | ---------- |
| insert | `<feature>.create` |
| getAll | `<feature>.read` |
| getById | `<feature>.read` |
| update | `<feature>.update` |
| delete | `<feature>.delete` |

For Domain Actions, describe each one:

| Action | Input | Returns | Permission |
| ------ | ----- | ------- | ---------- |
| <actionName> | <what it accepts> | single record \| list \| message only | `<feature>.<action>` |

Permission keys are lowercase dot.case, prefixed with the feature name.

## Validation

| Field | Rule |
| ----- | ---- |
| <fieldName> | required, max 255 chars |
| <fieldName> | optional, one of <EnumName> |
| <fieldName> | required, minimum 0 |

## Response Fields

- **Exposed:** <field names safe to return>
- **Never exposed:** <sensitive fields, or "none">

## UI

### List page (`/<route>`)

- Columns: <field> (sortable), <field>, <field as status badge>
- Filters: <field — text / dropdown / date range>
- Row actions: Edit, Delete <+ domain actions>
- Search: yes/no — on <fields>
- Page size: 20

### Create / edit form

| Field | Input | Notes |
| ----- | ----- | ----- |
| <fieldName> | text / textarea / number / dropdown / date / file / toggle | required, max length |
| <fkField> | lazy-loaded dropdown | options from <OtherEntity> |

### Behaviour

- Status badge colours: <VALUE>=<colour>, …
- <nested tables, tabs, dialogs, conditional fields>
- <domain action buttons — placement, confirmation required?>

## Localization

- Translated content required: yes | no
- <if yes> Key prefix: `<feature>.`

## Non-Functional

- Expected volume: small (<1k) | medium (1k–100k) | large (>100k)
- List endpoint read-heavy: yes | no — <if yes, cache TTL>
- Known expensive joins or N+1 risks: <describe, or none>
- Soft delete: yes | no
- Audit log on: <which actions, or none>
- Notifications triggered: <when and to whom, or none>
- File attachments: <field name, allowed types, max size, or none>

## Dependencies

- Depends on: <modules this imports entities from, or none>
- Required before: <modules that depend on this, or none>
````

---

## Step 5 — Consistency Check

Verify and fix before printing the summary:

- [ ] Every navigation entry in the bootstrap PRD has a matching feature PRD
- [ ] Every package a feature PRD relies on is selected in the bootstrap PRD — notifications,
      file attachments, and translated content each require theirs
- [ ] `enableCompanyFeature` is `true` if any feature entity is company-scoped
- [ ] Development order matches the dependency declarations in the feature PRDs
- [ ] Permission keys are unique across modules and all use `<feature>.<action>` dot.case
- [ ] No PRD contains implementation detail (imports, decorators, module order, file paths)

---

## Step 6 — Summary

```
PRD Generation Complete
────────────────────────────────────────
Bootstrap:  docs/prd-bootstrap.md
Features:
  01 <name>   <N> entities, <N> endpoints
  02 <name>   <N> entities, <N> endpoints

Packages:  <selected list>

TODO items needing your input:
  docs/prd-bootstrap.md — <N>: <fields>
  docs/prd-feature-01-<name>.md — <N>: <fields>

Consistency check: PASSED | FIXED (<what>)

Run in this order:
  1. /bootstrap docs/prd-bootstrap.md
  2. /develop-feature docs/prd-feature-01-<name>.md
  3. /develop-feature docs/prd-feature-02-<name>.md
────────────────────────────────────────
```

---

## Hard Rules

- **Never invent a value.** Unknown becomes `<TODO: what is needed>`.
- **Never write implementation detail** — no import paths, decorator names, guard classes,
  module registration order, or file layouts. The skills own those and stay current with the
  packages; a PRD that repeats them goes stale silently.
- **`databaseMode` and `enableCompanyFeature` are independent.** A separate database per tenant
  is `multi-tenant`. Multiple companies in one shared database is `single` +
  `enableCompanyFeature`. The phrase "multi-tenant SaaS" alone decides nothing — read which one
  is meant.
- **`companyId` always comes from the authenticated user**, never a request payload. State this
  on every company-scoped entity.
- **Permission keys are `<feature>.<action>` in lowercase dot.case** — matching what the IAM
  package and the API skills expect.
- **One PRD per module.** Parent plus child entities stay together.
- **Ask once**, grouped. Never a second round of questions.
