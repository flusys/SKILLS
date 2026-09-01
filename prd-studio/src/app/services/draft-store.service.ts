import { Injectable, effect, signal } from "@angular/core";
import type { FeaturePrd } from "../../../server/schema/feature.js";
import { ApiService, type Draft, type ExportResult, type LintIssue } from "./api.service.js";
import { emptyBootstrap, emptyFeature } from "./factory.js";

export type Tab = { kind: "bootstrap" } | { kind: "feature"; slug: string };

const TARGET_DIR_KEY = "prd-studio:targetDir";

function loadStoredTargetDir(): string {
  try {
    return localStorage.getItem(TARGET_DIR_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * The draft is mutated in place (nested plain objects, not immutable updates) — the same shape
 * the panels always worked with — and `touch()` forces the signal to renotify regardless of
 * reference equality (`equal: () => false`). Unlike the old hand-rolled vanilla store, this is
 * safe to call after every edit: Angular's signal-driven change detection only re-renders the
 * specific bindings that actually read the changed data, never a full DOM teardown, so there's
 * no risk of losing scroll position or input focus the way a `root.innerHTML = ""` rebuild did.
 */
@Injectable({ providedIn: "root" })
export class DraftStoreService {
  readonly draft = signal<Draft>({ bootstrap: emptyBootstrap(), features: [] }, { equal: () => false });
  readonly lintIssues = signal<LintIssue[]>([]);
  readonly activeTab = signal<Tab>({ kind: "bootstrap" });
  readonly selectedEntity = signal<Record<string, string>>({});
  /** Remembered across reloads (localStorage) — otherwise every refresh silently clears it back
   * to empty, and the next Import/Export click just says "Set a target directory first" with no
   * clue that the field used to be filled in. */
  readonly targetDir = signal(loadStoredTargetDir());
  readonly status = signal("");

  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  /** Chains autosave runs so a slow request can never be overtaken by a later one — without
   * this, two overlapping PUTs (timer fires again before the first response lands) could
   * resolve out of order and let a stale draft clobber a newer save. */
  private savePromise: Promise<void> = Promise.resolve();

  constructor(private readonly api: ApiService) {
    effect(() => {
      const dir = this.targetDir();
      try {
        if (dir) localStorage.setItem(TARGET_DIR_KEY, dir);
        else localStorage.removeItem(TARGET_DIR_KEY);
      } catch {
        // best-effort only
      }
    });
  }

  async load(): Promise<void> {
    try {
      const draft = await this.api.fetchDraft();
      if (draft.bootstrap && Object.keys(draft.bootstrap).length > 0) {
        this.draft.set(draft);
      }
    } catch (err) {
      this.status.set(`Failed to load draft: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    await this.refreshLint();
  }

  async refreshLint(): Promise<void> {
    try {
      this.lintIssues.set(await this.api.fetchLint());
    } catch (err) {
      this.status.set(`Failed to load lint issues: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  /** Call after any mutation to the draft object graph. */
  touch(): void {
    this.draft.set(this.draft());
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.runSave(), 500);
  }

  /** Appends onto the in-flight chain rather than firing a fresh request, so overlapping
   * autosaves are serialized instead of racing (see `savePromise` above). */
  private runSave(): void {
    this.savePromise = this.savePromise.catch(() => undefined).then(async () => {
      try {
        await this.api.saveDraft(this.draft());
        await this.refreshLint();
      } catch (err) {
        this.status.set(`Autosave failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    });
  }

  setActiveTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  selectEntity(featureSlug: string, entityName: string): void {
    this.selectedEntity.update((m) => ({ ...m, [featureSlug]: entityName }));
  }

  addFeatureModule(): void {
    const draft = this.draft();
    const order = draft.features.length + 1;
    const slug = `module-${order}`;
    const feature = emptyFeature(order, slug, `New Module ${order}`);
    draft.features.push(feature);
    draft.bootstrap.featureModules.push({
      order,
      file: `docs/prd-feature-${String(order).padStart(2, "0")}-${slug}.md`,
      name: feature.name,
      dependsOn: [],
    });
    this.setActiveTab({ kind: "feature", slug });
    this.touch();
  }

  renameFeatureSlug(oldSlug: string, newSlug: string): void {
    const draft = this.draft();
    const feature = draft.features.find((f) => f.slug === oldSlug);
    if (!feature || !newSlug || newSlug === oldSlug) return;
    if (draft.features.some((f) => f.slug === newSlug)) return; // must stay unique

    feature.slug = newSlug;

    // Matched by `order`, not by substring on the filename — two slugs like "team" and
    // "sub-team" both produce a file ending in "-team.md", so a substring match on the old
    // slug could silently rewrite the wrong module's reference.
    const ref = draft.bootstrap.featureModules.find((m) => m.order === feature.order);
    if (ref) ref.file = `docs/prd-feature-${String(ref.order).padStart(2, "0")}-${newSlug}.md`;

    for (const nav of draft.bootstrap.navigationMenu) {
      if (nav.moduleSlug === oldSlug) nav.moduleSlug = newSlug;
    }

    // Every other module's dependency lists, and the bootstrap-level "development order" list,
    // reference modules by slug — a rename that doesn't cascade here would leave those pointing
    // at a slug that no longer exists.
    const renameIn = (list: string[]) => list.map((s) => (s === oldSlug ? newSlug : s));
    for (const other of draft.bootstrap.featureModules) {
      other.dependsOn = renameIn(other.dependsOn);
    }
    for (const other of draft.features) {
      other.dependencies.dependsOn = renameIn(other.dependencies.dependsOn);
      other.dependencies.requiredBefore = renameIn(other.dependencies.requiredBefore);
    }

    const tab = this.activeTab();
    if (tab.kind === "feature" && tab.slug === oldSlug) this.activeTab.set({ kind: "feature", slug: newSlug });
    this.touch();
  }

  removeFeatureModule(slug: string): void {
    const draft = this.draft();
    const removedOrder = draft.features.find((f) => f.slug === slug)?.order;
    draft.features = draft.features.filter((f) => f.slug !== slug);
    // Matched by `order`, not by substring on the filename — see the same fix in
    // renameFeatureSlug for why a substring match on the slug is unsafe here.
    draft.bootstrap.featureModules = draft.bootstrap.featureModules.filter((m) => m.order !== removedOrder);
    const tab = this.activeTab();
    if (tab.kind === "feature" && tab.slug === slug) this.setActiveTab({ kind: "bootstrap" });
    this.touch();
  }

  addEntity(feature: FeaturePrd): void {
    const entity = { name: `Entity${feature.entities.length + 1}`, fields: [{ name: "", type: "string(255)" as const, nullable: false }], companyScoping: { kind: "none" as const }, enums: [], relations: [], indexes: [] };
    feature.entities.push(entity);
    this.selectEntity(feature.slug, entity.name);
    this.touch();
  }

  removeEntity(feature: FeaturePrd, entityName: string): void {
    feature.entities = feature.entities.filter((e) => e.name !== entityName);
    const map = { ...this.selectedEntity() };
    delete map[feature.slug];
    this.selectedEntity.set(map);
    this.touch();
  }

  async doImport(targetDir: string): Promise<void> {
    this.status.set("Importing…");
    const result = await this.api.importFromDir(targetDir);
    if (result.ok && result.draft) {
      this.draft.set(result.draft);
      this.status.set("Imported.");
      this.setActiveTab({ kind: "bootstrap" });
      await this.refreshLint();
    } else {
      this.status.set(`Import failed: ${result.error}`);
    }
  }

  async doExport(targetDir: string, force = false): Promise<ExportResult> {
    this.status.set("Exporting…");
    const result = await this.api.exportToDir(targetDir, force);
    this.status.set(result.ok ? `Exported ${result.written?.length ?? 0} file(s).` : `Export blocked: ${result.error}`);
    return result;
  }
}
