import { IMenuItem } from "@flusys/ng-layout";

export const APP_MENU: IMenuItem[] = [
  {
    id: "dashboard",
    labelKey: "menu.dashboard",
    icon: "layout-grid",
    routerLink: ["/"],
  },
  {
    id: "administration",
    labelKey: "menu.administration",
    icon: "settings",
    routerLink: ["/administration"],
  },
  {
    id: "iam",
    labelKey: "menu.iam",
    icon: "shield",
    routerLink: ["/iam"],
  },
  {
    id: "storage",
    labelKey: "menu.storage",
    icon: "folder",
    routerLink: ["/storage"],
  },
  {
    id: "forms",
    labelKey: "menu.forms",
    icon: "list-checks",
    routerLink: ["/forms/manage"],
  },
  {
    id: "email",
    labelKey: "menu.email",
    icon: "mail",
    routerLink: ["/email"],
  },
  {
    id: "event-manager",
    labelKey: "menu.event.manager",
    icon: "calendar",
    routerLink: ["/event-manager"],
  },
  {
    id: "task-manager",
    labelKey: "menu.task.manager",
    icon: "check-square",
    routerLink: ["/task-manager"],
  },
  {
    id: "notifications",
    labelKey: "menu.notifications",
    icon: "bell",
    routerLink: ["/notifications"],
  },
  {
    id: "localization",
    labelKey: "menu.localization",
    icon: "globe",
    routerLink: ["/localization"],
  },
  {
    id: "ai-assistant",
    labelKey: "menu.ai.assistant",
    icon: "sparkles",
    routerLink: ["/ai-assistant"],
  },
];
