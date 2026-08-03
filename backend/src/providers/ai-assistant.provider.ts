import { UserService } from '@flusys/nestjs-auth';
import { PermissionCacheService, PermissionService, RoleService } from '@flusys/nestjs-iam';
import {
  AI_ASSISTANT_AUTH_PROVIDER,
  AI_ASSISTANT_TOOL_PROVIDER,
  AI_ASSISTANT_USER_LOOKUP_PROVIDER,
  IAiAssistantToolDefinition,
  ROLE_PERMISSIONS,
} from '@flusys/nestjs-shared';
import { ILoggedUserInfo } from '@flusys/nestjs-shared/interfaces';
import { Provider } from '@nestjs/common';

export function getAiAssistantAuthProvider(enableCompanyFeature: boolean): Provider {
  return {
    provide: AI_ASSISTANT_AUTH_PROVIDER,
    useFactory: (
      permissionService: PermissionService,
      permissionCacheService: PermissionCacheService,
    ) => ({
      resolveAuthContext: async (
        identity: { userId: string; companyId?: string; branchId?: string } | null,
      ) => {
        if (!identity) {
          return { userId: 'guest', role: 'guest', permissions: [] };
        }

        await permissionService.getMyPermissions(
          identity.userId,
          identity.branchId ?? null,
          identity.companyId ?? null,
        );
        const cached = await permissionCacheService.getMyPermissions({
          userId: identity.userId,
          companyId: identity.companyId,
          branchId: identity.branchId,
        });

        return {
          userId: identity.userId,
          role: 'user',
          permissions: cached?.backendCodes ?? [],
          companyId: identity.companyId,
          branchId: identity.branchId,
        };
      },
    }),
    inject: [PermissionService, PermissionCacheService],
  };
}

export function getAiAssistantUserLookupProvider(): Provider {
  return {
    provide: AI_ASSISTANT_USER_LOOKUP_PROVIDER,
    useFactory: (userService: UserService) => ({
      getUsersByIds: async (ids: string[], user: ILoggedUserInfo) => {
        if (ids.length === 0) return [];
        try {
          const users = await userService.findByIds(ids, user, ['id', 'name', 'email']);
          return users.map((u) => ({ id: u.id, name: u.name ?? u.email, email: u.email }));
        } catch {
          return [];
        }
      },
    }),
    inject: [UserService],
  };
}

function buildListRolesTool(
  roleService: RoleService,
): IAiAssistantToolDefinition<{ search?: string }, { name: string }[]> {
  return {
    name: 'list-roles',
    description: 'List role names configured in the current company.',
    inputSchema: {
      type: 'object',
      properties: { search: { type: 'string', description: 'Optional name filter' } },
    },
    isVisible: (ctx) => ctx.permissions.includes(ROLE_PERMISSIONS.READ),
    handler: async (args, ctx) => {
      const scopedUser = { companyId: ctx.companyId } as ILoggedUserInfo;
      const { data } = await roleService.getAll(args.search ?? '', {}, scopedUser);
      return data.map((role) => ({ name: role.name }));
    },
  };
}

export function getAiAssistantToolProvider(): Provider {
  return {
    provide: AI_ASSISTANT_TOOL_PROVIDER,
    useFactory: (roleService: RoleService) => [buildListRolesTool(roleService)],
    inject: [RoleService],
  };
}
