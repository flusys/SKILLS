---
paths:
  - "backend/src/persistence/migrations/**"
---

# Generated Migrations

Files in this folder are TypeORM output, not hand-written source — regenerate, don't edit.

- Schema change → edit the entity, then:
  `cd backend && npm run migration:generate --name=<name> && npm run migration:run`
- Bad migration → delete the file and regenerate; never patch it in place.
- **Deleting or merging an entity does not get you a `DROP TABLE`.** `migration:generate` only
  diffs tables that still have a matching registered entity — TypeORM's schema builder has no path
  that finds an orphaned DB table and drops it, so the old table is silently left behind forever,
  no matter how many times you regenerate. This has recurred more than once on this kind of change
  (merging two entities into one, or removing a feature's entity outright) precisely because
  nothing surfaces it — the generate step just succeeds with an empty or unrelated diff. Removing
  an entity needs an explicit, acknowledged one-off `DROP TABLE <name>;` run directly against the
  dev DB (or a deliberately hand-authored migration) as a separate, called-out step — flag it to
  the user rather than assuming a later regenerate will clean it up.
- **Adding a `NOT NULL` column when existing rows can't yet satisfy it stays inside "change the
  entity and regenerate" via three steps, not one:** (1) add the column `nullable: true`,
  generate+run that migration; (2) backfill existing rows with a plain SQL `UPDATE` run directly
  against the DB — a one-off data fix, not a migration file; (3) flip the column to
  `nullable: false` and generate+run a second migration that does `ALTER COLUMN ... SET NOT NULL`.
- This path is also hook-blocked for `Edit`/`Write`/`MultiEdit` (`.claude/hooks/block-protected-paths.sh`).
  If you land here needing a change, the workflow above is what was skipped.
