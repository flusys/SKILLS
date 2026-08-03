import { DestroyRef, Injectable, inject, isDevMode } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { SwUpdate, VersionReadyEvent } from "@angular/service-worker";
import { MessageService } from "@flusys/ng-ui";
import { filter, interval } from "rxjs";

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Watches the service worker for new app versions.
 * The SW only auto-checks on navigation, so this app (left open for long
 * sessions) also polls periodically. Update is surfaced via a sticky toast
 * rather than a forced reload, since users may have unsaved forms open.
 */
@Injectable({ providedIn: "root" })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === "VERSION_READY"),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.messageService.add({
          severity: "info",
          summary: "Update available",
          detail:
            "A new version of Fluxing Systems is ready. Refresh the page to update.",
          sticky: true,
          key: "app-update",
        });
      });

    this.swUpdate.unrecoverable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.messageService.add({
          severity: "error",
          summary: "Reloading",
          detail: "The app entered an unrecoverable state and needs to reload.",
          sticky: true,
          key: "app-update",
        });
        document.location.reload();
      });

    if (!isDevMode()) {
      interval(UPDATE_CHECK_INTERVAL_MS)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => void this.swUpdate.checkForUpdate());
    }
  }
}
