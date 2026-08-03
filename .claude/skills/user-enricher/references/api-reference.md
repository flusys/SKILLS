# User Enricher — Type & Wiring Reference

Loaded on demand from the `user-enricher` skill. This documents the *shape* of the system —
types, tokens, wiring steps, example providers — as declared by the installed
`@flusys/nestjs-auth` + `@flusys/ng-auth` packages. It does **not** tell you which of these are
actually wired up to a live UI/DB call in your installed version — that is a separate, empirical
question. Always run Step 0 in the main `user-enricher` skill before implementing any hook here;
several methods below are typed and injectable but dead in the shipped components.

## Backend — `USER_ENRICHER` / `IUserEnricher`

### When to implement

Generate a `UserEnricher` class whenever the app needs **any** of:
- Side-effects on registration (e.g. create a linked profile/employee/staff record in the same DB transaction)
- Extra data on `GET /auth/me` (roles, IAM permissions, completion %)
- Custom joins on the user list query
- Extra fields on `PATCH /auth/users/:id/profile`

If none of these apply, skip this — do not create an empty class.

### Decision: which methods to implement

| App requirement | Methods to implement |
|---|---|
| Create linked entity on register | `onUserCreated` |
| Add roles/permissions to `/auth/me` | `getProfileExtras` |
| Extra fields in user list response | `enrichListItems` |
| Save extra profile fields on update | `validateProfileExtras` + `updateProfileExtras` |
| Multi-step profile sections | `getProfileSections` + `getProfileSectionData` + `updateProfileSection` |
| Profile file upload/delete | `handleSectionFileUpload` + `handleSectionFileDelete` |
| Profile completion bar | `calculateProfileCompletion` |

All methods are optional — only implement what the app requires. **Before implementing any but
`onUserCreated` / `enrichListItems`, re-check Step 0 in the main skill file** — most of the rest
were dead in the one audited version (typed, injectable, but nothing in the shipped UI calls them).

### Step 1 — Create the enricher class

**File:** `src/auth/user.enricher.ts`

```typescript
import { IUserEnricher, IProfileExtras, USER_ENRICHER } from '@flusys/nestjs-auth';
// The user entity class is `AppUser`, and it lives on the /entities subpath —
// there is no `User` export, and entity classes are never on the package root.
import { AppUser } from '@flusys/nestjs-auth/entities';
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

  // Transform raw list items after query (add computed fields, map joins).
  async enrichListItems(users: any[], user: ILoggedUserInfo | null): Promise<any[]> {
    // await query on those users,
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

### Step 2 — Wire the provider

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

> Do NOT provide `USER_ENRICHER` inside `AuthModule.forRootAsync({ providers: [] })` — place it in
> the module that imports `AuthModule` so the DI scope is correct. (See the DI scope gotcha in the
> main skill file for the request-scoped-dependency case.)

### Step 3 — Pass `additionalFields` from the frontend

Registration DTO already accepts `additionalFields: Record<string, any>`. The frontend sends
custom data there; `onUserCreated` receives it. No DTO changes needed.

### Rules

- `onUserCreated` runs **inside** the registration `QueryRunner` transaction — use
  `queryRunner.manager`, not an injected repository, to stay in the same transaction. Throwing
  rolls back user creation entirely.
- `enrichListItems` — keep joins lightweight; never load full relations here.
- Never inject `UserEnricher` into itself or into `AuthenticationService` — it is consumed by the
  package, not called directly.
- Always use `@Optional() @Inject(USER_ENRICHER)` when consuming the token in your own services —
  the token may be absent in test environments.

---

## Frontend — Auth Extension Providers

Extension tokens let feature modules inject custom behaviour into `@flusys/ng-auth` pages
**without modifying ng-auth source** — ideal for cross-cutting concerns like HR data, CRM data, or
custom validation rules that need to be surfaced in multiple places (registration, profile, admin
user list/detail).

### Extension Tokens

| Token | Interface | Extends |
| ----- | --------- | ------- |
| `AUTH_REGISTRATION_EXTENSION` | `IRegistrationExtensionProvider` | Registration page extra fields |
| `AUTH_PROFILE_EXTENSION` | `IProfileExtensionProvider` | Profile page extra sections/fields |
| `AUTH_USER_FORM_EXTENSION` | `IUserFormExtensionProvider` | Admin user form extra fields |
| `AUTH_USER_LIST_EXTENSION` | `IUserListExtensionProvider` | User list extra columns/actions |
| `AUTH_USER_DETAIL_CONFIG` | `IUserDetailViewConfig` | User detail view mode config |
| `AUTH_VALIDATION_CONFIG` | `IAuthValidationConfig` | Custom email/password validation |

### Profile Page Extension (`AUTH_PROFILE_EXTENSION`)

```typescript
import {
  AUTH_PROFILE_EXTENSION,
  IProfileExtensionProvider,
  IProfileExtraSection,
  IProfileExtraField,
} from '@flusys/ng-auth';
import { Observable, of } from 'rxjs';

@Injectable()
export class HrProfileExtension implements IProfileExtensionProvider {
  private readonly hrApi = inject(HrApiService);

  getExtraSections(): IProfileExtraSection[] {
    return [
      {
        key: 'employment',
        titleKey: 'hr.profile.employment',
        icon: 'briefcase',
        order: 10,
        collapsible: true,
        editPermission: 'hr.profile.edit',
      },
    ];
  }

  getExtraFields(): IProfileExtraField[] {
    return [
      { key: 'department', labelKey: 'hr.field.department', type: 'text', editable: false, sectionKey: 'employment', order: 1 },
      { key: 'jobTitle', labelKey: 'hr.field.job_title', type: 'text', editable: true, sectionKey: 'employment', order: 2 },
    ];
  }

  getExtraFieldValues(userId: string): Observable<Record<string, unknown>> {
    return this.hrApi.getEmployeeProfile(userId).pipe(
      map(res => ({ department: res.data.department, jobTitle: res.data.jobTitle }))
    );
  }

  saveExtraFieldValues(userId: string, data: Record<string, unknown>): Observable<void> {
    return this.hrApi.updateEmployeeProfile(userId, data);
  }
}

// Register in app.config.ts
{ provide: AUTH_PROFILE_EXTENSION, useClass: HrProfileExtension }
```

### User List Extension (`AUTH_USER_LIST_EXTENSION`)

```typescript
import {
  AUTH_USER_LIST_EXTENSION,
  IUserListExtensionProvider,
  IUserListExtraColumn,
  IUserListExtraAction,
  IUser,
} from '@flusys/ng-auth';

@Injectable()
export class HrUserListExtension implements IUserListExtensionProvider {
  private readonly hrApi = inject(HrApiService);

  getExtraColumns(): IUserListExtraColumn[] {
    return [
      { key: 'department', header: 'Department', headerKey: 'hr.field.department', field: 'department', sortable: true, order: 5 },
    ];
  }

  getExtraActions(): IUserListExtraAction[] {
    return [
      {
        key: 'view-hr',
        labelKey: 'hr.action.view_profile',
        icon: 'id-card',
        severity: 'info',
        permission: 'hr.profile.read',
        onClick: (user: IUser) => this.openHrProfile(user.id),
        isVisible: (user: IUser) => user.isActive,
        order: 1,
      },
    ];
  }

  // Enrich user data with extra fields from another service
  enrichUserData(users: IUser[]): Observable<IUser[]> {
    const ids = users.map(u => u.id);
    return this.hrApi.getEmployeeBasicInfo(ids).pipe(
      map(res => users.map(u => ({
        ...u,
        department: res.data.find(e => e.userId === u.id)?.department ?? '',
      })))
    );
  }

  private openHrProfile(userId: string) { /* ... */ }
}

// Register in app.config.ts
{ provide: AUTH_USER_LIST_EXTENSION, useClass: HrUserListExtension }
```

### User Form Extension (`AUTH_USER_FORM_EXTENSION`)

```typescript
import {
  AUTH_USER_FORM_EXTENSION,
  IUserFormExtensionProvider,
  IUserFormExtraField,
} from '@flusys/ng-auth';

@Injectable()
export class HrUserFormExtension implements IUserFormExtensionProvider {
  private readonly hrApi = inject(HrApiService);

  getExtraFields(): IUserFormExtraField[] {
    return [
      { key: 'employeeId', labelKey: 'hr.field.employee_id', type: 'text', required: true, order: 10 },
      {
        key: 'department', labelKey: 'hr.field.department', type: 'select',
        options: [
          { labelKey: 'hr.dept.engineering', value: 'engineering' },
          { labelKey: 'hr.dept.hr', value: 'hr' },
        ],
        order: 11,
      },
    ];
  }

  getExtraFieldValues(userId: string): Observable<Record<string, unknown>> {
    return this.hrApi.getEmployeeFields(userId).pipe(map(r => r.data));
  }

  saveExtraFieldValues(userId: string, data: Record<string, unknown>): Observable<void> {
    return this.hrApi.saveEmployeeFields(userId, data);
  }
}

// Register in app.config.ts
{ provide: AUTH_USER_FORM_EXTENSION, useClass: HrUserFormExtension }
```

### Registration Extension (`AUTH_REGISTRATION_EXTENSION`)

```typescript
import {
  AUTH_REGISTRATION_EXTENSION,
  IRegistrationExtensionProvider,
  IRegistrationExtraField,
} from '@flusys/ng-auth';

@Injectable()
export class TenantRegistrationExtension implements IRegistrationExtensionProvider {
  getExtraFields(): IRegistrationExtraField[] {
    return [
      { key: 'companyName', labelKey: 'auth.register.company_name', type: 'text', required: true, order: 5 },
    ];
  }

  transformRegistrationData(data: Record<string, unknown>) {
    return { ...data, tenantType: 'company' };
  }
}

// Register in app.config.ts
{ provide: AUTH_REGISTRATION_EXTENSION, useClass: TenantRegistrationExtension }
```

### Custom Validation Config (`AUTH_VALIDATION_CONFIG`)

```typescript
import { AUTH_VALIDATION_CONFIG } from '@flusys/ng-auth';

// In app.config.ts providers
{
  provide: AUTH_VALIDATION_CONFIG,
  useValue: {
    password: { minLength: 12, requireUppercase: true, requireNumbers: true, requireSpecialChars: true },
    email: { pattern: /^[a-zA-Z0-9._%+-]+@company\.com$/, messageKey: 'auth.validation.company_email_only' },
  },
}
```

### User Detail View Config (`AUTH_USER_DETAIL_CONFIG`)

```typescript
import { AUTH_USER_DETAIL_CONFIG } from '@flusys/ng-auth';

{
  provide: AUTH_USER_DETAIL_CONFIG,
  useValue: {
    viewMode: 'sidebar', // 'dialog' | 'sidebar' | 'page'
    allowEdit: true,
    width: '600px',
    tabs: [
      { key: 'general', labelKey: 'auth.user.tab.general', icon: 'user' },
      { key: 'hr', labelKey: 'hr.tab.employment', icon: 'briefcase', component: HrUserTabComponent },
    ],
  },
}
```

> Per Step 0 in the main skill file, only `viewMode`/`width`/`allowEdit` were live in one audited
> version — `component`/`tabs` rendered nothing. Verify before relying on them; if dead, use
> `AUTH_USER_LIST_EXTENSION.getExtraActions()`'s `onClick` to open your own dialog instead.
