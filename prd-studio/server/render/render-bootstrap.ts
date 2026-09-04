import type { BootstrapPrd } from "../schema/bootstrap.js";
import { bool, table } from "./table.js";

/**
 * Deterministic JSON -> markdown renderer for docs/prd-bootstrap.md.
 * Output shape matches Step 3 of .claude/skills/prd-generator/SKILL.md exactly —
 * no LLM in this path, so nothing gets paraphrased, dropped, or re-inferred on export.
 */
export function renderBootstrapPrd(prd: BootstrapPrd): string {
  const { appIdentity, configValues, tenantMapping, packageSelection, seedData, navigationMenu, featureModules } =
    prd;

  const sections: string[] = [];

  sections.push(`# Bootstrap PRD — ${appIdentity.appName}`);

  sections.push(
    [
      "## App Identity",
      "",
      `- **App name:** ${appIdentity.appName}`,
      `- **Purpose:** ${appIdentity.purpose}`,
      `- **Backend port:** ${appIdentity.backendPort}`,
      `- **Frontend port:** ${appIdentity.frontendPort}`,
      `- **Production API URL:** ${appIdentity.productionApiUrl}`,
    ].join("\n"),
  );

  const configRows: [string, string][] = [
    ["appName", configValues.appName],
    ["dbType", configValues.dbType],
    ["databaseMode", configValues.databaseMode],
    ["enableCompanyFeature", bool(configValues.enableCompanyFeature)],
    ["permissionMode", configValues.permissionMode],
    ["enableEmailVerification", bool(configValues.enableEmailVerification)],
    ["ENABLE_DOMAIN_EVENTS", bool(configValues.enableDomainEvents)],
    ["USE_EVENT_LABEL", configValues.eventTransport],
    ["ADMIN_EMAIL", configValues.adminEmail],
    ["ADMIN_PASSWORD", configValues.adminPassword],
  ];
  sections.push(
    [
      "## Config Values",
      "",
      table(
        ["Key", "Value", "Derived from"],
        configRows.map(([k, v]) => [k, v, "PRD Studio"]),
      ),
    ].join("\n"),
  );

  if (tenantMapping.length > 0) {
    sections.push(
      [
        "## Tenant Mapping",
        "",
        "The requirements name their own tenant/sub-unit — map every occurrence to FLUSYS's built-in",
        "company/branch scoping instead of a custom entity or FK field.",
        "",
        table(
          ["Domain term", "Maps to", "Notes"],
          tenantMapping.map((t) => [t.domainTerm, `\`${t.mapsTo}\``, t.notes ?? ""]),
        ),
      ].join("\n"),
    );
  }

  sections.push(
    [
      "## Package Selection",
      "",
      table(
        ["Package pair", "Selected", "Reason"],
        packageSelection.map((p) => [
          `nestjs-${p.package} / ng-${p.package}`,
          p.selected ? "yes" : "no",
          p.reason,
        ]),
      ),
      "",
      "**Always included:** nestjs-core, nestjs-shared, nestjs-auth / ng-core, ng-shared, ng-layout,",
      "ng-auth, ng-ui",
    ].join("\n"),
  );

  const seedLines = ["## Seed Data", "", "- Default admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`"];
  if (seedData.roles?.length) {
    seedLines.push(`- Roles to seed: ${seedData.roles.join(", ")}`);
  }
  if (seedData.defaultLanguage) {
    const extra = seedData.additionalLanguages?.length
      ? `; additional languages: ${seedData.additionalLanguages.join(", ")}`
      : "";
    seedLines.push(`- Default language: ${seedData.defaultLanguage}${extra}`);
  }
  sections.push(seedLines.join("\n"));

  sections.push(
    [
      "## Navigation Menu",
      "",
      "In display order. Icons are [Lucide](https://lucide.dev) names.",
      "",
      table(
        ["Label", "Icon", "Route", "Notes"],
        navigationMenu.map((n) => [
          n.label,
          n.icon,
          `\`${n.route}\``,
          n.alwaysPresent ? ["always present", n.notes].filter(Boolean).join(", ") : (n.notes ?? ""),
        ]),
      ),
    ].join("\n"),
  );

  const orderedModules = [...featureModules].sort((a, b) => a.order - b.order);
  sections.push(
    [
      "## Feature Modules (development order)",
      "",
      "Dependencies first — `/develop-feature` runs these in order.",
      "",
      ...orderedModules.map(
        (m) => `${m.order}. \`${m.file}\` — ${m.dependsOn.length ? `depends on ${m.dependsOn.join(", ")}` : "no dependencies"}`,
      ),
    ].join("\n"),
  );

  return sections.join("\n\n") + "\n";
}
