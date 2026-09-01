import type { BootstrapPrd } from "../schema/bootstrap.js";
import type { FeaturePrd } from "../schema/feature.js";

export type LintSeverity = "blocking" | "warning";

export interface LintIssue {
  severity: LintSeverity;
  message: string;
  /** "bootstrap" or a feature slug, so the UI can route the user to the right tab */
  scope: string;
}

/**
 * Executable version of Step 5 ("Consistency Check") from
 * .claude/skills/prd-generator/SKILL.md. Runs continuously against the in-progress
 * model instead of once at the end of a generation pass — the whole point of moving
 * these checks here is to catch a gap while it's still cheap to fix.
 */
export function lint(bootstrap: BootstrapPrd, features: FeaturePrd[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const push = (severity: LintSeverity, scope: string, message: string) =>
    issues.push({ severity, scope, message });

  const featureBySlug = new Map(features.map((f) => [f.slug, f]));

  // Every nav entry (that isn't always-present) links to a real feature module.
  const knownSlugs = new Set(features.map((f) => f.slug));
  for (const nav of bootstrap.navigationMenu) {
    if (nav.alwaysPresent) continue;
    if (!nav.moduleSlug) {
      push(
        "warning",
        "bootstrap",
        `Navigation entry "${nav.label}" (${nav.route}) has no linked module — set moduleSlug so this can be checked exactly.`,
      );
    } else if (!knownSlugs.has(nav.moduleSlug)) {
      push(
        "blocking",
        "bootstrap",
        `Navigation entry "${nav.label}" links to module "${nav.moduleSlug}", which doesn't exist.`,
      );
    }
  }
  // Every non-tenant feature module should be reachable from the nav menu.
  const linkedSlugs = new Set(bootstrap.navigationMenu.map((n) => n.moduleSlug).filter(Boolean));
  for (const f of features) {
    if (!linkedSlugs.has(f.slug)) {
      push("warning", f.slug, `"${f.name}" has no navigation menu entry linking to it (via moduleSlug).`);
    }
  }

  // Every feature module listed in the bootstrap PRD has a corresponding feature loaded.
  for (const ref of bootstrap.featureModules) {
    const slug = ref.file.match(/prd-feature-\d{2}-([a-z0-9-]+)\.md$/)?.[1];
    if (!slug || !featureBySlug.has(slug)) {
      push("blocking", "bootstrap", `Feature module reference "${ref.file}" has no matching feature PRD.`);
    }
  }

  // Packages: any feature requiring notification/storage/email support has the package selected.
  const selected = new Set(bootstrap.packageSelection.filter((p) => p.selected).map((p) => p.package));
  for (const f of features) {
    if (f.nonFunctional.fileAttachments.length > 0 && !selected.has("storage")) {
      push("blocking", f.slug, `"${f.name}" has file attachments but "storage" isn't selected in Package Selection.`);
    }
    if (f.nonFunctional.notificationsTriggered.length > 0 && !selected.has("notification")) {
      push("blocking", f.slug, `"${f.name}" triggers notifications but "notification" isn't selected in Package Selection.`);
    }
    if (f.localization.translatedContentRequired && !selected.has("localization")) {
      push("blocking", f.slug, `"${f.name}" requires translated content but "localization" isn't selected in Package Selection.`);
    }
  }

  // enableCompanyFeature must be true if any entity is company-scoped.
  const anyCompanyScoped = features.some((f) => f.entities.some((e) => e.companyScoping.kind !== "none"));
  if (anyCompanyScoped && !bootstrap.configValues.enableCompanyFeature) {
    push(
      "blocking",
      "bootstrap",
      "At least one entity is company-scoped, but enableCompanyFeature is false in Config Values.",
    );
  }

  // No feature entity duplicates a tenant/sub-unit noun already mapped to companyId/branchId.
  const tenantTerms = new Set(bootstrap.tenantMapping.map((t) => t.domainTerm.toLowerCase()));
  for (const f of features) {
    for (const e of f.entities) {
      if (tenantTerms.has(e.name.toLowerCase())) {
        push(
          "blocking",
          f.slug,
          `Entity "${e.name}" duplicates a tenant noun already mapped to ${
            bootstrap.tenantMapping.find((t) => t.domainTerm.toLowerCase() === e.name.toLowerCase())?.mapsTo
          } in the bootstrap PRD's Tenant Mapping — remove it, don't build it as a custom entity.`,
        );
      }
      for (const field of e.fields) {
        for (const t of bootstrap.tenantMapping) {
          const subunitPattern = /(_id|Id)$/;
          if (subunitPattern.test(field.name) && field.name.toLowerCase().includes(t.domainTerm.toLowerCase())) {
            push(
              "warning",
              f.slug,
              `Field "${field.name}" on "${e.name}" looks like the tenant FK already covered by the Tenant Mapping (${t.domainTerm} → ${t.mapsTo}) — should it be removed in favor of the built-in scoping?`,
            );
          }
        }
      }
    }
  }

  // Cross-tenant management entities must state an explicit gating permission.
  for (const f of features) {
    for (const e of f.entities) {
      if (e.companyScoping.kind === "cross-tenant" && !e.companyScoping.gatingPermission) {
        push("blocking", f.slug, `Entity "${e.name}" is cross-tenant-managed but has no gating permission stated.`);
      }
    }
  }

  // Any entity with a workflow-shaped status enum (>2 values) should have a state machine.
  for (const f of features) {
    const hasWorkflowEnum = f.entities.some((e) =>
      e.enums.some((en) => /status|state|stage/i.test(en.name) && en.values.length > 2),
    );
    if (hasWorkflowEnum && !f.stateMachine) {
      push(
        "warning",
        f.slug,
        `"${f.name}" has a status-like enum with more than two values but no ## State Machine section — confirm it's really a flat status, not an approval/routing flow.`,
      );
    }
  }

  // Development order matches each module's own dependsOn declarations, and every referenced
  // slug actually exists (a module rename that didn't cascade would leave a stale reference here).
  const orderBySlug = new Map(
    bootstrap.featureModules.map((m) => [m.file.match(/prd-feature-\d{2}-([a-z0-9-]+)\.md$/)?.[1] ?? "", m.order]),
  );
  const knownFeatureSlugs = new Set(features.map((f) => f.slug));
  for (const f of features) {
    for (const dep of f.dependencies.dependsOn) {
      if (!knownFeatureSlugs.has(dep)) {
        push("blocking", f.slug, `"${f.name}" depends on "${dep}", but no module with that slug exists.`);
        continue;
      }
      const depOrder = orderBySlug.get(dep);
      const myOrder = orderBySlug.get(f.slug);
      if (depOrder !== undefined && myOrder !== undefined && depOrder >= myOrder) {
        push(
          "blocking",
          f.slug,
          `"${f.name}" depends on "${dep}", but development order has "${dep}" at position ${depOrder} and "${f.name}" at position ${myOrder} — dependency must come first.`,
        );
      }
    }
  }

  // Permission keys are unique across modules and correctly cased.
  const seenPermissions = new Map<string, string>();
  for (const f of features) {
    const perms = [...f.endpoints.crud.map((e) => e.permission), ...f.endpoints.domainActions.map((e) => e.permission)];
    for (const p of perms) {
      if (!/^[a-z0-9-]+\.[a-z0-9-]+$/.test(p)) {
        push("blocking", f.slug, `Permission key "${p}" isn't lowercase dot.case.`);
      }
      const existing = seenPermissions.get(p);
      if (existing && existing !== f.slug) {
        push("blocking", f.slug, `Permission key "${p}" is also used in "${existing}" — permission keys must be unique.`);
      }
      seenPermissions.set(p, f.slug);
    }
  }

  // Response fields: every field on every entity should be classified exposed or never-exposed.
  for (const f of features) {
    const classified = new Set([...f.responseFields.exposed, ...f.responseFields.neverExposed]);
    for (const e of f.entities) {
      for (const field of e.fields) {
        if (!classified.has(field.name)) {
          push(
            "warning",
            f.slug,
            `Field "${e.name}.${field.name}" isn't listed in Response Fields as exposed or never-exposed.`,
          );
        }
      }
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: LintIssue[]): boolean {
  return issues.some((i) => i.severity === "blocking");
}
