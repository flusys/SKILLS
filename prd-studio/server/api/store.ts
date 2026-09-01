import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BootstrapPrd } from "../schema/bootstrap.js";
import type { FeaturePrd } from "../schema/feature.js";

/**
 * The in-progress model is intentionally untyped/loose at rest — a work-in-progress draft
 * has empty required fields all the time, and the schema's strictness is exactly what we
 * want to defer to export time (see api/server.ts), not enforce while someone is still
 * filling the canvas in.
 */
export interface Draft {
  bootstrap: Partial<BootstrapPrd> & Record<string, unknown>;
  features: (Partial<FeaturePrd> & Record<string, unknown>)[];
}

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", ".data");
const draftFile = join(dataDir, "draft.json");

/**
 * A draft saved before `endpoints` became `{ crud, domainActions }` still has it as a flat array
 * (either all CRUD rows or all domain-action rows, per the old either/or schema). Normalize on
 * load so an older local `.data/draft.json` doesn't crash the editor on the missing `.crud` key.
 */
function migrateLegacyEndpoints(features: Draft["features"]): Draft["features"] {
  return features.map((f) => {
    if (!Array.isArray(f["endpoints"])) return f;
    const rows = f["endpoints"] as Record<string, unknown>[];
    const isCrud = rows.length === 0 || "operation" in rows[0];
    return {
      ...f,
      endpoints: (isCrud ? { crud: rows, domainActions: [] } : { crud: [], domainActions: rows }) as unknown as FeaturePrd["endpoints"],
    };
  });
}

export function loadDraft(): Draft {
  if (existsSync(draftFile)) {
    const draft = JSON.parse(readFileSync(draftFile, "utf-8")) as Draft;
    return { ...draft, features: migrateLegacyEndpoints(draft.features) };
  }
  // Genuinely empty — the web app's factory.ts owns shaping a fresh draft into a complete,
  // if content-empty, model (see emptyBootstrap()). A partially-shaped default here would let
  // the client's "already has content" check use it as-is and crash on the missing keys.
  return { bootstrap: {}, features: [] };
}

export function saveDraft(draft: Draft): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(draftFile, JSON.stringify(draft, null, 2));
}
