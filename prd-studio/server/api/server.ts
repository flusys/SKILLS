import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import { z } from "zod";
import { bootstrapPrdSchema } from "../schema/bootstrap.js";
import { featurePrdSchema } from "../schema/feature.js";
import { renderBootstrapPrd } from "../render/render-bootstrap.js";
import { renderFeaturePrd } from "../render/render-feature.js";
import { parseBootstrapPrd } from "../parse/parse-bootstrap.js";
import { parseFeaturePrd } from "../parse/parse-feature.js";
import { lint, hasBlockingIssues, type LintIssue } from "../lint/rules.js";
import { loadDraft, saveDraft, type Draft } from "./store.js";
import type { z as zType } from "zod";

/** Folds zod validation failures into the same LintIssue shape the completeness linter uses,
 * so the client has exactly one issue format to render regardless of whether a problem is
 * "this field is missing" (schema) or "this is complete but inconsistent" (lint rule). */
function schemaIssuesToLint(
  bootstrapResult: { success: true } | { success: false; error: zType.ZodError },
  featureResults: ({ success: true } | { success: false; error: zType.ZodError })[],
  featureSlugs: (string | undefined)[],
): LintIssue[] {
  return [
    ...(bootstrapResult.success
      ? []
      : bootstrapResult.error.issues.map((i) => ({
          severity: "blocking" as const,
          scope: "bootstrap",
          message: `${i.path.join(".") || "(root)"}: ${i.message}`,
        }))),
    ...featureResults.flatMap((r, idx) =>
      r.success
        ? []
        : r.error.issues.map((i) => ({
            severity: "blocking" as const,
            scope: featureSlugs[idx] ?? `feature[${idx}]`,
            message: `${i.path.join(".") || "(root)"}: ${i.message}`,
          })),
    ),
  ];
}

export function createServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Dev-only CORS: the web app runs on Vite's dev server (a different origin) and talks to
  // this API directly. No external network exposure is intended for this tool.
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/draft", (_req, res) => {
    res.json(loadDraft());
  });

  app.put("/api/draft", (req, res) => {
    const body = z.object({ bootstrap: z.record(z.any()), features: z.array(z.record(z.any())) }).safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "malformed draft envelope", issues: body.error.issues });
    }
    saveDraft(body.data as Draft);
    res.json({ ok: true });
  });

  app.get("/api/lint", (_req, res) => {
    const draft = loadDraft();
    const bootstrapResult = bootstrapPrdSchema.safeParse(draft.bootstrap);
    const featureResults = draft.features.map((f) => featurePrdSchema.safeParse(f));

    const schemaIssues = schemaIssuesToLint(
      bootstrapResult,
      featureResults,
      draft.features.map((f) => f.slug as string | undefined),
    );

    const validFeatures = featureResults.flatMap((r) => (r.success ? [r.data] : []));
    const ruleIssues =
      bootstrapResult.success && validFeatures.length === draft.features.length
        ? lint(bootstrapResult.data, validFeatures)
        : [];

    res.json({ issues: [...schemaIssues, ...ruleIssues] });
  });

  app.post("/api/import", (req, res) => {
    const body = z.object({ targetDir: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "targetDir is required" });

    const docsDir = join(body.data.targetDir, "docs");
    const bootstrapPath = join(docsDir, "prd-bootstrap.md");
    if (!existsSync(bootstrapPath)) {
      return res.status(404).json({ error: `no docs/prd-bootstrap.md found under ${body.data.targetDir}` });
    }

    const bootstrap = parseBootstrapPrd(readFileSync(bootstrapPath, "utf-8"));
    const featureFiles = existsSync(docsDir)
      ? readdirSync(docsDir).filter((f) => /^prd-feature-\d{2}-[a-z0-9-]+\.md$/.test(f))
      : [];

    const features = featureFiles.map((file) => {
      const m = /^prd-feature-(\d{2})-([a-z0-9-]+)\.md$/.exec(file)!;
      const order = Number(m[1]);
      const slug = m[2];
      return parseFeaturePrd(readFileSync(join(docsDir, file), "utf-8"), order, slug);
    });

    const draft: Draft = { bootstrap, features };
    saveDraft(draft);
    res.json(draft);
  });

  app.post("/api/export", (req, res) => {
    const body = z.object({ targetDir: z.string().min(1), force: z.boolean().optional() }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "targetDir is required" });

    const draft = loadDraft();
    const bootstrapResult = bootstrapPrdSchema.safeParse(draft.bootstrap);
    const featureResults = draft.features.map((f) => featurePrdSchema.safeParse(f));

    if (!bootstrapResult.success || featureResults.some((r) => !r.success)) {
      // Not forceable: required fields are genuinely missing, so there's nothing valid to
      // render — "force" only ever bypasses lint-rule warnings below, never raw schema gaps.
      return res.status(422).json({
        error: "draft does not satisfy the PRD schema yet",
        forceable: false,
        issues: schemaIssuesToLint(
          bootstrapResult,
          featureResults,
          draft.features.map((f) => f.slug as string | undefined),
        ),
      });
    }

    const bootstrap = bootstrapResult.data;
    const features = featureResults.flatMap((r) => (r.success ? [r.data] : []));

    const issues = lint(bootstrap, features);
    if (hasBlockingIssues(issues) && !body.data.force) {
      return res.status(409).json({ error: "blocking lint issues remain", forceable: true, issues });
    }

    const docsDir = join(body.data.targetDir, "docs");
    mkdirSync(docsDir, { recursive: true });

    const written: string[] = [];
    const bootstrapPath = join(docsDir, "prd-bootstrap.md");
    writeFileSync(bootstrapPath, renderBootstrapPrd(bootstrap));
    written.push(bootstrapPath);

    for (const f of features) {
      const filePath = join(docsDir, `prd-feature-${String(f.order).padStart(2, "0")}-${f.slug}.md`);
      writeFileSync(filePath, renderFeaturePrd(f));
      written.push(filePath);
    }

    res.json({ ok: true, written, issues });
  });

  return app;
}
