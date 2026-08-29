# `.claude/` — Claude Code Orchestration Guide

This directory is what turns Claude Code from a general coding assistant into the FLUSYS
pipeline described in the root [CLAUDE.md](../CLAUDE.md). It's built from five mechanisms, each
with a distinct job. Picking the right one — and not reaching for the wrong one — is most of
what "using this kit well" means.

| Mechanism    | Where          | Runs                                            | Can edit files? | Job                                                              |
| ------------ | -------------- | ------------------------------------------------ | ---------------- | ----------------------------------------------------------------- |
| **Skill**    | `skills/`      | Inline, in the main conversation                 | Yes               | A workflow step you or the model invokes on purpose               |
| **Agent**    | `agents/`      | Isolated subagent, spawned by a skill or by you  | Only if given Edit/Write tools (none here do) | Independent work that must stay structurally unable to also "fix" what it finds |
| **Hook**     | `hooks/*.sh`   | Automatically, on a matching tool call           | N/A — inspects, allows, or blocks the call | Mechanical, unbypassable enforcement of a rule prose can't guarantee |
| **Rule**     | `rules/*.md`   | Automatically, surfaced when a matching file is opened or edited | No — it's context, not code | A reminder scoped to exactly the files it's relevant to, without bloating every prompt |
| **Workflow** | `workflows/*.js` | Explicitly invoked, orchestrates many subagents | Via the agents it spawns | Fan-out work — the same operation repeated across many files, in parallel |

If you're not sure which one a new piece of guidance belongs in, read "Choosing where new
guidance goes" at the bottom before adding it anywhere.

## Skills — `skills/*/SKILL.md`

The workflow steps in CLAUDE.md's pipeline table. A skill is loaded into the main conversation —
it can read, write, run commands, ask you questions, and check `git status` before a risky
change, because it *is* the conversation, not a sandboxed helper.

**Invocation:** by name (`/bootstrap`, `/develop-feature docs/prd-feature-01-invoice.md`), or
automatically when the skill's frontmatter `description` matches what you're doing — that
description is the only thing loaded up front, so it has to be specific enough to match on. The
full `SKILL.md` body loads only once the skill actually fires.

**Current inventory:**

| Skill | Fires on |
| ----- | -------- |
| `prd-generator` | Raw requirements, no PRD yet |
| `bootstrap` | A completed `docs/prd-bootstrap.md`; auto-detects template vs. already-named project |
| `develop-feature` | A ready `docs/prd-feature-*.md` |
| `refactor` | A bare file path, or "refactor/clean up the whole project" |
| `rules-writer` | Right after a real bug gets fixed, or a task reveals a non-obvious correction |
| `api-design`, `engineering`, `ui-design`, `user-enricher` | Reference skills — loaded automatically while writing the relevant kind of code, not run as standalone steps |

**Authoring convention:** keep `SKILL.md` short — frontmatter `description` plus the procedure at
a glance. Push anything long (package tables, full API references, gotcha lists) into
`references/*.md`, linked from the body and read only at the step that actually needs it. This is
what lets nine skills coexist without every one of them loading fully on every turn — see CLAUDE.md's
"Token & model economy" note.

## Agents — `agents/*.md`

A subagent is an isolated context with its own (usually restricted) toolset. Use one only when
the job needs to be **structurally unable to also fix what it finds** — the isolation is the
feature, not a convenience.

**Current inventory:**

| Agent | Tools | Model | Job |
| ----- | ----- | ----- | --- |
| `code-reviewer` | `Read, Grep, Glob` (no Edit/Write) | `haiku` | Independent pass over changed files — backend and frontend both — for bugs, security, reinvented base-class logic, dead FLUSYS patterns, and (for anything under the frontend root) the Angular/`ng-ui` gotcha catalog in `angular-foundations.md`/`ui-design.md`'s Anti-patterns. Reports `file:line — issue — fix`, grouped by severity, with a one-line verdict. Cannot self-fix by design — the requesting session decides what to apply |

**When to reach for a new agent vs. a skill:** if the task both finds problems *and* fixes them,
it's a skill (or part of one) — `refactor` fixes inline because there's no value in separating
"notice a dead import" from "delete it." Only split into an agent when the review needs to stay
honest by being unable to touch the code — e.g. a pre-commit second opinion that shouldn't quietly
patch over its own findings.

**Authoring convention:** pin `model:` in frontmatter for narrow, mechanical, or read-only work
(`code-reviewer` runs `haiku` for its *entire* isolated context, not just the current turn — unlike
a skill's `model:`, which reverts once the skill's step ends). List exactly the tools the job
needs — an agent with edit tools that's supposed to be a read-only check is a review with no
teeth.

## Hooks — `hooks/*.sh`

Shell scripts wired to `PreToolUse` / `PostToolUse` in [`settings.json`](settings.json), matched
against a tool name (`Edit|Write|MultiEdit`). A hook is the only mechanism here that runs whether
or not the model remembers to check — it reads the tool call's JSON off stdin, and can `allow`,
`deny`, or `block` before/after the fact. Reach for a hook when a Hard Rule has been violated more
than once despite being written down in prose; prose is a suggestion, a hook is a gate.

**Current inventory:**

| Hook | Fires on | Enforces |
| ---- | -------- | -------- |
| `block-protected-paths.sh` | `PreToolUse` for `Edit\|Write\|MultiEdit` | Denies edits under `node_modules/` or `persistence/migrations/` — the two "never hand-edit" Hard Rules in CLAUDE.md |
| `check-company-filter.sh` | `PostToolUse` for `Edit\|Write\|MultiEdit` on `services/*.service.ts` | Blocks (with a fix snippet) if a company-scoped entity's service never calls `applyCompanyFilter` **anywhere**, or calls it only outside `getSelectQuery` (e.g. only in `getExtraManipulateQuery`, which never fires for `getById`/`getByIds`) — the second case is a real, previously-shipped cross-tenant leak that a plain string-presence check misses. Only fires once bootstrap has stamped `Company feature: true` in root CLAUDE.md, and only for a service whose matching `.entity.ts` actually declares `companyId`. Escape hatch: a `// company-filter: exempt — <reason>` comment |

**Authoring convention:** a hook should fire narrowly and explain *why* in its denial/block
message, including the exact command or pattern to use instead — see both scripts' `jq -n` output.
A hook that blocks without saying what to do instead just gets `--no-verify`-style workarounds,
which defeats the point. Never make a hook silently swallow output; it should be immediately
obvious to whoever hits it why the action was stopped.

## Rules — `rules/*.md`

Path-scoped context, distinct from a hook: a rule can't block anything, it just makes sure the
relevant reminder is in front of the model exactly when it's touching a file that needs it,
instead of relying on the model to recall a Hard Rule from CLAUDE.md while three files deep in an
unrelated change. Frontmatter `paths:` is a glob list; the rule surfaces when a matching file is
opened or edited.

**Current inventory:**

| Rule | Paths | Reminds |
| ---- | ----- | ------- |
| `entities.md` | `backend/src/**/*.entity.ts` | A schema change needs `migration:generate` + `migration:run` — TypeORM won't pick it up on its own |
| `migrations.md` | `backend/src/persistence/migrations/**` | These are generated output; edit the entity and regenerate instead of patching. (Also hook-blocked — this rule explains what to do if you land here anyway) |
| `tenant-context.md` | `**/controllers/*.controller.ts`, `**/services/*.service.ts` | `companyId`/`branchId` come from `@CurrentUser()`, never a DTO/query/path param — the controller-side half of the Hard Rule that `check-company-filter.sh` enforces mechanically on the service side |
| `service-ownership.md` | `backend/src/modules/**/services/*.service.ts` | Before touching another entity's table directly (`manager.findOne`/`save`/`getRepository`), check whether it has its own owning service — including across feature/module boundaries — and add a method there instead of reaching around it |

**Rules vs. hooks, concretely:** `tenant-context.md` and `check-company-filter.sh` cover the same
Hard Rule from two angles — the rule reminds a human-authored controller not to trust a
client-supplied `companyId` (unenforceable mechanically, it's a code-shape judgment call), the
hook mechanically verifies the service actually calls `applyCompanyFilter` (a `grep`-able fact).
When a Hard Rule has both a judgment-call half and a mechanically-checkable half, split it exactly
this way — rule for the half that needs understanding, hook for the half that's a pattern match.

**Authoring convention:** scope `paths:` as tight as the rule actually applies to — a rule that
fires on every file stops being a targeted reminder and becomes noise. Keep the body to the one
thing that file-type needs to know; cross-reference the Hard Rule and any related hook/rule by
name rather than restating them.

## Workflows — `workflows/*.js`

A workflow is a small script (`agent()`, `pipeline()` helpers available) that orchestrates many
subagent calls — for fan-out work where the same operation needs to run across a large, variable
set of files. Skills handle one unit of work (one feature, one file); a workflow handles "do this
skill's operation, but for every file matching a pattern, in parallel."

**Current inventory:**

| Workflow | Does |
| -------- | ---- |
| `refactor-sweep.js` | Lists every source file under a folder (`haiku`, mechanical listing), then runs the `/refactor` skill's exact rules against each file **individually** via one `pipeline()`-parallelized subagent per file (`haiku`), collecting a one-line result per file. This is what backs CLAUDE.md's "never sample — when asked to process every file, actually edit every file" rule at scale: a single conversation refactoring twenty files serially would blow its own context before finishing; twenty parallel haiku subagents each scoped to one file don't |

**When to write a new workflow vs. just looping in the main conversation:** if the fan-out is
small (a handful of files) or needs your judgment between files, do it inline. Reach for a
workflow when the set is large/variable, each unit is independent, and the per-file work is
mechanical enough to hand to a cheap model — `refactor-sweep.js`'s shape (list → `pipeline()` →
collect) is the template.

## How the pieces interact — a worked example

`/develop-feature docs/prd-feature-01-invoice.md` writes an `invoice.service.ts` with a
`companyId` column on its entity:

1. **Rule** `tenant-context.md` surfaces the moment the skill opens `invoice.controller.ts` or
   `invoice.service.ts` — reminding it to pull `companyId` from `@CurrentUser()`, not a DTO.
2. **Hook** `block-protected-paths.sh` fires on every `Edit`/`Write` the skill makes; it's a no-op
   here since none of the writes touch `node_modules/` or `persistence/migrations/`.
3. The skill edits `invoice.entity.ts`, which needs a migration. **Rule** `entities.md` surfaces
   the regenerate-don't-hand-edit reminder. The skill runs `migration:generate` — writing into
   `persistence/migrations/` would itself be hook-blocked if attempted directly.
4. Once `invoice.service.ts` is saved, **hook** `check-company-filter.sh` fires (`PostToolUse`):
   if `Company feature: true` is stamped in root CLAUDE.md and the service never called
   `applyCompanyFilter`, the write is blocked with the exact fix inline.
5. After the feature lands, you (or the skill) spawn the **agent** `code-reviewer` — isolated,
   read-only, `haiku` — for an independent pass over the changed files before commit.
6. If review or manual testing surfaces a non-obvious gotcha (e.g. a route-ordering bug), the
   **skill** `rules-writer` distills it into `docs/CLAUDE.RULES.md` so the next feature skips it —
   and, if the gotcha is really about a `@flusys/*` package or a general pattern rather than this
   project's own business entities, folds the same lesson directly into the relevant skill file
   here too, so it survives into the *next* project even though `docs/CLAUDE.RULES.md` won't.

Nothing here needed a `workflow` — that mechanism only enters once you're doing this same shape
of change across many files at once, e.g. `/refactor` on the whole `modules/` tree.

## Choosing where new guidance goes

Ask, in order:

1. **Does it need to be mechanically unbypassable, not just remembered?** → hook.
2. **Is it only relevant while a specific set of files is open, and doesn't block anything?** →
   rule, `paths:` scoped as tight as it actually applies.
3. **Is it a distinct workflow step someone will invoke on purpose, or that should auto-fire on a
   recognizable trigger?** → skill. Keep `SKILL.md` short; push detail into `references/`.
4. **Does it need to independently check work while being structurally unable to also fix it?** →
   agent, with the minimum toolset the job needs.
5. **Is it the same skill-shaped operation repeated across a large/variable file set, where each
   unit is independent and mechanical enough for a cheap model?** → workflow.

Project-specific conventions (this project's DataSource provider name, app slug, API prefix, the
`Company feature` stamp) belong in root [CLAUDE.md](../CLAUDE.md), never here — this directory's
skills are shared and get overwritten on a kit update; project-specific state has to survive that.
`docs/CLAUDE.RULES.md` is the other project-specific file: it's *learned* corrections
(`rules-writer`'s output), one project at a time, distinct from this guide's job of documenting
the *mechanisms* themselves. `rules-writer` itself decides, per lesson, whether it's project-only
(stays in `docs/CLAUDE.RULES.md` alone) or generic enough to also write directly into a skill file
here — see that skill's own Step 2.5. A skill file citing `docs/CLAUDE.RULES.md` by name as the
source of a rule is a bug: that file doesn't exist on a fresh clone, so the lesson must live in the
skill file's own prose, not behind a pointer to a project-local file.
