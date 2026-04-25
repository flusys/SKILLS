import { ITenantDatabaseConfig } from '@flusys/nestjs-core';
import { getEntitiesByConfig } from '@flusys/nestjs-auth/entities';
import { getEmailEntitiesByConfig } from '@flusys/nestjs-email/entities';
import { getIAMEntitiesByConfig } from '@flusys/nestjs-iam/entities';
import { getStorageEntitiesByConfig } from '@flusys/nestjs-storage/entities';
import { getFormBuilderEntitiesByConfig } from '@flusys/nestjs-form-builder/entities';
import { getNotificationEntitiesByConfig } from '@flusys/nestjs-notification/entities';
import { getLocalizationEntities } from '@flusys/nestjs-localization/entities';
import { getEventManagerEntitiesByConfig } from '@flusys/nestjs-event-manager/entities';
import { bootstrapAppConfig } from './modules.config';

/**
 * Get all entities based on configuration (supports both single and multi-tenant)
 * @param tenantConfig - Optional tenant config for multi-tenant mode
 */
export function getAllEntities(tenantConfig?: ITenantDatabaseConfig): any[] {
  const enableCompany = tenantConfig?.enableCompanyFeature ?? bootstrapAppConfig.enableCompanyFeature;
  const permissionMode = tenantConfig?.permissionMode ?? bootstrapAppConfig.permissionMode;
  const enableEmailVerification = tenantConfig?.enableEmailVerification ?? bootstrapAppConfig.enableEmailVerification ?? true;

  return [
    ...getEntitiesByConfig({ enableCompanyFeature: enableCompany, enableEmailVerification }),
    ...getIAMEntitiesByConfig(enableCompany, permissionMode),
    ...getStorageEntitiesByConfig(enableCompany),
    ...getFormBuilderEntitiesByConfig(enableCompany),
    ...getEmailEntitiesByConfig(enableCompany),
    ...getNotificationEntitiesByConfig(enableCompany),
    ...getLocalizationEntities(),
    ...getEventManagerEntitiesByConfig(enableCompany),
  ];
}
