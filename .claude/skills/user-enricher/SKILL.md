---
name: user-enricher
description: "How to properly wire up FLUSYS's user-enricher system end-to-end — backend IUserEnricher/USER_ENRICHER plus the four ng-auth extension tokens (AUTH_REGISTRATION_EXTENSION, AUTH_PROFILE_EXTENSION, AUTH_USER_FORM_EXTENSION, AUTH_USER_LIST_EXTENSION). Load when adding app-specific data (e.g. personal info, HR fields, employee data) that needs to show up across registration, self profile, admin user list, and admin user create/edit — not just one of them. Full type reference in references/api-reference.md; this file covers the verified, hands-on gotchas: which hooks/config fields are actually wired vs dead in the installed version, security traps, and route-ordering bugs."
---

# User Enricher — End-to-End Playbook

[references/api-reference.md](references/api-reference.md) documents the *shape* of this system
(types, tokens, example providers). This file documents how to actually wire it correctly, based
on tracing real call sites in an installed `@flusys/nestjs-auth` + `@flusys/ng-auth` version —
including several places where the `.d.ts` promises more than the shipped component actually does.

## The mental model

One dataset (e.g. "personal info", "HR fields") commonly needs to appear on **four surfaces**.
Each surface has its own frontend token and its own backend consumer — there is no single
"enricher" that covers all four automatically:

| Surface                        | Frontend token                | Backend consumer (nestjs-auth)          |
| ------------------------------- | ------------------------------ | ---------------------------------------- |
| Registration form (extra fields) | `AUTH_REGISTRATION_EXTENSION` | `IUserEnricher.onUserCreated`            |
| Self profile page (view/edit)   | `AUTH_PROFILE_EXTENSION`      | *your own app's* GET/PUT endpoints       |
| Admin user list (columns/actions)| `AUTH_USER_LIST_EXTENSION`   | `IUserEnricher.enrichListItems`          |
| Admin create/edit user form      | `AUTH_USER_FORM_EXTENSION`   | *your own app's* GET/PUT endpoints (admin-guarded) |

Registration is special: it's the only surface backed directly by an `IUserEnricher` hook
(`onUserCreated`) baked into `nestjs-auth`'s own transaction. Profile and admin-form are *not*
backed by dedicated `nestjs-auth` endpoints for your custom fields — you write your own
GET/PUT for them and just plug the calls into `getExtraFieldValues`/`saveExtraFieldValues`.

## Step 0 — verify before you build (do this first, every time)

A hook or config field existing in the `.d.ts` does **not** mean anything calls it. Library
versions add types ahead of wiring them into the actual components. Before implementing
anything, grep the **installed, compiled** package — not just the `.d.ts` — for a real call site:

```bash
# Does a backend hook actually get invoked?
grep -n "userEnricher?\." node_modules/@flusys/nestjs-auth/cjs/services/*.js

# Does a frontend component actually read an extension token's result?
# (inject()-ing a token proves nothing — find where the injected value is read in a
# computed()/template, not just assigned to a field.)
grep -n "<TOKEN_NAME>\|getExtra\|enrichUserData" path/to/ng-auth/pages/**/*.ts
```

**What one audited `@flusys/*` version turned up — treat as a worked example, not as fact about
your version. Re-run Step 0 before relying on any line of this:**
- **Live**: `onUserCreated` (registration), `enrichListItems` (admin list — called by
  `UserService.getAll()` on every fetch), `AUTH_REGISTRATION_EXTENSION`, `AUTH_PROFILE_EXTENSION`,
  `AUTH_USER_FORM_EXTENSION`, `AUTH_USER_LIST_EXTENSION.getExtraColumns`/`getExtraActions`.
- **Dead** (typed, injectable, but nothing calls them from the shipped UI): `getProfileExtras`,
  `getProfileSections`, `getProfileSectionData`, `updateProfileSection`, `updateProfileExtras`,
  `validateProfileExtras`, `handleSectionFileUpload`, `handleSectionFileDelete`,
  `calculateProfileCompletion` — there's a whole backend `UserController` surface
  (`getProfileWithExtras`, `getProfileSections`, etc.) with zero frontend consumer. Also dead:
  `IUserListExtensionProvider.enrichUserData` (never called by `UserListComponent`), and
  `AUTH_USER_DETAIL_CONFIG`'s `component`/`tabs` fields (only `viewMode`/`width`/`allowEdit` are
  actually read — the default detail dialog just re-renders `getExtraColumns()`).
- Implementing a "dead" hook is pure backend code with no visible effect — don't, unless you've
  just personally re-verified it's live in your version.

## Backend recipes

### `onUserCreated` — attach data at registration

- Runs **inside** `AuthenticationService.register`'s own `QueryRunner` transaction — use
  `queryRunner.manager`/`queryRunner.query`, never an injected repository, or you're outside the
  transaction. Throwing rolls back the whole registration.
- If your extra entity lives on a *different* datasource/connection than `nestjs-auth`'s own
  entities (common in multi-app monorepos — your app's tables aren't registered on
  `AuthDataSourceProvider`), you can't use `queryRunner.manager.save()` for it. Use
  `queryRunner.query(rawSql, params)` on the same `queryRunner` instead — it's the same
  underlying connection/transaction, just not TypeORM-repository-aware of your entity.
- Keep the registration DTO's `additionalFields` keys **identical** to the extension's field
  keys. The base register page auto-nests `extraFieldsModel()` under `additionalFields` — if the
  keys already match what `onUserCreated` expects, you need zero `transformRegistrationData`.

### `enrichListItems` — populate admin list columns

- Called on every `getAll()` — must be **one bulk query** (`In(ids)`), never N+1 per row.
- It is the *only* thing that makes `AUTH_USER_LIST_EXTENSION.getExtraColumns()`'s `field`
  lookup show real data — that column reads `user[field]` straight off the row Angular already
  has; there's no separate fetch triggered by the column definition itself. Skip this hook and
  every extra column just renders `-`.
- **DI scope gotcha**: `USER_ENRICHER` is typically provided inside `AuthModule.forRoot(...)`'s
  own `providers` array, not your feature module. If your enricher needs a request-scoped
  dependency (e.g. a multi-tenant datasource provider your feature module also uses), it must be
  listed in *that same* `providers` array too — it won't resolve through your feature module's DI
  graph from there. It's safe to provide the same class in both places if its underlying
  connection is cached on `static` fields (check before assuming).

### Locking down cross-user access

- Self-service endpoints (`GET /profile`, `PUT /profile/:id` called only with your own id)
  frequently ship with just `JwtAuthGuard` — safe only because nothing sends another user's id.
  The moment an admin-facing extension (list "view" action, admin form) starts calling the same
  shape of endpoint for *other* users, that's a live horizontal-privilege-escalation hole unless
  you add `PermissionGuard` + `@RequirePermission(...)`.
- Prefer a **separate admin route** (e.g. `PUT profile/admin/:id`) over branching one handler on
  `id === user.id` — much easier to guard correctly and reason about later.
- **Route-ordering bug**: Nest/Express matches same-method routes in declaration order within a
  controller. `PUT profile/admin/:id` must be declared **before** `PUT profile/:id`, or the
  generic route swallows it first with `id = 'admin'`. Same applies to any specific route that
  shares a path segment with a generic `:id` sibling.
- **Route path must literally match the frontend service's base URL**: with `@Controller('')`
  (no class-level prefix), there's no gateway magic aligning routes for you — the frontend's
  `getServiceUrl(appConfig, 'auth')` resolves to e.g. `http://host/auth`, so every custom
  endpoint's `@Get`/`@Post`/`@Put` decorator must itself start with `auth/...`
  (`@Get('auth/profile')`, not `@Get('profile')`) or the call 404s. This is easy to miss because
  Step 0's grep for a live call site still succeeds — the token is read, the handler exists, the
  DI is fine; only the literal path string is wrong. Verify by diffing the controller's route
  strings against `environment.ts`'s `services.<name>.baseUrl` plus the path suffix the frontend
  API service appends.

### File uploads before the user exists (registration)

- The generic storage upload endpoint is guarded end-to-end by JWT — an anonymous registrant
  filling the register form cannot use it, full stop.
- Add a small, dedicated, **unauthenticated** single-file upload endpoint that calls your storage
  service directly (bypassing the guarded controller), returning a file id. Point the
  registration extension's file field at that endpoint; submit the returned id as part of
  `additionalFields` — never the raw file.
- Authenticated contexts (profile self-service, admin form) don't have this problem — the user
  already has a JWT, so their save endpoint can just take a raw `File` via multipart directly, no
  pre-upload step needed. Don't build the pre-upload dance for these.
- These pre-registration uploads are easy to orphan: a registrant can upload a photo, get back a
  file id, then pick a *different* photo (or abandon the form) before ever submitting — the first
  upload never attaches to a user and leaks in storage forever. Add a companion unauthenticated
  delete endpoint (e.g. `POST auth/registration/delete-photo`) and call it from the field
  component whenever a previous upload's id is about to be replaced. Guard the delete itself
  against removing a file that *did* get claimed in the meantime — check the relevant claim
  columns (e.g. `AppUser.profilePictureId`, your extra entity's file-reference columns) with a
  couple of `exists()` queries before deleting; don't trust the client-supplied id blindly.

## Frontend recipes

### One field component, multiple context tokens

`PROFILE_FIELD_CONTEXT`, `USER_FORM_FIELD_CONTEXT`, and `REGISTRATION_FIELD_CONTEXT` are three
separate `InjectionToken`s with the *identical* `{ field, value, updateValue }` shape. To reuse
one field component (e.g. a file picker) between the profile and user-form extensions, inject
both optionally and fall back:

```ts
private readonly context =
  inject(PROFILE_FIELD_CONTEXT, { optional: true }) ??
  inject(USER_FORM_FIELD_CONTEXT, { optional: true })!;
```

`IRegistrationExtraField` has `defaultValue`/`containerClass`; `IProfileExtraField` and
`IUserFormExtraField` do **not**. There is no way to preset a value through the field descriptor
for those two — any "current value" (existing photo URL, current select value) has to come back
through `getExtraFieldValues()`'s returned record instead, and your field component reads it off
`context.value` on render.

### Sharing field descriptors between profile and user-form

Since they usually edit the same dataset through the same save-endpoint shape, write one factory
returning `IProfileExtraField[]` and cast at the user-form call site
(`as unknown as IUserFormExtraField[]`) rather than duplicating the array — the two interfaces
are structurally compatible for the common subset of properties (`key`, `label`, `type`,
`required`, `options`, `order`, `component`).

### Admin "view details" without fighting a half-wired config

If `AUTH_USER_DETAIL_CONFIG`'s `component`/`tabs` turn out dead in your version (see Step 0),
don't fight it. Use `AUTH_USER_LIST_EXTENSION.getExtraActions()`'s `onClick(user)` — a plain
callback you fully control — to open your own dialog. Actions have no template slot to render
into, so mount the dialog once, globally (e.g. in the app root component), driven by a small
`providedIn: 'root'` service holding a `selectedUserId` signal that the action sets and the
dialog reads.

## Checklist before calling it done

- [ ] Every backend hook implemented has a verified live call site (Step 0), not just a `.d.ts` entry
- [ ] `onUserCreated`'s `additionalFields` keys match the registration extension's field keys exactly
- [ ] `enrichListItems` does one bulk query, never N+1
- [ ] Any endpoint newly reachable with another user's id has `PermissionGuard` + `@RequirePermission`
- [ ] New admin-only routes are declared before more generic parameterized siblings on the same path
- [ ] Registration-time file uploads go through a dedicated unauthenticated endpoint, never `FILE_PROVIDER`
- [ ] All extension tokens are registered in `app.config.ts` alongside `provideAuthProviders()`/`provideAuthLayoutIntegration()`

## See also

- [references/api-reference.md](references/api-reference.md) — full `USER_ENRICHER`/`IUserEnricher`
  type reference and all six `ng-auth` extension-token examples
