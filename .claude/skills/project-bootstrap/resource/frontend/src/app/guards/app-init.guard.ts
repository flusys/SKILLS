import { inject, isDevMode } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthInitService, AuthStateService } from '@flusys/ng-auth';
import { APP_CONFIG, isFeatureEnabled } from '@flusys/ng-core';
import { PermissionStateService } from '@flusys/ng-iam';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';

/**
 * App Initialization Guard - Handles session restore, auth check, and permission loading.
 */
export const appInitGuard: CanActivateFn = (
  _route,
  state,
): Observable<boolean | UrlTree> => {
  const authState = inject(AuthStateService);
  const authInit = inject(AuthInitService);
  const permissionState = inject(PermissionStateService);
  const appConfig = inject(APP_CONFIG);
  const router = inject(Router);

  const loginUrl = router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
  const companyUrl = router.createUrlTree(['/auth/select-company'], {
    queryParams: { returnUrl: state.url },
  });

  const needsRestore = !authState.user() || !authState.accessToken();

  const sessionRestore$ = needsRestore
    ? authInit.initialize().pipe(
        timeout(10000),
        catchError(() => of(false)),
      )
    : of(true);

  return sessionRestore$.pipe(
    switchMap((initSuccess): Observable<boolean | UrlTree> => {
      // Verify session restoration and authentication
      if (!initSuccess || !authState.user() || !authState.accessToken()) {
        if (isDevMode()) console.warn('[AppInitGuard] Auth failed, redirecting to login');
        return of(loginUrl);
      }

      // Check company/branch selection (if feature enabled)
      if (appConfig.enableCompanyFeature && (!authState.company() || !authState.branch())) {
        if (isDevMode()) console.warn('[AppInitGuard] Missing company/branch selection');
        return of(companyUrl);
      }

      // Load IAM permissions (if feature enabled and not already loaded)
      if (isFeatureEnabled(appConfig, 'iam') && !permissionState.isLoaded()) {
        return permissionState.loadPermissions().pipe(
          map(() => true),
          catchError(() => of(true)), // Graceful degradation
        );
      }

      return of(true);
    }),
  );
};
