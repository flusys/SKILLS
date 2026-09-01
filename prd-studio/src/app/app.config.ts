import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import { buildBootstrapPreset, ConfirmationService, MessageService, provideNgUI } from "@flusys/ng-ui";

/**
 * Deliberately minimal — this app talks only to the local prd-studio API (fetch, no HttpClient
 * needed) and reads/writes nothing that requires auth/iam/storage/localization. Only ng-core's
 * theming (via ng-ui) is registered; none of the FLUSYS product modules apply here.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideNgUI({
      theme: {
        preset: buildBootstrapPreset(),
        options: { darkModeSelector: ".app-dark" },
      },
    }),
    MessageService,
    ConfirmationService,
  ],
};
