---
allowed-tools: Read, Grep, Glob, Write, Bash(npm run *), AskUserQuestion, TodoWrite
description: Bootstrap a new FLUSYS project from a PRD — select only needed packages, generate all wiring files, configure environment
---

# /bootstrap

Bootstrap a new FLUSYS project from a PRD. The full-featured templates already exist at `backend/` and `frontend/` in the project root — this command customizes the wiring files in place and trims unselected packages.

## Usage

```
/bootstrap <path-to-prd>
/bootstrap prd.md
/bootstrap docs/requirements.md
```

---

## Execution Steps

### Step 1 — Load Skill

Load [project-bootstrap](.claude/skills/project-bootstrap/SKILL.md) and follow it for all decisions, file generation, and rules.

### Step 2 — Read PRD

Read the PRD file provided. Follow **Step 1 — Read the PRD and Select Packages** from the skill to extract config values and select packages.

### Step 3 — Confirm Package Selection

Before modifying any file, output a package selection summary for the user to confirm:

```
Package Selection from PRD
────────────────────────────────────────
Backend (always):   nestjs-core, nestjs-shared, nestjs-auth
Frontend (always):  ng-core, ng-shared, ng-layout, ng-auth

From PRD analysis:
  [x] nestjs-iam / ng-iam                      — PRD mentions roles/permissions
  [x] nestjs-storage / ng-storage               — PRD mentions file upload
  [x] nestjs-localization / ng-localization     — PRD mentions multi-language
  [ ] nestjs-email / ng-email                   — No email features detected
  [ ] nestjs-event-manager                      — No calendar/events detected
  [ ] nestjs-notification                       — No real-time notifications detected
  [ ] nestjs-form-builder                       — No dynamic forms detected
  [ ] nestjs-task-manager / ng-task-manager     — No task/board/kanban features detected

Config:
  enableCompanyFeature: true
  permissionMode: FULL
  databaseMode: single
  enableEmailVerification: false
────────────────────────────────────────
Proceed with this selection? (confirm or adjust)
```

Wait for user confirmation before modifying any files.

### Step 4 — Customize Backend Files

Follow **Step 2** from the skill. Customize in this order:

| # | File | Notes |
|---|------|-------|
| 0 | `backend/package.json` | Remove each unselected `@flusys/nestjs-*` package; keep `pg` OR `mysql2` — not both — based on DB type; remove `socket.io`, `@nestjs/websockets`, `@nestjs/platform-socket.io` if notification not selected |
| 1 | `backend/.env` | Customize from PRD |
| 2 | `backend/src/config/modules.config.ts` | Trim unselected packages + remove unused option functions |
| 3 | `backend/src/config/entities.config.ts` | Trim unselected packages |
| 4 | `backend/src/config/swagger.config.ts` | Comment out unselected packages |
| 5 | `backend/src/config/security.config.ts` | Keep as-is |
| 6 | `backend/src/persistence/migration.config.ts` | Keep as-is |
| 7 | `backend/src/persistence/seed-admin.ts` | Set feature flags from PRD |
| 8 | `backend/src/persistence/seed-localization.ts` | Only if localization selected — delete otherwise |
| 9 | `backend/src/persistence/index.ts` | Keep as-is |
| 10 | `backend/src/providers/auth-email.provider.ts` | Full or noop version |
| 11 | `backend/src/providers/index.ts` | Keep as-is |
| 12 | `backend/src/app.module.ts` | Remove unselected modules; NotificationModule must be before AuthModule if selected |
| 13 | `backend/src/modules/shared/app-datasource.provider.ts` | Rename class to `<AppName>DataSourceProvider` — update class name in all 5 static field declarations + constructor call |
| 14 | `backend/src/modules/shared/swagger.config.ts` | Rename function + update `title` and `path` to match app name |
| 15 | `backend/src/app.controller.ts` | Keep as-is |
| 16 | `backend/src/app.service.ts` | Keep as-is |
| 17 | `backend/src/main.ts` | Keep as-is |

### Step 5 — Customize Frontend Files

Follow **Step 3** from the skill. Customize in this order:

| # | File | Notes |
|---|------|-------|
| 0 | `frontend/package.json` | Remove each unselected `@flusys/ng-*` package; remove `socket.io-client` if notification not selected |
| 1 | `frontend/src/main.ts` | Keep as-is |
| 2 | `frontend/src/environments/environment.base.ts` | Customize from PRD |
| 3 | `frontend/src/environments/environment.ts` | Set `enabled: false` for unselected |
| 4 | `frontend/src/environments/environment.prod.ts` | Set production API URL |
| 5 | `frontend/src/app/app.config.ts` | Remove unselected providers |
| 6 | `frontend/src/app/app.routes.ts` | Remove unselected routes |
| 7 | `frontend/src/app/app.component.ts` | Keep as-is |
| 8 | `frontend/src/app/app.component.html` | Keep as-is |
| 9 | `frontend/src/app/app.component.scss` | Keep as-is |
| 10 | `frontend/src/app/guards/app-init.guard.ts` | Trim IAM block if iam not selected |
| 11 | `frontend/src/app/services/auth-layout-sync.service.ts` | Keep as-is |
| 12 | `frontend/src/app/services/search-adapter.service.ts` | Keep as-is |
| 13 | `frontend/src/app/config/app-menu.config.ts` | Customize from PRD |
| 14 | `frontend/src/app/config/app-launcher.config.ts` | Keep as-is (placeholder) |
| 15 | `frontend/src/app/pages/home/home.component.ts` | Keep as-is (placeholder) |

### Step 6 — Install and First-Run

After files are customized, run:

```bash
# Install (after package.json cleanup — removes unused packages from node_modules)
cd backend && npm install
cd frontend && npm install

# Backend — run from backend/
npm run migration:generate --name=init   # generate initial migration from selected packages
npm run migration:run                    # apply migration — creates all tables
npm run seed:admin                       # seed admin user + feature flags
npm run seed:localization                # only if localization is selected
npm run start:dev

# Frontend (new terminal)
cd frontend
npm start
```

### Step 7 — Verification Checklist

Follow the **Verification Checklist** from the skill.

---

### Step 8 — Auto-Develop All Features

After Step 7 verification passes, auto-develop all feature modules listed in the bootstrap PRD:

1. Read `## Feature Modules (development order)` from the bootstrap PRD
2. Show a combined plan and ask for a single confirmation:

```
Auto-Development Plan
────────────────────────────────────────
Will develop in order:
  1. docs/prd-feature-01-<name1>.md
  2. docs/prd-feature-02-<name2>.md
  ...

Each: DB design → API → backend → Angular UI → quality → performance → security → migration
────────────────────────────────────────
Proceed with auto-develop? (confirm or skip)
```

3. On confirm: for each feature PRD in the listed order, load and execute all steps from [/develop-feature](.claude/commands/develop-feature.md) — **skip the per-feature Step 2 confirmation** (PRD was already reviewed before /bootstrap ran)
4. After all features complete, print the final project summary:

```
Project Build Complete
────────────────────────────────────────
Bootstrap:  wired + migrated + seeded
Features:   <N> modules developed
            <list each: module name + files created>

Next steps:
  1. Add translation values in admin UI (if localization selected)
  2. Assign permissions to roles in IAM module
  3. Replace placeholder search in search-adapter.service.ts
  4. Replace placeholder launcher apps in app-launcher.config.ts
────────────────────────────────────────
```

---

## What This Command Does NOT Do

- Does not scaffold the monorepo directory structure (already exists)
- Does not generate feature modules if the bootstrap PRD has no `Feature Modules` section — add feature PRDs first
- Does not deploy or push to any environment
- Does not write tests
- Does not set up CI/CD
