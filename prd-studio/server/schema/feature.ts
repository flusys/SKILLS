import { z } from "zod";
import {
  apiStrategySchema,
  crudOperationSchema,
  fieldTypeSchema,
  onDeleteSchema,
  relationTypeSchema,
  volumeSchema,
} from "./common.js";

/**
 * Structured mirror of docs/prd-feature-<nn>-<name>.md, matching Step 4 of
 * .claude/skills/prd-generator/SKILL.md exactly, section by section.
 *
 * The design goal: every place the current markdown-first flow lets a detail go
 * missing silently (a relation with no inverse, a field never classified as
 * exposed/hidden, a status enum with no state machine) is a *required* key here
 * instead of an optional sentence buried in a paragraph. A Studio UI built on
 * this schema can literally refuse to let those fields stay empty.
 */

export const fieldSchema = z.object({
  name: z.string().min(1),
  type: fieldTypeSchema,
  nullable: z.boolean(),
  notes: z.string().optional(),
});

export const enumSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string().min(1)).min(1),
  default: z.string().min(1),
});

export const relationSchema = z.object({
  type: relationTypeSchema,
  to: z.string().min(1, "required — the other entity's name"),
  onDelete: onDeleteSchema,
});

/**
 * Only present when the entity's access pattern isn't the default
 * "companyId from @CurrentUser()" case — see "Spot cross-tenant management"
 * in the prd-generator SKILL. Forces the author to pick one instead of leaving
 * the default assumed and wrong.
 */
export const companyScopingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("self-service") }),
  z.object({
    kind: z.literal("cross-tenant"),
    managingActor: z.string().min(1, "required — e.g. Super Admin"),
    gatingPermission: z.string().min(1),
  }),
]);

export const entitySchema = z.object({
  name: z.string().min(1),
  fields: z.array(fieldSchema).min(1),
  companyScoping: companyScopingSchema.default({ kind: "none" }),
  enums: z.array(enumSchema).default([]),
  relations: z.array(relationSchema).default([]),
  indexes: z.array(z.string()).default([]),
});

export const apiStrategyBlockSchema = z
  .object({
    strategy: apiStrategySchema,
    partialOperations: z.array(crudOperationSchema).optional(),
    domainActions: z
      .array(
        z.object({
          name: z.string().min(1),
          description: z.string().min(1),
        }),
      )
      .optional(),
  })
  .refine(
    (v) => v.strategy !== "Partial CRUD" || (v.partialOperations?.length ?? 0) > 0,
    { message: "Partial CRUD requires at least one operation", path: ["partialOperations"] },
  )
  .refine(
    (v) => v.strategy !== "Domain Action" || (v.domainActions?.length ?? 0) > 0,
    { message: "Domain Action requires at least one action", path: ["domainActions"] },
  );

export const crudEndpointSchema = z.object({
  operation: crudOperationSchema,
  permission: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/, "must be lowercase dot.case, e.g. invoice.create"),
});

export const domainActionEndpointSchema = z.object({
  action: z.string().min(1),
  input: z.string().min(1),
  returns: z.enum(["single record", "list", "message only"]),
  permission: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/, "must be lowercase dot.case, e.g. invoice.approve"),
});

/**
 * A feature's real endpoint set is additive, not either/or: a Full or Partial CRUD entity
 * routinely gets extra domain-specific actions bolted onto the same controller (approve, send,
 * void) alongside the base CRUD operations — see the `// Custom endpoints go here` slot on the
 * generated controller in api-design/references/crud-generation.md. Only a pure Domain Action
 * feature (no entity lifecycle at all) has an empty `crud` array.
 */
export const featureEndpointsSchema = z.object({
  crud: z.array(crudEndpointSchema).default([]),
  domainActions: z.array(domainActionEndpointSchema).default([]),
});

/**
 * Required whenever an entity's status field drives an approval/review/routing
 * flow, not a flat enum — see the SKILL's "State Machine" section, which calls a
 * thin version here "the single most expensive kind of gap to leave."
 */
export const stateMachineSchema = z.object({
  entity: z.string().min(1),
  states: z.array(z.string().min(1)).min(2),
  transitions: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        action: z.string().min(1),
        by: z.string().min(1, "required — who performs this transition"),
      }),
    )
    .min(1),
  onReject: z.string().min(1, "required — return-to-submitter vs. terminate; resubmit semantics"),
  parallelVsSequential: z.string().min(1, "required"),
  workedExample: z
    .string()
    .min(1, "required — a concrete scenario with real step numbers, not an abstract description"),
});

export const validationRuleSchema = z.object({
  field: z.string().min(1),
  rule: z.string().min(1),
});

export const responseFieldsSchema = z.object({
  exposed: z.array(z.string()).min(1),
  neverExposed: z.array(z.string()).default([]),
});

export const listPageSchema = z.object({
  route: z.string().min(1),
  columns: z.array(z.object({ field: z.string().min(1), sortable: z.boolean() })).min(1),
  filters: z
    .array(z.object({ field: z.string().min(1), inputType: z.enum(["text", "dropdown", "date-range"]) }))
    .default([]),
  rowActions: z.array(z.string()).default(["Edit", "Delete"]),
  search: z.object({ enabled: z.boolean(), fields: z.array(z.string()).default([]) }),
  pageSize: z.number().int().default(20),
});

export const formFieldSchema = z.object({
  field: z.string().min(1),
  input: z.enum(["text", "textarea", "number", "dropdown", "date", "file", "toggle"]),
  notes: z.string().optional(),
  optionsFrom: z.string().optional().describe("for a dropdown backed by another entity"),
});

export const uiSchema = z.object({
  listPage: listPageSchema,
  createEditForm: z.array(formFieldSchema).min(1),
  behaviour: z.array(z.string()).default([]),
});

export const localizationSchema = z.object({
  translatedContentRequired: z.boolean(),
  keyPrefix: z.string().optional(),
});

export const fileAttachmentSchema = z.object({
  field: z.string().min(1),
  allowedTypes: z.array(z.string()).min(1),
  maxSizeMb: z.number().positive(),
});

export const nonFunctionalSchema = z.object({
  expectedVolume: volumeSchema,
  listReadHeavy: z.boolean(),
  cacheTtlSeconds: z.number().int().positive().optional(),
  expensiveJoinsOrN1Risks: z.string().default("none"),
  softDelete: z.boolean(),
  auditLogOn: z.array(z.string()).default([]),
  notificationsTriggered: z.array(z.object({ when: z.string(), to: z.string() })).default([]),
  fileAttachments: z.array(fileAttachmentSchema).default([]),
});

export const dependenciesSchema = z.object({
  dependsOn: z.array(z.string()).default([]),
  requiredBefore: z.array(z.string()).default([]),
});

export const featurePrdSchema = z
  .object({
    order: z.number().int().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    purpose: z.string().min(1),
    apiStrategy: apiStrategyBlockSchema,
    entities: z.array(entitySchema).min(1),
    endpoints: featureEndpointsSchema,
    stateMachine: stateMachineSchema.optional(),
    validation: z.array(validationRuleSchema).default([]),
    responseFields: responseFieldsSchema,
    ui: uiSchema,
    localization: localizationSchema,
    nonFunctional: nonFunctionalSchema,
    dependencies: dependenciesSchema,
  })
  .refine(
    (v) => v.apiStrategy.strategy === "Domain Action" || v.endpoints.crud.length > 0,
    { message: "Full or Partial CRUD requires at least one CRUD endpoint", path: ["endpoints", "crud"] },
  )
  .refine(
    (v) => v.apiStrategy.strategy !== "Domain Action" || v.endpoints.crud.length === 0,
    { message: "A pure Domain Action feature has no entity lifecycle — remove its CRUD endpoints", path: ["endpoints", "crud"] },
  )
  .refine(
    (v) => v.apiStrategy.strategy !== "Domain Action" || v.endpoints.domainActions.length > 0,
    { message: "Domain Action requires at least one action endpoint", path: ["endpoints", "domainActions"] },
  );

export type Field = z.infer<typeof fieldSchema>;
export type Enum = z.infer<typeof enumSchema>;
export type Relation = z.infer<typeof relationSchema>;
export type CompanyScoping = z.infer<typeof companyScopingSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type ApiStrategyBlock = z.infer<typeof apiStrategyBlockSchema>;
export type CrudEndpoint = z.infer<typeof crudEndpointSchema>;
export type DomainActionEndpoint = z.infer<typeof domainActionEndpointSchema>;
export type FeatureEndpoints = z.infer<typeof featureEndpointsSchema>;
export type StateMachine = z.infer<typeof stateMachineSchema>;
export type ValidationRule = z.infer<typeof validationRuleSchema>;
export type ResponseFields = z.infer<typeof responseFieldsSchema>;
export type ListPage = z.infer<typeof listPageSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type Ui = z.infer<typeof uiSchema>;
export type Localization = z.infer<typeof localizationSchema>;
export type FileAttachment = z.infer<typeof fileAttachmentSchema>;
export type NonFunctional = z.infer<typeof nonFunctionalSchema>;
export type Dependencies = z.infer<typeof dependenciesSchema>;
export type FeaturePrd = z.infer<typeof featurePrdSchema>;
