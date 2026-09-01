import { Injectable } from "@angular/core";
import type { BootstrapPrd } from "../../../server/schema/bootstrap.js";
import type { FeaturePrd } from "../../../server/schema/feature.js";

export interface Draft {
  bootstrap: BootstrapPrd;
  features: FeaturePrd[];
}

export interface LintIssue {
  severity: "blocking" | "warning";
  scope: string;
  message: string;
}

export interface ExportResult {
  ok: boolean;
  error?: string;
  written?: string[];
  issues?: LintIssue[];
  /** true only when the failure is a lint-rule warning that `force: true` can bypass — never
   * true for a schema gap (a required field that's genuinely empty has nothing to render). */
  forceable?: boolean;
}

/** Plain fetch, not HttpClient — this app talks to exactly one local server with no auth, retry,
 * or interceptor needs, so the extra machinery isn't worth it. */
@Injectable({ providedIn: "root" })
export class ApiService {
  private async getJson<T>(url: string): Promise<{ res: Response; body: T }> {
    const res = await fetch(url);
    const body = (await res.json()) as T;
    return { res, body };
  }

  private async sendJson<T>(url: string, method: "POST" | "PUT", payload: unknown): Promise<{ res: Response; body: T }> {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as T;
    return { res, body };
  }

  async fetchDraft(): Promise<Draft> {
    const { res, body } = await this.getJson<Draft & { error?: string }>("/api/draft");
    if (!res.ok) throw new Error(body.error ?? `Failed to load draft (${res.status})`);
    return body;
  }

  async saveDraft(draft: Draft): Promise<void> {
    const { res, body } = await this.sendJson<{ error?: string }>("/api/draft", "PUT", draft);
    if (!res.ok) throw new Error(body.error ?? `Failed to save draft (${res.status})`);
  }

  async fetchLint(): Promise<LintIssue[]> {
    const { res, body } = await this.getJson<{ issues: LintIssue[]; error?: string }>("/api/lint");
    if (!res.ok) throw new Error(body.error ?? `Failed to load lint issues (${res.status})`);
    return body.issues;
  }

  async importFromDir(targetDir: string): Promise<{ ok: boolean; error?: string; draft?: Draft }> {
    const { res, body } = await this.sendJson<Draft & { error?: string }>("/api/import", "POST", { targetDir });
    if (!res.ok) return { ok: false, error: body.error };
    return { ok: true, draft: body };
  }

  async exportToDir(targetDir: string, force = false): Promise<ExportResult> {
    const { res, body } = await this.sendJson<{ error?: string; written?: string[]; issues?: LintIssue[]; forceable?: boolean }>(
      "/api/export",
      "POST",
      { targetDir, force },
    );
    if (!res.ok) return { ok: false, error: body.error, issues: body.issues, forceable: body.forceable };
    return { ok: true, written: body.written, issues: body.issues };
  }
}
