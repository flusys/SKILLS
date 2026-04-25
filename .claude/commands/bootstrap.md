---
allowed-tools: Read, Grep, Glob, Write, Bash(npm run *), AskUserQuestion, TodoWrite
description: Bootstrap a new FLUSYS project from a PRD — select only needed packages, generate all wiring files, configure environment
---

# /bootstrap

Bootstrap a new FLUSYS project from a PRD. Generates only the wiring files that connect packages together — not boilerplate that already exists in the monorepo.

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

Before generating any file, output a package selection summary for the user to confirm:

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

Config:
  enableCompanyFeature: true
  permissionMode: FULL
  databaseMode: single
  enableEmailVerification: false
────────────────────────────────────────
Proceed with this selection? (confirm or adjust)
```

Wait for user confirmation before writing any files.

### Step 4 — Generate Backend Files

Follow **Step 2** from the skill. Generate in this order:

| # | File | Notes |
|---|------|-------|
| 1 | `backend/.env` | Customize from PRD |
| 2 | `backend/src/config/modules.config.ts` | Trim unselected packages |
| 3 | `backend/src/config/entities.config.ts` | Trim unselected packages |
| 4 | `backend/src/config/swagger.config.ts` | Comment out unselected packages |
| 5 | `backend/src/config/security.config.ts` | Copy as-is |
| 6 | `backend/src/persistence/migration.config.ts` | Copy as-is |
| 7 | `backend/src/persistence/seed-admin.ts` | Set feature flags from PRD |
| 8 | `backend/src/persistence/seed-localization.ts` | Only if localization selected |
| 9 | `backend/src/persistence/index.ts` | Copy as-is |
| 10 | `backend/src/providers/auth-email.provider.ts` | Full or noop version |
| 11 | `backend/src/providers/index.ts` | Copy as-is |
| 12 | `backend/src/app.module.ts` | Remove unselected modules |
| 13 | `backend/src/app.controller.ts` | Copy as-is |
| 14 | `backend/src/app.service.ts` | Copy as-is |
| 15 | `backend/src/main.ts` | Copy as-is |

### Step 5 — Generate Frontend Files

Follow **Step 3** from the skill. Generate in this order:

| # | File | Notes |
|---|------|-------|
| 1 | `frontend/src/main.ts` | Copy as-is |
| 2 | `frontend/src/environments/environment.base.ts` | Customize from PRD |
| 3 | `frontend/src/environments/environment.ts` | Set `enabled: false` for unselected |
| 4 | `frontend/src/environments/environment.prod.ts` | Set production API URL |
| 5 | `frontend/src/app/app.config.ts` | Remove unselected providers |
| 6 | `frontend/src/app/app.routes.ts` | Remove unselected routes |
| 7 | `frontend/src/app/app.component.ts` | Copy as-is |
| 8 | `frontend/src/app/app.component.html` | Copy as-is |
| 9 | `frontend/src/app/app.component.scss` | Copy as-is |
| 10 | `frontend/src/app/guards/app-init.guard.ts` | Trim IAM block if iam not selected |
| 11 | `frontend/src/app/services/auth-layout-sync.service.ts` | Copy as-is |
| 12 | `frontend/src/app/services/search-adapter.service.ts` | Copy as-is |
| 13 | `frontend/src/app/config/app-menu.config.ts` | Customize from PRD |
| 14 | `frontend/src/app/config/app-launcher.config.ts` | Copy as-is (placeholder) |
| 15 | `frontend/src/app/pages/home/home.component.ts` | Copy as-is (placeholder) |

### Step 6 — First-Run Commands

After files are generated, run:

```bash
# Backend
cd backend
npm run migration:run
npm run seed:run
npm run start:dev

# Frontend (new terminal)
cd frontend
npm run build:libs
npm start
```

### Step 7 — Verification Checklist

Follow the **Verification Checklist** from the skill.

---

## What This Command Does NOT Do

- Does not scaffold the monorepo directory structure (already exists)
- Does not generate feature entities, services, or pages (use `/crud` for that)
- Does not install npm packages (already in monorepo)
- Does not set up CI/CD

## Next Steps After Bootstrap

Once the app boots successfully:

1. Run `/crud <EntityName>` for each domain entity from the PRD
2. Run a migration after each entity is added
3. Add translation keys via the localization admin UI (if localization selected)
