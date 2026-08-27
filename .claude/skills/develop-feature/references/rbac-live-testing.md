# Live-Testing an RBAC-Gated Endpoint

Read this before curl-testing any `@RequirePermission`-gated endpoint — every step below is a
fact about `@flusys/nestjs-iam`/`nestjs-shared`'s permission system, not project code, so it's the
same on every feature.

## 1. Warm the permission cache — required after every backend restart, for every user, including admin

`PermissionGuard` (`@flusys/nestjs-shared`) only ever **reads** a cache via
`SharedPermissionCacheService.getPermissions()` — it never computes on a miss. Nothing in the
login flow populates that cache. The only thing that computes-and-caches is
`@flusys/nestjs-iam`'s `MyPermissionController`, called by the dashboard SPA once right after
login. A raw curl session never triggers it, and a backend restart **empties** the cache (it does
not "refresh" it — restart is not a fix, it's the reason you need this step).

So: after login, and again after every backend restart, call this once per test user before any
other request:

```bash
curl -s -X POST http://localhost:3002/iam/permissions/my-permissions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
```

Symptom if skipped: every `@RequirePermission`-gated endpoint returns
`{"success":false,"message":"No permissions found","messageKey":"error.no.permissions.found"}`
regardless of how correct the underlying `Role`/grants are. If you see that message, warm the
cache before debugging anything else.

## 2. The IAM schema, for provisioning a test user directly via SQL

There's no registration UI for most roles yet, so a test user under `permissionMode: "RBAC"` is
usually provisioned directly in Postgres. One polymorphic table, `user_iam_permission`, covers all
of role-action grants and role assignment — there is no separate `role_action`/`user_role` table,
don't go looking for one. Columns: `permission_type`, `source_type`, `source_id`, `target_type`,
`target_id`, plus `company_id`/`branch_id` scoping. Lowercase string values:

| `permission_type` | `source_type` → `source_id` | `target_type` → `target_id` | Meaning |
| ------------------ | ---------------------------- | ----------------------------- | ------- |
| `role_action`       | `role` → role id             | `action` → action id           | grants an action to a role |
| `user_role`         | `user` → app_user id          | `role` → role id               | assigns a role to a user |
| `user_action`       | `user` → app_user id          | `action` → action id           | direct grant — **ignored entirely under pure `RBAC`** (`PermissionCacheService.collectAllActionIds()` only resolves `USER_ROLE`→`ROLE_ACTION` chains under `RBAC`; direct grants only count under `DIRECT`/`FULL`) |
| `company_action`    | `company` → company id        | `action` → action id           | company-wide grant |

Separately, `user_company_permissions` (`user_id`, `permission_type` = `'company'`/`'branch'`,
`target_id`, `is_active`) controls which company/branch the user can select at login — a user
needs a row for **both** `company` and `branch` or `/auth/select` rejects them.

Minimal provisioning template (swap in real ids for the action codes your feature owns):

```sql
INSERT INTO app_user (id, name, email, password, is_active, email_verified)
VALUES ('<uuid>', 'Test User', 'test-x@test.local', '<bcrypt hash>', true, true);

INSERT INTO user_company_permissions (user_id, permission_type, target_id, is_active) VALUES
  ('<user-id>', 'company', '<company-id>', true),
  ('<user-id>', 'branch',  '<branch-id>',  true);

INSERT INTO role (id, name, description, is_active, company_id)
VALUES ('<role-id>', 'Temp Test Role', 'temp', true, '<company-id>');

INSERT INTO user_iam_permission (permission_type, source_type, source_id, target_type, target_id, company_id) VALUES
  ('role_action', 'role', '<role-id>', 'action', '<action-id-1>', '<company-id>'),
  ('role_action', 'role', '<role-id>', 'action', '<action-id-2>', '<company-id>'),
  ('user_role',   'user', '<user-id>', 'role',   '<role-id>',     '<company-id>');
```

Generate a bcrypt hash inline: `node -e "console.log(require('bcrypt').hashSync('Test@1234', 10))"`
(run from `backend/`, where the `bcrypt` package is already installed).

Look up real action ids with:
`SELECT id, code FROM action WHERE code IN ('<module>.read', ...);`

## 3. Clean up afterward

Delete in this order to respect FKs: `audit_logs` rows referencing the test user →
domain rows the test created → `user_iam_permission` rows (`source_id` = user or role id) →
`user_company_permissions` → `role` → `app_user`. Also revert any existing row you temporarily
mutated to set up the test (e.g. flipping an enrollment's `status` to make it "current") back to
its original value — don't leave seeded/pre-existing data in a test-only state.
