/** Escape characters that would otherwise be mistaken for cell delimiters or break a row onto
 * multiple lines — must stay the exact inverse of md-util.ts's `table()` parser. */
function escapeCell(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** Minimal, dependency-free GFM table renderer — deliberately not a templating engine. */
export function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    rows = [headers.map(() => "—")];
  }
  const headerLine = `| ${headers.join(" | ")} |`;
  const dividerLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((r) => `| ${r.map(escapeCell).join(" | ")} |`);
  return [headerLine, dividerLine, ...rowLines].join("\n");
}

export function bool(v: boolean): string {
  return v ? "yes" : "no";
}
