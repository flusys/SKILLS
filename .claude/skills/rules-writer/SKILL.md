---
name: rules-writer
description: Distill a correction, a bug's root cause, or a non-obvious gotcha into a compact rule appended to docs/CLAUDE.RULES.md, so future sessions follow it without being told twice. Use for /rules-writer, immediately after fixing a real bug, or whenever a task just finished having revealed a correction, constraint, or convention worth keeping.
model: haiku
---

# Rules Writer

Convert `$ARGUMENTS` — or, with no arguments, the fix/correction this conversation just made — into
a compact, reusable rule appended to `docs/CLAUDE.RULES.md`, so a future session follows it
without being told twice.

## Input

Two ways this runs:

- **Manual, with `$ARGUMENTS`:** raw feedback, a correction, a preference, or any instruction the
  user just gave. If `$ARGUMENTS` is empty on a manual invocation, use `AskUserQuestion` to ask
  what rule to capture.
- **Proactive, no arguments:** right after this conversation fixes a real bug, or a task
  (`/develop-feature`, `/refactor`, a manual edit) finishes having revealed something non-obvious
  — a root cause, a constraint, a convention the codebase expects but doesn't enforce. Distill from
  what you just did, not from a prompt.

**Restraint — don't fire on everything.** Only capture something a future session would otherwise
get wrong again: a non-obvious root cause, a correction the user had to give, a project convention
that isn't already written down. A typo fix, a one-off request, or anything already covered by
`CLAUDE.md` or a skill in `.claude/skills/` is not a rule — skip it silently rather than padding
the file.

## Step 1: Check Structure Cheaply — no full read

Run `grep -n "^## " docs/CLAUDE.RULES.md` to get the existing section headers and their line
numbers — enough to plan Steps 3-4 without loading the whole file into context.

- File or `docs/` folder missing, or grep returns nothing → treat as fresh; Step 4 initializes it
  with the `# Claude Rules` header.
- Do not `Read` the full file here just to "see what's there."

## Step 2: Distill the Rule

Rewrite the raw input into an **optimized rule** — not a transcript of what happened, but the
compressed instruction a future session should follow:

- **Strip conversational filler** — keep only the actionable rule.
- **State it imperatively** — "Always X" / "Never Y" / "When A, do B".
- **Add a Why line** only if there's a real reason — a bug it caused, a convention, a performance
  concern. Skip it if there's nothing non-obvious to say.
- **Add a Scope** — which layer/package/file-pattern this applies to (e.g. `backend entities`, `all
Angular list components`, a specific domain module). Use `All` if global.
- Keep it to 2-4 lines. This is a rule, not documentation.

## Step 3: Check for Duplicates/Conflicts — grep first, read small

Grep `docs/CLAUDE.RULES.md` for 2-3 distinctive keywords from the new rule (file/service/entity
names, key nouns) — the primary duplicate check, not a full read.

- **No matches** → new rule; proceed to Step 4.
- **Matches found** → `Read` only a small window around each matched line (grep's line number as
  `offset`, `limit` ~10-15) to judge same/outdated/unrelated. Never read the entire file for this.
  - **Same rule already exists** → skip; if proactive, say nothing further; if manual, tell the
    user it's already captured.
  - **Existing rule is outdated/contradicted** → replace it in place (`Edit`), don't duplicate.
  - **Unrelated coincidental keyword hit** → treat as new rule, proceed to Step 4.

## Step 4: Categorize & Write

File sections (create as needed, in this order):

```markdown
# Claude Rules

## Backend (NestJS)

## Frontend (Angular)

## Workflow

## General
```

Pick the section by where the rule applies; a rule touching both goes under **General**. Use the
section line numbers from Step 1 to target `Edit`'s `old_string` precisely instead of re-reading
the file to relocate the section.

## Rule Format

One bullet per rule, no nested sub-bullets unless truly needed:

```markdown
- **<imperative rule statement>** — Scope: <package/area>. Why: <reason, if any>.
```

Example:

```markdown
## Backend (NestJS)

- **Every list/get query on a company-scoped entity must call `applyCompanyFilter`.** — Scope: all
  company-scoped entities. Why: a missing filter is a cross-tenant data leak, caught in review on
  the `invoice` module and easy to repeat on the next one.
```

## Step 5: Write & Confirm

Write/Edit `docs/CLAUDE.RULES.md` with the new or updated rule.

- **Manual invocation** — report concisely:
  ```
  Added to docs/CLAUDE.RULES.md under [Section]:
  "<the distilled rule line>"
  ```
  If it replaced an existing rule: `Updated existing rule under [Section] (was outdated).`
- **Proactive capture** — fold it into the normal end-of-task summary as one line ("Also captured
  in docs/CLAUDE.RULES.md: <rule>"), not a separate message.

## Rules

- Never write duplicate rules — always check first.
- Never dump the raw user prompt or a blow-by-blow of the fix verbatim — always distill it.
- Do not invent a "Why" that isn't stated or obvious from context.
- Do not commit the file — leave that to the user unless they explicitly ask.
- One rule per invocation, unless the input clearly contains multiple distinct corrections — then
  add each as its own bullet.
