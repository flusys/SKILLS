---
allowed-tools: Read, Grep, Glob, Edit, Write, TodoWrite, AskUserQuestion, Bash(git diff*), Bash(git status*)
description: Refactor file or codebase following FLUSYS patterns
---

# Refactor

Refactor code using **refactor** instruction.

## Scope: Fix ONLY These

| Category            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| **Bugs**            | Code that will cause runtime errors or crashes             |
| **Security**        | SQL injection, XSS, auth bypass vulnerabilities            |
| **Dead code**       | Unused imports, functions, variables, files, DTOs, classes |
| **Broken patterns** | Violates FLUSYS critical rules (see CLAUDE.md)             |
| **Redundant code**  | Duplicate logic, wrapper functions, always-same parameters |

### MANDATORY: Verify Usage Before Keeping Methods

**For EVERY public method, you MUST:**

1. **Grep the project** for the method name
2. **Check results** - is it called outside its own file?
3. **If NO external callers** → DELETE the method
4. **Exception:** Interface requirements (`implements IXxx`)

### MANDATORY: Remove Dead Code

**You MUST remove ALL unused code. This is not optional.**

1. **Unused imports** - Delete immediately
2. **Unused functions/methods** - Grep to verify, then delete
3. **Unused variables/constants** - Delete
4. **Unused class members** - Check if accessed anywhere in class:
   - Static properties never accessed → DELETE
   - Static overrides where parent uses hardcoded class name → DELETE
   - Constructor params with `private readonly` only used in super() → Remove modifiers
   - Instance properties never read after assignment → DELETE
5. **Unused DTOs/classes** - Delete the class AND remove from exports
6. **Unused files** - Delete the file AND remove from index.ts
7. **Commented-out code** - Delete (git has history)

**Before deleting, verify:**

- Not required by an interface (`implements IXxx`)
- Not exported and used elsewhere (use Grep to check)
- Not a public API that external code depends on
- For overrides: parent class actually uses polymorphic access (not hardcoded class name)

## DO NOT Fix

- Style preferences (formatting, naming conventions)
- "Could be better" improvements
- Working code that isn't optimal
- Adding comments, docstrings, or type annotations
- Refactoring for refactoring's sake
- Hypothetical future issues

## Quality Gates

### Angular (only if broken)

- [ ] Legacy `@Input()/@Output()` → `input()/output()` signals
- [ ] `ngIf/ngFor` → `@if/@for` control flow
- [ ] Manual subscriptions without cleanup → `takeUntilDestroyed()`
- [ ] Mutable state → Signal-based reactive state
- [ ] **Localization**: Hardcoded strings → `| translate` pipe
- [ ] **Localization**: `label:` in arrays → `labelKey:` with translation key
- [ ] **Localization**: Hardcoded placeholders → `[placeholder]="'key' | translate"`

### NestJS (only if broken)

- [ ] Missing `@RequirePermission` on protected endpoints
- [ ] Raw SQL queries without parameterization
- [ ] `@InjectRepository` → DataSource provider pattern
- [ ] Missing error handling in async operations
- [ ] **Localization**: Bare string exceptions → `{ message, messageKey }` syntax
- [ ] **Localization**: Plain `throw new Error()` → HTTP exception with messageKey
- [ ] **Localization**: Response without messageKey → add messageKey from constants

## Refactoring Checklist

### 1. Remove Dead & Unnecessary Code (MANDATORY)

- [ ] **Unused imports** - Delete all unused imports
- [ ] **Unused functions/methods** - Grep to verify, then delete
- [ ] **Unused variables/constants** - Delete
- [ ] **Unused classes/DTOs** - Delete class AND remove from exports/index
- [ ] **Commented-out code** - Delete (git has history)
- [ ] **Wrapper functions** - Delete if only calling another function
- [ ] **Always-same parameters** - Remove parameter, hardcode the value
- [ ] **Redundant type assertions** - Remove if type is already correct
- [ ] **VERIFY:** Before removing methods, check `implements IXxx` interface requirements

### 2. Extract Shared Logic (Within File)

- [ ] Identify duplicate code blocks (3+ lines repeated)
- [ ] Extract into private helper methods
- [ ] Naming: `toXxx()` for transformers, `buildXxx()` for builders

### 3. Consolidate Similar Functions

- [ ] Merge functions with similar logic into one with parameters
- [ ] Use optional parameters or overloads where appropriate
- [ ] Combine validation logic into reusable validators

### 4. Organize Function Order

```
1. Constructor & lifecycle hooks
2. Public API methods
3. Private business logic helpers
4. Private data transformation helpers (toXxx, buildXxx)
5. Private utility helpers
```

### 5. Code Style

- **Clean & minimal** - No bloat, no unnecessary code
- **Well structured** - Clear separation of concerns
- **No comments** - Only where logic isn't self-evident
- **No defensive code** - No checks for impossible cases

## Rules

- **ALWAYS grep to verify method usage** before deciding to keep
- **ALWAYS remove dead code** - Unused imports, functions, classes, DTOs, variables
- If code works and is secure, leave it alone
- Converge to stable state - don't suggest endless changes
- Report "No issues found" if code is clean (after removing dead code)
- Do NOT create new files unless absolutely necessary
- Remove console.logs, commented-out code, and unnecessary comments
- Simplify verbose patterns to concise equivalents

## Output Format (Single File)

1. **Summary** - Changes made
2. **Metrics** - Lines removed vs original
3. **Extracted helpers** - New helper methods created
4. **Remaining** - Any suggestions (if critical)

## Examples

**Unused method detection:**

```typescript
// In language.service.ts:
async findByCode(code: string): Promise<Language | null> { ... }

// Grep "findByCode" across project:
// Result: Only found in language.service.ts (definition only)
// Action: DELETE - method is unused
```

**Wrapper function → Remove:**

```typescript
// Before
async handleRegistration(dto: RegisterDto) {
  return this.processRegistration(dto, false);
}
// After: removed, call processRegistration directly
```

**Interface check before removing:**

```typescript
// Class implements IModuleConfigService
// Methods appear unused but interface REQUIRES them!
// Rule: Always check `implements` clause before removing
```

## Detection Commands

```bash
# For each public method found, verify usage:
Grep pattern: methodName
Path: (project root)

# If result count = 1 (only definition) → UNUSED
# If result count > 1 → USED (keep it)
```

```
# Find @InjectRepository usage (NestJS anti-pattern)
pattern: @InjectRepository

# Find legacy Angular decorators
pattern: @Input()
pattern: @Output()

# Find console.log statements
pattern: console.log

# Find any types
pattern: : any

# Find commented-out code
pattern: // .*function|// .*class|// .*const
```

**After removing code:**

1. Check if removed class/DTO is in index.ts exports - remove from there too
2. Check if file is now empty - delete the file
3. Verify no import errors in dependent files
