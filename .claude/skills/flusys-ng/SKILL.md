---
name: flusys-ng
description: "FLUSYS Angular packages — complete public API, implementation patterns, wiring, . Load when generating or reviewing any Angular code: shared components, services, guards, signals, or provider tokens."
---

# FLUSYS Angular — Package Reference

## Dependency Order

```
ng-core  →  ng-shared →  ng-layout
                      →  ng-auth
                      →  ng-localization
                      →  ng-iam
                      →  ng-notification
                      →  ng-storage
                      →  ng-email
                      →  ng-form-builder
                      →  ng-event-manager
```

---

## @flusys/ng-shared

Foundation for all feature packages. Always available.

### Guards

Three guards available — all redirect to `'/'` by default, pass `redirectTo` to override.

| Guard                 | Logic                             | Input                  |
| --------------------- | --------------------------------- | ---------------------- |
| `permissionGuard`     | single check or `ILogicNode` tree | `string \| ILogicNode` |
| `anyPermissionGuard`  | OR — passes if user has ANY       | `string[]`             |
| `allPermissionsGuard` | AND — passes if user has ALL      | `string[]`             |

```typescript
import { permissionGuard, anyPermissionGuard, allPermissionsGuard } from '@flusys/ng-shared';
import { ILogicNode } from '@flusys/ng-shared';

// Simple string — single permission
{
  path: 'products',
  canActivate: [permissionGuard('product.read')],
  loadComponent: () => import('./products/product-list.component'),
}

// anyPermissionGuard — OR: passes if user has at least one
{
  path: 'products/manage',
  canActivate: [anyPermissionGuard(['product.create', 'product.update', 'product.admin'])],
  loadComponent: () => import('./products/product-manage.component'),
}

// allPermissionsGuard — AND: passes only if user has every permission
{
  path: 'admin',
  canActivate: [allPermissionsGuard(['admin.view', 'admin.manage'], '/access-denied')],
  loadComponent: () => import('./admin/admin.component'),
}

// permissionGuard + ILogicNode — (product.update OR product.admin) AND product.read
const productEditLogic: ILogicNode = {
  type: 'group',
  operator: 'AND',
  children: [
    { type: 'action', actionId: 'product.read' },
    {
      type: 'group',
      operator: 'OR',
      children: [
        { type: 'action', actionId: 'product.update' },
        { type: 'action', actionId: 'product.admin' },
      ],
    },
  ],
};

{
  path: 'products/:id/edit',
  canActivate: [permissionGuard(productEditLogic, '/access-denied')],
  loadComponent: () => import('./products/product-form.component'),
}
```

### `HasPermissionDirective`

```html
<!-- *hasPermission accepts string | ILogicNode -->
<button *hasPermission="'product.create'">Create</button>

<!-- ILogicNode — AND/OR tree -->
<div *hasPermission="adminOrManagerLogic">Admin Panel</div>
```

```typescript
// In component
readonly adminOrManagerLogic: ILogicNode = {
  type: 'group',
  operator: 'OR',
  children: [
    { type: 'action', actionId: 'admin' },
    { type: 'action', actionId: 'manager' },
  ],
};
```

### `PermissionValidatorService`

```typescript
import { PermissionValidatorService } from '@flusys/ng-shared';

@Component({...})
export class ProductListComponent {
  private readonly perm = inject(PermissionValidatorService);

  // Always wrap in computed() — reactively updates when user/branch changes
  readonly canCreate = computed(() => this.perm.hasPermission('product.create'));
  readonly canEdit   = computed(() => this.perm.hasAnyPermission(['product.update', 'admin']));
  readonly canDelete = computed(() => this.perm.hasAllPermissions(['product.delete', 'product.admin']));
}
```

```html
@if (canCreate()) {
<p-button label="New Product" (onClick)="openForm()" />
}
```

### `FileUrlService`

```typescript
import { FileUrlService } from '@flusys/ng-shared';

@Component({...})
export class AvatarComponent {
  private readonly fileUrl = inject(FileUrlService);
  readonly avatarUrl = signal<string | null>(null);

  ngOnInit() {
    this.fileUrl.fetchSingleFileUrl(this.user().avatarFileId)
      .subscribe(f => this.avatarUrl.set(f?.url ?? null));
  }
}
```

> Never construct file URLs manually — always use `FileUrlService`.

### Reusable Components

```typescript
import {
  LazySelectComponent, // single-value dropdown, lazy search + infinite scroll
  LazyMultiSelectComponent, // multi-value dropdown, lazy search + select-all
  UserSelectComponent, // single user picker (requires USER_PROVIDER)
  UserMultiSelectComponent, // multi user picker (requires USER_PROVIDER)
  FileUploaderComponent, // drag-drop upload (requires FILE_PROVIDER or custom fn)
  FileSelectorDialogComponent, // browse & select from storage (requires FILE_PROVIDER)
  IconComponent, // renders PrimeNG icon or image URL
} from "@flusys/ng-shared";
```

#### Form binding support

| Component                     | `[(value)]`        | `[(ngModel)]` | `[formControl]` / `formControlName` |
| ----------------------------- | ------------------ | ------------- | ----------------------------------- |
| `LazySelectComponent`         | Yes                | Yes           | Yes — `ControlValueAccessor`        |
| `LazyMultiSelectComponent`    | Yes                | Yes           | Yes — `ControlValueAccessor`        |
| `UserSelectComponent`         | Yes (`model()`)    | No            | No                                  |
| `UserMultiSelectComponent`    | Yes (`model()`)    | No            | No                                  |
| `FileUploaderComponent`       | No                 | No            | No — event-based                    |
| `FileSelectorDialogComponent` | `[(visible)]` only | No            | No                                  |
| `IconComponent`               | No                 | No            | No — display only                   |

---

#### `lib-lazy-select` — single value, lazy search, infinite scroll

**Required:** `[optionLabel]` `[optionValue]` `[isEditMode]` `[isLoading]` `[total]` `[pagination]` `[selectDataList]`

**Optional:** `[placeHolder]` · `[showClear]` (default `true`)

**Outputs:** `(onSearch)` string debounced 500ms · `(onPagination)` next `IPagination`

**value type:** `string | null`

```html
<!-- signal two-way binding -->
<lib-lazy-select
  [(value)]="selectedCategoryId"
  [optionLabel]="'label'"
  [optionValue]="'value'"
  [isEditMode]="true"
  [isLoading]="isLoading()"
  [total]="total()"
  [pagination]="pagination()"
  [selectDataList]="categoryList()"
  [placeHolder]="'module.category.placeholder' | translate"
  (onSearch)="handleSearch($event)"
  (onPagination)="handlePagination($event)"
/>

<!-- reactive form -->
<lib-lazy-select
  [formControl]="categoryCtrl"
  [optionLabel]="'label'"
  [optionValue]="'value'"
  [isEditMode]="true"
  [isLoading]="isLoading()"
  [total]="total()"
  [pagination]="pagination()"
  [selectDataList]="categoryList()"
  (onSearch)="handleSearch($event)"
  (onPagination)="handlePagination($event)"
/>

<!-- signal form state (read from signal, write via event) -->
<lib-lazy-select
  [value]="formData().categoryId || null"
  [optionLabel]="'label'"
  [optionValue]="'value'"
  [isEditMode]="true"
  [isLoading]="isLoading()"
  [total]="total()"
  [pagination]="pagination()"
  [selectDataList]="categoryList()"
  (valueChange)="updateFormField('categoryId', $event)"
  (onSearch)="handleSearch($event)"
  (onPagination)="handlePagination($event)"
/>
```

---

#### `lib-lazy-multi-select` — multiple values, lazy search, select-all

**Required:** `[isEditMode]` `[isLoading]` `[total]` `[pagination]` `[selectDataList]` (`IDropDown[]` — no `optionLabel`/`optionValue`)

**Optional:** `[placeHolder]` · `[showClear]` (default `true`)

**Outputs:** `(onSearch)` · `(onPagination)` — **value type:** `string[] | null`

Display: shows comma-joined labels for ≤3 selections; "N items selected" beyond 3.

```html
<lib-lazy-multi-select
  [(value)]="selectedIds"
  [isEditMode]="true"
  [isLoading]="isLoading()"
  [total]="total()"
  [pagination]="pagination()"
  [selectDataList]="itemList()"
  [placeHolder]="'module.items.placeholder' | translate"
  (onSearch)="handleSearch($event)"
  (onPagination)="handlePagination($event)"
/>
```

---

#### `lib-user-select` — single user picker

**Required:** `[isEditMode]`

**Optional:** `[value]` · `[placeHolder]` · `[showClear]` (default `true`) · `[filterActive]` (default `true`) · `[additionalFilters]` · `[pageSize]` (default 20) · `[loadUsers]` custom fn (overrides `USER_PROVIDER`)

**Outputs:** `(valueChange)` `string | null` · `(userSelected)` `IUserBasicInfo | null` · `(onError)` `Error`

```html
<!-- simple two-way -->
<lib-user-select [(value)]="selectedUserId" [isEditMode]="true" />

<!-- signal form state pattern -->
<lib-user-select
  [value]="formData().userId || null"
  [isEditMode]="true"
  [placeHolder]="'module.search.users.placeholder' | translate"
  (valueChange)="updateFormField('userId', $event)"
/>

<!-- custom load function (bypass USER_PROVIDER) -->
<lib-user-select
  [(value)]="selectedUserId"
  [isEditMode]="true"
  [loadUsers]="loadBranchUsers"
/>
```

---

#### `lib-user-multi-select` — multiple user picker

**Required:** `[isEditMode]`

**Optional:** same as `lib-user-select` plus `[showClear]`

**Outputs:** `(valueChange)` `string[] | null` · `(usersSelected)` `IUserBasicInfo[]` · `(onError)` `Error`

**value type:** `string[] | null`

```html
<lib-user-multi-select
  [(value)]="selectedUserIds"
  [isEditMode]="true"
  [placeHolder]="'module.assignees.placeholder' | translate"
  (usersSelected)="onAssigneesSelected($event)"
/>
```

---

#### `lib-file-uploader` — drag-drop file upload

Requires `FILE_PROVIDER` (`provideStorageProviders()`) **or** `[uploadFile]` fn. Shows warning UI if neither configured.

| Input                   | Type                    | Default | Notes                                            |
| ----------------------- | ----------------------- | ------- | ------------------------------------------------ |
| `[uploadFile]`          | `UploadFileFn`          | —       | Custom fn (overrides `FILE_PROVIDER`)            |
| `[uploadMultipleFiles]` | `UploadMultipleFilesFn` | —       | Batch upload fn                                  |
| `[acceptTypes]`         | `string[]`              | `[]`    | MIME types e.g. `['image/*', 'application/pdf']` |
| `[multiple]`            | `boolean`               | `false` | Allow multiple files                             |
| `[maxFiles]`            | `number`                | `10`    | Max count when `multiple`                        |
| `[maxSizeMb]`           | `number`                | `10`    | Max file size in MB                              |
| `[disabled]`            | `boolean`               | `false` |                                                  |
| `[showPreview]`         | `boolean`               | `true`  | Show file list below drop zone                   |
| `[autoUpload]`          | `boolean`               | `true`  | Upload on select; `false` for manual trigger     |
| `[uploadOptions]`       | `IFileUploadOptions`    | `{}`    | Passed to upload fn (e.g. `storageConfigId`)     |

**Outputs:** `(fileUploaded)` `IUploadedFile` · `(filesUploaded)` `IUploadedFile[]` · `(fileSelected)` `File[]` · `(onError)` `Error`

```html
<!-- auto upload, single image -->
<lib-file-uploader
  [acceptTypes]="['image/*']"
  [maxSizeMb]="5"
  (fileUploaded)="onFileUploaded($event)"
  (onError)="onUploadError($event)"
/>

<!-- manual upload, multiple files -->
<lib-file-uploader
  [autoUpload]="false"
  [multiple]="true"
  [maxFiles]="10"
  (fileSelected)="onFilesSelected($event)"
/>
```

---

#### `lib-file-selector-dialog` — browse & select from storage

Requires `FILE_PROVIDER` (`provideStorageProviders()`). Shows error UI if not configured.

| Input            | Type       | Default | Notes                                  |
| ---------------- | ---------- | ------- | -------------------------------------- |
| `[(visible)]`    | `boolean`  | `false` | Controls dialog open/close             |
| `[multiple]`     | `boolean`  | `false` | Single or multi-file selection         |
| `[acceptTypes]`  | `string[]` | `[]`    | MIME type filter                       |
| `[maxSelection]` | `number`   | `10`    | Max files when `multiple`              |
| `[withUploader]` | `boolean`  | `false` | Show `lib-file-uploader` inside dialog |
| `[folderId]`     | `string`   | —       | Pre-filter to a specific folder        |
| `[header]`       | `string`   | —       | Custom title (default auto-translated) |
| `[pageSize]`     | `number`   | `20`    |                                        |

**Outputs:** `(fileSelected)` `IFileBasicInfo` · `(filesSelected)` `IFileBasicInfo[]` · `(closed)` `void` · `(onError)` `Error`

```html
<!-- single file -->
<lib-file-selector-dialog
  [(visible)]="showFilePicker"
  [acceptTypes]="['image/*']"
  (fileSelected)="onFileSelected($event)"
  (closed)="showFilePicker = false"
/>

<!-- multi select with built-in uploader -->
<lib-file-selector-dialog
  [(visible)]="showFilePicker"
  [multiple]="true"
  [maxSelection]="5"
  [withUploader]="true"
  (filesSelected)="onFilesSelected($event)"
/>
```

---

#### `lib-icon` — icon renderer

| Input        | Type           | Default        |
| ------------ | -------------- | -------------- |
| `[icon]`     | `string`       | required       |
| `[iconType]` | `IconTypeEnum` | `PRIMENG_ICON` |

```html
<lib-icon icon="pi pi-user" />
<lib-icon icon="/assets/logo.png" [iconType]="IconTypeEnum.IMAGE_FILE_LINK" />
```

### Pipes, Modules, Utils

```typescript
import { TranslatePipe } from "@flusys/ng-shared"; // {{ 'key' | translate }}
import { AngularModule, PrimeModule } from "@flusys/ng-shared"; // barrel imports
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@flusys/ng-shared"; // pure fns
```

---

## @flusys/ng-auth

JWT auth, user/company/branch state, and extension hooks.

### Guards

| Guard                 | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `appInitGuard`        | Restore session + load permissions — root route only |
| `authGuard`           | Redirect to login if not authenticated               |
| `guestGuard`          | Redirect home if already logged in                   |
| `companyFeatureGuard` | Require `enableCompanyFeature` in config             |
| `emailFeatureGuard`   | Require `enableEmailFeature` in config               |

### `AuthStateService`

```typescript
import { AuthStateService } from '@flusys/ng-auth';

@Component({...})
export class TopBarComponent {
  private readonly authState = inject(AuthStateService);

  // Read-only signals
  readonly user        = this.authState.user;           // Signal<IUserInfo | null>
  readonly company     = this.authState.company;        // Signal<ICompanyInfo | null>
  readonly branch      = this.authState.branch;         // Signal<IBranchInfo | null>
  readonly isAuth      = this.authState.isAuthenticated; // Signal<boolean>
  readonly userName    = this.authState.userName;       // Signal<string>
  readonly companyName = this.authState.companyName;    // Signal<string>
  readonly branchName  = this.authState.branchName;     // Signal<string>
  readonly isTokenExpired = this.authState.isTokenExpired; // Signal<boolean>

  // Used in computed() — token kept in-memory only (XSS protection)
  readonly displayName = computed(() => `${this.userName()} @ ${this.branchName()}`);
}
```

**Token security model:**

- Access token — memory-only (`AuthStateService`), never persisted
- Refresh token — `httpOnly` cookie (`fsn_refresh_token`)
- Only token expiry timestamp is stored in `localStorage`
- `appInitGuard` calls `AuthInitService.initialize()` on app boot to restore session via cookie

---

### Auth Extension Providers (User Enricher)

Extension tokens let feature modules inject custom behaviour into auth pages **without modifying ng-auth source**. this is ideal for cross-cutting concerns like HR data, CRM data, or custom validation rules that need to be surfaced in multiple places (registration, profile, admin user list/detail).

#### Extension Tokens

| Token                         | Interface                        | Extends                            |
| ----------------------------- | -------------------------------- | ---------------------------------- |
| `AUTH_REGISTRATION_EXTENSION` | `IRegistrationExtensionProvider` | Registration page extra fields     |
| `AUTH_PROFILE_EXTENSION`      | `IProfileExtensionProvider`      | Profile page extra sections/fields |
| `AUTH_USER_FORM_EXTENSION`    | `IUserFormExtensionProvider`     | Admin user form extra fields       |
| `AUTH_USER_LIST_EXTENSION`    | `IUserListExtensionProvider`     | User list extra columns/actions    |
| `AUTH_USER_DETAIL_CONFIG`     | `IUserDetailViewConfig`          | User detail view mode config       |
| `AUTH_VALIDATION_CONFIG`      | `IAuthValidationConfig`          | Custom email/password validation   |

#### Profile Page Extension (`AUTH_PROFILE_EXTENSION`)

Add custom sections/fields to the profile page:

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
        icon: 'pi pi-briefcase',
        order: 10,
        collapsible: true,
        editPermission: 'hr.profile.edit',
      },
    ];
  }

  getExtraFields(): IProfileExtraField[] {
    return [
      {
        key: 'department',
        labelKey: 'hr.field.department',
        type: 'text',
        editable: false,
        sectionKey: 'employment',
        order: 1,
      },
      {
        key: 'jobTitle',
        labelKey: 'hr.field.job_title',
        type: 'text',
        editable: true,
        sectionKey: 'employment',
        order: 2,
      },
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

#### User List Extension (`AUTH_USER_LIST_EXTENSION`)

Add columns and actions to the admin user list:

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
      {
        key: 'department',
        header: 'Department',
        headerKey: 'hr.field.department',
        field: 'department',
        sortable: true,
        order: 5,
      },
    ];
  }

  getExtraActions(): IUserListExtraAction[] {
    return [
      {
        key: 'view-hr',
        labelKey: 'hr.action.view_profile',
        icon: 'pi pi-id-card',
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

#### User Form Extension (`AUTH_USER_FORM_EXTENSION`)

Add extra fields to the admin create/edit user form:

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
      {
        key: 'employeeId',
        labelKey: 'hr.field.employee_id',
        type: 'text',
        required: true,
        order: 10,
      },
      {
        key: 'department',
        labelKey: 'hr.field.department',
        type: 'select',
        options: [
          { labelKey: 'hr.dept.engineering', value: 'engineering' },
          { labelKey: 'hr.dept.hr',          value: 'hr' },
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

#### Registration Extension (`AUTH_REGISTRATION_EXTENSION`)

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
      {
        key: 'companyName',
        labelKey: 'auth.register.company_name',
        type: 'text',
        required: true,
        order: 5,
      },
    ];
  }

  transformRegistrationData(data: Record<string, unknown>) {
    return { ...data, tenantType: 'company' };
  }
}

// Register in app.config.ts
{ provide: AUTH_REGISTRATION_EXTENSION, useClass: TenantRegistrationExtension }
```

#### Custom Validation Config (`AUTH_VALIDATION_CONFIG`)

```typescript
import { AUTH_VALIDATION_CONFIG } from '@flusys/ng-auth';

// In app.config.ts providers
{
  provide: AUTH_VALIDATION_CONFIG,
  useValue: {
    password: {
      minLength: 12,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    email: {
      pattern: /^[a-zA-Z0-9._%+-]+@company\.com$/,
      messageKey: 'auth.validation.company_email_only',
    },
  },
}
```

#### User Detail View Config (`AUTH_USER_DETAIL_CONFIG`)

```typescript
import { AUTH_USER_DETAIL_CONFIG } from '@flusys/ng-auth';

{
  provide: AUTH_USER_DETAIL_CONFIG,
  useValue: {
    viewMode: 'sidebar',   // 'dialog' | 'sidebar' | 'page'
    allowEdit: true,
    width: '600px',
    tabs: [
      { key: 'general', labelKey: 'auth.user.tab.general', icon: 'pi pi-user' },
      { key: 'hr',      labelKey: 'hr.tab.employment',     icon: 'pi pi-briefcase',
        component: HrUserTabComponent },
    ],
  },
}
```

---

## @flusys/ng-layout

App shell. Used at routing level, not per-feature.

### `LayoutService`

```typescript
import { LayoutService } from '@flusys/ng-layout';

@Component({...})
export class MyFeatureComponent {
  private readonly layout = inject(LayoutService);

  readonly isSidebarOpen = this.layout.sidebarOpen;  // Signal<boolean>
  readonly colorScheme   = this.layout.colorScheme;  // Signal<'light'|'dark'>
  readonly isRtl         = this.layout.isRtl;        // Signal<boolean>
  readonly scale         = this.layout.scale;        // Signal<number>
}
```

### Menu Model

```typescript
import { IMenuItem } from "@flusys/ng-layout";

// Always labelKey, never hardcoded label
export const PRODUCT_MENU: IMenuItem[] = [
  {
    labelKey: "product.menu.catalog",
    icon: "pi pi-box",
    routerLink: ["/products"],
    permission: "product.read", // hides if no permission
  },
  {
    labelKey: "product.menu.categories",
    icon: "pi pi-tags",
    routerLink: ["/products/categories"],
    permission: "product.category.read",
  },
];
```

---

## @flusys/ng-localization

Multi-language support.

### `resolveTranslationModule`

Attach to every feature route so translations lazy-load with the route. Import from `@flusys/ng-shared` — not `ng-localization`.

**Two-mode behavior:**

| Condition | What happens |
|---|---|
| `@flusys/ng-localization` is wired | Registers fallbacks in `LocalizationStateService`, then fetches from API |
| No localization provider | Registers fallbacks in `FALLBACK_MESSAGES_REGISTRY` only — no API call |

**Always pass `fallbackMessages`** — this ensures the UI renders correctly even if the API translation fetch fails or `ng-localization` is not wired.

```typescript
import { resolveTranslationModule } from '@flusys/ng-shared';
import { PRODUCT_MESSAGES } from '../constants/messages';
import { SHARED_MESSAGES } from '@flusys/ng-shared';

// In feature routes file — always include fallbackMessages
export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    resolve: {
      translations: resolveTranslationModule({
        modules: ['product'],
        fallbackMessages: { ...PRODUCT_MESSAGES, ...SHARED_MESSAGES },
      }),
    },
    children: [
      { path: '', component: ProductListComponent },
      { path: ':id', component: ProductFormComponent },
    ],
  },
];
```

```typescript
// Multiple modules (e.g. feature that also needs shared IAM translations)
resolve: {
  translations: resolveTranslationModule({
    modules: ['product', 'iam'],
    fallbackMessages: { ...PRODUCT_MESSAGES, ...IAM_MESSAGES, ...SHARED_MESSAGES },
  }),
}
```

> Already-loaded modules are skipped — safe to declare the same module in multiple routes.

### Translation Key Convention

Format: `module.section.key` in dot-case

```
common.button.save        // Shared labels — preload globally
auth.login.title          // Login/register/profile
iam.role.list.title       // Roles, permissions
storage.file.upload       // Files, folders
product.list.title        // Feature-specific
product.form.name_label
```

---

## @flusys/ng-iam

Role/action/permission management components.

### IAM Services

```typescript
import { PermissionApiService, MyPermissionsApiService, PermissionStateService } from '@flusys/ng-iam';

@Component({...})
export class PermissionDashboardComponent {
  private readonly permState = inject(PermissionStateService);
  private readonly myPerms   = inject(MyPermissionsApiService);

  // Current user's permissions (loaded by appInitGuard)
  readonly myActions = this.permState.myActions; // Signal<string[]>
  readonly myRoles   = this.permState.myRoles;   // Signal<string[]>
}
```

---

## @flusys/ng-form-builder

Dynamic form schema builder and viewer.

```html
<!-- Admin: build form schema -->
<lib-form-builder
  [schema]="schema()"
  (schemaChange)="schema.set($event)"
  (save)="saveSchema($event)"
/>

<!-- End-user: render and submit form -->
<lib-form-viewer
  [schema]="form().schema"
  [isSubmitting]="isSubmitting()"
  (submitted)="onSubmit($event)"
/>

<!-- Display submitted form result -->
<lib-form-result-viewer [result]="result()" />
```

---

## Key Rules

- **Permissions in templates**: always `computed()` wrapping `perm.hasPermission()` — never call the service directly in a template expression.
- **File URLs**: always `FileUrlService` — never construct URLs manually.
- **Menu labels**: always `labelKey` translation key — never hardcoded `label`.
- **Translation keys**: always `dot.case` — e.g. `product.form.name_label`.
- **Feature routes**: always attach `resolveTranslationModule({ modules, fallbackMessages })` resolver — import from `@flusys/ng-shared`, always include `fallbackMessages`.
- **User enricher**: use `AUTH_USER_LIST_EXTENSION` / `AUTH_USER_FORM_EXTENSION` / `AUTH_PROFILE_EXTENSION` tokens for cross-cutting user data — never patch ng-auth internals.
