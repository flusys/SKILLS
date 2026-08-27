---
paths:
  - "backend/src/**/*.entity.ts"
---

# Entity Changes Require a Migration

Editing a column, index, or relation here changes the DB schema. TypeORM does not pick it up
until you regenerate:

```
cd backend && npm run migration:generate --name=<name> && npm run migration:run
```

Never hand-edit the generated output in `persistence/migrations/` — see `.claude/rules/migrations.md`.

Every TypeScript property on this entity is **camelCase, always** — snake_case is reserved
exclusively for the DB column name inside `@Column({ name: "..." })`. An all-snake_case entity
compiles fine and `tsc` never flags it, so this is easy to get internally-consistently wrong;
check it on sight, not only when something fails.
