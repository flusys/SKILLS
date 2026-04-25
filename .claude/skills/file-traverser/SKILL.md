---
name: file-traverser
description: Traverse a file or folder and apply user instructions to each file — word replacements, skill/agent/command application, or any bulk instruction.
---

# File Traverser Skill

## Step 1 — Get Target Path

If the user did not provide a file or folder path, ask:
> "Which file or folder should I work on?"

If the user did not provide any instruction, ask:
> "What should I do with each file?"

Accept absolute or relative paths. Resolve before proceeding.

---

## Step 2 — Parse the Instruction

Read the user's prompt and extract every distinct action they want applied. There is no fixed list — the user may say anything:

- A word or string to replace
- A skill name to apply (`refactor`, `code-quality`, `security-review`, etc.)
- An agent type to dispatch (`angular-dev`, `nestjs-dev`, `general-purpose`)
- A slash command to run
- A free-form instruction in plain English

Extract all actions. If anything is ambiguous, ask before building the checklist.

---

## Step 3 — Build a Checklist and Confirm

Show the user exactly what will happen before touching any file:

```
Target: {path}    ({file} or {folder — recursive})

Instructions parsed from your prompt:
  [1] {action-1}
  [2] {action-2}
  ...

Files that will be processed:
  [ ] {file-1}
  [ ] {file-2}
  [ ] {file-3}
  ...
  Total: {n} file(s)

Proceed? [yes / change something]
```

Wait for explicit confirmation. Do not start until the user says yes.

If the user edits the instructions or path, rebuild the checklist and confirm again.

---

## Step 4 — Resolve File List

**Single file** → process only that file.

**Folder** → collect all files recursively:
- Use `Glob: {path}/**/*`
- Exclude: `node_modules`, `.git`, `dist`, `.angular`, `coverage`, `*.log`, `*.lock`
- Sort: alphabetically

If file count exceeds 50, warn the user and ask to confirm or narrow the scope before continuing.

---

## Step 5 — Process Each File

Go through the file list one by one. For each file:

1. Read the file
2. Execute every instruction in order, exactly as the user described
3. Write all changes using Edit (prefer) or Write
4. Tick the checklist: `[x] {file}`
5. Log one line: `{filename} — {brief result}`

If a file has nothing to change, mark it: `[~] {file} — skipped (no match)`

If a file fails, mark it: `[!] {file} — error: {reason}`, then continue to the next file.

---

## Step 6 — Summary

After all files are done:

```
Done.

Files processed:  {n}
Files changed:    {n}
Files skipped:    {n}   (nothing to apply)
Errors:           {n}

Errors:
  {file} — {reason}
  ...
```

Only show the Errors block if there were errors.

---

## Safety Rules

- **Before any batch edit**: Run `git status`. If uncommitted changes exist, warn the user and ask "Continue anyway?"
- **Deletions**: List everything that will be deleted, require explicit "yes" — never auto-delete.
- **Edit conflict**: Show current vs proposed, let the user decide.
- **File read error**: Log it, skip the file, include it in the summary errors.
- **>50 files**: Warn and ask to confirm or narrow scope before proceeding.
