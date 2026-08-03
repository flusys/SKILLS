# Angular Foundations

Loaded on demand from the `engineering` skill. Cross-cutting `@flusys/ng-*` services used from any
feature component — session state, file URLs, and the app shell. Authorization enforcement
(guards, permission checks) is covered in [security.md](security.md#angular-authorization).

## `AuthStateService` — session state

```typescript
import { AuthStateService } from '@flusys/ng-auth';

@Component({...})
export class TopBarComponent {
  private readonly authState = inject(AuthStateService);

  readonly user        = this.authState.user;            // Signal<IUserInfo | null>
  readonly company     = this.authState.company;          // Signal<ICompanyInfo | null>
  readonly branch      = this.authState.branch;           // Signal<IBranchInfo | null>
  readonly isAuth      = this.authState.isAuthenticated;   // Signal<boolean>
  readonly isTokenExpired = this.authState.isTokenExpired; // Signal<boolean>
}
```

Token security model: access token is memory-only (never persisted, XSS protection), the refresh
token lives in an `httpOnly` cookie (`fsn_refresh_token`), and only the token expiry timestamp is
kept in `localStorage`. `appInitGuard` calls `AuthInitService.initialize()` on app boot to restore
the session via that cookie.

## `FileUrlService`

```typescript
import { FileUrlService } from '@flusys/ng-shared';

private readonly fileUrl = inject(FileUrlService);
this.fileUrl.fetchSingleFileUrl(fileId).subscribe(f => this.avatarUrl.set(f?.url ?? null));
```

Never construct file URLs manually — always resolve them through this service.

## `LayoutService` and the menu model

```typescript
import { LayoutService } from '@flusys/ng-layout';

private readonly layout = inject(LayoutService);
readonly isSidebarOpen = this.layout.sidebarOpen; // Signal<boolean>
readonly colorScheme   = this.layout.colorScheme; // Signal<'light'|'dark'>
readonly isRtl         = this.layout.isRtl;       // Signal<boolean>
```

Menu entries (`IMenuItem[]` from `@flusys/ng-layout`) use `labelKey` (translation key) when
`ng-localization` is wired, or `label` (hardcoded string) when it is not — never omit both:

```typescript
export const PRODUCT_MENU: IMenuItem[] = [
  { labelKey: 'product.menu.catalog', icon: 'box', routerLink: ['/products'], permission: 'product.read' },
];
```

## IAM permission state

```typescript
import { PermissionStateService, MyPermissionsApiService } from '@flusys/ng-iam';

private readonly permState = inject(PermissionStateService);
readonly myActions = this.permState.myActions; // Signal<string[]> — loaded by appInitGuard
readonly myRoles   = this.permState.myRoles;   // Signal<string[]>
```
