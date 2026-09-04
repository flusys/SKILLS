import type { BootstrapPrd, NavigationMenuEntry, PackageSelectionEntry } from "../../../server/schema/bootstrap.js";
import { PACKAGE_KEYS } from "../../../server/schema/constants.js";
import type { Entity, FeaturePrd, Field } from "../../../server/schema/feature.js";

/** Shaped-but-empty model factories, so every field the editor touches already exists at the
 * right TS type — server-side zod only complains about *content* (empty strings, empty arrays)
 * at export/lint time, never about a missing key. */

/** Every comma-separated free-text field (roles, indexes, dependsOn, …) across the panels parses
 * the same way: split, trim each entry, drop empties. Shared here so all of them stay in sync. */
export function splitCsv(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function emptyBootstrap(): BootstrapPrd {
  return {
    appIdentity: { appName: "", purpose: "", backendPort: 3002, frontendPort: 3001, productionApiUrl: "TODO" },
    configValues: {
      appName: "",
      dbType: "postgres",
      databaseMode: "single",
      enableCompanyFeature: false,
      permissionMode: "FULL",
      enableEmailVerification: false,
      enableDomainEvents: false,
      eventTransport: "memory",
      adminEmail: "",
      adminPassword: "TODO: set before first run",
    },
    tenantMapping: [],
    packageSelection: PACKAGE_KEYS.map(
      (k): PackageSelectionEntry => ({ package: k, selected: false, reason: "" }),
    ),
    seedData: { defaultAdminFromConfig: true },
    navigationMenu: [{ label: "Dashboard", icon: "layout-dashboard", route: "/", alwaysPresent: true }],
    featureModules: [],
  };
}

export function emptyNavEntry(): NavigationMenuEntry {
  return { label: "", icon: "", route: "", alwaysPresent: false };
}

export function emptyField(): Field {
  return { name: "", type: "string(255)", nullable: false };
}

export function emptyEntity(name = "NewEntity"): Entity {
  return { name, fields: [emptyField()], companyScoping: { kind: "none" }, enums: [], relations: [], indexes: [] };
}

export function emptyFeature(order: number, slug: string, name: string): FeaturePrd {
  return {
    order,
    slug,
    name,
    purpose: "",
    apiStrategy: { strategy: "Full CRUD" },
    entities: [emptyEntity(name.replace(/\s+/g, ""))],
    endpoints: {
      crud: [
        { operation: "insert", permission: `${slug}.create` },
        { operation: "getAll", permission: `${slug}.read` },
        { operation: "getById", permission: `${slug}.read` },
        { operation: "update", permission: `${slug}.update` },
        { operation: "delete", permission: `${slug}.delete` },
      ],
      domainActions: [],
    },
    validation: [],
    responseFields: { exposed: [], neverExposed: [] },
    ui: {
      listPage: { route: `/${slug}`, columns: [], filters: [], rowActions: ["Edit", "Delete"], search: { enabled: false, fields: [] }, pageSize: 20 },
      createEditForm: [],
      behaviour: [],
    },
    localization: { translatedContentRequired: false },
    nonFunctional: {
      expectedVolume: "small",
      listReadHeavy: false,
      expensiveJoinsOrN1Risks: "none",
      softDelete: false,
      auditLogOn: [],
      domainEventsPublished: [],
      domainEventsConsumed: [],
      notificationsTriggered: [],
      fileAttachments: [],
    },
    dependencies: { dependsOn: [], requiredBefore: [] },
  };
}
