# FLUSYS Monorepo

Full-stack monorepo: Angular 21 frontend + NestJS 11 backend.

## Tech Stack

| Layer    | Stack                                                                |
| -------- | -------------------------------------------------------------------- |
| Frontend | Angular 21 (signals, standalone, zoneless) + PrimeNG + Tailwind      |
| Backend  | NestJS 11 + TypeORM + PostgreSQL + JWT                               |
| API      | POST-only RPC (not REST)                                             |
| Ports    | Frontend: `http://localhost:2001` · Backend: `http://localhost:2002` |

## Proactive Behavior

| Trigger                                              | Action                                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| User provides a PRD / requirements doc               | Auto-run `/bootstrap <prd-file>` — analyze PRD, select related flusys packages, generate wiring files |
| User provides any file path                          | Auto-run `/refactor` on it — remove dead code, fix patterns                                           |
| "refactor whole project" / "final look on all files" | Run `/file-traverser` → `/refactor` on every `.ts` file                                               |

**Rule:** Never use sampling/verification approach — actually edit every file with code changes.

## Commands

| Command            | Purpose                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `/bootstrap`       | **Start here with a PRD** — select packages, generate all wiring files, run migrations      |
| `/develop-feature` | Develop a full-stack feature from a modular PRD — entity, API, Angular UI, migrations, i18n |
| `/refactor`        | Refactor a file: remove dead code, fix Angular 21 + NestJS patterns, localization           |

## Skills

### Core Skills

| Skill                                                          | Purpose                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [project-bootstrap](.claude/skills/project-bootstrap/SKILL.md) | **New project from PRD** — package selection matrix, all wiring files, build order, first-run checklist |
| [api-design](.claude/skills/api-design/SKILL.md)               | POST-only RPC, response DTO shapes, status codes                                                        |
| [database-design](.claude/skills/database-design/SKILL.md)     | TypeORM patterns, migrations, N+1 prevention, soft delete                                               |
| [code-quality](.claude/skills/code-quality/SKILL.md)           | TypeScript best practices, naming, immutability, async                                                  |
| [security-review](.claude/skills/security-review/SKILL.md)     | OWASP Top 10, file upload security, JWT, Angular XSS                                                    |
| [performance](.claude/skills/performance/SKILL.md)             | Redis cache-aside, TTL guidelines, query optimization, computed() memoization, lazy routes              |
| [crud](.claude/skills/crud/SKILL.md)                           | Full-stack CRUD — entity, service, controller, DTOs, Angular service, list + form pages                 |
| [file-traverser](.claude/skills/file-traverser/SKILL.md)       | Batch refactor strategies — signal migration, control flow, repo fix                                    |

### Package Skills

| Skill                                              | Purpose                                                      |
| -------------------------------------------------- | ------------------------------------------------------------ |
| [flusys-nest](.claude/skills/flusys-nest/SKILL.md) | NestJS packages public API — envConfig, auth, guards, tokens |
| [flusys-ng](.claude/skills/flusys-ng/SKILL.md)     | Angular packages public API — signals, services, components  |
