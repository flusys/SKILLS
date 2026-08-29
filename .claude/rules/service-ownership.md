---
paths:
  - "backend/src/modules/**/services/*.service.ts"
---

# One Owning Service Per Entity

Before calling `manager.findOne`/`manager.save`/`manager.update`/`manager.delete`/`getRepository`
on an entity in this file, check: does this service **own** that entity? If not, that entity has
its own owning service somewhere in its domain module — call a public method on it instead of
reaching around it, even if the operation looks trivial enough to "just replicate here." This
applies across module/feature boundaries too, not only within one domain: if this service needs to
read-or-create a row belonging to an entity owned by a different feature, add a small additive
public method to *that* entity's owning service (e.g. `FeeHeadService.findOrCreateByName`) rather
than touching its table directly from here.

The one exception is a read-only reporting/aggregation service, which may query any entity
directly across a domain — but it must never mutate one it doesn't own.

Full pattern, the `ModuleRef`-based fix for two request-scoped owning services that need each
other, and worked examples: `.claude/skills/engineering/references/database.md`'s Service
Ownership Pattern section.
