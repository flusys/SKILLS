import { afterNextRender, Component, effect, ElementRef, input, output, ViewEncapsulation, viewChild } from "@angular/core";
import type { FeaturePrd } from "../../../server/schema/feature.js";
import { type CanvasHandle, mountCanvas } from "./canvas-renderer.js";

@Component({
  selector: "app-canvas",
  standalone: true,
  template: `<div #host class="prd-canvas-host"></div>`,
  // The SVG inside is built with raw DOM APIs (mountCanvas), not Angular's template compiler, so
  // it never receives the `_ngcontent-*` attribute emulated encapsulation relies on to scope
  // styles — a normal component stylesheet would silently fail to match it. ViewEncapsulation.None
  // is correct here specifically because this component's whole job is styling injected DOM.
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .prd-canvas-host {
        width: 100%;
      }
      .prd-canvas-host svg {
        width: 100%;
        height: auto;
        display: block;
        min-height: 320px;
        max-height: 68vh;
        border-radius: var(--p-content-border-radius, 10px);
        border: 1px solid var(--f-content-border-color);
        background: var(--f-content-background);
      }
      .prd-canvas-node {
        cursor: grab;
      }
      .prd-canvas-node:active {
        cursor: grabbing;
      }
      .prd-canvas-node-rect {
        fill: var(--f-content-background);
        stroke: var(--f-content-border-color);
        stroke-width: 1.5;
      }
      .prd-canvas-node-rect--selected {
        stroke: var(--color-primary);
        stroke-width: 2.5;
      }
      .prd-canvas-node-header {
        fill: color-mix(in srgb, var(--color-primary) 10%, var(--f-content-background));
      }
      .prd-canvas-node-header--selected {
        fill: var(--color-primary);
      }
      .prd-canvas-node-title {
        font-size: 13px;
        font-weight: 600;
        fill: var(--text-color);
      }
      .prd-canvas-node-title--selected {
        fill: var(--f-primary-contrast-color);
      }
      .prd-canvas-node-field {
        font-size: 11px;
        fill: var(--f-text-muted-color);
      }
      .prd-canvas-node-field-empty {
        font-size: 11px;
        font-style: italic;
        fill: var(--f-text-muted-color);
      }
      .prd-canvas-edge {
        stroke: var(--color-primary);
        stroke-width: 1.5;
      }
      .prd-canvas-edge-label {
        font-size: 10px;
        fill: var(--f-text-muted-color);
      }
      .prd-canvas-arrowhead {
        fill: var(--color-primary);
      }
      .prd-canvas-external-badge {
        fill: color-mix(in srgb, var(--f-orange-500, orange) 12%, var(--f-content-background));
        stroke: var(--f-orange-500, orange);
        stroke-width: 1;
      }
    `,
  ],
})
export class CanvasComponent {
  readonly feature = input.required<FeaturePrd>();
  readonly selected = input<string | undefined>(undefined);
  readonly selectEntity = output<string>();

  private readonly hostEl = viewChild.required<ElementRef<HTMLElement>>("host");
  private handle: CanvasHandle | undefined;

  constructor() {
    afterNextRender(() => {
      this.handle = mountCanvas(this.hostEl().nativeElement, (name) => this.selectEntity.emit(name));
      this.handle.redraw(this.feature(), this.selected());
    });

    effect(() => {
      const feature = this.feature();
      const selected = this.selected();
      this.handle?.redraw(feature, selected);
    });
  }
}
