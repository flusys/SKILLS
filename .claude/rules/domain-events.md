---
paths:
  - "backend/src/consumers/*.ts"
  - "backend/src/modules/**/consumers/*.ts"
  - "backend/src/config/modules.config.ts"
---

# Domain Events Are Fire-and-Forget

A `@OnDomainEvent` handler is not part of the request that produced the event. Nothing awaits it,
its errors are caught and logged, and the event is dropped entirely while a broker is down. So:

- **Never make a correctness requirement depend on a handler.** If losing the reaction would be a
  bug, call the owning service or an adapter token from the acting service instead.
- **Handlers must be idempotent.** The same event can arrive again after a broker reconnect, and
  `hybrid` mode only remembers the last 5000 ids in this process.
- **Consumers must be singletons.** Handlers are bound at bootstrap; a `REQUEST`-scoped provider
  has no instance to bind, so its handlers never run — the explorer logs one warning and moves on.

In `modules.config.ts`, `moduleEventsConfig` decides what ever reaches a consumer:

- **`actions` is the only filter.** Each entry is either `<entity>.<action>` for one entity alone
  or a bare action covering every entity of the module; both halves accept wildcards (`role.*`,
  `*.purged`). Omit `actions` entirely and every action publishes.
- **Every pair is spelled out, CRUD lifecycle ones included** — so one can be dropped by deleting
  its line. Adding a domain action without also listing that entity's `created`/`updated`/
  `deleted` silences them. Never fold them back into a bare action or a shared CRUD spread.
- CRUD action names are written as literals (their five names never change); every other action
  comes from its package's `*_EVENT_ACTIONS` constant, so a rename there breaks the build instead
  of silently muting the event.
- The entity half is the one **in the event name**, not the table you expect:
  `auth.session.logged-in` is matched by `session.logged-in`, never `appuser.logged-in`.
- The storage and email provider config rows do publish. Their credential blob does not — the
  payload sanitizer redacts the `config` key by name, so S3, Azure, SFTP and SMTP secrets never
  leave the process even though the row is on the bus.
- `includePayload` defaults to **on**. Set it to `false` for a module whose rows carry personal
  data or message bodies; do not restate the default.
- This app's own feature modules register no block here; they fall through to
  `appDomainEventsConfig` via `EventBusModule.forRoot({ defaultModuleEvents })`. Without it their
  `publishDomainAction` calls are silent no-ops while the packages publish normally.

Full mechanism — transports, the per-package action catalog, publishing rules, and the
event-vs-adapter decision: `.claude/skills/engineering/references/domain-events.md`.
