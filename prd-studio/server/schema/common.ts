import { z } from "zod";
import { PACKAGE_KEYS } from "./constants.js";

/**
 * Shared vocabulary lifted directly from .claude/skills/prd-generator/SKILL.md.
 * Every enum here mirrors a closed list the template already commits to — keeping
 * them closed (instead of `z.string()`) is what lets the Studio UI render a dropdown
 * instead of a free-text box, which is the whole point of the exercise.
 */

export const FIELD_TYPE_PATTERN =
  /^(string(\(\d+\))?|text|int|decimal\(\d+,\d+\)|boolean|date|timestamp|uuid|enum|json)$/;

export const fieldTypeSchema = z
  .string()
  .regex(
    FIELD_TYPE_PATTERN,
    "must be one of: string(255) / text / int / decimal(10,2) / boolean / date / timestamp / uuid / enum / json",
  );

export const relationTypeSchema = z.enum([
  "OneToOne",
  "ManyToOne",
  "OneToMany",
  "ManyToMany",
]);

export const onDeleteSchema = z.enum([
  "CASCADE",
  "SET NULL",
  "RESTRICT",
  "NO ACTION",
]);

export const eventTransportSchema = z.enum([
  "memory",
  "rabbitmq",
  "kafka",
  "hybrid",
]);

export const apiStrategySchema = z.enum([
  "Full CRUD",
  "Partial CRUD",
  "Domain Action",
]);

export const crudOperationSchema = z.enum([
  "insert",
  "insertMany",
  "getById",
  "getByIds",
  "getAll",
  "getByFilter",
  "bulkUpsert",
  "update",
  "updateMany",
  "delete",
]);

export const dbTypeSchema = z.enum(["postgres", "mysql"]);

export const databaseModeSchema = z.enum(["single", "multi-tenant"]);

export const permissionModeSchema = z.enum(["FULL", "RBAC", "DIRECT"]);

export const volumeSchema = z.enum(["small", "medium", "large"]);

export const tenantMapsToSchema = z.enum(["companyId", "branchId"]);

export const packageKeySchema = z.enum(PACKAGE_KEYS);

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type RelationType = z.infer<typeof relationTypeSchema>;
export type OnDelete = z.infer<typeof onDeleteSchema>;
export type ApiStrategy = z.infer<typeof apiStrategySchema>;
export type CrudOperation = z.infer<typeof crudOperationSchema>;
export type DbType = z.infer<typeof dbTypeSchema>;
export type DatabaseMode = z.infer<typeof databaseModeSchema>;
export type PermissionMode = z.infer<typeof permissionModeSchema>;
export type Volume = z.infer<typeof volumeSchema>;
export type TenantMapsTo = z.infer<typeof tenantMapsToSchema>;
