/**
 * Base Environment Configuration
 * Shared configuration across all environments (dev, prod, staging, etc.)
 * Only environment-specific values (apiBaseUrl, services) should be overridden
 */
export const BASE_ENVIRONMENT = {
  /** Application name */
  appName: 'FLUSYS THEME',
  appLogo: 'https://flusys.vercel.app/assets/images/logo-icon.svg',

  /** Author/Brand info for footer attribution */
  author: {
    name: 'Fluxing System',
    url: 'https://flusys.vercel.app',
  },

  /**
   * enableCompanyFeature in across the app
   */
  enableCompanyFeature: true,

  /**
   * Multi-tenant configuration
   * enabled: false → Database mode = single
   * enabled: true → Database mode = multi-tenant
   */
  multiTenant: {
    enabled: false,
    tenantHeader: 'x-tenant-id',
  },

  /**
   * IAM Permission Mode
   * - 'rbac': Role-Based Access Control only
   * - 'direct': Direct action assignments only
   * - 'full': Both RBAC and direct permissions (default)
   */
  permissionMode: 'full' as 'rbac' | 'direct' | 'full',

  /**
   * Storage configuration (client-side validation only)
   * Actual storage backend configured on server
   */
  storage: {
    apiPath: '/upload/file',
    maxFileSize: 10485760, // 10MB
    allowedMimeTypes: ['image/*', 'application/pdf', 'application/json'],
  },
};
