# Domain Events

The event counterpart of `HybridCache`: one wrapper (`HybridEventBus`), transport chosen by
configuration. Every `@flusys/*` service already publishes; the app's job is to decide what is
armed, and to consume.

Read this when wiring `EventBusModule`, narrowing a module's `events` block, publishing from a
feature service, or writing an `@OnDomainEvent` consumer.

---

## The envelope

Every event, CRUD or domain action, is the same shape. The name is always
`<module>.<entity>.<action>`.

```typescript
import { DomainEvent } from "@flusys/nestjs-shared/interfaces";

// storage.file_manager.uploaded
{
  id: "9f1c…",                       // uuid — also the dedupe key in hybrid mode
  name: "storage.file_manager.uploaded",
  module: "storage",
  entity: "file_manager",
  action: "uploaded",
  payload: {
    ids: ["…"],                      // always present
    data: [ /* saved rows */ ],      // unless the module sets includePayload: false
    metadata: { count: 3, location: "s3" },  // always attached when the publisher sets it
  },
  actor: { userId, companyId, tenantId, requestId },
  occurredAt: "2026-09-04T11:20:31.004Z",
  version: 1,
}
```

CRUD lifecycle actions are `created`, `updated`, `deleted`, `restored`, `purged` — the
`CrudEventActionName` union in `@flusys/nestjs-shared/interfaces`. There is no `EventAction` enum;
`action` is a plain string on the wire, and these five names are the ones `ApiService` emits for
its own entity. `delete` and `restore` carry ids only — there is no row left to attach. Everything
else is a domain action, a string each package exports from its own `config` entry point.

Events are published **after the transaction commits** and never fail the write that produced
them: `publishDomainEvent` swallows its own errors by design.

---

## Transports

| `USE_EVENT_LABEL` | Behaviour | Extra install |
| ----------------- | --------- | ------------- |
| `memory` (default) | In-process only | none |
| `rabbitmq` | Topic exchange, cross-service | `npm i amqplib` |
| `kafka` | Single topic, cross-service | `npm i kafkajs` |
| `hybrid` | Both layers, duplicate delivery dropped by event id | broker of choice |

Both drivers are loaded at runtime through `loadOptionalModule`, so the package builds and boots
without either installed. `hybrid` picks its broker from `EVENT_BROKER` (default `rabbitmq`).

Operational facts that decide whether a design works:

- **One delivery per service, not per replica.** RabbitMQ binds a single queue
  `<serviceName>.events`; Kafka joins one consumer group `<serviceName>-events`. Two replicas of
  the same service compete for each event and only one handles it. A service that must see every
  event on every replica needs its own `queue` / `groupId`.
- **A publisher consumes its own events.** Under `rabbitmq`/`kafka` local handlers run off the
  broker round trip — one code path across services. Under `hybrid` the in-process copy arrives
  first and the broker copy is dropped by id, so a handler still runs exactly once.
- **A broker that will not start degrades to in-process delivery** with an error log, rather than
  failing boot. Nothing reaches another service in that state — the log line is the only signal.
- **RabbitMQ reconnects itself** (`reconnectDelay`, 5s default) and re-binds every pattern.
  Publishes during the outage are dropped, not queued.
- **A subscription taken while the bus is down still binds later.** `subscribe` returns without a
  transport in that state; the bus remembers the pattern and binds it once transports are built,
  so a consumer registered before the broker came up does consume rather than sitting silent.
- **Kafka builds its consumer on the first bind**, not at connect, so a missing topic breaks
  consumption alone and leaves the producer working.

Events are fire-and-forget infrastructure, not a durable outbox. Anything that must not be lost
needs a row in the database, not an event.

---

## Registering the bus

`EventBusModule` is optional — no package injects the bus as a hard dependency. Leave it out and
the app boots fine, every publish is a silent no-op, and the one thing lost is consumption
(`@OnDomainEvent` methods are bound by an explorer that ships inside the module).

```typescript
// app.module.ts
import { EventBusModule } from "@flusys/nestjs-shared";

EventBusModule.forRoot({
  serviceName: "my-app",                    // queue name / kafka clientId
  defaultModuleEvents: appDomainEventsConfig,
});
```

`forRoot({ enabled: false })` is for the other case: the app supports events, this deployment has
them off, and you want that stated at startup. `enabled` defaults to the `ENABLE_DOMAIN_EVENTS`
env value.

**`defaultModuleEvents` is what arms the app's own modules.** Each `@flusys/*` package registers
its `events` block through its module options; a feature module written in this project registers
nothing, so it falls through to `defaultModuleEvents`, which defaults to `{ enabled: false }`.
Without it, a feature service's `publishDomainAction` call is a no-op while the packages are
happily publishing — silently, with no warning anywhere.

Anything in the app that injects `EVENT_BUS_INSTANCE` directly must mark it `@Optional()` (with
an explicit `@Inject`), or the service stops resolving in a deployment that omits the module.

`main.ts` must call `app.enableShutdownHooks()` — that is what closes broker connections cleanly.

---

## Per-module `events` config

Every feature package takes the same block inside its own `config`, and the block is the single
authority on whether that module publishes:

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `enabled` | `boolean` | `false` | Master switch for the module. Everything else is ignored when off |
| `actions` | `string[]` | all | Allowlist of actions and `<entity>.<action>` pairs |
| `includePayload` | `boolean` | `true` | Attach saved rows as `payload.data`; ids and metadata always ride |

`actions` is the **only** filter — there is no `entities` allowlist and no `excludeEntities`
denylist. Three rules decide what actually reaches a consumer:

1. **An entry with a dot is matched against `<entity>.<action>`; one without a dot is matched
   against the action alone**, and so covers every entity of the module. `['company.created']`
   publishes company inserts and nothing else; `['created']` publishes every entity's inserts.
2. **Both halves accept the routing wildcards** — `role.*` is every action on `role`, `*.purged`
   is every entity's purge, `#`/`**` span multiple segments. Omitting `actions` publishes
   everything the module can.
3. **It is one allowlist over CRUD and domain actions together.** Listing only
   `['session.logged-in']` silences that module's `created`/`updated`/`deleted` too. And the entity
   half is the one **in the event name**, which for a domain action is not always the table you
   expect: `auth.session.logged-in` is matched by `session.logged-in`, never `appuser.logged-in`.

Entity names are the ones the services register — some `snake_case` (`form_result`,
`file_manager`), some `camelCase` (`storageConfig`, `emailConfig`, `translationKey`). Check them
against each package's `<PKG>_EVENT_ENTITIES` constant before writing a pair.

Keep every module's block in one map in `config/modules.config.ts` (`moduleEventsConfig`), armed
by one env flag, and spell every pair out in full — the file then reads as an inventory of what
the app can publish, and a line is deleted to stop publishing it. Write the five CRUD action names
as literals, since they never change, and take every other action from its package's
`*_EVENT_ACTIONS` constant so a rename there breaks the build instead of silently muting the
event. Never collapse them back into a bare action or a shared CRUD spread. The cost of spelling
them out is that a package gaining a new entity or action stays silent until it is added here.

The `storageConfig` and `emailConfig` rows publish like any other. Their credentials do not: the
sanitizer redacts the `config` key by name, so the S3, Azure, SFTP and SMTP settings blob never
leaves the process.

Payloads are walked before they leave the process — credential-like fields become `[REDACTED]`,
a relation that loops back `[CIRCULAR]`, anything past 8 levels `[TRUNCATED]`, a Buffer
`[BINARY]` — so publishing saved TypeORM rows with bidirectional relations is safe. That is
sanitization, not authorization: everything on the bus is readable by every consumer and by the
broker, so prefer `includePayload: false` plus a `metadata` descriptor for anything sensitive.

### What each package can publish

| Module | Entities | Domain actions (beyond CRUD) |
| ------ | -------- | ---------------------------- |
| `auth` | `appuser`, `company`, `company_branch`, `session`, `user_company_permission`, `social_auth_config` | `registered`, `password-changed`, `password-reset-requested`, `password-reset`, `email-verified`, `logged-in`, `logged-out`, `token-refreshed`, `company-switched`, `social-logged-in`, `permission-granted`, `permission-revoked` |
| `iam` | `action`, `role`, `user_action`, `role_action`, `company_action`, `user_role` | `permissions-assigned` |
| `storage` | `file_manager`, `folder`, `storageConfig` | `uploaded`, `removed` |
| `form-builder` | `form`, `form_result` | `submitted`, `draft-saved` |
| `email` | `email_message`, `emailConfig`, `emailTemplate` | `sent`, `failed` |
| `event-manager` | `event` | `participant-status-changed` |
| `notification` | `notification` | `sent`, `read`, `all-read` |
| `localization` | `language`, `translationKey`, `translation` | `bulk-updated` |
| `task-manager` | `task`, `task_board`, `task_list`, `task_label`, `task_comment` | `moved`, `assigned`, `reordered` |

The constants are `<PKG>_EVENT_ACTIONS`, `<PKG>_EVENT_ENTITIES` and `<PKG>_EVENT_MODULE` from
`@flusys/nestjs-<pkg>/config`. This table is a starting point, not an authority — grep the
installed package's `config` entry point before assuming an action exists or does not.

Useful metadata riders: storage uploads/removals carry `location`, `storageConfigId`, `totalSize`,
`count`; form submissions carry `formId`, `isDraft`, `schemaVersion`; the event-manager
participant event is keyed by the **event** id with `participantId`/`participantUserId`/`status`
in metadata; `task.moved` carries `fromListId`/`toListId`; `translation.bulk-updated` carries
every written id plus `count`, and is not published when nothing was written.

---

## Publishing from a feature service

A service extending `ApiService` publishes CRUD automatically. For anything past CRUD:

```typescript
// inside a service extending ApiService — module and entity are filled in
await this.publishDomainAction("settled", {
  ids: [invoice.id],
  metadata: { amount: invoice.total, currency: invoice.currency },
  user,
});
```

Anywhere else (a Domain Action service that extends nothing):

```typescript
import { publishDomainEvent } from "@flusys/nestjs-shared/classes";

await publishDomainEvent({
  module: "billing",
  entity: "invoice",
  action: "settled",
  ids: [invoice.id],
  metadata: { amount: invoice.total },
  user,
});
```

`ApiService`'s 6th constructor argument is `moduleName` — the `<module>` segment of every event
the service emits, and the app slug by convention in this template, so app events read
`<app-slug>.invoice.settled` and one `<app-slug>.**` pattern covers the whole app. It is
**required**: there is no fallback module name, so a service cannot publish anonymously. Keep the
string byte-identical across services, and identical to what consumers subscribe to.

Rules for a publisher:

- Publish **after** the state change is committed, never inside the transaction.
- Publish **facts, not commands** — `invoice.settled`, not `send-invoice-email`. A name that reads
  as an instruction means the caller should have called a service method instead.
- An action name is `kebab-case`, past tense, and permanent: consumers and other services'
  `actions` allowlists are keyed on the string.
- Never make the operation's success depend on the event. Nothing awaits a handler, handler errors
  are logged and swallowed, and a broker outage drops the event entirely.

---

## Consuming

```typescript
import { OnDomainEvent } from "@flusys/nestjs-shared/decorators";
import { DomainEvent } from "@flusys/nestjs-shared/interfaces";

@Injectable()
export class AuditConsumer {
  @OnDomainEvent("storage.*.created", "auth.appuser.deleted")
  async handle(event: DomainEvent): Promise<void> {
    // event.payload.ids / .data / .metadata, event.actor, event.action
  }
}
```

`*` matches exactly one segment; `**` (or `#`) matches the rest. Handlers are discovered at
bootstrap on any **singleton** provider or controller registered with Nest — a `REQUEST`-scoped
provider has no instance to bind, and the explorer logs a warning and moves on, so consumers
belong on default-scoped providers.

Keep handlers **idempotent**: the same event can be delivered again after a broker reconnect, and
`hybrid` mode's dedupe window is only the last 5000 ids in that process. Handler errors are caught
and logged, so a failed handler is invisible unless it logs something meaningful itself.

Register app-level consumers in `AppModule.providers` (`src/consumers/`). A consumer that needs a
feature service belongs in that feature's module instead, where the service is already provided.

---

## Events vs. adapter tokens

Both cross module boundaries; they are not interchangeable.

| Use | When |
| --- | ---- |
| Adapter token (`NOTIFICATION_ADAPTER`, `EVENT_MANAGER_ADAPTER`, …) | The caller needs the thing to happen, needs the result, or needs it inside the same request — `@Optional()` injection, direct call, ordinary error handling |
| Domain event | The publisher does not care who reacts, or whether anyone does — audit trails, projections, cache busting, fan-out notifications, cross-service integration |

If losing the reaction would be a bug, it is not an event. Reach for the adapter, or a direct
call to the owning service.

---

## Anti-patterns

| Anti-pattern | Correct approach |
| ------------ | ---------------- |
| Awaiting an event to get a result back | Events are one-way. Call the owning service, or an adapter token |
| A handler whose failure must fail the request | Handler errors are swallowed — do the work inline instead |
| `@OnDomainEvent` on a `REQUEST`-scoped provider | Handlers bind at bootstrap; put consumers on singletons |
| Publishing from inside the transaction | Publish after commit, so a rollback cannot emit a lie |
| Enabling a module's events without narrowing `actions` | Every table's every write hits the bus — spell out the `<entity>.<action>` pairs |
| A module's `actions` listing only the new domain action | It is one allowlist: that entity's CRUD actions are silenced too |
| A shared `CRUD_EVENT_ACTIONS` spread across modules' `actions` | Write each `<entity>.<action>` pair on its own line, so one can be dropped by deleting it |
| Reaching for `entities` / `excludeEntities` | Gone — scope by putting the entity in the `actions` entry instead |
| App feature events without `defaultModuleEvents` | Unregistered modules default to disabled — arm them on `EventBusModule.forRoot` |
| Injecting `EVENT_BUS_INSTANCE` without `@Optional()` | Breaks any deployment that omits `EventBusModule` |
| `includePayload: true` on a module carrying personal or credential data | Publish ids plus a `metadata` descriptor; let consumers read what they are allowed to read |
| Treating the bus as a job queue or an outbox | Not durable — dropped during an outage. Persist the work, then publish |
| Renaming an action once consumers exist | The string is the contract; add a new action instead |
