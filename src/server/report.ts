export interface ReportComment {
  id: number;
  line: number;
  line_end?: number | null;
  text: string;
}

export interface ReportInput {
  fileName: string;
  filePath: string;
  sha256: string;
  lines: string[];
  comments: ReportComment[];
}

function fenceFor(block: string): string {
  const runs = block.match(/`+/g);
  const longest = runs ? Math.max(...runs.map((r) => r.length)) : 0;
  return "`".repeat(Math.max(3, longest + 1));
}

export function renderReport(input: ReportInput): string {
  const { fileName, filePath, sha256, lines, comments } = input;
  const sorted = [...comments].sort(
    (a, b) =>
      a.line - b.line ||
      (a.line_end ?? a.line) - (b.line_end ?? b.line) ||
      a.id - b.id,
  );
  const out: string[] = [];
  out.push(`# Review: ${fileName}`, "");
  out.push(`- **File:** \`${filePath}\``);
  out.push(`- **Date:** ${new Date().toISOString()}`);
  out.push(`- **SHA-256:** \`${sha256}\``);
  out.push(`- **Comments:** ${sorted.length}`, "");

  let currentKey = "";
  let firstInSection = true;
  for (const c of sorted) {
    const start = c.line;
    const end = c.line_end ?? c.line;
    const key = `${start}:${end}`;
    if (key !== currentKey) {
      currentKey = key;
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      const quoted: string[] = [];
      for (let i = start; i <= end; i++) {
        quoted.push(lines[i - 1] ?? "");
      }
      const block = quoted.join("\n");
      const fence = fenceFor(block);
      out.push(
        end > start ? `## Lines ${start}-${end}` : `## Line ${start}`,
        "",
        `${fence}text`,
        block,
        fence,
        "",
      );
      firstInSection = true;
    }
    if (!firstInSection) out.push("");
    for (const bodyLine of c.text.split("\n")) {
      out.push(bodyLine === "" ? ">" : `> ${bodyLine}`);
    }
    firstInSection = false;
  }

  return out.join("\n") + "\n";
}
