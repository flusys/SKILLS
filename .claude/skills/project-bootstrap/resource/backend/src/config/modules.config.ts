import {
  AuthModuleOptions,
  IAuthModuleConfig,
} from '@flusys/nestjs-auth';
import {
  IBootstrapAppConfig,
  IDatabaseConfig,
  IDataSourceServiceOptions,
  ITenantDatabaseConfig,
} from '@flusys/nestjs-core';
import { envConfig } from '@flusys/nestjs-core/config';
import {
  EmailModuleOptions,
  IEmailModuleConfig,
} from '@flusys/nestjs-email';
import {
  EventManagerModuleOptions,
  IEventManagerModuleConfig,
} from '@flusys/nestjs-event-manager';
import {
  FormBuilderModuleOptions,
  IFormBuilderConfig,
} from '@flusys/nestjs-form-builder';
import {
  IAMModuleOptions,
  IIAMModuleConfig,
} from '@flusys/nestjs-iam';
import {
  ILocalizationModuleConfig,
  LocalizationModuleOptions,
} from '@flusys/nestjs-localization';
import {
  INotificationModuleConfig,
  NotificationModuleOptions,
} from '@flusys/nestjs-notification';
import {
  IStorageModuleConfig,
  StorageModuleOptions,
} from '@flusys/nestjs-storage';
import { authEmailProvider } from '../providers';

// ============================================================================
// Configuration Definitions
// ============================================================================

/** Bootstrap configuration - controls module behavior at startup */
export const bootstrapAppConfig: IBootstrapAppConfig = {
  databaseMode: 'single',
  enableCompanyFeature: true,
  permissionMode: 'FULL',
  enableEmailVerification: true,
};

/** Default database configuration */
const _db = envConfig.getTypeOrmConfig();
export const defaultDatabaseConfig: IDatabaseConfig = {
  type: _db.type,
  host: _db.host,
  port: _db.port,
  username: _db.username,
  password: _db.password,
  database: _db.database,
};

/** Tenant configurations (for multi-tenant mode) */
export const tenantList: ITenantDatabaseConfig[] = [
  {
    id: 'tenant1',
    database: 'tenant1_db',
    name: 'Tenant 1',
    enableCompanyFeature: true,
    enableEmailVerification: true,
    permissionMode: 'FULL',
  },
  {
    id: 'tenant2',
    database: 'tenant2_db',
    name: 'Tenant 2',
    enableCompanyFeature: false,
    enableEmailVerification: false,
    permissionMode: 'FULL',
  },
];

/** Auth module configuration */
const authConfig: IAuthModuleConfig = {
  jwtSecret: envConfig.getJwtConfig().secret,
  jwtExpiration: envConfig.getJwtConfig().expiration,
  refreshTokenSecret: envConfig.getJwtConfig().refreshSecret,
  refreshTokenExpiration: envConfig.getJwtConfig().refreshExpiration,
  refreshTokenCookieName: 'fsn_refresh_token',
};

/** Storage module configuration */
const storageConfig: IStorageModuleConfig = {
  maxFileSize: envConfig.getNumber('MAX_FILE_SIZE', false) ?? 10 * 1024 * 1024,
  allowedFileTypes: envConfig.tryGetValue('ALLOWED_FILE_TYPES', false)?.split(',') ?? [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

function getAppUrl(): string {
  return (
    envConfig.tryGetValue('APP_URL', false) ??
    `http://localhost:${envConfig.getNumber('PORT', false) ?? 3000}`
  );
}

export function getDbConfig(): Partial<IDataSourceServiceOptions> {
  return bootstrapAppConfig.databaseMode === 'multi-tenant'
    ? { tenantDefaultDatabaseConfig: defaultDatabaseConfig, tenants: tenantList }
    : { defaultDatabaseConfig };
}

const baseModuleOptions = {
  global: true,
  includeController: true,
  bootstrapAppConfig,
};

// ============================================================================
// Module Options
// ============================================================================

export function getAuthModuleOptions(): AuthModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...authConfig, ...getDbConfig() },
    providers: [authEmailProvider],
  };
}

export function getIAMModuleOptions(): IAMModuleOptions {
  return { ...baseModuleOptions, config: { ...getDbConfig() } as IIAMModuleConfig };
}

export function getStorageModuleOptions(): StorageModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...storageConfig, ...getDbConfig(), appUrl: getAppUrl() },
  };
}

export function getFormBuilderModuleOptions(): FormBuilderModuleOptions {
  return { ...baseModuleOptions, config: { ...getDbConfig() } as IFormBuilderConfig };
}

export function getEmailModuleOptions(): EmailModuleOptions {
  return { ...baseModuleOptions, config: { ...getDbConfig() } as IEmailModuleConfig };
}

export function getEventManagerModuleOptions(): EventManagerModuleOptions {
  return { ...baseModuleOptions, config: { ...getDbConfig() } as IEventManagerModuleConfig };
}

export function getNotificationModuleOptions(): NotificationModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...getDbConfig(),
      enableRealtime: true,
      jwtSecret: envConfig.getJwtConfig().secret,
    } as INotificationModuleConfig,
  };
}

export function getLocalizationModuleOptions(): LocalizationModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getDbConfig(), defaultLanguageCode: 'en' } as ILocalizationModuleConfig,
  };
}
