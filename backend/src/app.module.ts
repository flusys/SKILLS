import { AiAssistantModule } from "@flusys/nestjs-ai-assistant";
import { AuthModule } from "@flusys/nestjs-auth";
import { EmailModule } from "@flusys/nestjs-email";
import { EventManagerModule } from "@flusys/nestjs-event-manager";
import { FormBuilderModule } from "@flusys/nestjs-form-builder";
import { IAMModule } from "@flusys/nestjs-iam";
import { LocalizationModule } from "@flusys/nestjs-localization";
import { NotificationModule } from "@flusys/nestjs-notification";
import {
  CacheModule,
  EventBusModule,
  LoggerMiddleware,
  SharedPermissionCacheModule,
} from "@flusys/nestjs-shared";
import { StorageModule } from "@flusys/nestjs-storage";
import { TaskManagerModule } from "@flusys/nestjs-task-manager";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DomainEventConsumer } from "./consumers";
import {
  appDomainEventsConfig,
  getAiAssistantModuleOptions,
  getAuthModuleOptions,
  getEmailModuleOptions,
  getEventManagerModuleOptions,
  getFormBuilderModuleOptions,
  getIAMModuleOptions,
  getLocalizationModuleOptions,
  getNotificationModuleOptions,
  getStorageModuleOptions,
  getTaskManagerModuleOptions,
} from "./config/modules.config";

@Module({
  imports: [
    CacheModule.forRoot(true, 8.64e7, 10000),
    // serviceName identifies this process on the broker (queue / clientId).
    // defaultModuleEvents covers this app's own modules - the packages carry
    // their own events block from modules.config.ts.
    EventBusModule.forRoot({
      serviceName: "my-app",
      defaultModuleEvents: appDomainEventsConfig,
    }),
    SharedPermissionCacheModule,
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 5 },
      { name: "medium", ttl: 10000, limit: 30 },
      { name: "long", ttl: 60000, limit: 100 },
    ]),

    // NotificationModule must be before AuthModule so NOTIFICATION_ADAPTER is available
    NotificationModule.forRoot(getNotificationModuleOptions()),

    // Feature modules
    AuthModule.forRoot(getAuthModuleOptions()),
    IAMModule.forRoot(getIAMModuleOptions()),
    StorageModule.forRoot(getStorageModuleOptions()),
    FormBuilderModule.forRoot(getFormBuilderModuleOptions()),
    EmailModule.forRoot(getEmailModuleOptions()),
    EventManagerModule.forRoot(getEventManagerModuleOptions()),
    TaskManagerModule.forRoot(getTaskManagerModuleOptions()),
    AiAssistantModule.forRoot(getAiAssistantModuleOptions()),

    LocalizationModule.forRoot(getLocalizationModuleOptions()),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DomainEventConsumer,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
