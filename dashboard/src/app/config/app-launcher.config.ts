import { ILauncherApp } from "@flusys/ng-layout";

export const APP_LAUNCHER_APPS: ILauncherApp[] = [
  {
    id: "docs",
    nameKey: "launcher.docs",
    icon: "book",
    url: "https://docs.example.com",
  },
  {
    id: "analytics",
    nameKey: "launcher.analytics",
    icon: "chart-column",
    url: "https://analytics.example.com",
  },
  {
    id: "support",
    nameKey: "launcher.support",
    icon: "help-circle",
    url: "https://support.example.com",
    permissionLogic: {
      type: "action",
      actionId: "analytics.view",
    },
  },
];
