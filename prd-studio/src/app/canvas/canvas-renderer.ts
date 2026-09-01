import type { FeaturePrd } from "../../../server/schema/feature.js";
import { loadLayout, positionFor, saveLayout, type Point } from "./layout.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 230;
const HEADER_H = 36;
const ROW_H = 20;
const MIN_VIEWBOX_W = 640;
const MIN_VIEWBOX_H = 340;
const PAD = 48;

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function nodeHeight(entity: FeaturePrd["entities"][number]): number {
  return HEADER_H + Math.max(1, entity.fields.length) * ROW_H + 12;
}

export interface CanvasHandle {
  redraw(feature: FeaturePrd, selected: string | undefined): void;
  destroy(): void;
}

/** Framework-agnostic SVG canvas — an Angular component just owns its container element and
 * calls redraw() from an effect(); this file has no Angular dependency of its own. */
export function mountCanvas(container: HTMLElement, onSelect: (entityName: string) => void): CanvasHandle {
  container.innerHTML = "";
  const svg = svgEl("svg", { viewBox: "0 0 640 340" });
  svg.classList.add("prd-canvas-svg");

  const defs = svgEl("defs");
  const marker = svgEl("marker", {
    id: "prd-canvas-arrow",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "7",
    markerHeight: "7",
    orient: "auto-start-reverse",
  });
  marker.append(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "prd-canvas-arrowhead" }));
  defs.append(marker);
  svg.append(defs);

  const edgesLayer = svgEl("g");
  const nodesLayer = svgEl("g");
  svg.append(edgesLayer, nodesLayer);
  container.append(svg);

  function redraw(feature: FeaturePrd, selected: string | undefined) {
    edgesLayer.innerHTML = "";
    nodesLayer.innerHTML = "";

    const layout = loadLayout(feature.slug);
    const positions = new Map<string, Point & { w: number; h: number }>();
    feature.entities.forEach((e, i) => {
      const p = positionFor(layout, e.name, i);
      positions.set(e.name, { ...p, w: NODE_WIDTH, h: nodeHeight(e) });
    });

    const lineEls: { line: SVGLineElement; label: SVGTextElement; from: string; to: string }[] = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    function edgeAnchor(from: Point & { w: number; h: number }, to: Point & { w: number; h: number }) {
      const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
      const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
      const goingRight = toCenter.x >= fromCenter.x;
      return {
        x1: goingRight ? from.x + from.w : from.x,
        y1: fromCenter.y,
        x2: goingRight ? to.x : to.x + to.w,
        y2: toCenter.y,
      };
    }

    for (const entity of feature.entities) {
      const from = positions.get(entity.name)!;
      let externalOffset = 0;
      for (const rel of entity.relations) {
        const to = positions.get(rel.to);
        if (to) {
          const { x1, y1, x2, y2 } = edgeAnchor(from, to);
          const line = svgEl("line", {
            x1: String(x1),
            y1: String(y1),
            x2: String(x2),
            y2: String(y2),
            class: "prd-canvas-edge",
            "marker-end": "url(#prd-canvas-arrow)",
          });
          const label = svgEl("text", {
            x: String((x1 + x2) / 2),
            y: String((y1 + y2) / 2 - 4),
            "text-anchor": "middle",
            class: "prd-canvas-edge-label",
          });
          label.textContent = `${rel.type} · ${rel.onDelete}`;
          edgesLayer.append(line, label);
          lineEls.push({ line, label, from: entity.name, to: rel.to });
        } else {
          const badgeX = from.x + from.w + 8;
          const badgeY = from.y + externalOffset;
          const badge = svgEl("g", { transform: `translate(${badgeX}, ${badgeY})` });
          badge.append(
            svgEl("rect", { width: "160", height: "22", rx: "5", class: "prd-canvas-external-badge" }),
            (() => {
              const t = svgEl("text", { x: "8", y: "15", class: "prd-canvas-edge-label" });
              t.textContent = `⇥ external: ${rel.to}`;
              return t;
            })(),
          );
          edgesLayer.append(badge);
          grow(badgeX, badgeY);
          grow(badgeX + 160, badgeY + 22);
          externalOffset += 26;
        }
      }
    }

    for (const entity of feature.entities) {
      const pos = positions.get(entity.name)!;
      grow(pos.x, pos.y);
      grow(pos.x + pos.w, pos.y + pos.h);
      const isSelected = entity.name === selected;
      const g = svgEl("g", { transform: `translate(${pos.x}, ${pos.y})`, class: "prd-canvas-node" });

      const rect = svgEl("rect", {
        width: String(pos.w),
        height: String(pos.h),
        rx: "10",
        class: isSelected ? "prd-canvas-node-rect prd-canvas-node-rect--selected" : "prd-canvas-node-rect",
      });
      const header = svgEl("path", {
        d: roundedTopPath(pos.w, HEADER_H, 10),
        class: isSelected ? "prd-canvas-node-header prd-canvas-node-header--selected" : "prd-canvas-node-header",
      });
      const title = svgEl("text", { x: "12", y: "23", class: "prd-canvas-node-title" });
      title.textContent = entity.name || "(unnamed)";
      if (isSelected) title.classList.add("prd-canvas-node-title--selected");

      g.append(rect, header, title);

      entity.fields.forEach((f, i) => {
        const y = HEADER_H + 16 + i * ROW_H;
        const t = svgEl("text", { x: "12", y: String(y), class: "prd-canvas-node-field" });
        t.textContent = `${f.name}: ${f.type}${f.nullable ? "?" : ""}`;
        g.append(t);
      });
      if (entity.fields.length === 0) {
        const t = svgEl("text", { x: "12", y: String(HEADER_H + 16), class: "prd-canvas-node-field-empty" });
        t.textContent = "(no fields yet)";
        g.append(t);
      }

      g.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(entity.name);
      });

      let dragging = false;
      let offset = { x: 0, y: 0 };
      g.addEventListener("pointerdown", (e) => {
        dragging = true;
        g.setPointerCapture(e.pointerId);
        const p = toSvgPoint(svg, e);
        offset = { x: p.x - pos.x, y: p.y - pos.y };
      });
      g.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const p = toSvgPoint(svg, e);
        pos.x = Math.max(0, p.x - offset.x);
        pos.y = Math.max(0, p.y - offset.y);
        g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
        for (const edge of lineEls) {
          const from = positions.get(edge.from)!;
          const to = positions.get(edge.to)!;
          const { x1, y1, x2, y2 } = edgeAnchor(from, to);
          edge.line.setAttribute("x1", String(x1));
          edge.line.setAttribute("y1", String(y1));
          edge.line.setAttribute("x2", String(x2));
          edge.line.setAttribute("y2", String(y2));
          edge.label.setAttribute("x", String((x1 + x2) / 2));
          edge.label.setAttribute("y", String((y1 + y2) / 2 - 4));
        }
      });
      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        layout[entity.name] = { x: pos.x, y: pos.y };
        saveLayout(feature.slug, layout);
        grow(pos.x, pos.y);
        grow(pos.x + pos.w, pos.y + pos.h);
        fitViewBox();
      };
      g.addEventListener("pointerup", endDrag);
      g.addEventListener("pointercancel", endDrag);

      nodesLayer.append(g);
    }

    function fitViewBox() {
      if (minX === Infinity) {
        svg.setAttribute("viewBox", `0 0 ${MIN_VIEWBOX_W} ${MIN_VIEWBOX_H}`);
        return;
      }
      const w = Math.max(MIN_VIEWBOX_W, maxX - minX + PAD * 2);
      const h = Math.max(MIN_VIEWBOX_H, maxY - minY + PAD * 2);
      svg.setAttribute("viewBox", `${minX - PAD} ${minY - PAD} ${w} ${h}`);
    }
    fitViewBox();
  }

  return { redraw, destroy: () => container.replaceChildren() };
}

function toSvgPoint(svg: SVGSVGElement, e: PointerEvent): Point {
  const ctm = svg.getScreenCTM();
  return ctm ? { x: (e.clientX - ctm.e) / ctm.a, y: (e.clientY - ctm.f) / ctm.d } : { x: e.clientX, y: e.clientY };
}

/** A rect with only its top corners rounded, for the node header band. */
function roundedTopPath(w: number, h: number, r: number): string {
  return `M0,${h} L0,${r} Q0,0 ${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h} Z`;
}
