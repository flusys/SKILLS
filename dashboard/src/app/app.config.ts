import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideSignalFormsConfig } from "@angular/forms/signals";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";
import {
  authInterceptor,
  provideAuthLayoutIntegration,
  provideAuthProviders,
  tokenRefreshInterceptor,
} from "@flusys/ng-auth";
import {
  apiLoaderInterceptor,
  APP_CONFIG,
  provideFallbackMessagesRegistry,
} from "@flusys/ng-core";
import { provideIamProviders } from "@flusys/ng-iam";
import {
  buildBootstrapPreset,
  LAYOUT_MESSAGES,
  LAYOUT_SEARCH_ADAPTER,
} from "@flusys/ng-layout";
import {
  getLocalizationConfig,
  provideLocalization,
} from "@flusys/ng-localization";
import { provideNotificationProviders } from "@flusys/ng-notification";
import { errorCatchingInterceptor, SHARED_MESSAGES } from "@flusys/ng-shared";
import { provideStorageProviders } from "@flusys/ng-storage";
import {
  ConfirmationService,
  MessageService,
  provideNgUI,
} from "@flusys/ng-ui";
import { environment } from "../environments/environment";
import { routes } from "./app.routes";
import { AppUpdateService } from "./services/app-update.service";
import { AuthLayoutSyncService } from "./services/auth-layout-sync.service";
import { SearchAdapterService } from "./services/search-adapter.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideSignalFormsConfig({}),
    provideClientHydration(withEventReplay()),

    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: "disabled",
        anchorScrolling: "enabled",
      }),
      withRouterConfig({
        paramsInheritanceStrategy: "always",
      }),
      withComponentInputBinding(),
      withViewTransitions(),
    ),

    // HTTP with interceptors (order matters: auth → refresh → error → loader)
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        tokenRefreshInterceptor,
        errorCatchingInterceptor,
        apiLoaderInterceptor,
      ]),
    ),

    provideNgUI({
      theme: {
        preset: buildBootstrapPreset(environment.layoutConfig),
        options: { darkModeSelector: ".app-dark" },
      },
    }),
    MessageService,
    ConfirmationService,

    { provide: APP_CONFIG, useValue: environment },

    provideFallbackMessagesRegistry({ ...SHARED_MESSAGES, ...LAYOUT_MESSAGES }),
    ...provideLocalization(
      getLocalizationConfig({
        defaultLanguageCode: "en",
        loadStrategy: "modules",
        initialModules: ["shared", "layout"],
        enableLayoutSelector: true,
      }),
      { ...SHARED_MESSAGES, ...LAYOUT_MESSAGES },
    ),

    ...provideAuthLayoutIntegration(),
    ...provideAuthProviders(),
    ...provideIamProviders(),
    ...provideStorageProviders(),
    ...provideNotificationProviders(),

    { provide: LAYOUT_SEARCH_ADAPTER, useClass: SearchAdapterService },
    AuthLayoutSyncService,
    AppUpdateService,

    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
