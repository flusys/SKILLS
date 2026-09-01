import { Component, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ButtonComponent,
  ConfirmDialog,
  ConfirmationService,
  InputTextDirective,
  MessageService,
  ToastComponent,
  TooltipDirective,
} from "@flusys/ng-ui";
import { BootstrapPanelComponent } from "./panels/bootstrap-panel.component.js";
import { FeaturePanelComponent } from "./panels/feature-panel.component.js";
import { LintPanelComponent } from "./panels/lint-panel.component.js";
import { DraftStoreService } from "./services/draft-store.service.js";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    InputTextDirective,
    ToastComponent,
    ConfirmDialog,
    TooltipDirective,
    BootstrapPanelComponent,
    FeaturePanelComponent,
    LintPanelComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  readonly activeFeature = computed(() => {
    const tab = this.store.activeTab();
    if (tab.kind !== "feature") return undefined;
    return this.store.draft().features.find((f) => f.slug === tab.slug);
  });

  constructor(
    readonly store: DraftStoreService,
    private readonly confirmation: ConfirmationService,
    private readonly messages: MessageService,
  ) {
    void this.store.load();
  }

  isActiveFeatureTab(slug: string): boolean {
    const tab = this.store.activeTab();
    return tab.kind === "feature" && tab.slug === slug;
  }

  removeModule(slug: string, name: string): void {
    this.confirmation.confirm({
      message: `Remove module "${name}"? This can't be undone.`,
      header: "Remove module",
      icon: "triangle-alert",
      accept: () => this.store.removeFeatureModule(slug),
    });
  }

  async onImport(): Promise<void> {
    const dir = this.store.targetDir();
    if (!dir) {
      this.messages.add({ severity: "warn", summary: "Set a target directory first" });
      return;
    }
    await this.store.doImport(dir);
  }

  async onExport(): Promise<void> {
    const dir = this.store.targetDir();
    if (!dir) {
      this.messages.add({ severity: "warn", summary: "Set a target directory first" });
      return;
    }
    const result = await this.store.doExport(dir);
    if (!result.ok && result.forceable) {
      this.confirmation.confirm({
        message: `${result.error}. Export anyway?`,
        header: "Blocking issues remain",
        icon: "triangle-alert",
        accept: async () => {
          await this.store.doExport(dir, true);
        },
      });
    } else if (!result.ok) {
      this.messages.add({
        severity: "error",
        summary: result.error,
        detail: "See the Completeness panel for what's missing.",
        life: 6000,
      });
    } else {
      this.messages.add({ severity: "success", summary: `Exported ${result.written?.length ?? 0} file(s)` });
    }
  }
}
