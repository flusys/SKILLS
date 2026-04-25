#!/usr/bin/env ts-node
/**
 * Admin Seed Script
 *
 * Creates initial admin user with full permissions:
 * - User: Uses ADMIN_EMAIL env var (defaults to admin@example.com)
 * - Password: Uses ADMIN_PASSWORD env var (defaults to Admin@123456)
 * - Company: Default Company (if enableCompanyFeature is true)
 * - Branch: Default Branch (if enableCompanyFeature is true)
 * - User-Company/Branch Permissions (if enableCompanyFeature is true)
 * - All Actions seeded from permission constants
 * - Direct user-action permissions (works regardless of permission mode)
 * - Company-action permissions (if enableCompanyFeature is true)
 * - Default Email Config: SMTP with Gmail
 * - Default Storage Config: Local storage
 *
 * Environment Variables:
 *   ADMIN_EMAIL    - Admin user email (default: admin@example.com)
 *   ADMIN_PASSWORD - Admin user password (default: Admin@123456)
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register projects/flusysnest/src/persistence/seed-admin.ts
 *   ADMIN_EMAIL=admin@mycompany.com ADMIN_PASSWORD=MySecurePass@123 npx ts-node -r tsconfig-paths/register projects/flusysnest/src/persistence/seed-admin.ts
 */

// ============================================================================
// DEFAULT CREDENTIALS (easy to remember for development)
// ============================================================================
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123456';
// ============================================================================

import {
  ACTION_PERMISSIONS,
  BRANCH_PERMISSIONS,
  COMPANY_ACTION_PERMISSIONS,
  COMPANY_PERMISSIONS,
  EMAIL_CONFIG_PERMISSIONS,
  EMAIL_TEMPLATE_PERMISSIONS,
  EVENT_PERMISSIONS,
  FILE_PERMISSIONS,
  FOLDER_PERMISSIONS,
  FORM_PERMISSIONS,
  FORM_RESULT_PERMISSIONS,
  LANGUAGE_PERMISSIONS,
  NOTIFICATION_PERMISSIONS,
  ROLE_ACTION_PERMISSIONS,
  ROLE_PERMISSIONS,
  STORAGE_CONFIG_PERMISSIONS,
  TRANSLATION_KEY_PERMISSIONS,
  TRANSLATION_PERMISSIONS,
  USER_ACTION_PERMISSIONS,
  USER_PERMISSIONS,
  USER_ROLE_PERMISSIONS,
} from '@flusys/nestjs-shared';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { bootstrapAppConfig } from '../config/modules.config';
import { migrationConfig } from './migration.config';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Converts MySQL-style `?` placeholders to PostgreSQL `$1, $2, ...` placeholders.
 * No-op for MySQL/MariaDB.
 */
function buildQuery(sql: string, dbType: string): string {
  if (dbType !== 'postgres') return sql;
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// ============================================================================
// SEED CONFIGURATION - Toggle features to seed
// ============================================================================
// Set to false to skip seeding actions for modules you don't use
const ENABLE_COMPANY_FEATURE = bootstrapAppConfig.enableCompanyFeature ?? false;
const ENABLE_STORAGE = false; // true if storage selected in PRD
const ENABLE_FORM_BUILDER = false; // true if form-builder selected in PRD
const ENABLE_EMAIL = false; // true if email selected in PRD
const ENABLE_EVENT_MANAGER = false; // true if event-manager selected in PRD
const ENABLE_LOCALIZATION = false; // true if localization selected in PRD
const ENABLE_NOTIFICATION = false; // true if notification selected in PRD
// ============================================================================

// Action type enum (matches ActionType in entities)
enum ActionType {
  BACKEND = 'backend',
  FRONTEND = 'frontend',
  BOTH = 'both',
}

// Permission type enum (matches IamPermissionType in entities)
enum IamPermissionType {
  USER_ROLE = 'user_role',
  ROLE_ACTION = 'role_action',
  USER_ACTION = 'user_action',
  COMPANY_ACTION = 'company_action',
}

// Entity type enum (matches IamEntityType in entities)
enum IamEntityType {
  USER = 'user',
  ROLE = 'role',
  ACTION = 'action',
  COMPANY = 'company',
}

// Interfaces
interface CompanyRow {
  id: string;
  name: string;
  slug: string;
}

interface BranchRow {
  id: string;
  name: string;
  slug: string;
  company_id: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
}

interface ActionRow {
  id: string;
  name: string;
  code: string;
}

/**
 * Action definitions grouped by module with parent-child hierarchy
 */
interface ActionDefinition {
  name: string;
  code: string;
  description: string;
  actionType: ActionType;
  children?: ActionDefinition[];
}

/**
 * Build action tree from permission constants
 */
function buildActionTree(): ActionDefinition[] {
  const createCrudActions = (
    moduleName: string,
    permissions: Record<string, string>,
  ): ActionDefinition[] => {
    return Object.entries(permissions).map(([key, code]) => ({
      name: `${moduleName} ${key.charAt(0) + key.slice(1).toLowerCase()}`,
      code,
      description: `${key.toLowerCase()} ${moduleName.toLowerCase()}`,
      actionType: ActionType.BOTH,
    }));
  };

  return [
    // Auth Module
    {
      name: 'Auth Module',
      code: 'auth',
      description: 'Authentication and user management',
      actionType: ActionType.BOTH,
      children: [
        {
          name: 'User Management',
          code: 'user',
          description: 'User CRUD operations',
          actionType: ActionType.BOTH,
          children: createCrudActions('User', USER_PERMISSIONS),
        },
        ...(ENABLE_COMPANY_FEATURE
          ? [
              {
                name: 'Company Management',
                code: 'company',
                description: 'Company CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Company', COMPANY_PERMISSIONS),
              },
              {
                name: 'Branch Management',
                code: 'branch',
                description: 'Branch CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Branch', BRANCH_PERMISSIONS),
              },
            ]
          : []),
      ],
    },
    // IAM Module
    {
      name: 'IAM Module',
      code: 'iam',
      description: 'Identity and access management',
      actionType: ActionType.BOTH,
      children: [
        {
          name: 'Action Management',
          code: 'action',
          description: 'Action CRUD operations',
          actionType: ActionType.BOTH,
          children: createCrudActions('Action', ACTION_PERMISSIONS),
        },
        {
          name: 'Role Management',
          code: 'role',
          description: 'Role CRUD operations',
          actionType: ActionType.BOTH,
          children: createCrudActions('Role', ROLE_PERMISSIONS),
        },
        {
          name: 'Permission Assignments',
          code: 'permission-assignment',
          description: 'Permission assignment operations',
          actionType: ActionType.BOTH,
          children: [
            ...createCrudActions('Role-Action', ROLE_ACTION_PERMISSIONS),
            ...createCrudActions('User-Role', USER_ROLE_PERMISSIONS),
            ...createCrudActions('User-Action', USER_ACTION_PERMISSIONS),
            ...(ENABLE_COMPANY_FEATURE
              ? createCrudActions('Company-Action', COMPANY_ACTION_PERMISSIONS)
              : []),
          ],
        },
      ],
    },
    // Storage Module (conditional)
    ...(ENABLE_STORAGE
      ? [
          {
            name: 'Storage Module',
            code: 'storage',
            description: 'File storage management',
            actionType: ActionType.BOTH,
            children: [
              {
                name: 'File Management',
                code: 'file',
                description: 'File CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('File', FILE_PERMISSIONS),
              },
              {
                name: 'Folder Management',
                code: 'folder',
                description: 'Folder CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Folder', FOLDER_PERMISSIONS),
              },
              {
                name: 'Storage Config',
                code: 'storage-config',
                description: 'Storage configuration CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Storage Config', STORAGE_CONFIG_PERMISSIONS),
              },
            ],
          },
        ]
      : []),
    // Email Module (conditional)
    ...(ENABLE_EMAIL
      ? [
          {
            name: 'Email Module',
            code: 'email',
            description: 'Email management',
            actionType: ActionType.BOTH,
            children: [
              {
                name: 'Email Config',
                code: 'email-config',
                description: 'Email configuration CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Email Config', EMAIL_CONFIG_PERMISSIONS),
              },
              {
                name: 'Email Template',
                code: 'email-template',
                description: 'Email template CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Email Template', EMAIL_TEMPLATE_PERMISSIONS),
              },
            ],
          },
        ]
      : []),
    // Form Builder Module (conditional)
    ...(ENABLE_FORM_BUILDER
      ? [
          {
            name: 'Form Builder Module',
            code: 'form-builder',
            description: 'Form builder management',
            actionType: ActionType.BOTH,
            children: [
              {
                name: 'Form Management',
                code: 'form',
                description: 'Form CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Form', FORM_PERMISSIONS),
              },
              {
                name: 'Form Result Management',
                code: 'form-result',
                description: 'Form result CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Form Result', FORM_RESULT_PERMISSIONS),
              },
            ],
          },
        ]
      : []),
    // Event Manager Module (conditional)
    ...(ENABLE_EVENT_MANAGER
      ? [
          {
            name: 'Event Manager Module',
            code: 'event-manager',
            description: 'Calendar event management',
            actionType: ActionType.BOTH,
            children: [
              {
                name: 'Event Management',
                code: 'event',
                description: 'Event CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Event', EVENT_PERMISSIONS),
              },
            ],
          },
        ]
      : []),
    // Notification Module (conditional)
    ...(ENABLE_NOTIFICATION
      ? [
          {
            name: 'Notification Module',
            code: 'notification',
            description: 'Notification management',
            actionType: ActionType.BOTH,
            children: [
              {
                name: 'Notification Management',
                code: 'notification-item',
                description: 'Notification CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Notification', NOTIFICATION_PERMISSIONS),
              },
            ],
          },
        ]
      : []),
    // Localization Module (conditional)
    ...(ENABLE_LOCALIZATION
      ? [
          {
            name: 'Localization Module',
            code: 'localization',
            description: 'Localization and translation management',
            actionType: ActionType.BOTH,
            children: [
              {
                name: 'Language Management',
                code: 'language',
                description: 'Language CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Language', LANGUAGE_PERMISSIONS),
              },
              {
                name: 'Translation Key Management',
                code: 'translation-key',
                description: 'Translation key CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Translation Key', TRANSLATION_KEY_PERMISSIONS),
              },
              {
                name: 'Translation Management',
                code: 'translation',
                description: 'Translation CRUD operations',
                actionType: ActionType.BOTH,
                children: createCrudActions('Translation', TRANSLATION_PERMISSIONS),
              },
            ],
          },
        ]
      : []),
  ];
}

/**
 * Insert actions recursively and return flat list of action IDs
 */
async function insertActionsRecursively(
  queryRunner: any,
  actions: ActionDefinition[],
  parentId: string | null,
  serial: { value: number },
  dbType: string,
): Promise<ActionRow[]> {
  const insertedActions: ActionRow[] = [];

  for (const action of actions) {
    const existingAction = (
      await queryRunner.query(
        buildQuery(
          `SELECT id, name, code FROM action WHERE code = ? AND deleted_at IS NULL LIMIT 1`,
          dbType,
        ),
        [action.code],
      )
    )[0] as ActionRow | undefined;

    let actionId: string;
    if (!existingAction) {
      actionId = uuidv4();
      await queryRunner.query(
        buildQuery(
          `INSERT INTO action (id, name, description, code, action_type, parent_id, serial, is_active, read_only)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          dbType,
        ),
        [
          actionId,
          action.name,
          action.description,
          action.code,
          action.actionType,
          parentId,
          serial.value++,
          true,
          true,
        ],
      );
      console.log(`  ✓ Created action: ${action.name} (${action.code})`);
      insertedActions.push({ id: actionId, name: action.name, code: action.code });
    } else {
      actionId = existingAction.id;
      console.log(`  - Action exists: ${action.name} (${action.code})`);
      insertedActions.push(existingAction);
    }

    if (action.children && action.children.length > 0) {
      const childActions = await insertActionsRecursively(
        queryRunner,
        action.children,
        actionId,
        serial,
        dbType,
      );
      insertedActions.push(...childActions);
    }
  }

  return insertedActions;
}

/**
 * Get all leaf actions (actions with actual permission codes)
 * Respects enableCompanyFeature configuration
 */
function getAllPermissionCodes(): string[] {
  const codes: string[] = [];

  // Auth Module
  codes.push(...Object.values(USER_PERMISSIONS));
  if (ENABLE_COMPANY_FEATURE) {
    codes.push(...Object.values(COMPANY_PERMISSIONS));
    codes.push(...Object.values(BRANCH_PERMISSIONS));
  }

  // IAM Module
  codes.push(...Object.values(ACTION_PERMISSIONS));
  codes.push(...Object.values(ROLE_PERMISSIONS));
  codes.push(...Object.values(ROLE_ACTION_PERMISSIONS));
  codes.push(...Object.values(USER_ROLE_PERMISSIONS));
  codes.push(...Object.values(USER_ACTION_PERMISSIONS));
  if (ENABLE_COMPANY_FEATURE) {
    codes.push(...Object.values(COMPANY_ACTION_PERMISSIONS));
  }

  // Storage Module (conditional)
  if (ENABLE_STORAGE) {
    codes.push(...Object.values(FILE_PERMISSIONS));
    codes.push(...Object.values(FOLDER_PERMISSIONS));
    codes.push(...Object.values(STORAGE_CONFIG_PERMISSIONS));
  }

  // Email Module (conditional)
  if (ENABLE_EMAIL) {
    codes.push(...Object.values(EMAIL_CONFIG_PERMISSIONS));
    codes.push(...Object.values(EMAIL_TEMPLATE_PERMISSIONS));
  }

  // Form Builder Module (conditional)
  if (ENABLE_FORM_BUILDER) {
    codes.push(...Object.values(FORM_PERMISSIONS));
    codes.push(...Object.values(FORM_RESULT_PERMISSIONS));
  }

  // Event Manager Module (conditional)
  if (ENABLE_EVENT_MANAGER) {
    codes.push(...Object.values(EVENT_PERMISSIONS));
  }

  // Notification Module (conditional)
  if (ENABLE_NOTIFICATION) {
    codes.push(...Object.values(NOTIFICATION_PERMISSIONS));
  }

  // Localization Module (conditional)
  if (ENABLE_LOCALIZATION) {
    codes.push(...Object.values(LANGUAGE_PERMISSIONS));
    codes.push(...Object.values(TRANSLATION_KEY_PERMISSIONS));
    codes.push(...Object.values(TRANSLATION_PERMISSIONS));
  }

  return codes;
}

async function seedAdmin(): Promise<void> {
  console.log('🌱 Starting admin seed...\n');
  console.log(`📋 Configuration:`);
  console.log(`   - enableCompanyFeature: ${ENABLE_COMPANY_FEATURE}`);
  console.log(`   - permissionMode: ${bootstrapAppConfig.permissionMode}`);
  console.log(`   - enableStorage: ${ENABLE_STORAGE}`);
  console.log(`   - enableFormBuilder: ${ENABLE_FORM_BUILDER}`);
  console.log(`   - enableEmail: ${ENABLE_EMAIL}`);
  console.log(`   - enableEventManager: ${ENABLE_EVENT_MANAGER}`);
  console.log(`   - enableLocalization: ${ENABLE_LOCALIZATION}`);
  console.log(`   - enableNotification: ${ENABLE_NOTIFICATION}`);
  console.log('');

  // Create DataSource (minimal - no entities needed for raw queries)
  const dataSource = new DataSource({
    type: migrationConfig.defaultDatabaseConfig.type as any,
    host: migrationConfig.defaultDatabaseConfig.host,
    port: migrationConfig.defaultDatabaseConfig.port,
    username: migrationConfig.defaultDatabaseConfig.username,
    password: migrationConfig.defaultDatabaseConfig.password,
    database: migrationConfig.defaultDatabaseConfig.database,
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✓ Database connected\n');

  const dbType = dataSource.options.type;
  const queryRunner = dataSource.createQueryRunner();

  // Both entities use the same table name - the difference is columns
  const permissionTable = 'user_iam_permission';

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let company: CompanyRow | undefined;
    let branch: BranchRow | undefined;

    // 1. Create Company (if company feature enabled)
    if (ENABLE_COMPANY_FEATURE) {
      console.log('📦 Creating company...');
      company = (
        await queryRunner.query(
          buildQuery(
            `SELECT id, name, slug FROM company WHERE slug = ? AND deleted_at IS NULL LIMIT 1`,
            dbType,
          ),
          ['default'],
        )
      )[0];

      if (!company) {
        const companyId = uuidv4();
        await queryRunner.query(
          buildQuery(
            `INSERT INTO company (id, name, slug, is_active, read_only) VALUES (?, ?, ?, ?, ?)`,
            dbType,
          ),
          [companyId, 'Default Company', 'default', true, false],
        );
        company = { id: companyId, name: 'Default Company', slug: 'default' };
        console.log(`   ✓ Company created: ${company.name} (${company.id})`);
      } else {
        console.log(`   - Company exists: ${company.name} (${company.id})`);
      }

      // 2. Create Branch
      console.log('📦 Creating branch...');
      branch = (
        await queryRunner.query(
          buildQuery(
            `SELECT id, name, slug, company_id FROM company_branch WHERE slug = ? AND company_id = ? AND deleted_at IS NULL LIMIT 1`,
            dbType,
          ),
          ['default', company.id],
        )
      )[0];

      if (!branch) {
        const branchId = uuidv4();
        await queryRunner.query(
          buildQuery(
            `INSERT INTO company_branch (id, name, slug, company_id, is_active, read_only) VALUES (?, ?, ?, ?, ?, ?)`,
            dbType,
          ),
          [branchId, 'Default Branch', 'default', company.id, true, false],
        );
        branch = { id: branchId, name: 'Default Branch', slug: 'default', company_id: company.id };
        console.log(`   ✓ Branch created: ${branch.name} (${branch.id})`);
      } else {
        console.log(`   - Branch exists: ${branch.name} (${branch.id})`);
      }
    }

    // 3. Create User
    console.log('\n👤 Creating user...');
    const adminEmail = process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

    let user: UserRow | undefined = (
      await queryRunner.query(
        buildQuery(
          `SELECT id, email, name FROM user WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
          dbType,
        ),
        [adminEmail],
      )
    )[0];

    if (!user) {
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);
      await queryRunner.query(
        buildQuery(
          `INSERT INTO user (id, email, password, name, is_active, email_verified) VALUES (?, ?, ?, ?, ?, ?)`,
          dbType,
        ),
        [userId, adminEmail, hashedPassword, 'Admin User', true, true],
      );
      user = { id: userId, email: adminEmail, name: 'Admin User' };
      console.log(`   ✓ User created: ${user.email} (${user.id})`);
    } else {
      console.log(`   - User exists: ${user.email} (${user.id})`);
    }

    // 4. Create User-Company/Branch Permissions (if company feature enabled)
    if (ENABLE_COMPANY_FEATURE && company && branch) {
      console.log('\n🔗 Creating company/branch permissions...');

      const companyPermission = (
        await queryRunner.query(
          buildQuery(
            `SELECT id FROM user_company_permissions WHERE user_id = ? AND permission_type = ? AND target_id = ? LIMIT 1`,
            dbType,
          ),
          [user.id, 'company', company.id],
        )
      )[0];

      if (!companyPermission) {
        await queryRunner.query(
          buildQuery(
            `INSERT INTO user_company_permissions (id, user_id, permission_type, target_id, is_active) VALUES (?, ?, ?, ?, ?)`,
            dbType,
          ),
          [uuidv4(), user.id, 'company', company.id, true],
        );
        console.log(`   ✓ Company permission created`);
      } else {
        console.log(`   - Company permission exists`);
      }

      const branchPermission = (
        await queryRunner.query(
          buildQuery(
            `SELECT id FROM user_company_permissions WHERE user_id = ? AND permission_type = ? AND target_id = ? LIMIT 1`,
            dbType,
          ),
          [user.id, 'branch', branch.id],
        )
      )[0];

      if (!branchPermission) {
        await queryRunner.query(
          buildQuery(
            `INSERT INTO user_company_permissions (id, user_id, permission_type, target_id, is_active) VALUES (?, ?, ?, ?, ?)`,
            dbType,
          ),
          [uuidv4(), user.id, 'branch', branch.id, true],
        );
        console.log(`   ✓ Branch permission created`);
      } else {
        console.log(`   - Branch permission exists`);
      }
    }

    // 5. Seed All Actions
    console.log('\n🎯 Seeding actions...');
    const actionTree = buildActionTree();
    const allActions = await insertActionsRecursively(
      queryRunner,
      actionTree,
      null,
      { value: 1 },
      dbType,
    );

    const permissionCodes = getAllPermissionCodes();
    console.log(`\n   📊 Total permission codes: ${permissionCodes.length}`);

    // 6. Create Direct User-Action Permissions
    console.log('\n🔐 Creating direct user-action permissions (hidden mode)...');

    const actionsWithCodes = allActions.filter((a) => permissionCodes.includes(a.code));
    let createdCount = 0;
    let existsCount = 0;

    for (const action of actionsWithCodes) {
      const existingPermission = ENABLE_COMPANY_FEATURE
        ? (
            await queryRunner.query(
              buildQuery(
                `SELECT id FROM ${permissionTable} WHERE permission_type = ? AND source_id = ? AND target_id = ? AND company_id = ? LIMIT 1`,
                dbType,
              ),
              [IamPermissionType.USER_ACTION, user.id, action.id, company?.id],
            )
          )[0]
        : (
            await queryRunner.query(
              buildQuery(
                `SELECT id FROM ${permissionTable} WHERE permission_type = ? AND source_id = ? AND target_id = ? LIMIT 1`,
                dbType,
              ),
              [IamPermissionType.USER_ACTION, user.id, action.id],
            )
          )[0];

      if (!existingPermission) {
        const permissionId = uuidv4();

        if (ENABLE_COMPANY_FEATURE && company) {
          await queryRunner.query(
            buildQuery(
              `INSERT INTO ${permissionTable} (id, permission_type, source_type, source_id, target_type, target_id, user_id, company_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              dbType,
            ),
            [
              permissionId,
              IamPermissionType.USER_ACTION,
              IamEntityType.USER,
              user.id,
              IamEntityType.ACTION,
              action.id,
              user.id,
              company.id,
            ],
          );
        } else {
          await queryRunner.query(
            buildQuery(
              `INSERT INTO ${permissionTable} (id, permission_type, source_type, source_id, target_type, target_id, user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              dbType,
            ),
            [
              permissionId,
              IamPermissionType.USER_ACTION,
              IamEntityType.USER,
              user.id,
              IamEntityType.ACTION,
              action.id,
              user.id,
            ],
          );
        }
        createdCount++;
      } else {
        existsCount++;
      }
    }

    console.log(`   ✓ Created ${createdCount} new user-action permissions`);
    if (existsCount > 0) {
      console.log(`   - ${existsCount} permissions already existed`);
    }

    // 7. Create Company-Action Permissions (if company feature enabled)
    if (ENABLE_COMPANY_FEATURE && company) {
      console.log('\n🏢 Creating company-action permissions...');
      let companyActionCreated = 0;
      let companyActionExists = 0;

      for (const action of allActions) {
        const existingCompanyAction = (
          await queryRunner.query(
            buildQuery(
              `SELECT id FROM ${permissionTable} WHERE permission_type = ? AND source_id = ? AND target_id = ? AND company_id = ? LIMIT 1`,
              dbType,
            ),
            [IamPermissionType.COMPANY_ACTION, company.id, action.id, company.id],
          )
        )[0];

        if (!existingCompanyAction) {
          await queryRunner.query(
            buildQuery(
              `INSERT INTO ${permissionTable} (id, permission_type, source_type, source_id, target_type, target_id, user_id, company_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              dbType,
            ),
            [
              uuidv4(),
              IamPermissionType.COMPANY_ACTION,
              IamEntityType.COMPANY,
              company.id,
              IamEntityType.ACTION,
              action.id,
              user.id,
              company.id,
            ],
          );
          companyActionCreated++;
        } else {
          companyActionExists++;
        }
      }

      console.log(`   ✓ Created ${companyActionCreated} new company-action permissions`);
      if (companyActionExists > 0) {
        console.log(`   - ${companyActionExists} permissions already existed`);
      }
    }

    // 8. Seed Default Email Config (SMTP)
    if (ENABLE_EMAIL) {
      console.log('\n📧 Creating default email config...');
      const existingEmailConfig = (
        await queryRunner.query(
          buildQuery(
            `SELECT id FROM email_config WHERE name = ? AND deleted_at IS NULL LIMIT 1`,
            dbType,
          ),
          ['Default SMTP'],
        )
      )[0];

      if (!existingEmailConfig) {
        const smtpConfig = {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'sfd.mhrana@gmail.com',
            pass: 'zkylcywhovrukyap',
          },
        };

        if (ENABLE_COMPANY_FEATURE && company) {
          await queryRunner.query(
            buildQuery(
              `INSERT INTO email_config (id, name, provider, config, from_email, from_name, is_active, is_default, company_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              dbType,
            ),
            [
              uuidv4(),
              'Default SMTP',
              'smtp',
              JSON.stringify(smtpConfig),
              'sfd.mhrana@gmail.com',
              'FLUSYS System',
              true,
              true,
              company.id,
            ],
          );
        } else {
          await queryRunner.query(
            buildQuery(
              `INSERT INTO email_config (id, name, provider, config, from_email, from_name, is_active, is_default)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              dbType,
            ),
            [
              uuidv4(),
              'Default SMTP',
              'smtp',
              JSON.stringify(smtpConfig),
              'sfd.mhrana@gmail.com',
              'FLUSYS System',
              true,
              true,
            ],
          );
        }
        console.log('   ✓ Default SMTP email config created');
      } else {
        console.log('   - Default email config already exists');
      }
    }

    // 9. Seed Default Storage Config (Local)
    if (ENABLE_STORAGE) {
      console.log('\n📁 Creating default storage config...');
      const existingStorageConfig = (
        await queryRunner.query(
          buildQuery(
            `SELECT id FROM storage_config WHERE name = ? AND deleted_at IS NULL LIMIT 1`,
            dbType,
          ),
          ['Default Local'],
        )
      )[0];

      if (!existingStorageConfig) {
        const localConfig = { basePath: './uploads' };

        if (ENABLE_COMPANY_FEATURE && company) {
          await queryRunner.query(
            buildQuery(
              `INSERT INTO storage_config (id, name, storage, config, is_active, is_default, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              dbType,
            ),
            [
              uuidv4(),
              'Default Local',
              'local',
              JSON.stringify(localConfig),
              true,
              true,
              company.id,
            ],
          );
        } else {
          await queryRunner.query(
            buildQuery(
              `INSERT INTO storage_config (id, name, storage, config, is_active, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
              dbType,
            ),
            [uuidv4(), 'Default Local', 'local', JSON.stringify(localConfig), true, true],
          );
        }
        console.log('   ✓ Default local storage config created');
      } else {
        console.log('   - Default storage config already exists');
      }
    }

    await queryRunner.commitTransaction();

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Admin seed completed successfully!');
    console.log('═'.repeat(60));
    console.log('\n📋 Summary:');
    console.log('─'.repeat(40));
    console.log(`   User:        ${user.email}`);
    console.log(`   Password:    ${adminPassword}`);
    if (ENABLE_COMPANY_FEATURE && company && branch) {
      console.log(`   Company:     ${company.name}`);
      console.log(`   Branch:      ${branch.name}`);
    }
    console.log(`   Actions:     ${allActions.length} total`);
    console.log(`   Permissions: ${actionsWithCodes.length} direct user-action permissions`);
    if (ENABLE_COMPANY_FEATURE) {
      console.log(`   Company Actions: ${allActions.length} company-action permissions`);
    }
    if (ENABLE_EMAIL) {
      console.log(`   Email Config: SMTP (sfd.mhrana@gmail.com)`);
    }
    if (ENABLE_STORAGE) {
      console.log(`   Storage Config: Local (./uploads)`);
    }
    console.log('─'.repeat(40));
    console.log('\n💡 Note: Direct user-action permissions work regardless of permission mode.');
    console.log('   This user has full access in RBAC, DIRECT, or FULL modes.');
    console.log('\n💡 Tip: Set ADMIN_EMAIL env var to use a custom admin email.\n');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// Run if called directly
seedAdmin().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
