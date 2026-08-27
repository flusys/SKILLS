# Security

Loaded on demand from the `engineering` skill. Covers OWASP Top 10 patterns, multi-tenant
isolation, input validation, and the Angular-side authorization mirror.

## False Positives — Do NOT Flag

| Pattern | Why It's Safe |
|---------|---------------|
| `router.navigateByUrl(returnUrl)` | Angular Router routes internally only |
| JWT without CSRF tokens | JWT Bearer auth is CSRF-immune |
| `@Public()` on endpoints | Explicitly marked, not a missed guard |
| Password in DTO (registration/login) | Hashed before storage, excluded from response |

## A01: Broken Access Control

`ILoggedUserInfo` (from `@flusys/nestjs-shared`, populated by `@CurrentUser()`) carries identity
only — it has **no permissions array**. Enforce permissions with `@RequirePermission` on the
controller; enforce resource ownership in the service.

```typescript
interface ILoggedUserInfo {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  profilePictureId?: string;
  companyId?: string; // set when enableCompanyFeature = true
  branchId?: string;
}
```

```typescript
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  @Post('insert')
  @RequirePermission('products.create')
  async insert(@Body() dto: CreateDto, @CurrentUser() user: ILoggedUserInfo) {
    return this.service.insert(dto, user);  // NEVER trust client userId
  }

  @Public()  // Explicit public marker
  @Post('public-catalog')
  async getPublicCatalog() {}
}

// Service — verify ownership.
async update(id: string, dto: UpdateDto, user: ILoggedUserInfo): Promise<Entity> {
  const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
  if (!entity) {
    throw new NotFoundException({ message: 'Not found', messageKey: 'error.notFound' });
  }
  if (entity.createdBy !== user.id) {
    throw new ForbiddenException({ message: 'Not authorized', messageKey: AUTH_MESSAGES.PERMISSION_DENIED });
  }
  return this.repository.save({ ...entity, ...dto });
}
```

## A02: Cryptographic Failures

```typescript
// bcrypt with 12+ rounds
const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS); // 12

// Exclude from all responses
@Exclude() password: string;
@Exclude() resetToken?: string;

// Never hardcode secrets — use envConfig
const jwtConfig = envConfig.getJwtConfig();
```

Never: MD5/SHA1 for passwords, hardcoded secrets, plaintext passwords, secrets in logs, committed .env files.

## A03: Injection

```typescript
// SQL — always parameterized
const users = await this.repository
  .createQueryBuilder('user')
  .where('user.email = :email', { email })
  .andWhere('user.name ILIKE :search', { search: `%${query}%` })
  .getMany();

// Dynamic columns — ALWAYS whitelist (prevents column injection)
const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'];
const sortField = ALLOWED_SORT_FIELDS.includes(filter.sortField) ? filter.sortField : 'createdAt';

// Command — use execFile (array args), never exec with string interpolation
execFile('convert', [inputPath, outputPath]);  // ✅
exec(`convert ${userInput} output.png`);       // ❌
```

## A04: Insecure Design

```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } })   // 5/min on login
@Throttle({ default: { limit: 3, ttl: 3600000 } })  // 3/hr on forgot-password

// Account lockout
if (user.failedLoginAttempts >= 5) throw new TooManyRequestsException('Account locked');
if (!await bcrypt.compare(dto.password, user.password)) {
  await this.incrementFailedAttempts(user.id);
  throw new UnauthorizedException('Invalid credentials');
}
```

## A05: Security Misconfiguration

```typescript
app.enableCors({ origin: envConfig.getOrigins(), credentials: true });  // No '*' in prod

app.use(helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:", "blob:"] },
  },
}));
```

## A07: Authentication Failures

```typescript
// JWT config
{ jwtExpiration: '15m', refreshTokenExpiration: '7d' }

// Secure cookie
res.cookie(cookieName, refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

// Token revocation
await this.cache.set(`${TOKEN_REVOKED_PREFIX}:${user.sessionId}`, true, 86400000);

// Check in JwtStrategy
const isRevoked = await this.cache.get(`${TOKEN_REVOKED_PREFIX}:${payload.sessionId}`);
if (isRevoked) throw new UnauthorizedException('Token revoked');
```

## Multi-Tenant Isolation (CRITICAL)

Every query on tenant data **must** include `companyId`. Missing = full data leak.

For `QueryBuilder` queries, use the helper from `@flusys/nestjs-shared` rather than hand-writing
the condition:

```typescript
import { applyCompanyFilter } from '@flusys/nestjs-shared';
import { bootstrapAppConfig } from 'src/config/modules.config'; // the project's source of truth

applyCompanyFilter(
  query,
  { isCompanyFeatureEnabled: bootstrapAppConfig.enableCompanyFeature, entityAlias: 'invoice' }, // columnName defaults to companyId
  user,
);
```

Never hardcode `isCompanyFeatureEnabled: true` — read it from `bootstrapAppConfig`. A snippet with
`true` baked in still filters after a single-company project sets the feature off, silently
returning zero rows once `user.companyId` is `undefined`.

Companion helpers in the same module: `buildCompanyWhereCondition` (for `find`-style `where`
objects), `validateCompanyOwnership` (throws when an entity belongs to another company), and
`hasCompanyId` (type guard).

A `PostToolUse` hook (`.claude/hooks/check-company-filter.sh`) backstops this rule mechanically:
once a project's `CLAUDE.md` records `Company feature: true`, saving a `*.service.ts` file for an
entity with a `companyId` column but no `applyCompanyFilter` call gets flagged automatically. A
service that genuinely needs to read across companies (a super-admin report) opts out with a
`// company-filter: exempt — <reason>` comment instead of triggering the check.

`.claude/rules/tenant-context.md` covers the other half — where `companyId`/`branchId` come from
in the first place — and auto-loads whenever a controller or service file under `modules/` is
open, the same mechanism `entities.md`/`migrations.md` use for the kit's other two Hard Rules.

**The same leak has a write-path variant, easy to miss because nothing reads the row back in the
same request.** A `before*Operation` FK-existence check (validating that a DTO's `otherEntityId`
refers to a real row before insert/update) needs `companyId` in its `where` clause too:

```typescript
// ❌ Lets a Company A user reference (and later read back) a Company B row by UUID
const category = await queryRunner.manager.findOne(Category, { where: { id: dto.categoryId } });

// ✅ — pass `user` into every FK-validation helper and scope it
const category = await queryRunner.manager.findOne(Category, {
  where: { id: dto.categoryId, ...(user?.companyId ? { companyId: user.companyId } : {}) },
});
```

Skip the filter only for a genuinely **global**, non-company-scoped entity (a shared catalog every
company may reference) — confirm that before treating any FK target as global.

```typescript
// ❌ Returns ALL tenants' data
await this.repository.find({ where: { deletedAt: IsNull() } });

// ✅ Always scope to current user's company
await this.repository.find({ where: { companyId: user.companyId, deletedAt: IsNull() } });

// ✅ Single resource — scope by BOTH id AND companyId
const entity = await this.repository.findOne({
  where: { id, companyId: user.companyId, deletedAt: IsNull() },
});
if (!entity) throw new NotFoundException({ message: 'Not found', messageKey: 'error.notFound' });
```

## Input Validation

```typescript
export class CreateUserDto {
  @IsString() @MaxLength(255) @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail() @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString() @MinLength(8) @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: 'Weak password' })
  password: string;

  @IsUUID()
  companyId: string;

  [key: string]: unknown;  // blocks mass-assignment
}
```

## XSS Prevention

```html
<!-- Angular auto-escapes interpolation — safe -->
<div>{{ userInput }}</div>

<!-- DANGER — only sanitized content -->
<div [innerHTML]="sanitizer.sanitize(SecurityContext.HTML, userHtml)"></div>
```

```typescript
// NestJS — sanitize HTML before storage
@Transform(({ value }) => purify.sanitize(value))
description: string;
```

## File Upload Security

```typescript
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) cb(null, true);
  else cb(new BadRequestException('Invalid file type'), false);
};

const limits = { fileSize: 5 * 1024 * 1024, files: 10 };

// Validate magic bytes — never trust client MIME
const type = await fileType.fromBuffer(buffer);
const isValid = type && allowedMimes.includes(type.mime);
```

Never: execute uploads, store without validation, trust client MIME type, allow path traversal in filenames.

**Server-generated files uploaded via `@flusys/nestjs-storage`'s `UploadService.uploadSingleFile`**
(a stub report, CSV/PDF export, data dump a service builds and stores on the backend — not a user
upload) must declare a `mimetype` from that service's own fixed allowlist: `image/*`,
`application/pdf`, Word/Excel formats, or `text/*` — nothing else, including `application/json`.
The validator rejects anything outside it regardless of whether the file content is actually well
formed. If the natural content type isn't on the list (e.g. a JSON export), declare `text/plain`
instead — it still matches the `text/*` wildcard and the filename/content are unaffected.

## Angular Authorization

Frontend enforcement mirrors the backend guards — never rely on hiding a button alone; the route
and the API call must also be guarded.

**Route guards** — all redirect to `'/'` by default, pass `redirectTo` to override:

```typescript
import { permissionGuard, anyPermissionGuard, allPermissionsGuard } from '@flusys/ng-shared';

{ path: 'products', canActivate: [permissionGuard('product.read')] }
{ path: 'products/manage', canActivate: [anyPermissionGuard(['product.create', 'product.admin'])] }
{ path: 'admin', canActivate: [allPermissionsGuard(['admin.view', 'admin.manage'], '/access-denied')] }
```

`permissionGuard` also accepts an `ILogicNode` AND/OR tree for compound checks — same shape as
`@RequirePermissionLogic` on the backend.

**Template and component checks:**

```typescript
import { PermissionValidatorService } from '@flusys/ng-shared';

@Component({...})
export class ProductListComponent {
  private readonly perm = inject(PermissionValidatorService);
  // Always wrap in computed() — reactively updates when user/branch changes
  readonly canCreate = computed(() => this.perm.hasPermission('product.create'));
}
```

```html
<!-- *hasPermission accepts string | ILogicNode -->
<button *hasPermission="'product.create'">Create</button>
```

**Auth session guards** (`@flusys/ng-auth`): `appInitGuard` (restore session + permissions — root
route only), `authGuard` (redirect to login if unauthenticated), `guestGuard` (redirect home if
already logged in), `companyFeatureGuard`, `emailFeatureGuard`.

## Security Audit Checklist

**Auth & Authorization**
- [ ] `@UseGuards(JwtAuthGuard)` on all protected controllers
- [ ] `@RequirePermission()` for fine-grained access
- [ ] `@CurrentUser()` for user context — never trust client
- [ ] Resource ownership verified in services
- [ ] Account lockout + rate limiting on auth endpoints

**Input & Data**
- [ ] All DTOs have validation decorators + `[key: string]: unknown`
- [ ] `@Transform()` for sanitization (trim, lowercase)
- [ ] Sensitive fields `@Exclude()` + `plainToInstance()` with `excludeExtraneousValues`
- [ ] Parameterized queries only — no string concat
- [ ] `deletedAt: IsNull()` on all queries
- [ ] `companyId` scoping on every tenant-data query

**Infrastructure**
- [ ] CORS configured (no wildcard in production)
- [ ] Helmet security headers
- [ ] Secure cookies (httpOnly, secure, sameSite: strict)
- [ ] HTTPS in production
- [ ] `npm audit` clean

**Logging**
- [ ] Security events logged (login, logout, failures)
- [ ] Passwords/tokens NOT logged

## Vulnerabilities Quick Reference

| Vulnerability | Fix |
|---------------|-----|
| Broken access control | Guards + permissions + ownership checks |
| SQL injection | Parameterized queries, whitelist sort fields |
| XSS | Angular auto-escape, sanitize innerHTML |
| CSRF | JWT Bearer auth (immune) |
| IDOR | UUIDs, verify ownership + companyId |
| Weak crypto | bcrypt 12+ rounds, no MD5/SHA1 |
| Sensitive data exposure | `@Exclude()`, `plainToInstance()` |
| Missing rate limits | `@Throttle()` on sensitive endpoints |
| Insecure cookies | httpOnly, secure, sameSite: strict |
| Multi-tenant leak | Always scope by `companyId` |
