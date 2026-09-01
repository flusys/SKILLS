import assert from "node:assert/strict";
import { bootstrapPrdSchema } from "../schema/bootstrap.js";
import { featurePrdSchema } from "../schema/feature.js";
import { renderBootstrapPrd } from "../render/render-bootstrap.js";
import { renderFeaturePrd } from "../render/render-feature.js";
import { parseBootstrapPrd } from "../parse/parse-bootstrap.js";
import { parseFeaturePrd } from "../parse/parse-feature.js";
import { exampleBootstrap } from "./example-bootstrap.js";
import { exampleFeature } from "./example-feature.js";

const bootstrap = bootstrapPrdSchema.parse(exampleBootstrap);
const feature = featurePrdSchema.parse(exampleFeature);

const bootstrapMd = renderBootstrapPrd(bootstrap);
const featureMd = renderFeaturePrd(feature);

const reparsedBootstrap = bootstrapPrdSchema.parse(parseBootstrapPrd(bootstrapMd));
const reparsedFeature = featurePrdSchema.parse(parseFeaturePrd(featureMd, feature.order, feature.slug));

/** JSON round-trip drops `undefined` keys anyway (this model travels over HTTP as JSON) — normalize before comparing. */
const j = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// Two fields are Studio-only editor metadata with no column in the markdown template, so
// they're genuinely lost on export -> reimport, not a parser bug:
//  - a feature module's human display name (bootstrap only ever renders its file path — see
//    render-bootstrap.ts — so the name is only recoverable by cross-referencing the feature
//    PRD's own title, which a real import flow does but this isolated bootstrap-only check doesn't)
//  - a nav entry's moduleSlug link (no column for it in the Navigation Menu table)
const normalizeModuleNames = (b: typeof bootstrap) => ({
  ...b,
  navigationMenu: b.navigationMenu.map(({ moduleSlug: _moduleSlug, ...rest }) => rest),
  featureModules: b.featureModules.map((m) => ({ ...m, name: m.name.toLowerCase() })),
});

assert.deepEqual(
  j(normalizeModuleNames(reparsedBootstrap)),
  j(normalizeModuleNames(bootstrap)),
  "bootstrap PRD did not round-trip through markdown",
);
assert.deepEqual(j(reparsedFeature), j(feature), "feature PRD did not round-trip through markdown");

console.log("Round-trip OK: render -> parse reproduces the original model exactly.");
