import { z } from "zod";
import {
  databaseModeSchema,
  dbTypeSchema,
  eventTransportSchema,
  packageKeySchema,
  permissionModeSchema,
  tenantMapsToSchema,
} from "./common.js";

/**
 * Structured mirror of docs/prd-bootstrap.md, section by section, matching
 * Step 3 of .claude/skills/prd-generator/SKILL.md exactly. Nothing here should
 * drift from that template without updating both — see prd-studio/README.md.
 */

export const appIdentitySchema = z.object({
  appName: z.string().min(1),
  purpose: z.string().min(1, "required — one sentence describing the app's purpose"),
  backendPort: z.number().int().default(3002),
  frontendPort: z.number().int().default(3001),
  productionApiUrl: z.string().min(1, "required — a URL, or the literal string 'TODO'"),
});

export const configValuesSchema = z.object({
  appName: z.string().min(1),
  dbType: dbTypeSchema,
  databaseMode: databaseModeSchema,
  enableCompanyFeature: z.boolean(),
  permissionMode: permissionModeSchema,
  enableEmailVerification: z.boolean(),
  enableDomainEvents: z.boolean().default(false),
  eventTransport: eventTransportSchema.default("memory"),
  adminEmail: z.string().min(1),
  adminPassword: z.string().min(1, "required — or the literal string 'TODO: set before first run'"),
});

export const tenantMappingEntrySchema = z.object({
  domainTerm: z.string().min(1, "required — the domain's own term, e.g. School"),
  mapsTo: tenantMapsToSchema,
  notes: z.string().optional(),
});

export const packageSelectionEntrySchema = z.object({
  package: packageKeySchema,
  selected: z.boolean(),
  reason: z.string().min(1, "required — the signal that decided this, e.g. 'file upload mentioned'"),
});

export const seedDataSchema = z.object({
  defaultAdminFromConfig: z.literal(true).default(true),
  roles: z.array(z.string().min(1)).optional(),
  defaultLanguage: z.string().optional(),
  additionalLanguages: z.array(z.string()).optional(),
});

export const navigationMenuEntrySchema = z.object({
  label: z.string().min(1),
  icon: z.string().min(1, "required — a lucide.dev icon name"),
  route: z.string().min(1),
  notes: z.string().optional(),
  alwaysPresent: z.boolean().default(false),
  /**
   * Explicit link to the feature module this nav entry opens, by slug — e.g. "invoicing" for
   * docs/prd-feature-01-invoicing.md. Required unless alwaysPresent, so the completeness linter
   * can check nav-to-module coverage exactly instead of guessing from route/slug word overlap.
   */
  moduleSlug: z.string().optional(),
});

export const featureModuleRefSchema = z.object({
  order: z.number().int().min(1),
  file: z.string().regex(/^docs\/prd-feature-\d{2}-[a-z0-9-]+\.md$/),
  name: z.string().min(1),
  dependsOn: z.array(z.string()).default([]),
});

export const bootstrapPrdSchema = z.object({
  appIdentity: appIdentitySchema,
  configValues: configValuesSchema,
  tenantMapping: z.array(tenantMappingEntrySchema).default([]),
  packageSelection: z.array(packageSelectionEntrySchema),
  seedData: seedDataSchema,
  navigationMenu: z.array(navigationMenuEntrySchema).min(1),
  featureModules: z.array(featureModuleRefSchema),
});

export type AppIdentity = z.infer<typeof appIdentitySchema>;
export type ConfigValues = z.infer<typeof configValuesSchema>;
export type TenantMappingEntry = z.infer<typeof tenantMappingEntrySchema>;
export type PackageSelectionEntry = z.infer<typeof packageSelectionEntrySchema>;
export type SeedData = z.infer<typeof seedDataSchema>;
export type NavigationMenuEntry = z.infer<typeof navigationMenuEntrySchema>;
export type FeatureModuleRef = z.infer<typeof featureModuleRefSchema>;
export type BootstrapPrd = z.infer<typeof bootstrapPrdSchema>;
