---
name: engineering
description: FLUSYS engineering standards — TypeScript/Angular code quality, TypeORM database patterns, HybridCache performance, and OWASP security. Load for any NestJS/Angular code writing or review.
---

# Engineering Standards

---

## 1. Code Quality

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

---

## 2. Database Design

### Column Patterns

```typescript
@Column({ name: 'name', length: 255 })
name: string;

@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
price: number;

@Column({ type: 'boolean', default: true })
isActive: boolean;

@Column({ type: 'enum', enum: Status, default: Status.DRAFT })
status: Status;

@Column({ type: 'json', nullable: true })  // MySQL: 'json' not 'jsonb'
metadata?: Record<string, unknown>;

@Column({ type: 'timestamp', nullable: true })
publishedAt?: Date;
```

### Relation Patterns (CRITICAL)

Always define BOTH the relation AND the FK column:

```typescript
@ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'category_id' })
category?: Category;

@Column({ name: 'category_id', nullable: true })
categoryId?: string;

@OneToMany(() => OrderItem, item => item.order, { cascade: true })
items: OrderItem[];

@ManyToMany(() => Tag, { cascade: ['insert'] })
@JoinTable({ name: 'product_tags', joinColumn: { name: 'product_id' }, inverseJoinColumn: { name: 'tag_id' } })
tags: Tag[];
```

`onDelete` options: `SET NULL` (nullable FK), `CASCADE` (delete children), `RESTRICT` (prevent parent delete)

### Indexing Strategy

```typescript
@Index(['companyId', 'isActive'])                         // Composite for common queries
@Index(['slug'], { unique: true })                        // Unique constraint
@Index(['email'], { where: 'deleted_at IS NULL', unique: true }) // Partial (PostgreSQL)
```

**Index:** Foreign keys, WHERE/ORDER BY columns, search fields, JOINs  
**Skip:** Boolean flags (low cardinality), rarely queried columns, tables < 1K rows

### Soft Delete (CRITICAL)

```typescript
// ALWAYS filter in every query
const active = await this.repository.find({ where: { deletedAt: IsNull() } });

const query = this.repository.createQueryBuilder('p').where('p.deletedAt IS NULL');

await this.repository.softDelete(id);
await this.repository.restore(id);
const all = await this.repository.find({ withDeleted: true }); // admin only
```

### Pagination with Filters

```typescript
async findPaginated(filter: FilterDto): Promise<PaginatedResponse<Entity>> {
  const query = this.repository.createQueryBuilder('e').where('e.deletedAt IS NULL');

  if (filter.search) query.andWhere('e.name ILIKE :search', { search: `%${filter.search}%` });
  if (filter.status) query.andWhere('e.status = :status', { status: filter.status });

  // ALWAYS whitelist sortField — prevents SQL injection
  const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'];
  const sortField = ALLOWED_SORT_FIELDS.includes(filter.sortField) ? filter.sortField : 'createdAt';
  const sortOrder = filter.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  query.orderBy(`e.${sortField}`, sortOrder);

  const [data, total] = await query.skip(filter.page * filter.pageSize).take(filter.pageSize).getManyAndCount();
  return { data, total, page: filter.page, pageSize: filter.pageSize };
}
```

### N+1 Prevention

```typescript
// Bad — fires 1 query per row accessing relation in loop
const products = await this.repository.find({ where: { deletedAt: IsNull() } });

// Good — single JOIN
const products = await this.repository
  .createQueryBuilder('p')
  .leftJoinAndSelect('p.category', 'category')
  .leftJoinAndSelect('p.tags', 'tags')
  .where('p.deletedAt IS NULL')
  .getMany();
```

**Rule:** Accessing a relation inside a loop or `.map()` = N+1. Always load it upfront.

### Bulk Operations

```typescript
await this.repository.insert(records);
await this.repository.update({ status: Status.PENDING }, { status: Status.PROCESSED, processedAt: new Date() });
await this.repository.softDelete({ categoryId });
```

### Transactions

```typescript
// Preferred for services
@Transactional()
async createWithRelations(dto: CreateDto): Promise<Entity> {
  const entity = await this.repository.save(dto);
  await this.historyService.log('created', entity.id);
  return entity;
}

// Manual
await this.dataSource.transaction(async manager => {
  await manager.decrement(Account, { id: fromId }, 'balance', amount);
  await manager.increment(Account, { id: toId }, 'balance', amount);
});
```

### Migration Best Practices

```bash
npm run migration:generate --name=AddProductSlug
npm run migration:run
npm run migration:revert
TENANT_ID=tenant1 npm run migration:run   # multi-tenant
npm run migration:run:all                  # all tenants
```

| Safe | Risky |
|------|-------|
| Add nullable column | Add NOT NULL without default |
| Add column with default | Drop column |
| Create index CONCURRENTLY | Rename column (breaks app) |
| Soft delete data | Hard delete data |

Safe migration pattern: add nullable → backfill → add constraint.

### DB Checklist

**Always:** Extend `Identity` from `@flusys/nestjs-shared`, define both relation + FK column, filter `deletedAt: IsNull()`, index FKs and search fields, use parameterized queries, use `@Transactional()` for multi-step ops, generate migrations (never sync in prod)

**Never:** Use `@InjectRepository` (use DataSource Provider), raw SQL without params, skip soft-delete filters, `synchronize: true` in production

---

## 3. Performance & Caching

### HybridCache Architecture

FLUSYS uses `HybridCache` (NOT `@nestjs/cache-manager`) — two-tier cache:
- **L1** — in-process `CacheableMemory` (LRU)
- **L2** — Redis via `@keyv/redis`

| `USE_CACHE_LABEL` | L1 Memory | L2 Redis |
|-------------------|-----------|----------|
| `memory` (default) | ✅ | ❌ |
| `redis` | ❌ | ✅ |
| `hybrid` | ✅ | ✅ |

Read order: L1 → L2 (automatic L1 backfill on L2 hit).

```typescript
await cache.get<T>(key)           // T | undefined
await cache.set(key, value, ttl)  // ttl in ms — ALWAYS pass explicit TTL
await cache.del(key)              // removes from L1 + L2
```

### Module Setup

```typescript
// app.module.ts — register once, provides CACHE_INSTANCE globally
import { CacheModule } from '@flusys/nestjs-shared';

@Module({
  imports: [CacheModule.forRoot()],
  // CacheModule.forRoot(true, 120_000, 10_000) — isGlobal, memTTL (ms), LRU size
})
export class AppModule {}
```

```typescript
// Inject in any service
import { CACHE_INSTANCE } from '@flusys/nestjs-shared';

constructor(@Inject(CACHE_INSTANCE) private readonly cache: HybridCache) {}
```

### Custom Cache Service

```typescript
@Injectable()
export class PermissionCacheService {
  private readonly TTL = 300_000;
  private readonly PREFIX = 'permission';

  constructor(@Inject(CACHE_INSTANCE) private readonly cache: HybridCache) {}

  private key(companyId: string, userId?: string): string {
    return userId
      ? `${this.PREFIX}:company:${companyId}:user:${userId}`
      : `${this.PREFIX}:company:${companyId}:list`;
  }

  async getOrSet<T>(key: string, loader: () => Promise<T>, ttl = this.TTL): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined) return cached;
    const fresh = await loader();
    await this.cache.set(key, fresh, ttl);
    return fresh;
  }

  async invalidate(companyId: string, userId?: string): Promise<void> {
    await Promise.all([
      this.cache.del(this.key(companyId, userId)),
      this.cache.del(this.key(companyId)),  // always invalidate list too
    ]);
  }
}
```

Key convention: `<entity>:company:<companyId>:<scope>:<id>` — always scope by tenant.

### Cache TTL Guidelines

| Data Type | TTL (ms) | Reason |
|-----------|----------|--------|
| IAM permissions | `3_600_000` (1h) | Invalidate on role/user change |
| Translations | `600_000` (10min) | Only on admin update |
| Company settings | `600_000` (10min) | Rarely changed |
| User profile | `120_000` (2min) | Balance freshness vs DB |
| Single entity by ID | `300_000` (5min) | Invalidate on update/delete |
| Entity list | `60_000` (1min) | Mutated frequently |
| S3 presigned URLs | `3_500_000` | URLs expire at 3600s |

> TTL is always in **milliseconds** — no exceptions.

### Angular — computed() Memoization

```typescript
// In service — computed() recalculates only when dependencies change
readonly activeProducts = computed(() => this.items().filter(p => p.isActive));
readonly totalActive = computed(() => this.activeProducts().length);
readonly groupedByCategory = computed(() =>
  this.items().reduce((acc, p) => { (acc[p.categoryId] ??= []).push(p); return acc; }, {} as Record<string, IProduct[]>)
);

// effect() is for side effects ONLY (localStorage, DOM, logging)
// ❌ Never effect(() => { this.count.set(this.items().length); })
// ✅ readonly count = computed(() => this.items().length);
```

### Angular — Bundle Size

```typescript
// Lazy load every feature route — no eager imports
{
  path: 'products',
  loadChildren: () => import('./products/routes').then(m => m.PRODUCT_ROUTES),
  resolve: { translations: translationModuleResolver('products') },
}

// Import only used PrimeNG modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
// ❌ Never: import { PrimeNGModule } from './primeng.module';
```

### Performance Anti-Patterns

| Bad | Good |
|-----|------|
| `@nestjs/cache-manager` | `HybridCache` via `CacheModule.forRoot()` |
| TTL in seconds: `300` | Always milliseconds: `300_000` |
| `new HybridCache()` in constructor | Register via `CacheModule.forRoot()` |
| `@Inject('CACHE_INSTANCE')` string | `@Inject(CACHE_INSTANCE)` token |
| `cache.set(key, val)` without TTL | Always pass explicit TTL |
| Cache key without tenant scope | Always include `companyId` |
| Eager route imports | `loadChildren` / `loadComponent` |

---

## 4. Security

### False Positives — Do NOT Flag

| Pattern | Why It's Safe |
|---------|---------------|
| `router.navigateByUrl(returnUrl)` | Angular Router routes internally only |
| JWT without CSRF tokens | JWT Bearer auth is CSRF-immune |
| `@Public()` on endpoints | Explicitly marked, not a missed guard |
| Password in DTO (registration/login) | Hashed before storage, excluded from response |

### A01: Broken Access Control

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

// Service — verify ownership
async update(id: string, dto: UpdateDto, user: ILoggedUserInfo): Promise<Entity> {
  const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
  if (entity.createdBy !== user.id && !user.permissions.includes('admin')) {
    throw new ForbiddenException({ message: 'Not authorized', messageKey: AUTH_MESSAGES.PERMISSION_DENIED });
  }
  return this.repository.save({ ...entity, ...dto });
}
```

### A02: Cryptographic Failures

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

### A03: Injection

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

### A04: Insecure Design

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

### A05: Security Misconfiguration

```typescript
app.enableCors({ origin: envConfig.getOrigins(), credentials: true });  // No '*' in prod

app.use(helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:", "blob:"] },
  },
}));
```

### A07: Authentication Failures

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

### Multi-Tenant Isolation (CRITICAL)

Every query on tenant data **must** include `companyId`. Missing = full data leak.

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

### Input Validation

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

### XSS Prevention

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

### File Upload Security

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

### Security Audit Checklist

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

### Vulnerabilities Quick Reference

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
