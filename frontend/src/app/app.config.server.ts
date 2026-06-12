import { provideServerRendering, withRoutes } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { LOCALIZATION_API_SERVICE } from '@flusys/ng-core';
import { of } from 'rxjs';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // No backend calls during SSR/route extraction — the localization
    // initializer would block app stability; the browser loads it on hydration.
    {
      provide: LOCALIZATION_API_SERVICE,
      useValue: {
        getActiveLanguages: () => of({ success: false, data: null }),
        getTranslationsByLanguage: () => of({ success: false, data: null }),
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
