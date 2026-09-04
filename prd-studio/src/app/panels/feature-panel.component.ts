import { Component, computed, input } from "@angular/core";
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
import type { CrudEndpoint, DomainActionEndpoint, FeaturePrd } from "../../../server/schema/feature.js";
import { CanvasComponent } from "../canvas/canvas.component.js";
import { DraftStoreService } from "../services/draft-store.service.js";
import { splitCsv } from "../services/factory.js";
import { EntityInspectorComponent } from "./entity-inspector.component.js";

@Component({
  selector: "app-feature-panel",
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
    CanvasComponent,
    EntityInspectorComponent,
  ],
  templateUrl: "./feature-panel.component.html",
})
export class FeaturePanelComponent {
  readonly feature = input.required<FeaturePrd>();

  readonly apiStrategyOptions: string[] = ["Full CRUD", "Partial CRUD", "Domain Action"];
  readonly crudOperationOptions: string[] = [
    "insert",
    "insertMany",
    "getById",
    "getByIds",
    "getAll",
    "getByFilter",
    "bulkUpsert",
    "update",
    "updateMany",
    "delete",
  ];
  readonly returnsOptions: string[] = ["single record", "list", "message only"];
  readonly volumeOptions: string[] = ["small", "medium", "large"];
  readonly inputTypeOptions: string[] = ["text", "textarea", "number", "dropdown", "date", "file", "toggle"];
  readonly filterInputOptions: string[] = ["text", "dropdown", "date-range"];

  constructor(readonly store: DraftStoreService) {}

  readonly selectedEntity = computed(() => {
    const f = this.feature();
    const slug = f.slug;
    const selectedName = this.store.selectedEntity()[slug] ?? f.entities[0]?.name;
    return f.entities.find((e) => e.name === selectedName);
  });

  onSelectEntity(name: string): void {
    this.store.selectEntity(this.feature().slug, name);
  }

  addEntity(): void {
    this.store.addEntity(this.feature());
  }

  onNameChange(v: string): void {
    const f = this.feature();
    f.name = v;
    const ref = this.store.draft().bootstrap.featureModules.find((m) => m.file.includes(`-${f.slug}.md`));
    if (ref) ref.name = v;
    this.store.touch();
  }

  onSlugChange(v: string): void {
    const slug = v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) return;
    this.store.renameFeatureSlug(this.feature().slug, slug);
  }

  onStrategyChange(v: string): void {
    const f = this.feature();
    const strategy = v as FeaturePrd["apiStrategy"]["strategy"];
    f.apiStrategy.strategy = strategy;
    if (strategy === "Partial CRUD") f.apiStrategy.partialOperations ??= [];
    if (strategy === "Domain Action") {
      // A pure Domain Action feature has no entity lifecycle — its domain action *declarations*
      // and endpoint rows survive the switch either way (see addDomainAction/addDomainActionEndpoint),
      // only the CRUD endpoints are cleared.
      f.apiStrategy.domainActions ??= [];
      f.endpoints.crud = [];
    }
    this.store.touch();
  }

  togglePartialOperation(op: string, checked: boolean): void {
    const f = this.feature();
    const set = new Set(f.apiStrategy.partialOperations ?? []);
    const operation = op as NonNullable<FeaturePrd["apiStrategy"]["partialOperations"]>[number];
    if (checked) set.add(operation);
    else set.delete(operation);
    f.apiStrategy.partialOperations = [...set];
    this.store.touch();
  }
  isPartialOperationChecked(op: string): boolean {
    return (this.feature().apiStrategy.partialOperations ?? []).includes(op as never);
  }

  addDomainAction(): void {
    const f = this.feature();
    f.apiStrategy.domainActions ??= [];
    f.apiStrategy.domainActions.push({ name: "", description: "" });
    this.store.touch();
  }
  removeDomainAction(i: number): void {
    this.feature().apiStrategy.domainActions?.splice(i, 1);
    this.store.touch();
  }

  get crudEndpoints(): CrudEndpoint[] {
    return this.feature().endpoints.crud;
  }
  get domainActionEndpoints(): DomainActionEndpoint[] {
    return this.feature().endpoints.domainActions;
  }
  addCrudEndpoint(): void {
    this.crudEndpoints.push({ operation: "insert", permission: `${this.feature().slug}.create` });
    this.store.touch();
  }
  removeCrudEndpoint(i: number): void {
    this.crudEndpoints.splice(i, 1);
    this.store.touch();
  }
  addDomainActionEndpoint(): void {
    this.domainActionEndpoints.push({ action: "", input: "", returns: "single record", permission: `${this.feature().slug}.` });
    this.store.touch();
  }
  removeDomainActionEndpoint(i: number): void {
    this.domainActionEndpoints.splice(i, 1);
    this.store.touch();
  }

  toggleStateMachine(enabled: boolean): void {
    const f = this.feature();
    f.stateMachine = enabled
      ? { entity: f.entities[0]?.name ?? "", states: [], transitions: [], onReject: "", parallelVsSequential: "", workedExample: "" }
      : undefined;
    this.store.touch();
  }
  onStatesChange(v: string): void {
    if (!this.feature().stateMachine) return;
    this.feature().stateMachine!.states = splitCsv(v);
    this.store.touch();
  }
  addTransition(): void {
    this.feature().stateMachine?.transitions.push({ from: "", action: "", by: "", to: "" });
    this.store.touch();
  }
  removeTransition(i: number): void {
    this.feature().stateMachine?.transitions.splice(i, 1);
    this.store.touch();
  }

  addValidationRule(): void {
    this.feature().validation.push({ field: "", rule: "" });
    this.store.touch();
  }
  removeValidationRule(i: number): void {
    this.feature().validation.splice(i, 1);
    this.store.touch();
  }

  readonly allFieldKeys = computed(() => {
    const f = this.feature();
    const seen = new Set<string>();
    const out: { entity: string; field: string }[] = [];
    for (const e of f.entities) {
      for (const fld of e.fields) {
        if (!fld.name || seen.has(fld.name)) continue;
        seen.add(fld.name);
        out.push({ entity: e.name, field: fld.name });
      }
    }
    return out;
  });

  classificationOf(fieldName: string): "unclassified" | "exposed" | "never-exposed" {
    const f = this.feature();
    if (f.responseFields.exposed.includes(fieldName)) return "exposed";
    if (f.responseFields.neverExposed.includes(fieldName)) return "never-exposed";
    return "unclassified";
  }
  setClassification(fieldName: string, v: "unclassified" | "exposed" | "never-exposed"): void {
    const rf = this.feature().responseFields;
    rf.exposed = rf.exposed.filter((x) => x !== fieldName);
    rf.neverExposed = rf.neverExposed.filter((x) => x !== fieldName);
    if (v === "exposed") rf.exposed.push(fieldName);
    if (v === "never-exposed") rf.neverExposed.push(fieldName);
    this.store.touch();
  }

  addColumn(): void {
    this.feature().ui.listPage.columns.push({ field: "", sortable: false });
    this.store.touch();
  }
  removeColumn(i: number): void {
    this.feature().ui.listPage.columns.splice(i, 1);
    this.store.touch();
  }
  addFilter(): void {
    this.feature().ui.listPage.filters.push({ field: "", inputType: "text" });
    this.store.touch();
  }
  removeFilter(i: number): void {
    this.feature().ui.listPage.filters.splice(i, 1);
    this.store.touch();
  }
  onRowActionsChange(v: string): void {
    this.feature().ui.listPage.rowActions = splitCsv(v);
    this.store.touch();
  }
  onSearchFieldsChange(v: string): void {
    this.feature().ui.listPage.search.fields = splitCsv(v);
    this.store.touch();
  }
  addFormField(): void {
    this.feature().ui.createEditForm.push({ field: "", input: "text" });
    this.store.touch();
  }
  removeFormField(i: number): void {
    this.feature().ui.createEditForm.splice(i, 1);
    this.store.touch();
  }
  onBehaviourChange(v: string): void {
    this.feature().ui.behaviour = splitCsv(v);
    this.store.touch();
  }

  addAuditAction(v: string): void {
    this.feature().nonFunctional.auditLogOn = splitCsv(v);
    this.store.touch();
  }
  onEventsPublishedChange(v: string): void {
    this.feature().nonFunctional.domainEventsPublished = splitCsv(v);
    this.store.touch();
  }
  onEventsConsumedChange(v: string): void {
    this.feature().nonFunctional.domainEventsConsumed = splitCsv(v);
    this.store.touch();
  }
  addNotification(): void {
    this.feature().nonFunctional.notificationsTriggered.push({ when: "", to: "" });
    this.store.touch();
  }
  removeNotification(i: number): void {
    this.feature().nonFunctional.notificationsTriggered.splice(i, 1);
    this.store.touch();
  }
  addFileAttachment(): void {
    this.feature().nonFunctional.fileAttachments.push({ field: "", allowedTypes: [], maxSizeMb: 5 });
    this.store.touch();
  }
  removeFileAttachment(i: number): void {
    this.feature().nonFunctional.fileAttachments.splice(i, 1);
    this.store.touch();
  }
  onAllowedTypesChange(i: number, v: string): void {
    this.feature().nonFunctional.fileAttachments[i].allowedTypes = splitCsv(v);
    this.store.touch();
  }

  onDependsOnChange(v: string): void {
    this.feature().dependencies.dependsOn = splitCsv(v);
    this.store.touch();
  }
  onRequiredBeforeChange(v: string): void {
    this.feature().dependencies.requiredBefore = splitCsv(v);
    this.store.touch();
  }
}
