import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapPrdSchema } from "../schema/bootstrap.js";
import { featurePrdSchema } from "../schema/feature.js";
import { renderBootstrapPrd } from "../render/render-bootstrap.js";
import { renderFeaturePrd } from "../render/render-feature.js";
import { exampleBootstrap } from "./example-bootstrap.js";
import { exampleFeature } from "./example-feature.js";

const bootstrap = bootstrapPrdSchema.parse(exampleBootstrap);
const feature = featurePrdSchema.parse(exampleFeature);

const bootstrapMd = renderBootstrapPrd(bootstrap);
const featureMd = renderFeaturePrd(feature);

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "example-output", "docs");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "prd-bootstrap.md"), bootstrapMd);
writeFileSync(join(outDir, "prd-feature-01-invoicing.md"), featureMd);

console.log(`Validated OK. Wrote:\n  ${join(outDir, "prd-bootstrap.md")}\n  ${join(outDir, "prd-feature-01-invoicing.md")}`);
