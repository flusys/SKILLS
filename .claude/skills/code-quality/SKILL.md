---
name: code-quality
description: Load when writing or reviewing TypeScript/Angular code — type safety, null safety, naming conventions, signal patterns, error handling, async patterns, and anti-patterns. NOT for DB, API design, or CRUD generation.
---

# Code Quality

## Type Safety

```typescript
// Specific types over any/unknown
function getById<T>(id: string): Promise<T | null> { }

// Type guards for runtime checks — validate ALL key fields, not just one
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
type ReadonlyUser = Readonly<IUser>;
```

## Null Safety

```typescript
const name = user?.profile?.name;            // Optional chaining
const displayName = user?.name ?? 'Unknown'; // Nullish coalescing (NOT ||)
if (value == null) { }                       // Checks both null and undefined
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Class/Interface | PascalCase | `UserService`, `IUser` |
| Function/Variable | camelCase | `getUser()`, `userId` |
| Constant | UPPER_SNAKE | `API_BASE_URL` |
| Private Signal | #camelCase | `#users`, `#loading` |
| File | kebab-case | `user-service.ts` |
| DB Table/Column | snake_case | `user_permissions` |
| Boolean | is/has/can prefix | `isActive`, `hasPermission` |
| Array | plural noun | `users`, `items` |

## Function Design

```typescript
// Always declare explicit return types
function getUser(id: string): Promise<IUser | null> { }
function isActive(user: IUser): boolean { }

// Guard clauses (fail fast, reduce nesting)
function calculate(user: IUser, amount: number): number {
  if (!user) return 0;
  if (!user.isPremium) return 0;
  if (amount < 100) return 0;
  return amount * 0.2;
}

// Options object for 3+ params
interface CreateUserOptions { name: string; email: string; role?: string; }
function createUser(options: CreateUserOptions): Promise<IUser> { }

// Single responsibility — one function, one job
// Bad: fetchAndProcessAndSaveUsers()
// Good: fetchUsers() → processUsers() → saveUsers()
```

## Immutability

```typescript
// Arrays
const added = [...items, newItem];
const removed = items.filter(i => i.id !== id);
const updated = items.map(i => i.id === id ? { ...i, ...changes } : i);

// Objects
const merged = { ...user, name: 'New' };

// Signals — always use update(), never mutate in place
this.#users.update(users => users.filter(u => u.id !== id));
```

## Signal Patterns (Angular)

```typescript
// Private writable, public readonly
#users = signal<IUser[]>([]);
readonly users = this.#users.asReadonly();

#loading = signal(false);
readonly loading = this.#loading.asReadonly();

// computed() for ALL derived state — never set() derived values imperatively
readonly userCount = computed(() => this.#users().length);
readonly isEmpty = computed(() => this.#users().length === 0 && !this.#loading());
readonly fullName = computed(() => `${this.#user()?.firstName ?? ''} ${this.#user()?.lastName ?? ''}`.trim());

// effect() for side-effects that react to signal changes (e.g. syncing form from input)
constructor() {
  effect(() => {
    const row = this.editRow();
    this.#form.set(row ? { name: row.name } : { name: '' });
  });
}
```

## Error Handling

```typescript
// NestJS — throw HTTP exceptions (always object syntax with messageKey)
if (!entity) throw new NotFoundException({ message: 'Entity not found', messageKey: 'error.entity.notFound' });
if (!canAccess) throw new ForbiddenException({ message: 'Access denied', messageKey: 'error.access.denied' });

// Angular — handle in service, propagate to component
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

// Never: empty catch, catch-and-ignore, generic error messages
```

## Async Patterns

```typescript
// Parallel when independent
const [users, roles] = await Promise.all([
  this.getUsers(),
  this.getRoles()
]);

// Sequential when dependent
const user = await this.getUser(id);
const permissions = await this.getPermissions(user.roleId);
```

## Import Organization

Enforce this order in every file — one blank line between groups:

```typescript
// 1. Node built-ins (path, fs, crypto)
import { randomUUID } from 'crypto';

// 2. Framework / third-party (Angular, NestJS, TypeORM, RxJS, PrimeNG)
import { Injectable } from '@nestjs/common';
import { signal, computed } from '@angular/core';

// 3. Workspace / monorepo packages (@flusys/*)
import { Identity } from '@flusys/nestjs-shared';

// 4. Relative imports (../services, ./models)
import { UserService } from '../services';
```

## Clean Code Principles

- **Self-documenting** — Clear names over comments
- **No dead code** — Remove unused imports, variables, commented code
- **No redundant checks** — Trust internal code, validate at boundaries
- **DRY** — Extract repeated logic, but don't over-abstract (3+ repetitions before extracting)
- **KISS** — Simplest solution that works

## Anti-Patterns to Avoid

```typescript
// Bad: any type
function process(data: any) { }  // Use specific type or unknown

// Bad: missing return type
function getUser(id: string) { }  // Always declare: Promise<IUser | null>

// Bad: nested ternaries
const x = a ? b ? c : d : e;  // Use if/else or early returns

// Bad: magic numbers
if (status === 3) { }  // Use named constants: STATUS.APPROVED

// Bad: boolean parameters
function fetch(id: string, includeDeleted: boolean) { }
// Good: options object
function fetch(id: string, options?: { includeDeleted?: boolean }) { }

// Bad: mutating parameters
function addItem(arr: Item[]) { arr.push(item); }  // Return new array

// Bad: deep nesting (4+ levels)
if (a) { if (b) { if (c) { if (d) { } } } }  // Use guard clauses

// Bad: over-abstracting too early
class GenericRepositoryFactoryProvider<T, R extends Repository<T>> { }
// Good: concrete class until the pattern repeats 3+ times across real entities

// Bad: imperative derived state via set()
effect(() => { this.#count.set(this.#users().length); });  // Use computed()
```

## Checklists

### Writing New Code
**Use:** Specific types, explicit return types, `?.` and `??`, guard clauses, options objects, immutable updates, named constants, `computed()` for derived state, small functions (<20 lines), meaningful names

**Avoid:** `any`, missing return types, `||` for defaults (use `??`), deep nesting, magic numbers, mutations, empty catch blocks, `*ngIf`/`*ngFor` in Angular templates

### Code Review
**Flag:** `any` type, missing return types, `||` for nullable defaults, hardcoded strings in Angular templates, manual `unsubscribe()` instead of `takeUntilDestroyed`, imperative derived state instead of `computed()`, boolean function params instead of options objects

## When To Apply

Apply these patterns when **writing new code**. Do NOT refactor existing working code just to match these patterns. Only fix code that:
- Has actual bugs or security issues
- Is being modified for other reasons (then improve adjacent code)
- Causes maintainability problems
