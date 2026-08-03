# API Documentation (Swagger)

Loaded on demand from the `api-design` skill. Covers `setupSwaggerDocs` from
`@flusys/nestjs-core/docs` — one call per module, scoped and filtered per feature.

`setupSwaggerDocs(app, ...configs)` is called once per module in `main.ts` (dev only). A brand-new
project already has one call per selected package wired by `/bootstrap`; add one more when a new
domain module needs its own docs page.

## Creating a swagger config for a new domain module

Create `src/docs/<domain>-swagger.config.ts`:

```typescript
import { IModuleSwaggerOptions, ISchemaPropertyExclusion } from "@flusys/nestjs-core";

const COMPANY_SCHEMA_EXCLUSIONS: ISchemaPropertyExclusion[] = [
  { schemaName: "CreateProductDto", properties: ["companyId"] },
  { schemaName: "ProductResponseDto", properties: ["companyId", "branchId"] },
];

export function productSwaggerConfig(options?: {
  enableCompanyFeature?: boolean;
}): IModuleSwaggerOptions {
  const enableCompanyFeature = options?.enableCompanyFeature ?? true;
  return {
    title: "Product API",
    description: "## Product Management API\nCRUD for products and categories.",
    version: "1.0",
    path: "api/docs/products", // URL where Swagger UI is served
    bearerAuth: true,
    excludeSchemaProperties: enableCompanyFeature ? undefined : COMPANY_SCHEMA_EXCLUSIONS,
  };
}
```

Wire it in `main.ts`:

```typescript
import { ProductModule } from "./modules/product/product.module";
import { productSwaggerConfig } from "./docs/product-swagger.config";

setupSwaggerDocs(app, {
  ...productSwaggerConfig({ enableCompanyFeature }),
  modules: [ProductModule], // scope to this module's controllers only
});
```

## `IModuleSwaggerOptions` — all fields

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `title` | `string` | Swagger UI tab title |
| `description` | `string` | Markdown shown at top of docs |
| `version` | `string` | API version label (default `'1.0'`) |
| `path` | `string` | URL path e.g. `api/docs/products` |
| `modules` | `Type[]` | Scope to specific NestJS modules — omit for all |
| `bearerAuth` | `boolean` | Show Bearer token Authorize button |
| `globalHeaders` | `ISwaggerGlobalHeader[]` | Headers injected on every request |
| `excludeTags` | `string[]` | Hide entire controller tag groups |
| `excludePaths` | `string[]` | Hide specific paths (supports `*` wildcard) |
| `excludeSchemaProperties` | `ISchemaPropertyExclusion[]` | Hide fields from request/response DTOs |
| `excludeQueryParameters` | `IQueryParameterExclusion[]` | Hide query params from GET endpoints |
| `excludeExamples` | `IExampleExclusion[]` | Hide named response examples |

### `excludeTags` — hide entire controller groups

Controller tag = the string in `@ApiTags('...')`.

```typescript
excludeTags: ['Admin Panel', 'Internal'],
```

### `excludePaths` — hide specific URL paths

Supports `*` (single segment) and `**` (any depth):

```typescript
excludePaths: [
  '/products/internal-sync',  // exact path
  '/products/*/audit-log',    // wildcard single segment
  '/admin/**',                 // wildcard all under /admin
],
```

### `excludeSchemaProperties` — hide DTO fields

Removes properties from request/response schemas, and strips them from `required[]`:

```typescript
excludeSchemaProperties: [
  { schemaName: 'CreateProductDto', properties: ['companyId'] },
  { schemaName: 'ProductResponseDto', properties: ['companyId', 'branchId'] },
],
```

> `schemaName` = the DTO class name (NestJS uses the class name as the OpenAPI schema name).

### `excludeQueryParameters` — hide GET query params

Use when a GET endpoint has query params only relevant when a feature flag is on:

```typescript
excludeQueryParameters: [
  { pathPattern: '/products/search', method: 'get', parameters: ['companyId', 'branchId'] },
  { pathPattern: '/products/*', parameters: ['tenantId'] },
],
```

### `excludeExamples` — hide named response examples

```typescript
excludeExamples: [
  { pathPattern: '/products/insert', method: 'post', examples: ['withCompanyContext', 'multiTenantResponse'] },
],
```

### `globalHeaders` — inject headers on every request

For multi-tenant mode where every endpoint requires `x-tenant-id`:

```typescript
globalHeaders: [
  { name: 'x-tenant-id', description: 'Target tenant database identifier', required: false, example: 'tenant_acme' },
],
```
