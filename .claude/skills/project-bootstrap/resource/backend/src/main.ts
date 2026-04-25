import { envConfig } from '@flusys/nestjs-core/config';
import {
  instance as winstonInstance,
  ResponseMetaInterceptor,
  DeleteEmptyIdFromBodyInterceptor,
  GlobalExceptionFilter,
} from '@flusys/nestjs-shared';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { bootstrapAppConfig } from './config/modules.config';
import { configureSecurityMiddleware } from './config/security.config';
import { configureSwaggerDocs } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({ instance: winstonInstance }),
  });

  app.enableCors({
    origin: envConfig.getOrigins(),
    methods: 'POST,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'x-tenant-id', 'x-client-type', 'x-loader-tag'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new DeleteEmptyIdFromBodyInterceptor(), new ResponseMetaInterceptor());

  app.enableVersioning({ type: VersioningType.URI });
  app.use(cookieParser());
  configureSecurityMiddleware(app);

  const isProduction = envConfig.isProduction();
  const port = envConfig.getPort() || 2002;

  if (!isProduction) {
    configureSwaggerDocs(app, port);
  }

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on port ${port}`);
  logger.log(`Database mode: ${bootstrapAppConfig.databaseMode}`);
  logger.log(`Environment: ${isProduction ? 'production' : 'development'}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application failed to start', error);
  process.exit(1);
});
