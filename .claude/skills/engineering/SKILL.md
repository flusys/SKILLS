---
name: engineering
description: FLUSYS engineering standards — TypeScript/Angular code quality, TypeORM database patterns, HybridCache performance, and OWASP security. Load for any NestJS/Angular code writing or review.
---

# Engineering Standards

Read [references/database.md](references/database.md), [references/caching.md](references/caching.md),
[references/security.md](references/security.md), and
[references/angular-foundations.md](references/angular-foundations.md) only at the step that
needs them — this file stays cheap to load for every write/review pass.

| Load | When |
| ---- | ---- |
| [references/database.md](references/database.md) | Designing or reviewing entities, migrations, queries — includes the Service Ownership pattern for multi-service domains |
| [references/caching.md](references/caching.md) | Adding `HybridCache`, or reviewing Angular `computed()`/bundle-size performance |
| [references/security.md](references/security.md) | Any OWASP review pass, multi-tenant isolation, or auth/permission code |
| [references/angular-foundations.md](references/angular-foundations.md) | Consuming session state, file URLs, layout, or IAM permission signals from a feature component |

Before writing a cross-cutting concern yourself — file URLs, session/company/branch state, sidebar
or theme state, permission checks — check whether `@flusys/ng-shared`, `@flusys/ng-auth`, or
`@flusys/ng-layout` already exposes it (see angular-foundations.md). The backend equivalent is
`envConfig` below and the Integration Adapters in the `api-design` skill.

---

## Code Quality

### Configuration — `envConfig`

`@flusys/nestjs-core/config` reads `.env` — never read `process.env` directly in feature code.

```typescript
import { envConfig } from "@flusys/nestjs-core/config";

envConfig.getTypeOrmConfig(); // → IDatabaseConfig
envConfig.getJwtConfig();     // → { jwtSecret, jwtExpiration, refreshTokenSecret, refreshTokenExpiration }
envConfig.getRedisUrl();      // → 'redis://localhost:6379'
envConfig.getOrigins();       // → string[]
envConfig.getPort();          // → number
envConfig.isProduction();     // → boolean
```

### Type Safety

```typescript
// Specific types — never any/unknown unless unavoidable
function getById<T>(id: string): Promise<T | null> {}

// Type guards — validate ALL key fields
function isUser(obj: unknown): obj is IUser {
  return (
    typeof obj === 'object' && obj !== null &&
    'id' in obj && typeof (obj as any).id === 'string' &&
    'email' in obj && typeof (obj as any).email === 'string'
  );
}

// Utility types for transformations
type UserCreate = Omit<IUser, 'id' | 'createdAt'>;
type UserUpdate = Partial<Pick<IUser, 'name' | 'email'>>;
```

### Null Safety

```typescript
const name = user?.profile?.name;            // Optional chaining
const displayName = user?.name ?? 'Unknown'; // Nullish coalescing (NOT ||)
if (value == null) { }                       // Checks both null and undefined
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Class/Interface | PascalCase | `UserService`, `IUser` |
| Function/Variable | camelCase | `getUser()`, `userId` |
| Constant | UPPER_SNAKE | `API_BASE_URL` |
| Private Signal | #camelCase | `#users`, `#loading` |
| File | kebab-case | `user-service.ts` |
| DB Table/Column | snake_case | `user_permissions` |
| Boolean | is/has/can prefix | `isActive`, `hasPermission` |

### Function Design

```typescript
// Always explicit return types
function getUser(id: string): Promise<IUser | null> {}

// Guard clauses — fail fast, reduce nesting
function calculate(user: IUser, amount: number): number {
  if (!user) return 0;
  if (!user.isPremium) return 0;
  if (amount < 100) return 0;
  return amount * 0.2;
}

// Options object for 3+ params
interface CreateUserOptions { name: string; email: string; role?: string; }
function createUser(options: CreateUserOptions): Promise<IUser> {}
```

### Immutability

```typescript
const added = [...items, newItem];
const removed = items.filter(i => i.id !== id);
const updated = items.map(i => i.id === id ? { ...i, ...changes } : i);

// Signals — always use update(), never mutate in place
this.#users.update(users => users.filter(u => u.id !== id));
```

### Signal Patterns (Angular)

```typescript
// Private writable, public readonly
#users = signal<IUser[]>([]);
readonly users = this.#users.asReadonly();

// computed() for ALL derived state — never set() derived values imperatively
readonly userCount = computed(() => this.#users().length);
readonly isEmpty = computed(() => this.#users().length === 0 && !this.#loading());

// effect() for side-effects only (syncing form, localStorage, DOM)
constructor() {
  effect(() => {
    const row = this.editRow();
    this.#form.set(row ? { name: row.name } : { name: '' });
  });
}
```

### Error Handling

```typescript
// NestJS — always object syntax with messageKey
if (!entity) throw new NotFoundException({ message: 'Not found', messageKey: 'error.entity.notFound' });

// Angular — handle in service
async loadData(): Promise<void> {
  try {
    this.#loading.set(true);
    const data = await firstValueFrom(this.http.post<T>(url, body));
    this.#data.set(data);
  } catch (error) {
    this.#error.set(error instanceof Error ? error.message : 'error.unknown');
  } finally {
    this.#loading.set(false);
  }
}
```

### Async Patterns

```typescript
// Parallel when independent
const [users, roles] = await Promise.all([this.getUsers(), this.getRoles()]);

// Sequential when dependent
const user = await this.getUser(id);
const permissions = await this.getPermissions(user.roleId);
```

### Import Order

```typescript
// 1. Node built-ins
import { randomUUID } from 'crypto';
// 2. Framework / third-party
import { Injectable } from '@nestjs/common';
// 3. Workspace packages (@flusys/*)
import { Identity } from '@flusys/nestjs-shared';
// 4. Relative imports
import { UserService } from '../services';
```

### Anti-Patterns

```typescript
// Bad: any type, missing return type, boolean param, magic numbers
function process(data: any) {}
function getUser(id: string) {}
function fetch(id: string, includeDeleted: boolean) {}
if (status === 3) {}

// Bad: mutating parameters, deep nesting, nested ternaries
function addItem(arr: Item[]) { arr.push(item); }
if (a) { if (b) { if (c) { if (d) {} } } }
const x = a ? b ? c : d : e;

// Bad: imperative derived state (use computed() instead)
effect(() => { this.#count.set(this.#users().length); });
```
