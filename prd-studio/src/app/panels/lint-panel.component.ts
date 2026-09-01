import { Component, computed, input } from "@angular/core";
import { TagComponent } from "@flusys/ng-ui";
import type { LintIssue } from "../services/api.service.js";

@Component({
  selector: "app-lint-panel",
  standalone: true,
  imports: [TagComponent],
  template: `
    <h3 class="text-sm font-semibold text-color mb-2">Completeness</h3>
    <div class="flex gap-2 mb-3">
      <f-tag [value]="blocking().length + ' blocking'" severity="danger" />
      <f-tag [value]="warnings().length + ' warning'" severity="warn" />
    </div>

    @if (issues().length === 0) {
      <div class="text-sm text-green-600 dark:text-green-400 py-2">✓ Ready to export.</div>
    } @else {
      <div class="flex flex-col gap-2">
        @for (issue of ordered(); track issue.scope + issue.message) {
          <div
            class="rounded-lg p-2.5 text-xs border-l-4"
            [class.bg-red-50]="issue.severity === 'blocking'"
            [class.border-red-500]="issue.severity === 'blocking'"
            [class.dark:bg-red-950]="issue.severity === 'blocking'"
            [class.bg-amber-50]="issue.severity === 'warning'"
            [class.border-amber-500]="issue.severity === 'warning'"
            [class.dark:bg-amber-950]="issue.severity === 'warning'"
          >
            <span class="block font-semibold uppercase tracking-wide text-[10px] opacity-70 mb-0.5">{{ issue.scope }}</span>
            <span>{{ issue.message }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class LintPanelComponent {
  readonly issues = input.required<LintIssue[]>();

  readonly blocking = computed(() => this.issues().filter((i) => i.severity === "blocking"));
  readonly warnings = computed(() => this.issues().filter((i) => i.severity === "warning"));
  readonly ordered = computed(() => [...this.blocking(), ...this.warnings()]);
}
