/** Canvas node positions are pure presentation, not PRD content — kept client-side only,
 * in localStorage, never sent to the backend or written into the exported model. */

export interface Point {
  x: number;
  y: number;
}

function key(featureSlug: string): string {
  return `prd-studio:layout:${featureSlug}`;
}

export function loadLayout(featureSlug: string): Record<string, Point> {
  try {
    const raw = localStorage.getItem(key(featureSlug));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLayout(featureSlug: string, layout: Record<string, Point>): void {
  try {
    localStorage.setItem(key(featureSlug), JSON.stringify(layout));
  } catch {
    // best-effort only
  }
}

export function positionFor(layout: Record<string, Point>, entityName: string, index: number): Point {
  if (layout[entityName]) return layout[entityName];
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: 40 + col * 260, y: 40 + row * 220 };
}
