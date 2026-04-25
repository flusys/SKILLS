---
name: security-review
description: Load when reviewing or writing any auth, guards, DTOs, queries, file uploads, or multi-tenant data access — covers OWASP Top 10, tenant isolation, injection, XSS, token security, and input validation for FLUSYS NestJS/Angular apps
---

# Security Review

## False Positive Avoidance

Do NOT flag these as vulnerabilities:

| Pattern                                                     | Why It's Safe                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `router.navigateByUrl(returnUrl)`                           | Angular Router only routes internally, cannot redirect externally |
| JWT auth without CSRF tokens                                | JWT Bearer auth is inherently CSRF-immune                         |
| `handleError(): never` after catch                          | TypeScript `never` guarantees it throws                           |
| `new Function('return import(...)')` with hardcoded strings | No user input, safe dynamic import                                |
| `@Public()` decorator on endpoints                          | Explicitly marked, not a missed guard                             |
| Password in DTO (registration/login)                        | Hashed before storage, excluded from response                     |

---

## OWASP Top 10 (2021) Coverage

### A01: Broken Access Control

```typescript
// Controller - Always use guards + permissions
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  @Post('insert')
  @RequirePermission('products.create')
  async insert(
    @Body() dto: CreateDto,
    @CurrentUser() user: ILoggedUserInfo,  // NEVER trust client userId
  ) {
    return this.service.insert(dto, user);
  }

  @Public()  // Explicitly mark public endpoints
  @Post('public-catalog')
  async getPublicCatalog() {}
}

// Service - Verify ownership for sensitive operations
async update(id: string, dto: UpdateDto, user: ILoggedUserInfo): Promise<Entity> {
  const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });

  // Check ownership or admin permission
  if (entity.createdBy !== user.id && !user.permissions.includes('admin')) {
    throw new ForbiddenException({
      message: 'Not authorized to modify this resource',
      messageKey: AUTH_MESSAGES.PERMISSION_DENIED,
    });
  }

  return this.repository.save({ ...entity, ...dto });
}
```

**Checklist:**

- `@UseGuards(JwtAuthGuard)` on all protected controllers
- `@RequirePermission()` for fine-grained access
- `@CurrentUser()` for user context (never trust client)
- Verify resource ownership in services
- Use UUIDs, not sequential IDs (prevents enumeration)

### A02: Cryptographic Failures

```typescript
// Password hashing - bcrypt with 12+ rounds
import { BCRYPT_SALT_ROUNDS } from '@flusys/nestjs-auth';

const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS); // 12

// Password verification
const isValid = await bcrypt.compare(password, user.password);

// Exclude from responses
@Exclude() password: string;
@Exclude() resetToken?: string;
@Exclude() verificationToken?: string;
```

**Secrets Management:**

```typescript
// Environment variables - NEVER hardcode
const jwtSecret = process.env.JWT_SECRET;
const dbPassword = process.env.DB_PASSWORD;

// envConfig for type-safe access
import { envConfig } from "@flusys/nestjs-core/config";
const jwtConfig = envConfig.getJwtConfig();
```

**Never do:**

- MD5/SHA1 for passwords
- Hardcode secrets in code
- Store plaintext passwords
- Include secrets in logs
- Commit .env files

### A03: Injection

#### SQL Injection Prevention

```typescript
// CORRECT - Parameterized queries
const users = await this.repository
  .createQueryBuilder("user")
  .where("user.email = :email", { email })
  .andWhere("user.name ILIKE :search", { search: `%${query}%` })
  .getMany();

// CORRECT - Repository methods
const user = await this.repository.findOne({ where: { email } });

// WRONG - SQL Injection vulnerable!
const users = await this.repository.query(
  `SELECT * FROM users WHERE email = '${email}'`,
);
```

#### Dynamic Column Injection Prevention

```typescript
// WRONG - sortField interpolated directly → SQL injection
query.orderBy(`e.${filter.sortField}`, filter.sortOrder);

// CORRECT - whitelist allowed sort columns
const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'];
const sortField = ALLOWED_SORT_FIELDS.includes(filter.sortField) ? filter.sortField : 'createdAt';
const sortOrder = filter.sortOrder === 'ASC' ? 'ASC' : 'DESC';
query.orderBy(`e.${sortField}`, sortOrder);
```

#### NoSQL/Query Injection Prevention

```typescript
// CORRECT - Validated DTO
const filter = plainToInstance(FilterDto, rawFilter);
await validateOrReject(filter);

// WRONG - Direct object injection
const result = await this.repository.find({ where: userInput });
```

#### Command Injection Prevention

```typescript
// CORRECT - Avoid shell commands when possible
import { execFile } from "child_process";
execFile("convert", [inputPath, outputPath]); // Array args, no shell

// WRONG - Shell injection vulnerable
exec(`convert ${userInput} output.png`);
```

### A04: Insecure Design

```typescript
// Rate limiting on sensitive endpoints
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 requests per minute
@Post('login')
async login(@Body() dto: LoginDto) {}

@Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
@Post('forgot-password')
async forgotPassword(@Body() dto: ForgotPasswordDto) {}

// Account lockout
async login(dto: LoginDto): Promise<LoginResponse> {
  const user = await this.findByEmail(dto.email);

  if (user.failedLoginAttempts >= 5) {
    throw new TooManyRequestsException('Account locked. Try again later.');
  }

  if (!await bcrypt.compare(dto.password, user.password)) {
    await this.incrementFailedAttempts(user.id);
    throw new UnauthorizedException('Invalid credentials');
  }

  await this.resetFailedAttempts(user.id);
  return this.generateTokens(user);
}
```

### A05: Security Misconfiguration

```typescript
// CORS configuration
app.enableCors({
  origin: envConfig.getOrigins(), // Specific origins, NOT '*' in production
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
});

// Helmet for security headers
import helmet from "helmet";
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
      },
    },
  }),
);

// Disable X-Powered-By
app.disable("x-powered-by");

// Production checks
if (envConfig.isProduction()) {
  // Disable debug endpoints
  // Enable strict SSL
  // Use secure cookies
}
```

### A06: Vulnerable Components

```bash
# Regular dependency audits
npm audit
npm audit fix

# Check for outdated packages
npm outdated

# Use lockfile for reproducible builds
npm ci  # Not npm install
```

### A07: Authentication Failures

```typescript
// JWT configuration
{
  jwtSecret: process.env.JWT_SECRET,         // Min 256 bits
  jwtExpiration: '15m',                       // Short-lived access tokens
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshTokenExpiration: '7d',
  refreshTokenCookieName: 'fsn_refresh_token',
}

// Secure cookie settings
res.cookie(cookieName, refreshToken, {
  httpOnly: true,      // No JS access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Token revocation
async logout(user: ILoggedUserInfo): Promise<void> {
  await this.cache.set(
    `${TOKEN_REVOKED_PREFIX}:${user.sessionId}`,
    true,
    86400000,  // TTL matches token expiry
  );
}

// Check revocation in JwtStrategy
async validate(payload: TokenPayload): Promise<ILoggedUserInfo> {
  const isRevoked = await this.cache.get(`${TOKEN_REVOKED_PREFIX}:${payload.sessionId}`);
  if (isRevoked) throw new UnauthorizedException('Token revoked');
  // ...
}
```

### A08: Data Integrity Failures

```typescript
// Response DTO - Explicit exposure
export class UserResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() name: string;
  @Expose() @ApiProperty() email: string;

  @Exclude() password?: string;
  @Exclude() resetToken?: string;
  @Exclude() verificationToken?: string;
  @Exclude() failedLoginAttempts?: number;
}

// Transform entities to DTOs
return plainToInstance(UserResponseDto, entity, {
  excludeExtraneousValues: true,
});

// Audit trail (provided by Identity from @flusys/nestjs-shared)
createdBy: string;
updatedBy: string;
deletedBy: string;
```

### A09: Security Logging & Monitoring

```typescript
// Log security events
this.logger.warn("Failed login attempt", { email: dto.email, ip: request.ip });
this.logger.warn("Permission denied", { userId: user.id, resource, action });
this.logger.log("User logged in", { userId: user.id });
this.logger.log("Password changed", { userId: user.id });

// Never log sensitive data
this.logger.log("User login", { email }); // OK
this.logger.log("User login", { password }); // WRONG!
```

### A10: Server-Side Request Forgery (SSRF)

```typescript
// Validate URLs before fetching
const allowedHosts = ["api.trusted-service.com", "cdn.example.com"];

function validateUrl(url: string): boolean {
  const parsed = new URL(url);
  return (
    allowedHosts.includes(parsed.host) &&
    ["http:", "https:"].includes(parsed.protocol)
  );
}

// Block internal IPs
const blockedPatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // Link-local
];
```

---

## Multi-Tenant Isolation (FLUSYS Critical)

Every query against tenant-scoped data **must** include `companyId`. A missing scope = full data leak across tenants.

```typescript
// WRONG - returns data from ALL tenants
const products = await this.repository.find({
  where: { deletedAt: IsNull() },
});

// CORRECT - always scope to current user's company
const products = await this.repository.find({
  where: { companyId: user.companyId, deletedAt: IsNull() },
});

// CORRECT - QueryBuilder
const query = this.repository
  .createQueryBuilder('p')
  .where('p.companyId = :companyId', { companyId: user.companyId })
  .andWhere('p.deletedAt IS NULL');

// CORRECT - ownership check on single-resource access
async findOne(id: string, user: ILoggedUserInfo): Promise<Entity> {
  const entity = await this.repository.findOne({
    where: { id, companyId: user.companyId, deletedAt: IsNull() },
  });
  if (!entity) throw new NotFoundException({ message: 'Not found', messageKey: 'error.notFound' });
  return entity;
}
```

**Checklist:**
- Every `find`, `findOne`, `createQueryBuilder` on tenant data includes `companyId: user.companyId`
- Single-resource endpoints (`GET /entity/:id`) scope by both `id` AND `companyId` — never just `id`
- Admin-only cross-tenant queries are explicitly guarded with an admin permission check

---

## Input Validation Patterns

```typescript
export class CreateUserDto {
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  @ApiProperty()
  name: string;

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  @ApiProperty()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      "Password must include uppercase, lowercase, number, and special character",
  })
  @ApiProperty()
  password: string;

  @IsUUID()
  @ApiProperty()
  companyId: string;

  @IsOptional()
  @IsUrl({ protocols: ["http", "https"] })
  @ApiProperty({ required: false })
  website?: string;

  @IsOptional()
  @IsPhoneNumber()
  @ApiProperty({ required: false })
  phone?: string;
}
```

---

## XSS Prevention

### Angular (Frontend)

```html
<!-- Safe - Angular auto-escapes -->
<div>{{ userInput }}</div>
<div [textContent]="userInput"></div>

<!-- DANGER - Only with sanitized content -->
<div [innerHTML]="sanitizedHtml"></div>

<!-- Use DomSanitizer for trusted content -->
<div [innerHTML]="sanitizer.bypassSecurityTrustHtml(trustedHtml)"></div>
```

```typescript
// Sanitize user-provided HTML
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

export class RichTextComponent {
  sanitizedContent: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {}

  setContent(html: string): void {
    // For untrusted content - sanitizes dangerous tags/attributes
    this.sanitizedContent = this.sanitizer.sanitize(SecurityContext.HTML, html);
  }
}
```

### NestJS (Backend)

```typescript
// Sanitize HTML before storage
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

@Transform(({ value }) => purify.sanitize(value))
@ApiProperty()
description: string;
```

---

## File Upload Security

```typescript
// Multer configuration
const storage = diskStorage({
  destination: './uploads/temp',
  filename: (req, file, cb) => {
    const uniqueName = `${uuid()}-${Date.now()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

  const ext = extname(file.originalname).toLowerCase();
  const mimeValid = allowedMimes.includes(file.mimetype);
  const extValid = allowedExts.includes(ext);

  if (mimeValid && extValid) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Invalid file type'), false);
  }
};

// Size limits
const limits = {
  fileSize: 5 * 1024 * 1024,  // 5MB max
  files: 10,                   // Max 10 files per request
};

// Validate file content (magic bytes)
import * as fileType from 'file-type';

async validateFileContent(buffer: Buffer): Promise<boolean> {
  const type = await fileType.fromBuffer(buffer);
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  return type && allowedTypes.includes(type.mime);
}
```

**Never do:**

- Execute uploaded files
- Store in web-accessible directory without validation
- Trust client-provided MIME types
- Allow path traversal in filenames (`../../../etc/passwd`)

---

## Session & Token Security

```typescript
// Session cache keys
const SESSION_CACHE_PREFIX = 'auth:session';
const TOKEN_REVOKED_PREFIX = 'auth:revoked';

// Store session metadata
await this.cache.set(`${SESSION_CACHE_PREFIX}:${sessionId}`, {
  userId: user.id,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  createdAt: new Date(),
}, sessionTTL);

// Validate session on sensitive operations
async validateSession(sessionId: string, request: Request): Promise<void> {
  const session = await this.cache.get(`${SESSION_CACHE_PREFIX}:${sessionId}`);

  if (!session) throw new UnauthorizedException('Session expired');

  // Optional: IP binding for high-security scenarios
  if (session.ip !== request.ip) {
    this.logger.warn('Session IP mismatch', { sessionId, expected: session.ip, actual: request.ip });
    // Depending on security requirements: throw or just log
  }
}
```

---

## Security Headers (Angular)

```typescript
// angular.json - CSP meta tag
{
  "architect": {
    "build": {
      "options": {
        "index": {
          "input": "src/index.html",
          "output": "index.html"
        }
      }
    }
  }
}

// index.html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

---

## Security Audit Checklist

### Authentication & Authorization

- [ ] `@UseGuards(JwtAuthGuard)` on protected endpoints
- [ ] `@RequirePermission()` for fine-grained access
- [ ] `@CurrentUser()` for user context (never trust client)
- [ ] Resource ownership verified in services
- [ ] Account lockout after failed attempts
- [ ] Rate limiting on auth endpoints

### Input Validation

- [ ] All DTOs have validation decorators
- [ ] `@Transform()` for sanitization (trim, lowercase)
- [ ] `[key: string]: unknown` on all DTOs (blocks mass-assignment: `export class CreateDto { name: string; [key: string]: unknown; }`)
- [ ] File upload validation (type, size, content)
- [ ] URL validation before fetch

### Data Protection

- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] Sensitive fields `@Exclude()` from responses
- [ ] `plainToInstance()` with `excludeExtraneousValues`
- [ ] No hardcoded secrets (use env vars)
- [ ] Secrets not logged

### Query Security

- [ ] Parameterized queries only (no string concat)
- [ ] `deletedAt: IsNull()` on all queries (soft delete)
- [ ] Input validated before use in queries

### Infrastructure

- [ ] CORS configured (no wildcard in production)
- [ ] Security headers (Helmet)
- [ ] HTTPS enforced in production
- [ ] Secure cookie settings (httpOnly, secure, sameSite)
- [ ] Dependencies audited (`npm audit`)

### Logging & Monitoring

- [ ] Security events logged (login, logout, failures)
- [ ] Sensitive data NOT logged
- [ ] Failed auth attempts tracked

---

## Common Vulnerabilities Quick Reference

| Vulnerability           | Fix                                      |
| ----------------------- | ---------------------------------------- |
| Broken access control   | Guards + permissions + ownership checks  |
| SQL injection           | Parameterized queries, never concat      |
| XSS                     | Angular auto-escape, sanitize innerHTML  |
| CSRF                    | JWT Bearer auth (immune), or CSRF tokens |
| IDOR                    | UUIDs, verify ownership                  |
| Weak crypto             | bcrypt 12+ rounds, no MD5/SHA1           |
| Sensitive data exposure | `@Exclude()`, `plainToInstance()`        |
| Missing rate limits     | `@Throttle()` on sensitive endpoints     |
| Insecure cookies        | httpOnly, secure, sameSite: strict       |
| SSRF                    | Validate URLs, block internal IPs        |
