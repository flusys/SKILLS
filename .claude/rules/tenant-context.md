---
paths:
  - "backend/src/modules/**/controllers/*.controller.ts"
  - "backend/src/modules/**/services/*.service.ts"
---

# `companyId` / `branchId` Always Come From `@CurrentUser()`

Never read `companyId` or `branchId` from a request DTO, query string, or path param. Read them
from `@CurrentUser()` in the controller and forward them as explicit method parameters to the
service — a client-supplied value is a direct cross-tenant write vector, not just a read one.

The one exception: an entity whose own PRD names a platform-level actor (e.g. Super Admin, with no
`companyId` claim of their own) managing it across every company. There, `companyId` is legitimately
an explicit, required, DTO-supplied create-time field — safe specifically because create/update is
permission-gated to that actor alone, so the cross-tenant-write threat this rule guards against
doesn't apply. See `BusinessProfileService` in `school-profile-subscription` for the worked
example. Everywhere else, the rule above is absolute.

`<if enableCompanyFeature>` every list/get query on this entity must also scope by `companyId` —
see `.claude/skills/engineering/references/security.md`'s Multi-Tenant Isolation section for the
`applyCompanyFilter` helper. `.claude/hooks/check-company-filter.sh` enforces that query-side half
mechanically on save; this file surfaces the controller-side half the moment either file is open,
the same way `entities.md` and `migrations.md` cover the other two Hard Rules.
