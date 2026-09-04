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
import { AUTH_EVENT_ACTIONS } from "@flusys/nestjs-auth/config";
import { EMAIL_EVENT_ACTIONS } from "@flusys/nestjs-email/config";
import { EVENT_MANAGER_EVENT_ACTIONS } from "@flusys/nestjs-event-manager/config";
import { FORM_BUILDER_EVENT_ACTIONS } from "@flusys/nestjs-form-builder/config";
import { IAM_EVENT_ACTIONS } from "@flusys/nestjs-iam/config";
import { LOCALIZATION_EVENT_ACTIONS } from "@flusys/nestjs-localization/config";
import { NOTIFICATION_EVENT_ACTIONS } from "@flusys/nestjs-notification/config";
import { IModuleEventsConfig } from "@flusys/nestjs-shared/interfaces";
import { STORAGE_EVENT_ACTIONS } from "@flusys/nestjs-storage/config";
import { TASK_MANAGER_EVENT_ACTIONS } from "@flusys/nestjs-task-manager/config";
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

// ============================================================================
// Domain Events
// ============================================================================

export type FeatureModuleName =
  | "auth"
  | "iam"
  | "storage"
  | "form-builder"
  | "email"
  | "event-manager"
  | "notification"
  | "localization"
  | "task-manager";

/** One switch arms every module; each module still narrows its own block below */
const domainEventsEnabled = envConfig.getBoolean("ENABLE_DOMAIN_EVENTS", false);

/**
 * Per-module domain event settings. `actions` is the only filter, and every
 * entry names the entity it belongs to: `company.created` publishes company
 * inserts, while `company.updated` left out keeps company edits silent.
 *
 * Every pair a package can publish is written out, CRUD lifecycle ones
 * included, so a single one can be dropped by deleting its line. A pair that is
 * missing here is never published - when a package gains an entity or an
 * action, add its lines or it will stay silent. Do not fold them back into bare
 * actions or a shared spread.
 *
 * CRUD lifecycle actions are written as literals because their five names never
 * change; every other action comes from its package's own `*_EVENT_ACTIONS`
 * constant, so renaming one there breaks this file instead of silently muting
 * the event.
 *
 * An entry without a dot still covers every entity of the module, and both
 * halves accept wildcards (`role.*`, `*.purged`), but the explicit pairs below
 * are what this app runs on.
 *
 * Saved rows ride along on the envelope by default; `includePayload: false`
 * sends ids and metadata alone, and is set on the modules whose rows carry
 * personal data or message bodies.
 */
export const moduleEventsConfig: Record<FeatureModuleName, IModuleEventsConfig> =
  {
    auth: {
      enabled: domainEventsEnabled,
      actions: [
        "appuser.created",
        "appuser.updated",
        "appuser.deleted",
        "appuser.restored",
        "appuser.purged",
        `appuser.${AUTH_EVENT_ACTIONS.REGISTERED}`,
        `appuser.${AUTH_EVENT_ACTIONS.PASSWORD_CHANGED}`,
        `appuser.${AUTH_EVENT_ACTIONS.PASSWORD_RESET_REQUESTED}`,
        `appuser.${AUTH_EVENT_ACTIONS.PASSWORD_RESET}`,
        `appuser.${AUTH_EVENT_ACTIONS.EMAIL_VERIFIED}`,
        "company.created",
        "company.updated",
        "company.deleted",
        "company.restored",
        "company.purged",
        "company_branch.created",
        "company_branch.updated",
        "company_branch.deleted",
        "company_branch.restored",
        "company_branch.purged",
        `session.${AUTH_EVENT_ACTIONS.LOGGED_IN}`,
        `session.${AUTH_EVENT_ACTIONS.LOGGED_OUT}`,
        `session.${AUTH_EVENT_ACTIONS.TOKEN_REFRESHED}`,
        `session.${AUTH_EVENT_ACTIONS.COMPANY_SWITCHED}`,
        `user_company_permission.${AUTH_EVENT_ACTIONS.PERMISSION_GRANTED}`,
        `user_company_permission.${AUTH_EVENT_ACTIONS.PERMISSION_REVOKED}`,
      ],
      includePayload: false,
    },

    iam: {
      enabled: domainEventsEnabled,
      actions: [
        "action.created",
        "action.updated",
        "action.deleted",
        "action.restored",
        "action.purged",
        "role.created",
        "role.updated",
        "role.deleted",
        "role.restored",
        "role.purged",
        `user_action.${IAM_EVENT_ACTIONS.PERMISSIONS_ASSIGNED}`,
        `role_action.${IAM_EVENT_ACTIONS.PERMISSIONS_ASSIGNED}`,
        `company_action.${IAM_EVENT_ACTIONS.PERMISSIONS_ASSIGNED}`,
        `user_role.${IAM_EVENT_ACTIONS.PERMISSIONS_ASSIGNED}`,
      ],
    },

    storage: {
      enabled: domainEventsEnabled,
      actions: [
        "file_manager.created",
        "file_manager.updated",
        "file_manager.deleted",
        "file_manager.restored",
        "file_manager.purged",
        `file_manager.${STORAGE_EVENT_ACTIONS.UPLOADED}`,
        `file_manager.${STORAGE_EVENT_ACTIONS.REMOVED}`,
        "folder.created",
        "folder.updated",
        "folder.deleted",
        "folder.restored",
        "folder.purged",
        "storageConfig.created",
        "storageConfig.updated",
        "storageConfig.deleted",
        "storageConfig.restored",
        "storageConfig.purged",
      ],
    },

    "form-builder": {
      enabled: domainEventsEnabled,
      actions: [
        "form.created",
        "form.updated",
        "form.deleted",
        "form.restored",
        "form.purged",
        "form_result.created",
        "form_result.updated",
        "form_result.deleted",
        "form_result.restored",
        "form_result.purged",
        `form_result.${FORM_BUILDER_EVENT_ACTIONS.SUBMITTED}`,
        `form_result.${FORM_BUILDER_EVENT_ACTIONS.DRAFT_SAVED}`,
      ],
      includePayload: false,
    },

    email: {
      enabled: domainEventsEnabled,
      actions: [
        "emailConfig.created",
        "emailConfig.updated",
        "emailConfig.deleted",
        "emailConfig.restored",
        "emailConfig.purged",
        "emailTemplate.created",
        "emailTemplate.updated",
        "emailTemplate.deleted",
        "emailTemplate.restored",
        "emailTemplate.purged",
        `email_message.${EMAIL_EVENT_ACTIONS.SENT}`,
        `email_message.${EMAIL_EVENT_ACTIONS.FAILED}`,
      ],
      includePayload: false,
    },

    "event-manager": {
      enabled: domainEventsEnabled,
      actions: [
        "event.created",
        "event.updated",
        "event.deleted",
        "event.restored",
        "event.purged",
        `event.${EVENT_MANAGER_EVENT_ACTIONS.PARTICIPANT_STATUS_CHANGED}`,
      ],
    },

    notification: {
      enabled: domainEventsEnabled,
      actions: [
        "notification.created",
        "notification.updated",
        "notification.deleted",
        "notification.restored",
        "notification.purged",
        `notification.${NOTIFICATION_EVENT_ACTIONS.SENT}`,
        `notification.${NOTIFICATION_EVENT_ACTIONS.READ}`,
        `notification.${NOTIFICATION_EVENT_ACTIONS.ALL_READ}`,
      ],
      includePayload: false,
    },

    localization: {
      enabled: domainEventsEnabled,
      actions: [
        "language.created",
        "language.updated",
        "language.deleted",
        "language.restored",
        "language.purged",
        "translationKey.created",
        "translationKey.updated",
        "translationKey.deleted",
        "translationKey.restored",
        "translationKey.purged",
        "translation.created",
        "translation.updated",
        "translation.deleted",
        "translation.restored",
        "translation.purged",
        `translation.${LOCALIZATION_EVENT_ACTIONS.BULK_UPDATED}`,
      ],
      includePayload: false,
    },

    "task-manager": {
      enabled: domainEventsEnabled,
      actions: [
        "task.created",
        "task.updated",
        "task.deleted",
        "task.restored",
        "task.purged",
        `task.${TASK_MANAGER_EVENT_ACTIONS.MOVED}`,
        `task.${TASK_MANAGER_EVENT_ACTIONS.ASSIGNED}`,
        "task_board.created",
        "task_board.updated",
        "task_board.deleted",
        "task_board.restored",
        "task_board.purged",
        "task_list.created",
        "task_list.updated",
        "task_list.deleted",
        "task_list.restored",
        "task_list.purged",
        `task_list.${TASK_MANAGER_EVENT_ACTIONS.REORDERED}`,
        "task_label.created",
        "task_label.updated",
        "task_label.deleted",
        "task_label.restored",
        "task_label.purged",
        "task_comment.created",
        "task_comment.updated",
        "task_comment.deleted",
        "task_comment.restored",
        "task_comment.purged",
      ],
    },
  };

export function getModuleEventsConfig(
  moduleName: FeatureModuleName,
): IModuleEventsConfig {
  return moduleEventsConfig[moduleName];
}

/** Config every feature module shares: datasource wiring plus that module's events block */
export function getBaseModuleConfig(
  moduleName: FeatureModuleName,
): Partial<IDataSourceServiceOptions> & { events: IModuleEventsConfig } {
  return { ...getDbConfig(), events: getModuleEventsConfig(moduleName) };
}

/**
 * Applies to the application's own feature modules, which register no events
 * block of their own - without it every `publishDomainAction` they make is a
 * no-op even while the packages are publishing.
 */
export const appDomainEventsConfig: IModuleEventsConfig = {
  enabled: domainEventsEnabled,
};

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
    config: { ...authConfig, ...getBaseModuleConfig("auth") },
    providers: [authEmailProvider, permissionSyncProvider],
  };
}

export function getIAMModuleOptions(): IAMModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getBaseModuleConfig("iam") } as IIAMModuleConfig,
  };
}

export function getStorageModuleOptions(): StorageModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...storageConfig,
      ...getBaseModuleConfig("storage"),
      appUrl: getAppUrl(),
    },
  };
}

export function getFormBuilderModuleOptions(): FormBuilderModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getBaseModuleConfig("form-builder") } as IFormBuilderConfig,
  };
}

export function getEmailModuleOptions(): EmailModuleOptions {
  return {
    ...baseModuleOptions,
    config: { ...getBaseModuleConfig("email") } as IEmailModuleConfig,
  };
}

export function getEventManagerModuleOptions(): EventManagerModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...getBaseModuleConfig("event-manager"),
    } as IEventManagerModuleConfig,
  };
}

export function getNotificationModuleOptions(): NotificationModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...getBaseModuleConfig("notification"),
      enableRealtime: true,
      jwtSecret: envConfig.getJwtConfig().secret,
    } as INotificationModuleConfig,
  };
}

export function getLocalizationModuleOptions(): LocalizationModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...getBaseModuleConfig("localization"),
      defaultLanguageCode: "en",
    } as ILocalizationModuleConfig,
  };
}

export function getTaskManagerModuleOptions(): TaskManagerModuleOptions {
  return {
    ...baseModuleOptions,
    config: {
      ...getBaseModuleConfig("task-manager"),
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
      ...getBaseModuleConfig("auth"),
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
      ...getBaseModuleConfig("storage"),
      appUrl: api?.appUrl ?? getAppUrl(),
      ...(api && {
        maxFileSize: api.maxFileSize ?? storageConfig.maxFileSize,
        allowedFileTypes:
          api.allowedFileTypes ?? storageConfig.allowedFileTypes,
      }),
    };
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
  moduleName: FeatureModuleName,
  urlEnvKey: string,
  apiKeyEnvKey: string,
): Promise<T> {
  const api = await fetchConfigFromApi<Record<string, unknown>>(
    httpService,
    urlEnvKey,
    apiKeyEnvKey,
  );
  return { ...getBaseModuleConfig(moduleName), ...(api || {}) } as T;
}

@Injectable()
class IAMConfigFactory implements IAMOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  createIAMOptions = (): Promise<IIAMModuleConfig> =>
    createSimpleModuleConfig(
      this.httpService,
      "iam",
      "IAM_CONFIG_API_URL",
      "IAM_CONFIG_API_KEY",
    );
}

@Injectable()
class FormBuilderConfigFactory implements FormBuilderOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  createFormBuilderOptions = (): Promise<IFormBuilderConfig> =>
    createSimpleModuleConfig(
      this.httpService,
      "form-builder",
      "FORM_BUILDER_CONFIG_API_URL",
      "FORM_BUILDER_CONFIG_API_KEY",
    );
}

@Injectable()
class EmailConfigFactory implements EmailOptionsFactory {
  constructor(private readonly httpService: HttpService) {}
  createEmailOptions = (): Promise<IEmailModuleConfig> =>
    createSimpleModuleConfig(
      this.httpService,
      "email",
      "EMAIL_CONFIG_API_URL",
      "EMAIL_CONFIG_API_KEY",
    );
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
      "event-manager",
      "EVENT_MANAGER_CONFIG_API_URL",
      "EVENT_MANAGER_CONFIG_API_KEY",
    );
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
      ...getBaseModuleConfig("notification"),
      enableRealtime: true,
      jwtSecret: envConfig.getJwtConfig().secret,
      ...(api || {}),
    } as INotificationModuleConfig;
  }
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
      ...getBaseModuleConfig("localization"),
      defaultLanguageCode: "en",
      ...(api || {}),
    } as ILocalizationModuleConfig;
  }
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
  async createTaskManagerOptions(): Promise<ITaskManagerModuleConfig> {
    return {
      ...getBaseModuleConfig("task-manager"),
      jwtSecret: envConfig.getJwtConfig().secret,
    } as ITaskManagerModuleConfig;
  }
}

export function getTaskManagerModuleAsyncOptions(): TaskManagerModuleAsyncOptions {
  return {
    ...baseModuleOptions,
    useClass: TaskManagerConfigFactory,
  };
}

@Injectable()
class AiAssistantConfigFactory implements AiAssistantOptionsFactory {
  async createAiAssistantOptions(): Promise<IAiAssistantModuleConfig> {
    return {
      ...getDbConfig(),
    } as IAiAssistantModuleConfig;
  }
}

export function getAiAssistantModuleAsyncOptions(): AiAssistantModuleAsyncOptions {
  return {
    ...baseModuleOptions,
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
