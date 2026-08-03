---
name: refactor
description: Refactor a file or a whole folder — remove dead code, fix broken FLUSYS patterns, no cosmetic churn. Use for /refactor, for a bare file path, or for 'clean up / final pass on all files'.
---

# /refactor

Remove what is dead or broken. Leave working code alone.

```
/refactor src/app/pages/invoice/invoice.component.ts
/refactor backend/src/modules/invoice/
/refactor .                                  # whole project
```

## Scope

A single file is processed directly. A folder is processed **file by file** — every file, no
sampling. Collect with `Glob`, excluding `node_modules`, `.git`, `dist`, `.angular`, `coverage`,
`*.log`, and lockfiles. Sort alphabetically so the run is reproducible.

Before any multi-file run: check `git status`. If the tree is dirty, say so and ask before
proceeding — this skill edits in bulk and a clean baseline is what makes it reviewable. If the
set exceeds 50 files, report the count and confirm the scope first, or offer the dynamic workflow
below.

For a large folder, `.claude/workflows/refactor-sweep.js` runs the same rules with one subagent
per file in parallel instead of one file at a time in this conversation — trigger it with
`ultracode: refactor sweep <folder>` or "use a workflow to refactor sweep `<folder>`".

Track progress with TodoWrite on multi-file runs, then report one line per file:

```
path/to/file.ts — 3 unused imports, 1 dead method removed
path/to/other.ts — no changes
path/to/broken.ts — ERROR: <reason>
```

An error on one file does not stop the run. Continue and list failures in the summary.

## Fix only these

| Category | Meaning |
| -------- | ------- |
| Bugs | code that will throw or misbehave at runtime |
| Security | injection, XSS, missing auth or permission checks, cross-tenant reads |
| Dead code | unused imports, functions, variables, classes, DTOs, files |
| Broken patterns | violates a rule in `CLAUDE.md` or the FLUSYS skills |
| Redundancy | duplicated logic, wrapper functions, parameters that are always the same value |
| Reinvented base | hand-written code that `ApiService` or `ApiResourceService` already provides |

## Do not touch

Formatting, naming preferences, working-but-not-optimal code, added comments or docstrings,
speculative future-proofing. If it works and is secure, leave it.

## Removing code safely

Dead code removal is mandatory, not optional — but verify before deleting.

For every public method: `Grep` the project for its name. Callers only inside its own file means
it is unused. Before deleting, confirm it is not required by an `implements` clause, not exported
and used elsewhere, and not a public API something outside the repo depends on. For an override,
check the parent actually dispatches polymorphically rather than calling a hardcoded class name.

Also remove: static properties never read, instance properties assigned but never used,
constructor parameter modifiers where the value is only forwarded to `super()`, commented-out
code (git has it), and `console.log`.

After removing something, follow through — drop it from the barrel `index.ts`, delete the file if
it is now empty, and confirm no importer broke.

## FLUSYS patterns worth fixing

Only when actually broken — this is not a migration pass.

**Angular**

- `@Input()` / `@Output()` → `input()` / `output()`
- `*ngIf` / `*ngFor` → `@if` / `@for`
- subscriptions without cleanup → `takeUntilDestroyed()`
- mutable state → signals
- hardcoded user-visible strings → `| translate`; array `label:` → `labelKey:` when localization
  is enabled

**Reinvented base classes** — the highest-value fix, and the easiest to miss because the code
looks fine in isolation:

- a service method that reimplements `insert` / `update` / `delete` / `getAll` / `findById`
- search or filter logic in a custom method instead of `getGlobalSearchQuery` / `getFilterQuery`
- a hand-written controller handler where `createApiController` + `enabledEndpoints` would do
- a list component with its own `items` / `isLoading` signal mirroring `ApiResourceService.data`
  and `.isLoading`, or a `loadData()` that re-fetches instead of calling `reload()`
- `afterInsertOperation` / `afterUpdateOperation` overridden with three parameters — they take
  four, with the originating dto second

**NestJS**

- missing `@RequirePermission` on a protected endpoint
- unparameterized SQL
- `@InjectRepository` → the project's DataSource provider
- `companyId` read from a DTO instead of `@CurrentUser()`
- missing company filter on a list or get query for a company-scoped entity
- bare `throw new Error()` → an HTTP exception with `{ message, messageKey }`

## Output

Per file, or as a summary for folder runs: what changed, roughly how much was removed, any
helper extracted, and anything critical left open. Report "no issues found" when a file is
already clean — do not invent work to look productive.

For a multi-file run, optionally delegate to the `code-reviewer` agent afterward for an
independent, read-only pass over the touched files — it cannot edit, so it catches anything this
run's own judgment missed instead of silently fixing it.
