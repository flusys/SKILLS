import { getAiAssistantEntitiesByConfig } from "@flusys/nestjs-ai-assistant/entities";
import { getAuthEntitiesByConfig } from "@flusys/nestjs-auth/entities";
import { ITenantDatabaseConfig } from "@flusys/nestjs-core";
import { getEmailEntitiesByConfig } from "@flusys/nestjs-email/entities";
import { getEventManagerEntitiesByConfig } from "@flusys/nestjs-event-manager/entities";
import { getFormBuilderEntitiesByConfig } from "@flusys/nestjs-form-builder/entities";
import { getIAMEntitiesByConfig } from "@flusys/nestjs-iam/entities";
import { getLocalizationEntities } from "@flusys/nestjs-localization/entities";
import { getNotificationEntitiesByConfig } from "@flusys/nestjs-notification/entities";
import { getStorageEntitiesByConfig } from "@flusys/nestjs-storage/entities";
import { getTaskManagerEntitiesByConfig } from "@flusys/nestjs-task-manager/entities";
import { bootstrapAppConfig } from "./modules.config";

/**
 * Get all entities based on configuration (supports both single and multi-tenant)
 * @param tenantConfig - Optional tenant config for multi-tenant mode
 */
export function getAllEntities(tenantConfig?: ITenantDatabaseConfig): any[] {
  const enableCompany =
    tenantConfig?.enableCompanyFeature ??
    bootstrapAppConfig.enableCompanyFeature;
  const permissionMode =
    tenantConfig?.permissionMode ?? bootstrapAppConfig.permissionMode;
  const enableEmailVerification =
    tenantConfig?.enableEmailVerification ??
    bootstrapAppConfig.enableEmailVerification ??
    true;

  return [
    ...getAuthEntitiesByConfig({
      enableCompanyFeature: enableCompany,
      enableEmailVerification,
    }),
    ...getIAMEntitiesByConfig(enableCompany, permissionMode),
    ...getStorageEntitiesByConfig(enableCompany),
    ...getFormBuilderEntitiesByConfig(enableCompany),
    ...getEmailEntitiesByConfig(enableCompany),
    ...getNotificationEntitiesByConfig(enableCompany),
    ...getLocalizationEntities(),
    ...getEventManagerEntitiesByConfig(enableCompany),
    ...getTaskManagerEntitiesByConfig(enableCompany),
    ...getAiAssistantEntitiesByConfig(enableCompany),
  ];
}
