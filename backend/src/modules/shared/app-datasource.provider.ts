import { getAllEntities } from '@/config/entities.config';
import {
  bootstrapAppConfig,
  defaultDatabaseConfig,
  tenantList,
} from '@/config/modules.config';
import {
  IDatabaseConfig,
  IDataSourceServiceOptions,
  ITenantDatabaseConfig,
} from '@flusys/nestjs-core';
import { MultiTenantDataSourceService } from '@flusys/nestjs-shared';
import { Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DataSource } from 'typeorm';

@Injectable({ scope: Scope.REQUEST })
export class AppDataSourceProvider extends MultiTenantDataSourceService {
  protected static override readonly tenantConnections = new Map<string, DataSource>();
  protected static override singleDataSource: DataSource | null = null;
  protected static override readonly tenantsRegistry = new Map<string, ITenantDatabaseConfig>();
  protected static override initialized = false;
  protected static override readonly connectionLocks = new Map<string, Promise<DataSource>>();
  protected static override singleConnectionLock: Promise<DataSource> | null = null;

  constructor(@Optional() @Inject(REQUEST) request?: Request) {
    super(AppDataSourceProvider.buildParentOptions(), request);
  }

  private static buildParentOptions(): IDataSourceServiceOptions {
    return {
      bootstrapAppConfig,
      defaultDatabaseConfig,
      tenantDefaultDatabaseConfig:
        bootstrapAppConfig.databaseMode === 'multi-tenant' ? defaultDatabaseConfig : undefined,
      tenants:
        bootstrapAppConfig.databaseMode === 'multi-tenant' ? tenantList : undefined,
    };
  }

  protected override async createDataSourceFromConfig(
    config: IDatabaseConfig,
  ): Promise<DataSource> {
    return super.createDataSourceFromConfig(config, getAllEntities());
  }
}
