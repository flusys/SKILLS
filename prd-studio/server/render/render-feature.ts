import type { Entity, FeaturePrd } from "../schema/feature.js";
import { table } from "./table.js";

/**
 * Deterministic JSON -> markdown renderer for docs/prd-feature-<nn>-<name>.md.
 * Output shape matches Step 4 of .claude/skills/prd-generator/SKILL.md exactly.
 */
export function renderFeaturePrd(prd: FeaturePrd): string {
  const sections: string[] = [];

  sections.push(`# Feature PRD — ${prd.name}`);
  sections.push(["## Purpose", "", prd.purpose].join("\n"));
  sections.push(renderApiStrategy(prd));
  sections.push("## Entities");
  sections.push(...prd.entities.map(renderEntity));
  sections.push(renderEndpoints(prd));
  if (prd.stateMachine) sections.push(renderStateMachine(prd));
  sections.push(renderValidation(prd));
  sections.push(renderResponseFields(prd));
  sections.push(renderUi(prd));
  sections.push(renderLocalization(prd));
  sections.push(renderNonFunctional(prd));
  sections.push(renderDependencies(prd));

  return sections.join("\n\n") + "\n";
}

function renderApiStrategy(prd: FeaturePrd): string {
  const lines = ["## API Strategy", "", `- **Strategy:** ${prd.apiStrategy.strategy}`];
  if (prd.apiStrategy.strategy === "Partial CRUD") {
    lines.push(`- Operations needed: ${(prd.apiStrategy.partialOperations ?? []).join(", ")}`);
  }
  // Declared regardless of strategy — a Full/Partial CRUD entity routinely gets extra
  // domain-specific actions bolted onto the same controller alongside base CRUD.
  for (const a of prd.apiStrategy.domainActions ?? []) {
    lines.push(`- Action \`${a.name}\`: ${a.description}`);
  }
  return lines.join("\n");
}

function renderEntity(e: Entity): string {
  const parts = [`### ${e.name}`, ""];
  parts.push(
    table(
      ["Field", "Type", "Nullable", "Notes"],
      e.fields.map((f) => [f.name, f.type, f.nullable ? "yes" : "no", f.notes ?? ""]),
    ),
  );
  parts.push(
    "",
    "`id`, `createdAt`, `updatedAt`, and `deletedAt` come from the `Identity` base class — do not",
    "list them.",
  );

  if (e.companyScoping.kind === "self-service") {
    parts.push(
      "",
      "`companyId` (and `branchId`, if branches apply) is present on this entity. It always comes",
      "from the authenticated user, never a request payload.",
    );
  } else if (e.companyScoping.kind === "cross-tenant") {
    parts.push(
      "",
      `\`companyId\` is an explicit required field on create, chosen by ${e.companyScoping.managingActor}`,
      `from the existing company list — not inferred from the caller. Create/update are`,
      `permission-gated to \`${e.companyScoping.gatingPermission}\`; the tenant's own actor may only read`,
      "this entity.",
    );
  }

  if (e.enums.length > 0) {
    parts.push(
      "",
      "**Enums:**",
      "",
      table(
        ["Enum", "Values", "Default"],
        e.enums.map((en) => [en.name, en.values.join(", "), en.default]),
      ),
    );
  }

  if (e.relations.length > 0) {
    parts.push(
      "",
      "**Relations:**",
      "",
      table(
        ["Type", "To", "On delete"],
        e.relations.map((r) => [r.type, r.to, r.onDelete]),
      ),
    );
  }

  parts.push("", `**Indexes:** ${e.indexes.length ? e.indexes.join(", ") : "none"}`);

  return parts.join("\n");
}

function renderEndpoints(prd: FeaturePrd): string {
  const parts = ["## Endpoints"];
  if (prd.endpoints.crud.length > 0) {
    parts.push(
      "",
      "For Full or Partial CRUD, list only the operations needed — the controller factory provides them:",
      "",
      table(
        ["Operation", "Permission"],
        prd.endpoints.crud.map((e) => [e.operation, `\`${e.permission}\``]),
      ),
    );
  }
  if (prd.endpoints.domainActions.length > 0) {
    parts.push(
      "",
      "For Domain Actions, describe each one:",
      "",
      table(
        ["Action", "Input", "Returns", "Permission"],
        prd.endpoints.domainActions.map((e) => [e.action, e.input, e.returns, `\`${e.permission}\``]),
      ),
    );
  }
  parts.push("", "Permission keys are lowercase dot.case, prefixed with the feature name.");
  return parts.join("\n");
}

function renderStateMachine(prd: FeaturePrd): string {
  const sm = prd.stateMachine!;
  const lines = ["## State Machine", "", `**States:** ${sm.states.join(", ")}`, "", "**Transitions:**", ""];
  lines.push(...sm.transitions.map((t) => `- \`${t.from}\` --${t.action}, by ${t.by}--> \`${t.to}\``));
  lines.push(
    "",
    `**On reject:** ${sm.onReject}`,
    "",
    `**Parallel vs. sequential:** ${sm.parallelVsSequential}`,
    "",
    `**Worked example:** ${sm.workedExample}`,
  );
  return lines.join("\n");
}

function renderValidation(prd: FeaturePrd): string {
  return [
    "## Validation",
    "",
    table(
      ["Field", "Rule"],
      prd.validation.map((v) => [v.field, v.rule]),
    ),
  ].join("\n");
}

function renderResponseFields(prd: FeaturePrd): string {
  return [
    "## Response Fields",
    "",
    `- **Exposed:** ${prd.responseFields.exposed.join(", ")}`,
    `- **Never exposed:** ${prd.responseFields.neverExposed.length ? prd.responseFields.neverExposed.join(", ") : "none"}`,
  ].join("\n");
}

function renderUi(prd: FeaturePrd): string {
  const { listPage, createEditForm, behaviour } = prd.ui;
  const parts = [
    "## UI",
    "",
    `### List page (\`${listPage.route}\`)`,
    "",
    `- Columns: ${listPage.columns.map((c) => `${c.field}${c.sortable ? " (sortable)" : ""}`).join(", ")}`,
    `- Filters: ${listPage.filters.length ? listPage.filters.map((f) => `${f.field} — ${f.inputType}`).join(", ") : "none"}`,
    `- Row actions: ${listPage.rowActions.join(", ")}`,
    `- Search: ${listPage.search.enabled ? `yes — on ${listPage.search.fields.join(", ")}` : "no"}`,
    `- Page size: ${listPage.pageSize}`,
    "",
    "### Create / edit form",
    "",
    table(
      ["Field", "Input", "Notes"],
      createEditForm.map((f) => [
        f.field,
        f.input,
        [f.notes, f.optionsFrom ? `options from ${f.optionsFrom}` : undefined].filter(Boolean).join("; "),
      ]),
    ),
  ];
  if (behaviour.length > 0) {
    parts.push("", "### Behaviour", "", ...behaviour.map((b) => `- ${b}`));
  }
  return parts.join("\n");
}

function renderLocalization(prd: FeaturePrd): string {
  const lines = [
    "## Localization",
    "",
    `- Translated content required: ${prd.localization.translatedContentRequired ? "yes" : "no"}`,
  ];
  if (prd.localization.translatedContentRequired && prd.localization.keyPrefix) {
    lines.push(`- Key prefix: \`${prd.localization.keyPrefix}\``);
  }
  return lines.join("\n");
}

function renderNonFunctional(prd: FeaturePrd): string {
  const nf = prd.nonFunctional;
  const lines = [
    "## Non-Functional",
    "",
    `- Expected volume: ${nf.expectedVolume}`,
    `- List endpoint read-heavy: ${nf.listReadHeavy ? `yes${nf.cacheTtlSeconds ? `, cache TTL ${nf.cacheTtlSeconds}s` : ""}` : "no"}`,
    `- Known expensive joins or N+1 risks: ${nf.expensiveJoinsOrN1Risks}`,
    `- Soft delete: ${nf.softDelete ? "yes" : "no"}`,
    `- Audit log on: ${nf.auditLogOn.length ? nf.auditLogOn.join(", ") : "none"}`,
    `- Notifications triggered: ${nf.notificationsTriggered.length ? nf.notificationsTriggered.map((n) => `${n.when} → ${n.to}`).join("; ") : "none"}`,
    `- File attachments: ${nf.fileAttachments.length ? nf.fileAttachments.map((f) => `${f.field} (${f.allowedTypes.join("/")}, max ${f.maxSizeMb}MB)`).join("; ") : "none"}`,
  ];
  return lines.join("\n");
}

function renderDependencies(prd: FeaturePrd): string {
  return [
    "## Dependencies",
    "",
    `- Depends on: ${prd.dependencies.dependsOn.length ? prd.dependencies.dependsOn.join(", ") : "none"}`,
    `- Required before: ${prd.dependencies.requiredBefore.length ? prd.dependencies.requiredBefore.join(", ") : "none"}`,
  ].join("\n");
}
