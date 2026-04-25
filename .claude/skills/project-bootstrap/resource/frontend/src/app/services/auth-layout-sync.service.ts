import { DestroyRef, Injectable, Signal, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AuthStateService } from '@flusys/ng-auth';
import {
  APP_CONFIG,
  isCompanyFeatureEnabled,
  isStorageFeatureEnabled,
} from '@flusys/ng-core';
import { LayoutService } from '@flusys/ng-layout';
import { NotificationStateService } from '@flusys/ng-notification';
import { FileUrlService } from '@flusys/ng-shared';
import { Observable, of, switchMap } from 'rxjs';
import { APP_LAUNCHER_APPS } from '../config/app-launcher.config';
import { APP_MENU } from '../config/app-menu.config';

/** Syncs auth state to layout (user profile, company, menu, apps) */
@Injectable({ providedIn: 'root' })
export class AuthLayoutSyncService {
  private readonly authState = inject(AuthStateService);
  private readonly layoutService = inject(LayoutService);
  private readonly fileUrlService = inject(FileUrlService);
  private readonly notificationState = inject(NotificationStateService, { optional: true });
  private readonly appConfig = inject(APP_CONFIG);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.layoutService.setMenu(APP_MENU);
    this.layoutService.setApps(APP_LAUNCHER_APPS);

    this.syncNotificationSocket();

    this.syncProfile(
      this.authState.user,
      (user) => user?.profilePictureId,
      (user, imageUrl) =>
        this.layoutService.setUserProfile(
          user
            ? { id: user.id, name: user.name ?? user.email, email: user.email, profilePictureUrl: imageUrl }
            : null,
        ),
    );

    if (isCompanyFeatureEnabled(this.appConfig)) {
      this.syncProfile(
        this.authState.company,
        (company) => company?.logoId,
        (company, imageUrl) =>
          this.layoutService.setCompanyProfile(
            company
              ? { id: company.id, name: company.name, slug: company.slug ?? '', logoUrl: imageUrl }
              : null,
          ),
      );
    }
  }

  private syncProfile<T>(
    source: Signal<T | null>,
    getImageId: (data: T | null) => string | undefined | null,
    setProfile: (data: T | null, imageUrl: string | null) => void,
  ): void {
    toObservable(source)
      .pipe(
        switchMap((data): Observable<null> => {
          const imageId = getImageId(data);
          if (data && imageId && isStorageFeatureEnabled(this.appConfig)) {
            return this.fileUrlService.fetchSingleFileUrl(imageId).pipe(
              switchMap((file) => {
                setProfile(data, file?.url ?? null);
                return of(null);
              }),
            );
          }
          setProfile(data, null);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private syncNotificationSocket(): void {
    if (!this.notificationState) return;

    toObservable(this.authState.isAuthenticated)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isAuthenticated) => {
        if (isAuthenticated) {
          const token = this.authState.accessToken();
          if (token) {
            this.notificationState!.connectSocket(token);
          }
        } else {
          this.notificationState!.disconnectSocket();
        }
      });
  }
}
