export interface ReportComment {
  id: number;
  line: number;
  text: string;
}

export interface ReportInput {
  fileName: string;
  filePath: string;
  sha256: string;
  lines: string[];
  comments: ReportComment[];
}

function fenceFor(line: string): string {
  const runs = line.match(/`+/g);
  const longest = runs ? Math.max(...runs.map((r) => r.length)) : 0;
  return "`".repeat(Math.max(3, longest + 1));
}

export function renderReport(input: ReportInput): string {
  const { fileName, filePath, sha256, lines, comments } = input;
  const sorted = [...comments].sort((a, b) => a.line - b.line || a.id - b.id);
  const out: string[] = [];
  out.push(`# Review: ${fileName}`, "");
  out.push(`- **File:** \`${filePath}\``);
  out.push(`- **Date:** ${new Date().toISOString()}`);
  out.push(`- **SHA-256:** \`${sha256}\``);
  out.push(`- **Comments:** ${sorted.length}`, "");

  let currentLine = -1;
  let firstInSection = true;
  for (const c of sorted) {
    if (c.line !== currentLine) {
      currentLine = c.line;
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      const quoted = lines[c.line - 1] ?? "";
      const fence = fenceFor(quoted);
      out.push(`## Line ${c.line}`, "", `${fence}text`, quoted, fence, "");
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
