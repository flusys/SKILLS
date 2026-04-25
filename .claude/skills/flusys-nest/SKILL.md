---
name: flusys-nest
description: "FLUSYS NestJS packages — complete public API. Load when generating or reviewing any NestJS code: envConfig, setupSwaggerDocs, ILoggedUserInfo, NOTIFICATION_ADAPTER, EVENT_MANAGER_ADAPTER tokens, AuthModule USER_ENRICHER, AUTH_EMAIL_PROVIDER."
---

# FLUSYS NestJS — Package Reference

## Dependency Order

```
nestjs-core  →  nestjs-shared  →  nestjs-auth
                                →  nestjs-iam
                                →  nestjs-email
                                →  nestjs-notification
                                →  nestjs-storage
                                →  nestjs-localization
                                →  nestjs-form-builder
                                →  nestjs-event-manager
```

**Import order in AppModule:** `NotificationModule` before `AuthModule` so `NOTIFICATION_ADAPTER` token is available. If notificatioin features if enabled.

---

## @flusys/nestjs-core

Foundation. No @flusys deps. Always first.

### Key Exports

```typescript
import { envConfig } from "@flusys/nestjs-core/config";
import {
  setupSwaggerDocs,
  IModuleSwaggerOptions,
} from "@flusys/nestjs-core/docs";
```

### `envConfig` — reads .env

```typescript
envConfig.getTypeOrmConfig(); // → IDatabaseConfig
envConfig.getJwtConfig(); // → { jwtSecret, jwtExpiration, refreshTokenSecret, refreshTokenExpiration }
envConfig.getRedisUrl(); // → 'redis://localhost:6379'
envConfig.getOrigins(); // → string[]
envConfig.getPort(); // → number
envConfig.isProduction(); // → boolean
```

### Swagger Docs

**Imports:**

```typescript
import {
  setupSwaggerDocs,
  IModuleSwaggerOptions,
  ISchemaPropertyExclusion,
  IExampleExclusion,
  IQueryParameterExclusion,
  ISwaggerGlobalHeader,
} from "@flusys/nestjs-core/docs";
```

**`setupSwaggerDocs(app, ...configs)`** — call once per module in `main.ts` (dev only).

---

#### Creating a swagger config for a custom module

Create `src/docs/product-swagger.config.ts` in your feature module:

```typescript
import {
  IModuleSwaggerOptions,
  ISchemaPropertyExclusion,
} from "@flusys/nestjs-core";

// 1. Define conditional schema exclusions (fields to hide based on feature flags)
const COMPANY_SCHEMA_EXCLUSIONS: ISchemaPropertyExclusion[] = [
  { schemaName: "CreateProductDto", properties: ["companyId"] },
  { schemaName: "ProductResponseDto", properties: ["companyId", "branchId"] },
];

export function productSwaggerConfig(options?: {
  enableCompanyFeature?: boolean;
  databaseMode?: "single" | "multi-tenant";
}): IModuleSwaggerOptions {
  const enableCompanyFeature = options?.enableCompanyFeature ?? true;
  const isMultiTenant = options?.databaseMode === "multi-tenant";

  return {
    title: "Product API",
    description: `## Product Management API\nCRUD for products and categories.`,
    version: "1.0",
    path: "api/docs/products", // URL where Swagger UI is served
    bearerAuth: true, // show Authorize button

    // --- conditional exclusions ---
    excludeSchemaProperties: enableCompanyFeature
      ? undefined
      : COMPANY_SCHEMA_EXCLUSIONS,
  };
}
```

Wire it in `main.ts`:

```typescript
import { ProductModule } from "./product/product.module";
import { productSwaggerConfig } from "./docs/product-swagger.config";

setupSwaggerDocs(app, {
  ...productSwaggerConfig({ enableCompanyFeature, databaseMode }),
  modules: [ProductModule], // scope to this module's controllers only
  globalHeaders: isMultiTenant
    ? [
        {
          name: "x-tenant-id",
          description: "Tenant ID",
          required: false,
          example: "tenant1",
        },
      ]
    : undefined,
});
```

---

#### `IModuleSwaggerOptions` — all fields

| Field                     | Type                         | Purpose                                         |
| ------------------------- | ---------------------------- | ----------------------------------------------- |
| `title`                   | `string`                     | Swagger UI tab title                            |
| `description`             | `string`                     | Markdown shown at top of docs                   |
| `version`                 | `string`                     | API version label (default `'1.0'`)             |
| `path`                    | `string`                     | URL path e.g. `api/docs/products`               |
| `modules`                 | `Type[]`                     | Scope to specific NestJS modules — omit for all |
| `bearerAuth`              | `boolean`                    | Show Bearer token Authorize button              |
| `globalHeaders`           | `ISwaggerGlobalHeader[]`     | Headers injected on every request               |
| `excludeTags`             | `string[]`                   | Hide entire controller tag groups               |
| `excludePaths`            | `string[]`                   | Hide specific paths (supports `*` wildcard)     |
| `excludeSchemaProperties` | `ISchemaPropertyExclusion[]` | Hide fields from request/response DTOs          |
| `excludeQueryParameters`  | `IQueryParameterExclusion[]` | Hide query params from GET endpoints            |
| `excludeExamples`         | `IExampleExclusion[]`        | Hide named response examples                    |

---

#### `excludeTags` — hide entire controller groups

Controller tag = the string in `@ApiTags('...')`. Use to remove whole sections:

```typescript
excludeTags: ['Admin Panel', 'Internal'],
// Hides all endpoints decorated with @ApiTags('Admin Panel') or @ApiTags('Internal')
```

Real usage (IAM — hide auth-owned controllers leaked into IAM docs):

```typescript
excludeTags: ['Authentication', 'Users', 'Companies', 'Branches'],
```

---

#### `excludePaths` — hide specific URL paths

Supports `*` (single segment) and `**` (any depth):

```typescript
excludePaths: [
  '/products/internal-sync',        // exact path
  '/products/*/audit-log',          // wildcard single segment
  '/admin/**',                       // wildcard all under /admin
],
```

Real usage (auth — hide email verification endpoints when feature disabled):

```typescript
excludePaths: [
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/resend-verification',
  '/auth/verify-email',
],
```

---

#### `excludeSchemaProperties` — hide DTO fields

Removes properties from request/response schemas. Also strips them from `required[]`:

```typescript
excludeSchemaProperties: [
  // hide companyId from request DTOs when company feature is off
  { schemaName: 'CreateProductDto', properties: ['companyId'] },
  { schemaName: 'UpdateProductDto', properties: ['companyId'] },
  // hide from response DTOs too
  { schemaName: 'ProductResponseDto', properties: ['companyId', 'branchId'] },
],
```

> `schemaName` = the DTO class name (NestJS uses the class name as the OpenAPI schema name).

---

#### `excludeQueryParameters` — hide GET query params

Use when a GET endpoint has query params that are only relevant when a feature flag is on:

```typescript
excludeQueryParameters: [
  {
    pathPattern: '/products/search',    // exact path
    method: 'get',                      // optional — omit to match all methods
    parameters: ['companyId', 'branchId'],
  },
  {
    pathPattern: '/products/*',         // wildcard
    parameters: ['tenantId'],
  },
],
```

---

#### `excludeExamples` — hide named response examples

Use when a response has multiple named examples and some only apply under certain config:

```typescript
excludeExamples: [
  {
    pathPattern: '/products/insert',
    method: 'post',
    examples: ['withCompanyContext', 'multiTenantResponse'],
  },
],
```

Real usage (auth — hide company-related login response examples):

```typescript
excludeExamples: [
  { pathPattern: '/auth/login', method: 'post', examples: ['loginSuccessWithCompany', 'companySelection'] },
],
```

---

#### `globalHeaders` — inject headers on every request

For multi-tenant mode where every endpoint requires `x-tenant-id`:

```typescript
globalHeaders: [
  {
    name: 'x-tenant-id',
    description: 'Target tenant database identifier',
    required: false,          // false = optional in UI, still shown
    example: 'tenant_acme',
  },
],
```

---

## @flusys/nestjs-shared

Shared infrastructure used by all feature modules and custom app code.

### Guards & Decorators

> All controller guards and decorators (`JwtAuthGuard`, `PermissionGuard`, `@CurrentUser()`, `@RequirePermission`, `@RequireAnyPermission`, `@RequirePermissionLogic`, `@Public()`, `@LogAction()`) — imports, usage, and decision rules are in [api-design → Controller](../api-design/SKILL.md).

### `ILoggedUserInfo` — JWT payload

```typescript
interface ILoggedUserInfo {
  id: string;
  email: string;
  name?: string;
  companyId?: string; // set when enableCompanyFeature = true
  branchId?: string;
}
// Always use @CurrentUser() — never trust userId from request body
```

### Adapter Tokens (cross-package injection)

Tokens defined in `nestjs-shared`, implemented by feature packages. Inject in any service when those packages are enabled. Always use `@Optional()` so the service works even if the package is not registered.

**`NOTIFICATION_ADAPTER`** — provided by `nestjs-notification`

```typescript
import { NOTIFICATION_ADAPTER, INotificationAdapter } from '@flusys/nestjs-shared';

constructor(
  @Optional() @Inject(NOTIFICATION_ADAPTER)
  private readonly notif: INotificationAdapter | null,
) {}

// send to one user
await this.notif?.send({
  userId: entity.assignedUserId,
  title: 'New order assigned',
  message: `Order #${entity.code} assigned to you`,  // optional
  type: NotificationType.INFO,                        // optional
  data: { orderId: entity.id },                       // optional extra payload
  companyId: entity.companyId,                        // optional, company-scoped delivery
});

// send to multiple users
await this.notif?.sendToMany({ userIds: [...], title: 'Stock alert' });

// broadcast to entire company (optional method — check before calling)
await this.notif?.broadcastToCompany?.(entity.companyId, 'Stockout alert');
```

**`EVENT_MANAGER_ADAPTER`** — provided by `nestjs-event-manager`

````typescript
import { EVENT_MANAGER_ADAPTER, IEventManagerAdapter } from '@flusys/nestjs-shared';
import { ParticipantStatus, RecurrenceType } from '@flusys/nestjs-event-manager';

constructor(
  @Optional() @Inject(EVENT_MANAGER_ADAPTER)
  private readonly events: IEventManagerAdapter | null,
) {}

// create an event
const event = await this.events?.createEvent({
  title: 'Sprint Planning',
  eventDate: '2025-06-01',          // 'YYYY-MM-DD'
  startTime: '10:00',               // 'HH:mm'
  endTime: '11:00',
  description: '...',               // optional
  isAllDay: false,                  // optional
  recurrenceType: RecurrenceType.NONE, // optional
  participantIds: dto.attendeeIds,  // optional
  organizerId: user.id,             // optional
  companyId: user.companyId,        // optional
  meetingLink: dto.link,            // optional
  color: '#3B82F6',                 // optional
});

// update participant RSVP
await this.events?.updateParticipantStatus(participantId, ParticipantStatus.ACCEPTED);

---

## @flusys/nestjs-auth

---

### `USER_ENRICHER` — extending user registration & profile

#### When to implement

Generate a `UserEnricher` class whenever the app needs **any** of:
- Side-effects on registration (e.g. create a linked profile/employee/staff record in the same DB transaction)
- Extra data on `GET /auth/me` (roles, IAM permissions, completion %)
- Custom joins on the user list query
- Extra fields on `PATCH /auth/users/:id/profile`

If none of these apply, skip this — do not create an empty class.

#### Decision: which methods to implement

| App requirement | Methods to implement |
|---|---|
| Create linked entity on register | `onUserCreated` |
| Add roles/permissions to `/auth/me` | `getProfileExtras` |
| Extra fields in user list response | `enrichListQuery` + `enrichListItems` |
| Save extra profile fields on update | `validateProfileExtras` + `updateProfileExtras` |
| Multi-step profile sections | `getProfileSections` + `getProfileSectionData` + `updateProfileSection` |
| Profile file upload/delete | `handleSectionFileUpload` + `handleSectionFileDelete` |
| Profile completion bar | `calculateProfileCompletion` |

All methods are optional — only implement what the app requires.

#### Step 1 — Create the enricher class

**File:** `src/auth/user.enricher.ts`

```typescript
import { IUserEnricher, IProfileExtras, USER_ENRICHER } from '@flusys/nestjs-auth';
import { User } from '@flusys/nestjs-auth';
import { Injectable } from '@nestjs/common';
import { ILoggedUserInfo } from '@flusys/nestjs-shared';
import { QueryRunner, SelectQueryBuilder } from 'typeorm';

@Injectable()
export class UserEnricher implements IUserEnricher {
  constructor(
    // inject any services your enricher needs, e.g.:
    // private readonly iamService: IamService,
  ) {}

  // ── REGISTRATION HOOK ────────────────────────────────────────────────────
  // Called inside the registration DB transaction — throw to roll back the
  // entire registration. Only implement if you need a linked record per user.
  async onUserCreated(
    userId: string,
    additionalFields: Record<string, any> | null,
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Example: create linked EmployeeProfile in same transaction
    // await queryRunner.manager.save(EmployeeProfile, {
    //   userId,
    //   employeeId: additionalFields?.employeeId ?? null,
    // });
  }

  // ── USER LIST ENRICHMENT ─────────────────────────────────────────────────
  // Add extra joins/selects to the user list query. Return extraFields[] so
  // the service knows which raw columns to map.
  async enrichListQuery(
    query: SelectQueryBuilder<User>,
    user: ILoggedUserInfo | null,
  ): Promise<{ extraFields: string[] }> {
    // Example: join IAM roles
    // query.leftJoin('iam_user_roles', 'iur', 'iur.user_id = user.id')
    //      .addSelect('iur.role_id', 'roleId');
    return { extraFields: [] };
  }

  // Transform raw list items after query (add computed fields, map joins).
  async enrichListItems(users: any[], user: ILoggedUserInfo | null): Promise<any[]> {
    return users;
  }

  // ── PROFILE EXTRAS ────────────────────────────────────────────────────────
  // Called by GET /auth/me — return extra data merged into the me response.
  async getProfileExtras(userId: string, user: ILoggedUserInfo): Promise<IProfileExtras> {
    // Example:
    // const roles = await this.iamService.getUserRoles(userId, user.companyId);
    // const completion = await this.calculateProfileCompletion(userId, user);
    // return { roles, completionPercentage: completion };
    return {};
  }

  // ── PROFILE UPDATE ────────────────────────────────────────────────────────
  // Validate extra fields before saving (throw BadRequestException to reject).
  async validateProfileExtras(
    userId: string,
    extras: Record<string, any>,
    user: ILoggedUserInfo,
  ): Promise<void> {}

  // Persist extra fields inside the profile update transaction.
  async updateProfileExtras(
    userId: string,
    extras: Record<string, any>,
    queryRunner: QueryRunner,
  ): Promise<void> {}

  // ── PROFILE COMPLETION ────────────────────────────────────────────────────
  async calculateProfileCompletion(userId: string, user: ILoggedUserInfo): Promise<number> {
    return 0; // return 0-100
  }
}
```

#### Step 2 — Wire the provider

In `app.module.ts` (or the feature module that imports `AuthModule`), add to `providers`:

```typescript
import { USER_ENRICHER } from '@flusys/nestjs-auth';
import { UserEnricher } from './auth/user.enricher';

@Module({
  providers: [
    { provide: USER_ENRICHER, useClass: UserEnricher },
  ],
})
export class AppModule {}
```

> Do NOT provide `USER_ENRICHER` inside `AuthModule.forRootAsync({ providers: [] })` — place it in the module that imports `AuthModule` so the DI scope is correct.

#### Step 3 — Pass `additionalFields` from the frontend

Registration DTO already accepts `additionalFields: Record<string, any>`. The frontend sends custom data there; `onUserCreated` receives it. No DTO changes needed.

#### Rules
- `onUserCreated` runs **inside** the registration `QueryRunner` transaction — use `queryRunner.manager`, not an injected repository, to stay in the same transaction. Throwing rolls back user creation entirely.
- `enrichListQuery` / `enrichListItems` — keep joins lightweight; never load full relations here.
- Never inject `UserEnricher` into itself or into `AuthenticationService` — it is consumed by the package, not called directly.
- Always use `@Optional() @Inject(USER_ENRICHER)` when consuming the token in your own services — the token may be absent in test environments.

---

### `AUTH_EMAIL_PROVIDER` — wiring email for verification & password reset

#### When to wire

Wire `AUTH_EMAIL_PROVIDER` whenever `bootstrapAppConfig.enableEmailVerification = true`. Without this provider, `AuthEmailService.isEmailEnabled()` returns `false` and all email flows (verification, forgot-password, reset-password) are silently skipped.

#### Prerequisite

`@flusys/nestjs-email` must be installed and `EmailModule` registered in `AppModule` before `AuthModule`.

#### Step 1 — Create the provider file

**File:** `src/auth/auth-email.provider.ts`

```typescript
import { AUTH_EMAIL_PROVIDER, IAuthEmailProvider } from '@flusys/nestjs-auth';
import { EmailSendService } from '@flusys/nestjs-email';

export const authEmailProvider = {
  provide: AUTH_EMAIL_PROVIDER,
  useFactory: (emailSendService: EmailSendService): IAuthEmailProvider => ({
    // Called by POST /auth/forgot-password
    // resetUrl = frontend URL with token, e.g. https://app.com/reset-password?token=abc
    sendPasswordResetEmail: async (email: string, token: string, resetUrl: string) => {
      await emailSendService.sendTemplateEmail({
        templateSlug: 'password-reset',   // must match a template slug in nestjs-email
        to: email,
        variables: { resetUrl, token },
      });
    },

    // Called after POST /auth/register when email verification is enabled
    // verifyUrl = frontend URL with token, e.g. https://app.com/verify-email?token=abc
    sendVerificationEmail: async (email: string, token: string, verifyUrl: string) => {
      await emailSendService.sendTemplateEmail({
        templateSlug: 'email-verification',
        to: email,
        variables: { verifyUrl, token },
      });
    },

    // Optional — called after registration completes (no token needed)
    sendWelcomeEmail: async (email: string, name: string) => {
      await emailSendService.sendTemplateEmail({
        templateSlug: 'welcome',
        to: email,
        variables: { name },
      });
    },
  }),
  inject: [EmailSendService],
};
```

#### Step 2 — Register in AppModule

```typescript
import { authEmailProvider } from './auth/auth-email.provider';

@Module({
  imports: [
    EmailModule.forRootAsync({ ... }),   // must come before AuthModule
    AuthModule.forRootAsync({
      bootstrapAppConfig,
      providers: [authEmailProvider],    // inject inside AuthModule's DI scope
      ...
    }),
  ],
})
export class AppModule {}
```

> Place `authEmailProvider` inside `AuthModule.forRootAsync({ providers: [] })` — NOT in `AppModule.providers`. `AuthEmailService` is scoped to `AuthModule` and resolves `AUTH_EMAIL_PROVIDER` from within its own module context.

#### Step 3 — Ensure template slugs exist

The `templateSlug` values (`'password-reset'`, `'email-verification'`, `'welcome'`) must be seeded or created in the email template table. If a slug is missing, `sendTemplateEmail` will throw at runtime.

#### Rules
- Only implement `sendWelcomeEmail` if a welcome template exists — it is optional on the interface.
- Never hardcode the `resetUrl` / `verifyUrl` base — they are passed in by `AuthEmailService` from `IAuthModuleConfig.frontendUrl`. Ensure `frontendUrl` is set in `AuthModule.forRootAsync` config.
- Do not call `EmailSendService` directly from business logic for auth emails — always let `AuthEmailService` call `AUTH_EMAIL_PROVIDER`. This keeps retry/error handling centralised.
- `sendPasswordResetEmail` and `sendVerificationEmail` are **required** on the interface — always implement both even if one is temporarily unused.
