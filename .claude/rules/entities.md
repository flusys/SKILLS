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
