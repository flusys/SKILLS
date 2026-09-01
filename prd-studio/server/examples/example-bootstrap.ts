import type { BootstrapPrd } from "../schema/bootstrap.js";

export const exampleBootstrap: BootstrapPrd = {
  appIdentity: {
    appName: "Invoicely",
    purpose: "Lets small agencies create, send, and track client invoices.",
    backendPort: 3002,
    frontendPort: 3001,
    productionApiUrl: "TODO",
  },
  configValues: {
    appName: "Invoicely",
    dbType: "postgres",
    databaseMode: "single",
    enableCompanyFeature: true,
    permissionMode: "RBAC",
    enableEmailVerification: true,
    adminEmail: "admin@invoicely.com",
    adminPassword: "TODO: set before first run",
  },
  tenantMapping: [],
  packageSelection: [
    { package: "email", selected: true, reason: "invoice-sent and payment-reminder emails" },
    { package: "storage", selected: true, reason: "PDF invoice attachments" },
    { package: "notification", selected: false, reason: "not requested" },
    { package: "iam", selected: false, reason: "not requested" },
    { package: "event-manager", selected: false, reason: "not requested" },
    { package: "form-builder", selected: false, reason: "not requested" },
    { package: "task-manager", selected: false, reason: "not requested" },
    { package: "localization", selected: false, reason: "not requested" },
    { package: "ai-assistant", selected: false, reason: "not requested" },
  ],
  seedData: {
    defaultAdminFromConfig: true,
    roles: ["Admin", "Accountant"],
  },
  navigationMenu: [
    { label: "Dashboard", icon: "layout-dashboard", route: "/", alwaysPresent: true },
    { label: "Invoices", icon: "file-text", route: "/invoices", alwaysPresent: false, moduleSlug: "invoicing" },
    { label: "Administration", icon: "settings", route: "/administration", alwaysPresent: true, notes: "parent group" },
  ],
  featureModules: [{ order: 1, file: "docs/prd-feature-01-invoicing.md", name: "Invoicing", dependsOn: [] }],
};
