import { ILauncherApp } from '@flusys/ng-layout';

/** Apps shown in header launcher grid (iconType: 1=primeng, 2=material, 3=image) */
export const APP_LAUNCHER_APPS: ILauncherApp[] = [
  {
    id: 'docs',
    nameKey: 'launcher.docs',
    iconType: 1,
    icon: 'pi pi-book',
    url: 'https://docs.example.com',
  },
  {
    id: 'analytics',
    nameKey: 'launcher.analytics',
    iconType: 1,
    icon: 'pi pi-chart-bar',
    url: 'https://analytics.example.com',
  },
  {
    id: 'support',
    nameKey: 'launcher.support',
    iconType: 1,
    icon: 'pi pi-question-circle',
    url: 'https://support.example.com',
    permissionLogic: {
      type: 'action',
      actionId: 'analytics.view',
    },
  },
];
