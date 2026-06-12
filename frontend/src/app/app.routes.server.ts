import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // @flusys packages are not yet SSR-safe (LocalizationStateService injects
    // ApplicationRef during render → NG0200; token-refresh queuing blocks app
    // stability). Switch to RenderMode.Server once the packages support SSR.
    path: '**',
    renderMode: RenderMode.Client
  }
];
