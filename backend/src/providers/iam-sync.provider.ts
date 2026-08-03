import { IPermissionSyncAdapter, PERMISSION_SYNC_ADAPTER } from '@flusys/nestjs-shared/interfaces';
import { PermissionService } from '@flusys/nestjs-iam/services';
import { Provider } from '@nestjs/common';

export const permissionSyncProvider: Provider = {
  provide: PERMISSION_SYNC_ADAPTER,
  useFactory: (permissionService: PermissionService): IPermissionSyncAdapter => ({
    onCompanyDeleted: (companyId) => permissionService.revokeCompanyPermissions(companyId),
    onBranchDeleted: (branchId, companyId) =>
      permissionService.revokeBranchPermissions(branchId, companyId),
    onUserCompanyAccessRevoked: (userId, companyId) =>
      permissionService.revokeUserCompanyAccess(userId, companyId),
    onUserBranchAccessRevoked: (userId, branchId, companyId) =>
      permissionService.revokeUserBranchAccess(userId, branchId, companyId),
  }),
  inject: [PermissionService],
};
