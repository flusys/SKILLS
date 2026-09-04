import type { BootstrapPrd } from "../schema/bootstrap.js";
import { bulletList, boolFrom, section, stripBackticks, table } from "./md-util.js";

/**
 * Reverse-parses a docs/prd-bootstrap.md written to the Step 3 template shape back into
 * the structured model, so an already-exported PRD can be re-opened and edited on the canvas
 * instead of being a write-only export target.
 */
export function parseBootstrapPrd(md: string): BootstrapPrd {
  const titleMatch = /^#\s+Bootstrap PRD\s+—\s+(.+)$/m.exec(md);
  const appName = titleMatch?.[1]?.trim() ?? "";

  const identity = section(md, "App Identity") ?? "";
  const idLines = bulletList(identity);
  const idField = (label: string) => idLines.find((l) => l.startsWith(`**${label}:**`))?.split(`**${label}:**`)[1]?.trim() ?? "";

  const configRows = table(section(md, "Config Values") ?? "");
  const cfg = Object.fromEntries(configRows.map((r) => [r[0], r[1]]));

  const tenantSection = section(md, "Tenant Mapping");
  const tenantMapping = tenantSection
    ? table(tenantSection).map((r) => ({
        domainTerm: r[0],
        mapsTo: stripBackticks(r[1]) as "companyId" | "branchId",
        notes: r[2] || undefined,
      }))
    : [];

  const packageRows = table(section(md, "Package Selection") ?? "");
  const packageSelection = packageRows.map((r) => ({
    package: (r[0].match(/^nestjs-([a-z0-9-]+) \//)?.[1] ?? r[0]) as BootstrapPrd["packageSelection"][number]["package"],
    selected: boolFrom(r[1]),
    reason: r[2] ?? "",
  }));

  const seed = section(md, "Seed Data") ?? "";
  const seedLines = bulletList(seed);
  const rolesLine = seedLines.find((l) => l.startsWith("Roles to seed:"));
  const langLine = seedLines.find((l) => l.startsWith("Default language:"));
  const seedData: BootstrapPrd["seedData"] = {
    defaultAdminFromConfig: true,
    roles: rolesLine ? rolesLine.replace("Roles to seed:", "").split(",").map((s) => s.trim()) : undefined,
    defaultLanguage: langLine ? langLine.replace("Default language:", "").split(";")[0].trim() : undefined,
    additionalLanguages: langLine?.includes("additional languages:")
      ? langLine.split("additional languages:")[1].split(",").map((s) => s.trim())
      : undefined,
  };

  const navRows = table(section(md, "Navigation Menu") ?? "");
  const navigationMenu = navRows.map((r) => ({
    label: r[0],
    icon: r[1],
    route: stripBackticks(r[2]),
    alwaysPresent: r[3]?.includes("always present") ?? false,
    notes: r[3]?.replace("always present", "").replace(/^,\s*/, "").trim() || undefined,
  }));

  const modulesSection = section(md, "Feature Modules (development order)") ?? "";
  const featureModules = modulesSection
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+`/.test(l))
    .map((l) => {
      const m = /^(\d+)\.\s+`([^`]+)`\s+—\s+(.+)$/.exec(l);
      const order = Number(m?.[1] ?? 0);
      const file = m?.[2] ?? "";
      const depText = m?.[3] ?? "";
      const dependsOn = depText === "no dependencies" ? [] : depText.replace("depends on ", "").split(",").map((s) => s.trim());
      const name = file.match(/prd-feature-\d{2}-([a-z0-9-]+)\.md$/)?.[1] ?? file;
      return { order, file, name, dependsOn };
    });

  return {
    appIdentity: {
      appName: idField("App name") || appName,
      purpose: idField("Purpose"),
      backendPort: Number(idField("Backend port")) || 3002,
      frontendPort: Number(idField("Frontend port")) || 3001,
      productionApiUrl: idField("Production API URL"),
    },
    configValues: {
      appName: cfg.appName ?? appName,
      dbType: (cfg.dbType as "postgres" | "mysql") ?? "postgres",
      databaseMode: (cfg.databaseMode as "single" | "multi-tenant") ?? "single",
      enableCompanyFeature: boolFrom(cfg.enableCompanyFeature ?? "no"),
      permissionMode: (cfg.permissionMode as "FULL" | "RBAC" | "DIRECT") ?? "FULL",
      enableEmailVerification: boolFrom(cfg.enableEmailVerification ?? "no"),
      enableDomainEvents: boolFrom(cfg.ENABLE_DOMAIN_EVENTS ?? "no"),
      eventTransport: (cfg.USE_EVENT_LABEL as
        | "memory"
        | "rabbitmq"
        | "kafka"
        | "hybrid") ?? "memory",
      adminEmail: cfg.ADMIN_EMAIL ?? "",
      adminPassword: cfg.ADMIN_PASSWORD ?? "",
    },
    tenantMapping,
    packageSelection,
    seedData,
    navigationMenu,
    featureModules,
  };
}
