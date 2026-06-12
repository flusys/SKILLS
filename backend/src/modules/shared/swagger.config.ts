import { IModuleSwaggerOptions } from '@flusys/nestjs-core/docs';

export function appSwaggerConfig(): IModuleSwaggerOptions {
  return {
    title: 'App API',
    description: `
            ## App API
            Application specific API modules.
    `,
    version: '1.0',
    path: 'api/docs/app',
    bearerAuth: true,
  };
}
