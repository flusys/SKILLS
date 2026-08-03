---
paths:
  - "backend/src/persistence/migrations/**"
---

# Generated Migrations

Files in this folder are TypeORM output, not hand-written source — regenerate, don't edit.

- Schema change → edit the entity, then:
  `cd backend && npm run migration:generate --name=<name> && npm run migration:run`
- Bad migration → delete the file and regenerate; never patch it in place.
- This path is also hook-blocked for `Edit`/`Write`/`MultiEdit` (`.claude/hooks/block-protected-paths.sh`).
  If you land here needing a change, the workflow above is what was skipped.
