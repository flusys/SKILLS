import { createMigrationDataSource, IMigrationConfig } from '@flusys/nestjs-core';
import { bootstrapAppConfig, defaultDatabaseConfig, tenantList } from '../config/modules.config';
import { getAllEntities } from '../config/entities.config';

export const migrationConfig: IMigrationConfig = {
  defaultDatabaseConfig,
  bootstrapAppConfig,
  tenants: tenantList,
  migrationsPath: `${__dirname}/migrations`,
  entities: getAllEntities,
  migrationsTableName: 'migrations',
};

// DataSource for TypeORM CLI
export default createMigrationDataSource({
  config: migrationConfig,
  tenantId: process.env.TENANT_ID,
});
