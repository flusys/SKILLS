import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ButtonComponent,
  CardComponent,
  CheckboxComponent,
  InputNumberComponent,
  InputTextDirective,
  SelectComponent,
  TextareaDirective,
  TooltipDirective,
} from "@flusys/ng-ui";
import { PACKAGE_KEYS } from "../../../server/schema/constants.js";
import { emptyNavEntry, splitCsv } from "../services/factory.js";
import { DraftStoreService } from "../services/draft-store.service.js";

@Component({
  selector: "app-bootstrap-panel",
  standalone: true,
  imports: [
    FormsModule,
    CardComponent,
    ButtonComponent,
    InputTextDirective,
    TextareaDirective,
    SelectComponent,
    CheckboxComponent,
    InputNumberComponent,
    TooltipDirective,
  ],
  templateUrl: "./bootstrap-panel.component.html",
})
export class BootstrapPanelComponent {
  // f-select's `options` input is `unknown[]` (mutable), so these stay plain string[] rather
  // than `as const` readonly tuples — the option identity is validated server-side by the
  // schema's enums regardless.
  readonly dbTypeOptions: string[] = ["postgres", "mysql"];
  readonly databaseModeOptions: string[] = ["single", "multi-tenant"];
  readonly permissionModeOptions: string[] = ["FULL", "RBAC", "DIRECT"];
  readonly eventTransportOptions: string[] = ["memory", "rabbitmq", "kafka", "hybrid"];
  readonly mapsToOptions: string[] = ["companyId", "branchId"];
  readonly packageKeys = PACKAGE_KEYS;

  constructor(readonly store: DraftStoreService) {}

  get b() {
    return this.store.draft().bootstrap;
  }

  get moduleSlugOptions(): string[] {
    return ["", ...this.store.draft().features.map((f) => f.slug)];
  }

  onAppNameChange(v: string): void {
    this.b.appIdentity.appName = v;
    this.b.configValues.appName = v;
    this.store.touch();
  }

  addTenantMapping(): void {
    this.b.tenantMapping.push({ domainTerm: "", mapsTo: "companyId", notes: "" });
    this.store.touch();
  }
  removeTenantMapping(i: number): void {
    this.b.tenantMapping.splice(i, 1);
    this.store.touch();
  }

  addNavEntry(): void {
    this.b.navigationMenu.push(emptyNavEntry());
    this.store.touch();
  }
  removeNavEntry(i: number): void {
    this.b.navigationMenu.splice(i, 1);
    this.store.touch();
  }

  onRolesChange(v: string): void {
    this.b.seedData.roles = splitCsv(v);
    this.store.touch();
  }
  onAdditionalLanguagesChange(v: string): void {
    this.b.seedData.additionalLanguages = splitCsv(v);
    this.store.touch();
  }

  onModuleDependsOnChange(order: number, v: string): void {
    const ref = this.b.featureModules.find((m) => m.order === order);
    if (!ref) return;
    ref.dependsOn = splitCsv(v);
    this.store.touch();
  }
}
