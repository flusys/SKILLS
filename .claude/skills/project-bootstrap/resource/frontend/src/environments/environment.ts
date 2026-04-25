import { BASE_ENVIRONMENT } from './environment.base';

/**
 * Development environment configuration
 * Extends BASE_ENVIRONMENT with dev-specific values
 * Matches FLUSYS_NEST backend configuration modes
 */
export const environment = {
  ...BASE_ENVIRONMENT,
  production: false,

  /** API base URL (fallback for services without specific URLs) */
  apiBaseUrl: 'http://localhost:2002',

  /**
   * Service-specific configurations
   * Feature is enabled if service.enabled = true
   */
  services: {
    auth: {
      baseUrl: 'http://localhost:2002/auth',
      enabled: true,
    },
    administration: {
      baseUrl: 'http://localhost:2002/administration',
      enabled: true,
    },
    iam: {
      baseUrl: 'http://localhost:2002/iam',
      enabled: true,
    },
    storage: {
      baseUrl: 'http://localhost:2002/storage',
      enabled: true,
      defaultStorageConfigId: '',
    },
    formBuilder: {
      baseUrl: 'http://localhost:2002/form-builder',
      enabled: true,
    },
    email: {
      baseUrl: 'http://localhost:2002/email',
      enabled: true,
    },
    eventManager: {
      baseUrl: 'http://localhost:2002/event-manager',
      enabled: true,
    },
    notification: {
      baseUrl: 'http://localhost:2002/notification',
      enabled: true,
      socketUrl: 'http://localhost:2002',
    },
    localization: {
      baseUrl: 'http://localhost:2002/localization',
      enabled: true,
    },
  },
};
