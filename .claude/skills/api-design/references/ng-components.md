# Reusable Angular Components

Loaded on demand from the `api-design` skill. Shared form/display components from
`@flusys/ng-shared` used when building the frontend half of Full CRUD (Phase 4 of
[crud-generation.md](crud-generation.md)) — reach for one of these before hand-rolling a select,
uploader, or picker.

```typescript
import {
  LazySelectComponent,       // single-value dropdown, lazy search + infinite scroll
  LazyMultiSelectComponent,  // multi-value dropdown, lazy search + select-all
  UserSelectComponent,       // single user picker (requires USER_PROVIDER)
  UserMultiSelectComponent,  // multi user picker (requires USER_PROVIDER)
  FileUploaderComponent,     // drag-drop upload (requires FILE_PROVIDER or custom fn)
  FileSelectorDialogComponent, // browse & select from storage (requires FILE_PROVIDER)
  IconComponent,             // renders a Lucide icon (via @flusys/ng-ui) or image URL
} from "@flusys/ng-shared";
```

## Form binding support

| Component | `[(value)]` | `[(ngModel)]` | `[formControl]` / `formControlName` |
| --------- | ----------- | -------------- | ------------------------------------ |
| `LazySelectComponent` | Yes | Yes | Yes — `ControlValueAccessor` |
| `LazyMultiSelectComponent` | Yes | Yes | Yes — `ControlValueAccessor` |
| `UserSelectComponent` | Yes (`model()`) | No | No |
| `UserMultiSelectComponent` | Yes (`model()`) | No | No |
| `FileUploaderComponent` | No | No | No — event-based |
| `FileSelectorDialogComponent` | `[(visible)]` only | No | No |
| `IconComponent` | No | No | No — display only |

**A dropdown for an entity that is ambiguous by name alone once more than one exists in parallel —
a Class/Section once a school has more than one academic year live, a Location once a company has
more than one branch — needs a composed label ("Class Name - Academic Year"), not the bare
`name` field.** Write one shared label helper per such entity (e.g. `getClassLabel`,
`getSectionLabel` in a small `*.util.ts`) and have every component building that entity's
`optionLabel`/display string call it, rather than each component re-deriving its own ad hoc
`${a} - ${b}` template independently — a retrofit across ~20 already-built components on this
project is exactly the cost of skipping this the first time. This also means: never narrow a
fetched entity down to a slimmer local shape before storing it in a signal just because a list view
only needs a few fields — if the parent relation (e.g. `class.academicYear`) was already joined by
the service, keep it on the stored object, or the label helper has nothing to compose from by the
time the dropdown renders.

## `lib-lazy-select` — single value, lazy search, infinite scroll

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
```

## `lib-lazy-multi-select` — multiple values, lazy search, select-all

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

## `lib-user-select` — single user picker

**Required:** `[isEditMode]`

**Optional:** `[value]` · `[placeHolder]` · `[showClear]` (default `true`) · `[filterActive]` (default `true`) · `[additionalFilters]` · `[pageSize]` (default 20) · `[loadUsers]` custom fn (overrides `USER_PROVIDER`)

**Outputs:** `(valueChange)` `string | null` · `(userSelected)` `IUserBasicInfo | null` · `(onError)` `Error`

```html
<lib-user-select [(value)]="selectedUserId" [isEditMode]="true" />

<!-- custom load function (bypass USER_PROVIDER) -->
<lib-user-select [(value)]="selectedUserId" [isEditMode]="true" [loadUsers]="loadBranchUsers" />
```

## `lib-user-multi-select` — multiple user picker

**Required:** `[isEditMode]`

**Optional:** same as `lib-user-select` plus `[showClear]`

**Outputs:** `(valueChange)` `string[] | null` · `(usersSelected)` `IUserBasicInfo[]` · `(onError)` `Error`

```html
<lib-user-multi-select
  [(value)]="selectedUserIds"
  [isEditMode]="true"
  [placeHolder]="'module.assignees.placeholder' | translate"
  (usersSelected)="onAssigneesSelected($event)"
/>
```

## `lib-file-uploader` — drag-drop file upload

Requires `FILE_PROVIDER` (`provideStorageProviders()`) **or** `[uploadFile]` fn. Shows warning UI if neither configured.

| Input | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `[uploadFile]` | `UploadFileFn` | — | Custom fn (overrides `FILE_PROVIDER`) |
| `[uploadMultipleFiles]` | `UploadMultipleFilesFn` | — | Batch upload fn |
| `[acceptTypes]` | `string[]` | `[]` | MIME types e.g. `['image/*', 'application/pdf']` |
| `[multiple]` | `boolean` | `false` | Allow multiple files |
| `[maxFiles]` | `number` | `10` | Max count when `multiple` |
| `[maxSizeMb]` | `number` | `10` | Max file size in MB |
| `[disabled]` | `boolean` | `false` | |
| `[showPreview]` | `boolean` | `true` | Show file list below drop zone |
| `[autoUpload]` | `boolean` | `true` | Upload on select; `false` for manual trigger |
| `[uploadOptions]` | `IFileUploadOptions` | `{}` | Passed to upload fn (e.g. `storageConfigId`) |

**Outputs:** `(fileUploaded)` `IUploadedFile` · `(filesUploaded)` `IUploadedFile[]` · `(fileSelected)` `File[]` · `(onError)` `Error`

```html
<lib-file-uploader
  [acceptTypes]="['image/*']"
  [maxSizeMb]="5"
  (fileUploaded)="onFileUploaded($event)"
  (onError)="onUploadError($event)"
/>
```

## `lib-file-selector-dialog` — browse & select from storage

Requires `FILE_PROVIDER` (`provideStorageProviders()`). Shows error UI if not configured.

| Input | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `[(visible)]` | `boolean` | `false` | Controls dialog open/close |
| `[multiple]` | `boolean` | `false` | Single or multi-file selection |
| `[acceptTypes]` | `string[]` | `[]` | MIME type filter |
| `[maxSelection]` | `number` | `10` | Max files when `multiple` |
| `[withUploader]` | `boolean` | `false` | Show `lib-file-uploader` inside dialog |
| `[folderId]` | `string` | — | Pre-filter to a specific folder |
| `[header]` | `string` | — | Custom title (default auto-translated) |
| `[pageSize]` | `number` | `20` | |

**Outputs:** `(fileSelected)` `IFileBasicInfo` · `(filesSelected)` `IFileBasicInfo[]` · `(closed)` `void` · `(onError)` `Error`

```html
<lib-file-selector-dialog
  [(visible)]="showFilePicker"
  [multiple]="true"
  [maxSelection]="5"
  [withUploader]="true"
  (filesSelected)="onFilesSelected($event)"
/>
```

## `lib-icon` — icon renderer

| Input | Type | Default |
| ----- | ---- | ------- |
| `[icon]` | `string` | required |
| `[iconType]` | `IconTypeEnum` | `ICON_NAME` |

```html
<lib-icon icon="user" />
<lib-icon icon="/assets/logo.png" [iconType]="IconTypeEnum.IMAGE_FILE_LINK" />
```

## `@flusys/ng-form-builder` — dynamic forms

Only relevant when the PRD calls for user-defined/dynamic forms (surveys, questionnaires) rather
than a fixed entity form.

```html
<!-- Admin: build form schema -->
<lib-form-builder [schema]="schema()" (schemaChange)="schema.set($event)" (save)="saveSchema($event)" />

<!-- End-user: render and submit form -->
<lib-form-viewer [schema]="form().schema" [isSubmitting]="isSubmitting()" (submitted)="onSubmit($event)" />

<!-- Display submitted form result -->
<lib-form-result-viewer [result]="result()" />
```
