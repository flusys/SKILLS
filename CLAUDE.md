# FLUSYS Template

The reference monorepo for building on `@flusys/*`: Angular 22 dashboard + NestJS 11 backend,
with **every** FLUSYS package already wired. A starting point, not a product.

## Using This Template

> Template-only section — `/bootstrap`'s Phase A deletes it when it stamps a real project.

```bash
git clone <template-repo> my-app
cd my-app
rm -rf .git && git init
```

Then run the workflow skills in order. Each has a single job:

```
requirements ──▶ /prd-generator ──▶ docs/prd-bootstrap.md
                                     docs/prd-feature-01-*.md …
                       │
  /bootstrap ──────────┤  first run: name the app, regenerate secrets, rewrite this file
                       │  every run: select packages, configure wiring, migrate, seed
                       │
  /develop-feature ────┘  one feature module per PRD, in dependency order
```

`/bootstrap` auto-detects whether this is still the untouched template (and stamps identity first)
or an already-named project (and skips straight to package wiring) — nothing to invoke separately
for that.

Review the generated PRDs before running `/bootstrap` — they are the contract, and the skills are
written so that a complete PRD never needs a follow-up question.

To add the kit to an _existing_ FLUSYS project instead, copy `.claude/` into it and write a
`CLAUDE.md` following the shape of this one. The skills glob for project roots rather than
hardcoding `backend/` and `dashboard/`, so other folder names work — confirm the detected paths
on the first run.

## Tech Stack

| Layer    | Stack                                                                   |
| -------- | ----------------------------------------------------------------------- |
| Frontend | Angular 22 (signals, standalone, zoneless) + `@flusys/ng-ui` + Tailwind |
| Backend  | NestJS 11 + TypeORM + PostgreSQL + JWT                                  |
| API      | RPC over POST for entity CRUD; GET for domain reads (not REST)          |
| Ports    | Dashboard `http://localhost:3001` · Backend `http://localhost:3002`     |

## Working Model

`@flusys/*` packages are consumed from npm. You configure them; you never read or edit their
internals. Each package exposes exactly three surfaces:

| Surface           | Backend                                                   | Frontend                                        |
| ----------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Registration      | `XxxModule.forRoot(...)` in `app.module.ts`               | `...provideXxxProviders()` in `app.config.ts`   |
| Options           | `getXxxModuleOptions()` in `config/modules.config.ts`     | `services.xxx` in `environments/environment.ts` |
| Routes / entities | `getXxxEntitiesByConfig()` in `config/entities.config.ts` | `XXX_ROUTES` in `app.routes.ts`                 |

## Skills & Agents

Workflow steps are skills under `.claude/skills/` — invoked by name with `/`, or automatically
when their description matches what you are doing. A skill runs inline, in the main conversation,
which is what lets a step like `/refactor` check `git status` and ask before a risky bulk edit.
There is no `commands/` folder — skills replace it.

`.claude/agents/` holds subagents: isolated, tool-restricted workers for the one job a skill can't
do — an independent check that is structurally unable to also fix what it finds. Reserved for
that; anything that edits files or needs your live input stays a skill.

| Agent                                            | Purpose                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [code-reviewer](.claude/agents/code-reviewer.md) | Read-only second pass over changed files — correctness, security, FLUSYS conventions. Cannot edit; can only report |

**Token & model economy:** a skill stays cheap to load — a short `SKILL.md` plus `references/`
pulled in only at the step that needs them (`api-design`, `bootstrap`, `engineering`), never the
whole thing up front. Both agents (`.claude/agents/*.md`) and skills (`.claude/skills/*/SKILL.md`)
can pin a model in frontmatter for narrow, mechanical work instead of inheriting the conversation's
default — a subagent's `model:` field runs its whole isolated context on that model
(`code-reviewer`'s `model: haiku`); a skill's `model:` field overrides only for the rest of the
current turn, then reverts (`rules-writer`'s `model: haiku` — grep, distill into a fixed template,
write). The same `model` option works inside `.claude/workflows/*.js`'s `agent()` calls, per spawned
agent — see `refactor-sweep.js`. Reserve the default/no-override model for generation and judgment
calls; route mechanical, well-scoped, or read-only work to a cheap one the same way.

**Workflow — run these, usually in this order:**

| Skill                                                      | Purpose                                                                                                                                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [prd-generator](.claude/skills/prd-generator/SKILL.md)     | Requirements → a bootstrap PRD plus one PRD per feature module                                                                                                                                       |
| [bootstrap](.claude/skills/bootstrap/SKILL.md)             | **First run on a fresh copy:** name the app, regenerate secrets, rewrite `CLAUDE.md` — auto-detected, never asked about. **Every run:** select packages from the PRD and configure every wiring file |
| [develop-feature](.claude/skills/develop-feature/SKILL.md) | Build one full-stack feature from a feature PRD                                                                                                                                                      |
| [refactor](.claude/skills/refactor/SKILL.md)               | Remove dead code and broken patterns from a file or folder                                                                                                                                           |

**Reference — loaded automatically while writing code:**

| Skill                                                  | Purpose                                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [api-design](.claude/skills/api-design/SKILL.md)       | Endpoint strategy, guards, response DTOs; `ApiService`/`ApiResourceService`, CRUD generation, Swagger, and shared components in `references/` |
| [engineering](.claude/skills/engineering/SKILL.md)     | Code quality, `envConfig`, TypeORM, HybridCache, OWASP security, Angular auth/session foundations                                             |
| [ui-design](.claude/skills/ui-design/SKILL.md)         | `@flusys/ng-ui` component catalog + Tailwind v4 design guide                                                                                  |
| [user-enricher](.claude/skills/user-enricher/SKILL.md) | End-to-end user-extension wiring across registration, profile, and admin                                                                      |

Large skills keep a short `SKILL.md` and push procedure into `references/`, loaded only when
actually needed.

**Continuous — runs after any task, not part of the pipeline:**

| Skill                                                | Purpose                                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [rules-writer](.claude/skills/rules-writer/SKILL.md) | Distill a correction or a just-fixed bug's root cause into a rule appended to `docs/CLAUDE.RULES.md`, so the next session doesn't repeat it |

## Proactive Behavior

| Trigger                                                                                | Action                                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Raw requirements, no PRD yet                                                           | `/prd-generator`, then `/bootstrap`                                         |
| A completed `docs/prd-bootstrap.md`                                                    | `/bootstrap docs/prd-bootstrap.md`                                          |
| A bare file path                                                                       | `/refactor` on it                                                           |
| "refactor the whole project" / "final pass on all files"                               | `/refactor <folder>` — it walks every file, no sampling                     |
| A real bug just got fixed, or a task finished having revealed a non-obvious correction | `rules-writer` — capture it in `docs/CLAUDE.RULES.md` before reporting done |

**Never sample.** When asked to process every file, actually edit every file.

## Hard Rules

- **Reuse before you build.** Before writing a custom entity, method, or cross-package
  integration, check whether a `@flusys/*` package, adapter token, or base-class hook already does
  it: package-level in `prd-generator`'s package table, adapter-level in `api-design`'s
  Integration Adapters (grep `@flusys/nestjs-shared/interfaces` for every `*_ADAPTER` token — never
  trust a hardcoded list), method-level in `develop-feature`'s base → hook → custom ladder. Only
  write new code for what nothing already covers, shaped like the closest existing pattern.
- **Never modify anything under `node_modules/`.** If a `@flusys/*` package is broken, report it
  by package name and stop.
- **Never hand-edit migrations.** Change the entity and regenerate.
- `companyId` / `branchId` always come from `@CurrentUser()` — never from a request DTO.
- Entity helpers import from the `/entities` subpath: `@flusys/nestjs-auth/entities`.
- Package routes use `children: XXX_ROUTES`, never `loadChildren` — they are already lazy.
- Project-specific conventions (DataSource provider name, app slug, API prefix) belong in this
  file, never in `.claude/skills/` — those are shared and get replaced when the kit is updated.

## Learned Rules

`docs/CLAUDE.RULES.md` accumulates corrections and bug-fix root causes learned while building
_this_ project — written by the `rules-writer` skill, one project at a time, never touched by a
kit update. If it exists, check it (a cheap `grep -n "^## "` first, per that skill's own approach)
before starting any nontrivial task; treat what it says with the same authority as the Hard Rules
above.

## Maintaining the Kit

> Template-only section — `/bootstrap`'s Phase A deletes it when it stamps a real project.

The skills describe a template and a set of published packages. Both move, and when the docs
drift the kit silently generates broken projects.

- **Verify before documenting.** A symbol existing in a `.d.ts` does not mean anything calls it.
  Grep the installed package for a real call site — the `user-enricher` skill shows the technique.
- **Fix the reference, not the output.** If a generated project needed a manual correction, the
  reference file that produced it is wrong.
- **Keep examples generic.** No real project names, app slugs, or domain entities in shared
  skills — a downstream project inherits every example verbatim.
- **One source of truth.** Skills decide; `references/` hold procedure; PRDs state requirements,
  never implementation. Anything restated in two places disagrees within a release.
- **One skill per job.** Two entries whose descriptions overlap force a guess at invocation time.
