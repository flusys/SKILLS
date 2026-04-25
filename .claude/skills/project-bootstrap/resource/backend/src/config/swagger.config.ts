import { AuthModule } from '@flusys/nestjs-auth';
import { authSwaggerConfig } from '@flusys/nestjs-auth/docs';
import { IModuleSwaggerOptions, setupSwaggerDocs } from '@flusys/nestjs-core/docs';
import { EmailModule } from '@flusys/nestjs-email';
import { emailSwaggerConfig } from '@flusys/nestjs-email/docs';
import { EventManagerModule } from '@flusys/nestjs-event-manager';
import { eventManagerSwaggerConfig } from '@flusys/nestjs-event-manager/docs';
import { FormBuilderModule } from '@flusys/nestjs-form-builder';
import { formBuilderSwaggerConfig } from '@flusys/nestjs-form-builder/docs';
import { IAMModule, PermissionModeHelper } from '@flusys/nestjs-iam';
import { iamSwaggerConfig } from '@flusys/nestjs-iam/docs';
import { LocalizationModule } from '@flusys/nestjs-localization';
import { localizationSwaggerConfig } from '@flusys/nestjs-localization/docs';
import { NotificationModule } from '@flusys/nestjs-notification';
import { notificationSwaggerConfig } from '@flusys/nestjs-notification/docs';
import { StorageModule } from '@flusys/nestjs-storage';
import { storageSwaggerConfig } from '@flusys/nestjs-storage/docs';
import { INestApplication, Logger } from '@nestjs/common';
import { bootstrapAppConfig } from './modules.config';

/**
 * Configure Swagger documentation for all modules (dev only)
 */
export function configureSwaggerDocs(app: INestApplication, port: number): void {
  const globalHeaders =
    bootstrapAppConfig.databaseMode === 'multi-tenant'
      ? [{ name: 'x-tenant-id', description: 'Tenant ID', required: false, example: 'tenant1' }]
      : undefined;

  const permissionMode = PermissionModeHelper.fromString(bootstrapAppConfig.permissionMode);
  const { enableCompanyFeature } = bootstrapAppConfig;

  const swaggerConfigs: IModuleSwaggerOptions[] = [
    { ...authSwaggerConfig(bootstrapAppConfig), modules: [AuthModule], globalHeaders },
    { ...iamSwaggerConfig(enableCompanyFeature, permissionMode, bootstrapAppConfig.databaseMode), modules: [IAMModule], globalHeaders },
    { ...storageSwaggerConfig(bootstrapAppConfig), modules: [StorageModule], globalHeaders },
    { ...formBuilderSwaggerConfig(bootstrapAppConfig), modules: [FormBuilderModule], globalHeaders },
    { ...emailSwaggerConfig(bootstrapAppConfig), modules: [EmailModule], globalHeaders },
    { ...eventManagerSwaggerConfig(bootstrapAppConfig), modules: [EventManagerModule], globalHeaders },
    { ...notificationSwaggerConfig(bootstrapAppConfig), modules: [NotificationModule], globalHeaders },
    { ...localizationSwaggerConfig(bootstrapAppConfig), modules: [LocalizationModule], globalHeaders },
  ];

  swaggerConfigs.forEach((config) => setupSwaggerDocs(app, config));

  const logger = new Logger('Swagger');
  logger.log(`Auth API docs:          http://localhost:${port}/api/docs/auth`);
  logger.log(`IAM API docs:           http://localhost:${port}/api/docs/iam`);
  logger.log(`Storage API docs:       http://localhost:${port}/api/docs/storage`);
  logger.log(`Form Builder API docs:  http://localhost:${port}/api/docs/form-builder`);
  logger.log(`Email API docs:         http://localhost:${port}/api/docs/email`);
  logger.log(`Event Manager API docs: http://localhost:${port}/api/docs/event-manager`);
  logger.log(`Notification API docs:  http://localhost:${port}/api/docs/notification`);
  logger.log(`Localization API docs:  http://localhost:${port}/api/docs/localization`);
}
