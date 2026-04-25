import { Routes } from "@angular/router";
import {
  ADMINISTRATION_ROUTES,
  AUTH_ROUTES,
  PROFILE_ROUTES,
} from "@flusys/ng-auth";
import { EMAIL_ROUTES } from "@flusys/ng-email";
import { EVENT_MANAGER_ROUTES } from "@flusys/ng-event-manager";
import {
  FORM_BUILDER_ADMIN_ROUTES,
  FORM_BUILDER_PUBLIC_ROUTES,
} from "@flusys/ng-form-builder";
import { IAM_ROUTES } from "@flusys/ng-iam";
import { AppLayout, LAYOUT_MESSAGES } from "@flusys/ng-layout";
import { LOCALIZATION_ROUTES } from "@flusys/ng-localization";
import { NOTIFICATION_ROUTES } from "@flusys/ng-notification";
import { SHARED_MESSAGES, resolveTranslationModule } from "@flusys/ng-shared";
import { STORAGE_ROUTES } from "@flusys/ng-storage";
import { appInitGuard } from "./guards/app-init.guard";

export const routes: Routes = [
  // Auth routes (login, register, select-company) - no layout
  {
    path: "auth",
    children: AUTH_ROUTES,
  },

  // Protected routes with layout
  {
    path: "",
    component: AppLayout,
    canActivate: [appInitGuard], // Handles session restore + auth check + IAM loading
    resolve: {
      translations: resolveTranslationModule({
        modules: ["shared", "layout"],
        fallbackMessages: { ...SHARED_MESSAGES, ...LAYOUT_MESSAGES },
      }),
    },
    children: [
      // Dashboard/Home
      {
        path: "",
        loadComponent: () =>
          import("./pages/home/home.component").then((m) => m.HomeComponent),
      },

      // Administration (Users, Companies, Branches)
      {
        path: "administration",
        children: ADMINISTRATION_ROUTES,
      },

      // IAM (Actions, Roles, Permissions)
      {
        path: "iam",
        children: IAM_ROUTES,
      },

      // Storage (File Manager, Folders, Storage Configs)
      {
        path: "storage",
        children: STORAGE_ROUTES,
      },

      // Forms Management (List, Details, Results)
      {
        path: "forms/manage",
        children: FORM_BUILDER_ADMIN_ROUTES,
      },

      // Email Management (Configs, Templates)
      {
        path: "email",
        children: EMAIL_ROUTES,
      },

      // Event Manager (Calendar, Events)
      {
        path: "event-manager",
        children: EVENT_MANAGER_ROUTES,
      },

      // Notifications
      {
        path: "notifications",
        children: NOTIFICATION_ROUTES,
      },

      // Localization (Languages, Translations)
      {
        path: "localization",
        children: LOCALIZATION_ROUTES,
      },

      // Profile
      {
        path: "profile",
        children: PROFILE_ROUTES,
      },
    ],
  },

  // Public Form Submission (no auth required, no layout)
  {
    path: "forms/public",
    children: FORM_BUILDER_PUBLIC_ROUTES,
  },
];
