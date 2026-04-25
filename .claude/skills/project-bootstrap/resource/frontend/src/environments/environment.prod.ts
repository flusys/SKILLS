import { BASE_ENVIRONMENT } from './environment.base';

/**
 * Production environment configuration
 * Replace YOUR_PRODUCTION_API_URL with your actual production API base URL.
 */
const PROD_API = 'https://YOUR_PRODUCTION_API_URL';

export const environment = {
  ...BASE_ENVIRONMENT,
  production: true,

  apiBaseUrl: PROD_API,

  services: {
    auth: {
      baseUrl: `${PROD_API}/auth`,
      enabled: true,
    },
    administration: {
      baseUrl: `${PROD_API}/administration`,
      enabled: true,
    },
    iam: {
      baseUrl: `${PROD_API}/iam`,
      enabled: true,
    },
    storage: {
      baseUrl: `${PROD_API}/storage`,
      enabled: true,
      defaultStorageConfigId: '',
    },
    formBuilder: {
      baseUrl: `${PROD_API}/form-builder`,
      enabled: true,
    },
    email: {
      baseUrl: `${PROD_API}/email`,
      enabled: true,
    },
    eventManager: {
      baseUrl: `${PROD_API}/event-manager`,
      enabled: true,
    },
    notification: {
      baseUrl: `${PROD_API}/notification`,
      enabled: true,
      socketUrl: PROD_API,
    },
    localization: {
      baseUrl: `${PROD_API}/localization`,
      enabled: true,
    },
  },
};
