import {
  AiAssistantModuleAsyncOptions,
  AiAssistantModuleOptions,
  AiAssistantOptionsFactory,
  IAiAssistantModuleConfig,
} from "@flusys/nestjs-ai-assistant";
import {
  AuthModuleAsyncOptions,
  AuthModuleOptions,
  AuthOptionsFactory,
  IAuthModuleConfig,
} from "@flusys/nestjs-auth";
import {
  IBootstrapAppConfig,
  IDatabaseConfig,
  IDataSourceServiceOptions,
  ITenantDatabaseConfig,
} from "@flusys/nestjs-core";
import { envConfig } from "@flusys/nestjs-core/config";
import {
  EmailModuleAsyncOptions,
  EmailModuleOptions,
  EmailOptionsFactory,
  IEmailModuleConfig,
} from "@flusys/nestjs-email";
import {
  EventManagerModuleAsyncOptions,
  EventManagerModuleOptions,
  EventManagerOptionsFactory,
  IEventManagerModuleConfig,
} from "@flusys/nestjs-event-manager";
import {
  FormBuilderModuleAsyncOptions,
  FormBuilderModuleOptions,
  FormBuilderOptionsFactory,
  IFormBuilderConfig,
} from "@flusys/nestjs-form-builder";
import {
  IAMModuleAsyncOptions,
  IAMModuleOptions,
  IAMOptionsFactory,
  IIAMModuleConfig,
} from "@flusys/nestjs-iam";
import {
  ILocalizationModuleConfig,
  LocalizationModuleAsyncOptions,
  LocalizationModuleOptions,
  LocalizationOptionsFactory,
} from "@flusys/nestjs-localization";
import {
  INotificationModuleConfig,
  NotificationModuleAsyncOptions,
  NotificationModuleOptions,
  NotificationOptionsFactory,
} from "@flusys/nestjs-notification";
import {
  IStorageModuleConfig,
  StorageModuleAsyncOptions,
  StorageModuleOptions,
  StorageOptionsFactory,
} from "@flusys/nestjs-storage";
import {
  ITaskManagerModuleConfig,
  TaskManagerModuleAsyncOptions,
  TaskManagerModuleOptions,
  TaskManagerOptionsFactory,
} from "@flusys/nestjs-task-manager";
import { HttpModule, HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import {
  authEmailProvider,
  getAiAssistantAuthProvider,
  getAiAssistantToolProvider,
  getAiAssistantUserLookupProvider,
  permissionSyncProvider,
} from "../providers";

// ============================================================================
// Configuration Definitions
// ============================================================================

/** Bootstrap configuration - controls module behavior at startup */
export const bootstrapAppConfig: IBootstrapAppConfig = {
  databaseMode: "single",
  enableCompanyFeature: true,
  permissionMode: "FULL",
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
    id: "tenant1",
    database: "tenant1_db",
    name: "Tenant 1",
    enableCompanyFeature: true,
    enableEmailVerification: true,
    permissionMode: "FULL",
  },
  {
    id: "tenant2",
    database: "tenant2_db",
    name: "Tenant 2",
    enableCompanyFeature: false,
    enableEmailVerification: false,
    permissionMode: "FULL",
  },
];

/** Auth module configuration */
const authConfig: IAuthModuleConfig = {
  jwtSecret: envConfig.getJwtConfig().secret,
  jwtExpiration: envConfig.getJwtConfig().expiration,
  refreshTokenSecret: envConfig.getJwtConfig().refreshSecret,
  refreshTokenExpiration: envConfig.getJwtConfig().refreshExpiration,
  refreshTokenCookieName: "fsn_refresh_token",
};

/** Storage module configuration */
const storageConfig: IStorageModuleConfig = {
  maxFileSize: envConfig.getNumber("MAX_FILE_SIZE", false) ?? 10 * 1024 * 1024,
  allowedFileTypes: envConfig
    .tryGetValue("ALLOWED_FILE_TYPES", false)
    ?.split(",") ?? [
    "image/*",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

function getAppUrl(): string {
  return (
    envConfig.tryGetValue("APP_URL", false) ??
    `http://localhost:${envConfig.getNumber("PORT", false) ?? 3000}`
  );
}

export function getDbConfig(): Partial<IDataSourceServiceOptions> {
  return bootstrapAppConfig.databaseMode === "multi-tenant"
    ? {
        tenantDefaultDatabaseConfig: defaultDatabaseConfig,
        tenants: tenantList,
      }
    : { defaultDatabaseConfig };
}

const baseModuleOptions = {
  global: true,
  includeController: true,
  bootstrapAppConfig,
};

async function fetchConfigFromApi<T>(
  httpService: HttpService,
  urlEnvKey: string,
  apiKeyEnvKey: string,
): Promise<T | null> {
  const url = process.env[urlEnvKey];
  if (!url) return null;
  try {
    const res = await firstValueFrom(
      httpService.get<T>(url, {
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
          ...(process.env[apiKeyEnvKey] && {
            Authorization: `Bearer ${process.env[apiKeyEnvKey]}`,
          }),
        },
      }),
    );
    return res.data;
  } catch {
    return null;
  }
}

// ============================================================================
// Module Options - Sync (default)
// ============================================================================

export function getAuthModuleOptions(): AuthModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...authConfig, ...getDbConfig() },
    providers: [authEmailProvider, permissionSyncProvider],
  };
}

export function getIAMModuleOptions(): IAMModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getDbConfig() } as IIAMModuleConfig,
  };
}

export function getStorageModuleOptions(): StorageModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...storageConfig, ...getDbConfig(), appUrl: getAppUrl() },
  };
}

export function getFormBuilderModuleOptions(): FormBuilderModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getDbConfig() } as IFormBuilderConfig,
  };
}

export function getEmailModuleOptions(): EmailModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getDbConfig() } as IEmailModuleConfig,
  };
}

export function getEventManagerModuleOptions(): EventManagerModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getDbConfig() } as IEventManagerModuleConfig,
  };
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
    config: {
      ...getDbConfig(),
      defaultLanguageCode: "en",
    } as ILocalizationModuleConfig,
  };
}

export function getTaskManagerModuleOptions(): TaskManagerModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...getDbConfig(),
      jwtSecret: envConfig.getJwtConfig().secret,
    } as ITaskManagerModuleConfig,
  };
}

export function getAiAssistantModuleOptions(): AiAssistantModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...getDbConfig(),
    } as IAiAssistantModuleConfig,
    providers: [
      getAiAssistantAuthProvider(
        bootstrapAppConfig.enableCompanyFeature ?? false,
      ),
      getAiAssistantToolProvider(),
      getAiAssistantUserLookupProvider(),
    ],
  };
}

// ============================================================================
// Module Options - Async (only for modules that actually need external config)
// ============================================================================

interface AuthApiResponse {
  jwtSecret?: string;
  jwtExpiration?: string;
  refreshTokenSecret?: string;
  refreshTokenExpiration?: string;
}

@Injectable()
class AuthConfigFactory implements AuthOptionsFactory {
  constructor(private readonly httpService: HttpService) {}

  async createAuthOptions(): Promise<IAuthModuleConfig> {
    const api = await fetchConfigFromApi<AuthApiResponse>(
      this.httpService,
      "AUTH_CONFIG_API_URL",
      "AUTH_CONFIG_API_KEY",
    );
    return {
      ...authConfig,
      ...getDbConfig(),
      ...(api && {
        jwtSecret: api.jwtSecret ?? authConfig.jwtSecret,
        jwtExpiration: api.jwtExpiration ?? authConfig.jwtExpiration,
        refreshTokenSecret:
          api.refreshTokenSecret ?? authConfig.refreshTokenSecret,
        refreshTokenExpiration:
          api.refreshTokenExpiration ?? authConfig.refreshTokenExpiration,
      }),
    };
  }

  createOptions(): Promise<IAuthModuleConfig> {
    return this.createAuthOptions();
  }
}

export function getAuthModuleAsyncOptions(): AuthModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: AuthConfigFactory,
    providers: [authEmailProvider, permissionSyncProvider],
  };
}

interface StorageApiResponse {
  maxFileSize?: number;
  allowedFileTypes?: string[];
  appUrl?: string;
}

@Injectable()
class StorageConfigFactory implements StorageOptionsFactory {
  constructor(private readonly httpService: HttpService) {}

  async createStorageOptions(): Promise<IStorageModuleConfig> {
    const api = await fetchConfigFromApi<StorageApiResponse>(
      this.httpService,
      "STORAGE_CONFIG_API_URL",
      "STORAGE_CONFIG_API_KEY",
    );
    return {
      ...storageConfig,
      ...getDbConfig(),
      appUrl: api?.appUrl ?? getAppUrl(),
      ...(api && {
        maxFileSize: api.maxFileSize ?? storageConfig.maxFileSize,
        allowedFileTypes:
          api.allowedFileTypes ?? storageConfig.allowedFileTypes,
      }),
    };
  }

  createOptions(): Promise<IStorageModuleConfig> {
    return this.createStorageOptions();
  }
}

export function getStorageModuleAsyncOptions(): StorageModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: StorageConfigFactory,
  };
}

// ============================================================================
// Async Options - IAM, FormBuilder, Email (Simple Config Pattern)
// ============================================================================

async function createSimpleModuleConfig<T>(
  httpService: HttpService,
  urlEnvKey: string,
  apiKeyEnvKey: string,
): Promise<T> {
  const api = await fetchConfigFromApi<Record<string, unknown>>(
    httpService,
    urlEnvKey,
    apiKeyEnvKey,
  );
  return { ...getDbConfig(), ...(api || {}) } as T;
}

@Injectable()
class IAMConfigFactory implements IAMOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  createIAMOptions = (): Promise<IIAMModuleConfig> =>
    createSimpleModuleConfig(
      this.httpService,
      "IAM_CONFIG_API_URL",
      "IAM_CONFIG_API_KEY",
    );
  createOptions = this.createIAMOptions;
}

@Injectable()
class FormBuilderConfigFactory implements FormBuilderOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  createFormBuilderOptions = (): Promise<IFormBuilderConfig> =>
    createSimpleModuleConfig(
      this.httpService,
      "FORM_BUILDER_CONFIG_API_URL",
      "FORM_BUILDER_CONFIG_API_KEY",
    );
  createOptions = this.createFormBuilderOptions;
}

@Injectable()
class EmailConfigFactory implements EmailOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  createEmailOptions = (): Promise<IEmailModuleConfig> =>
    createSimpleModuleConfig(
      this.httpService,
      "EMAIL_CONFIG_API_URL",
      "EMAIL_CONFIG_API_KEY",
    );
  createOptions = this.createEmailOptions;
}

export function getIAMModuleAsyncOptions(): IAMModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: IAMConfigFactory,
  };
}

export function getFormBuilderModuleAsyncOptions(): FormBuilderModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: FormBuilderConfigFactory,
  };
}

export function getEmailModuleAsyncOptions(): EmailModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: EmailConfigFactory,
  };
}

@Injectable()
class EventManagerConfigFactory implements EventManagerOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  createEventManagerOptions = (): Promise<IEventManagerModuleConfig> =>
    createSimpleModuleConfig(
      this.httpService,
      "EVENT_MANAGER_CONFIG_API_URL",
      "EVENT_MANAGER_CONFIG_API_KEY",
    );
  createOptions = this.createEventManagerOptions;
}

export function getEventManagerModuleAsyncOptions(): EventManagerModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: EventManagerConfigFactory,
  };
}

@Injectable()
class NotificationConfigFactory implements NotificationOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  async createNotificationOptions(): Promise<INotificationModuleConfig> {
    const api = await fetchConfigFromApi<Record<string, unknown>>(
      this.httpService,
      "NOTIFICATION_CONFIG_API_URL",
      "NOTIFICATION_CONFIG_API_KEY",
    );
    return {
      ...getDbConfig(),
      enableRealtime: true,
      jwtSecret: envConfig.getJwtConfig().secret,
      ...(api || {}),
    } as INotificationModuleConfig;
  }
  createOptions = this.createNotificationOptions;
}

export function getNotificationModuleAsyncOptions(): NotificationModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: NotificationConfigFactory,
  };
}

@Injectable()
class LocalizationConfigFactory implements LocalizationOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  async createLocalizationOptions(): Promise<ILocalizationModuleConfig> {
    const api = await fetchConfigFromApi<Record<string, unknown>>(
      this.httpService,
      "LOCALIZATION_CONFIG_API_URL",
      "LOCALIZATION_CONFIG_API_KEY",
    );
    return {
      ...getDbConfig(),
      defaultLanguageCode: "en",
      ...(api || {}),
    } as ILocalizationModuleConfig;
  }
  createOptions = this.createLocalizationOptions;
}

export function getLocalizationModuleAsyncOptions(): LocalizationModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: LocalizationConfigFactory,
  };
}

@Injectable()
class TaskManagerConfigFactory implements TaskManagerOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  async createTaskManagerOptions(): Promise<ITaskManagerModuleConfig> {
    return {
      ...getDbConfig(),
      jwtSecret: envConfig.getJwtConfig().secret,
    } as ITaskManagerModuleConfig;
  }
  createOptions = this.createTaskManagerOptions;
}

export function getTaskManagerModuleAsyncOptions(): TaskManagerModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: TaskManagerConfigFactory,
  };
}

@Injectable()
class AiAssistantConfigFactory implements AiAssistantOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  async createAiAssistantOptions(): Promise<IAiAssistantModuleConfig> {
    return {
      ...getDbConfig(),
    } as IAiAssistantModuleConfig;
  }
  createOptions = this.createAiAssistantOptions;
}

export function getAiAssistantModuleAsyncOptions(): AiAssistantModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    imports: [HttpModule],
    useClass: AiAssistantConfigFactory,
    providers: [
      getAiAssistantAuthProvider(
        bootstrapAppConfig.enableCompanyFeature ?? false,
      ),
      getAiAssistantToolProvider(),
      getAiAssistantUserLookupProvider(),
    ],
  };
}
