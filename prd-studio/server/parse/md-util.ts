/** Small deterministic helpers for reverse-parsing our own renderer's markdown output. */

/** Extract the body of a `## Heading` (or `### Heading`) section, up to the next heading of the same or shallower level. */
export function section(md: string, heading: string, level: 2 | 3 = 2): string | undefined {
  const hashes = "#".repeat(level);
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${hashes}\\s+${escaped}\\s*$`, "m");
  const match = re.exec(md);
  if (!match) return undefined;
  const start = match.index + match[0].length;
  const rest = md.slice(start);
  const nextHeadingRe = new RegExp(`^#{1,${level}}\\s+`, "m");
  const next = rest.search(nextHeadingRe);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

/** All `### Heading` subsection bodies + their titles within a larger block (e.g. one entity per subsection). */
export function subsections(md: string): { title: string; body: string }[] {
  const parts = md.split(/^###\s+/m).slice(1);
  return parts.map((p) => {
    const nl = p.indexOf("\n");
    const title = (nl === -1 ? p : p.slice(0, nl)).trim();
    const body = (nl === -1 ? "" : p.slice(nl + 1)).trim();
    return { title, body };
  });
}

/** Split a table row on `|` delimiters, treating a backslash-escaped `\|` as a literal pipe
 * inside the cell rather than a delimiter — the exact inverse of render/table.ts's `escapeCell`. */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && i + 1 < line.length && (line[i + 1] === "|" || line[i + 1] === "\\")) {
      current += line[i + 1];
      i++;
    } else if (ch === "|") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

/** Parse the first GFM table in a block into rows of cells (header row excluded). */
export function table(md: string): string[][] {
  const lines = md.split("\n").map((l) => l.trim());
  const rows: string[][] = [];
  let inTable = false;
  for (const line of lines) {
    if (!line.startsWith("|")) {
      if (inTable) break;
      continue;
    }
    const cells = splitRow(line.slice(1, line.endsWith("|") ? -1 : undefined));
    if (cells.every((c) => /^-+$/.test(c))) {
      inTable = true;
      continue;
    }
    if (!inTable) continue; // header row itself, skip
    if (cells.length === 1 && cells[0] === "—") continue; // empty-table placeholder from our own renderer
    rows.push(cells);
  }
  return rows;
}

export function bulletList(md: string): string[] {
  return md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

export function boolFrom(v: string): boolean {
  return v.trim().toLowerCase() === "yes";
}

export function csv(v: string): string[] {
  const trimmed = v.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return [];
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

export function stripBackticks(v: string): string {
  return v.trim().replace(/^`|`$/g, "");
}
