import { Component, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonComponent, CheckboxComponent, InputTextDirective, SelectComponent, TooltipDirective } from "@flusys/ng-ui";
import type { Entity, FeaturePrd } from "../../../server/schema/feature.js";
import { emptyField, splitCsv } from "../services/factory.js";
import { DraftStoreService } from "../services/draft-store.service.js";

@Component({
  selector: "app-entity-inspector",
  standalone: true,
  imports: [FormsModule, ButtonComponent, InputTextDirective, SelectComponent, CheckboxComponent, TooltipDirective],
  templateUrl: "./entity-inspector.component.html",
})
export class EntityInspectorComponent {
  readonly feature = input.required<FeaturePrd>();
  readonly entity = input.required<Entity>();

  readonly fieldTypeOptions: string[] = ["string(255)", "text", "int", "decimal(10,2)", "boolean", "date", "timestamp", "uuid", "enum", "json"];
  readonly companyScopingOptions: string[] = ["none", "self-service", "cross-tenant"];
  readonly relationTypeOptions: string[] = ["OneToOne", "ManyToOne", "OneToMany", "ManyToMany"];
  readonly onDeleteOptions: string[] = ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"];

  constructor(readonly store: DraftStoreService) {}

  onNameChange(newName: string): void {
    const entity = this.entity();
    const oldName = entity.name;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    for (const e of this.feature().entities) {
      for (const r of e.relations) if (r.to === oldName) r.to = trimmed;
    }
    entity.name = trimmed;
    this.store.selectEntity(this.feature().slug, trimmed);
    this.store.touch();
  }

  deleteEntity(): void {
    this.store.removeEntity(this.feature(), this.entity().name);
  }

  addField(): void {
    this.entity().fields.push(emptyField());
    this.store.touch();
  }
  removeField(i: number): void {
    this.entity().fields.splice(i, 1);
    this.store.touch();
  }

  onCompanyScopingChange(kind: string): void {
    const entity = this.entity();
    entity.companyScoping =
      kind === "cross-tenant" ? { kind, managingActor: "", gatingPermission: "" } : { kind: kind as "none" | "self-service" };
    this.store.touch();
  }

  addEnum(): void {
    this.entity().enums.push({ name: "", values: [], default: "" });
    this.store.touch();
  }
  removeEnum(i: number): void {
    this.entity().enums.splice(i, 1);
    this.store.touch();
  }
  onEnumValuesChange(i: number, v: string): void {
    this.entity().enums[i].values = splitCsv(v);
    this.store.touch();
  }

  addRelation(): void {
    this.entity().relations.push({ type: "ManyToOne", to: "", onDelete: "SET NULL" });
    this.store.touch();
  }
  removeRelation(i: number): void {
    this.entity().relations.splice(i, 1);
    this.store.touch();
  }

  onIndexesChange(v: string): void {
    this.entity().indexes = splitCsv(v);
    this.store.touch();
  }
}
