import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import {
  authInterceptor,
  provideAuthLayoutIntegration,
  provideAuthProviders,
  tokenRefreshInterceptor,
} from '@flusys/ng-auth';
import {
  APP_CONFIG,
  apiLoaderInterceptor,
  errorCatchingInterceptor,
} from '@flusys/ng-core';
import { LAYOUT_SEARCH_ADAPTER } from '@flusys/ng-layout';
import { provideIamProviders } from '@flusys/ng-iam';
import {
  getLocalizationConfig,
  provideLocalization,
} from '@flusys/ng-localization';
import { provideNotificationProviders } from '@flusys/ng-notification';
import { provideStorageProviders } from '@flusys/ng-storage';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AuthLayoutSyncService } from './services/auth-layout-sync.service';
import { SearchAdapterService } from './services/search-adapter.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular core
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideSignalFormsConfig({}),
    provideClientHydration(withEventReplay()),

    // Router
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'disabled',
        anchorScrolling: 'enabled',
      }),
      withRouterConfig({
        paramsInheritanceStrategy: 'always',
        onSameUrlNavigation: 'reload',
      }),
      withComponentInputBinding(),
      withViewTransitions(),
    ),

    // HTTP with interceptors (order matters: auth → refresh → error → loader)
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        tokenRefreshInterceptor,
        errorCatchingInterceptor,
        apiLoaderInterceptor,
      ]),
    ),

    // PrimeNG
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } },
    }),
    MessageService,
    ConfirmationService,

    // App config (spread environment directly)
    { provide: APP_CONFIG, useValue: environment },

    // Localization with API support and language management UI
    //...provideFallbackLocalization(),
    ...provideLocalization(
      getLocalizationConfig({
        defaultLanguageCode: 'en',
        loadStrategy: 'modules',
        initialModules: ['shared', 'layout'],
        enableLayoutSelector: true,
      }),
    ),

    // Feature providers
    ...provideAuthLayoutIntegration(),
    ...provideAuthProviders(),
    ...provideIamProviders(),
    ...provideStorageProviders(),
    ...provideNotificationProviders(),

    // Search adapter
    { provide: LAYOUT_SEARCH_ADAPTER, useClass: SearchAdapterService },

    // Bridge service - syncs auth state to layout
    AuthLayoutSyncService,
  ],
};
