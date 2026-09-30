import { describe, expect, it } from "vitest";
import { renderReport, type ReportInput } from "../src/server/report";

const HASH = "9f2c1ab3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9";

function makeInput(overrides?: Partial<ReportInput>): ReportInput {
  const lines = Array.from({ length: 40 }, (_, i) => {
    if (i === 1) return "This is the reviewed line's content, quoted verbatim.";
    if (i === 39) return "Another reviewed line.";
    return `line ${i + 1}`;
  });
  return {
    fileName: "notes.md",
    filePath: "/abs/path/notes.md",
    sha256: HASH,
    lines,
    comments: [],
    ...overrides,
  };
}

describe("renderReport", () => {
  it("conforms to the normative structure", () => {
    const report = renderReport(
      makeInput({
        comments: [
          { id: 1, line: 2, text: "Fix this sentence." },
          { id: 2, line: 40, text: "Add a reference here." },
        ],
      }),
    );
    expect(report).toContain("# Review: notes.md\n");
    expect(report).toContain("- **File:** `/abs/path/notes.md`\n");
    expect(report).toContain(`- **SHA-256:** \`${HASH}\`\n`);
    expect(report).toContain("- **Comments:** 2\n");
    expect(report).toMatch(/- \*\*Date:\*\* \d{4}-\d{2}-\d{2}T[^\n]+\n/);
    expect(report).toContain("## Line 2\n\n```text\n");
    expect(report).toContain(
      "This is the reviewed line's content, quoted verbatim.\n```\n\n> Fix this sentence.\n",
    );
    expect(report).toContain(
      "## Line 40\n\n```text\nAnother reviewed line.\n```\n",
    );
    expect(report).not.toContain("## Index");
    expect(report).not.toContain("**Comment 1:**");
  });

  it("sorts sections by line and comments by id regardless of input order", () => {
    const report = renderReport(
      makeInput({
        comments: [
          { id: 3, line: 40, text: "Also fix the indentation here." },
          { id: 1, line: 2, text: "Fix this sentence." },
          { id: 2, line: 40, text: "Add a reference here." },
        ],
      }),
    );
    expect(report.indexOf("## Line 2")).toBeGreaterThan(-1);
    expect(report.indexOf("## Line 2")).toBeLessThan(
      report.indexOf("## Line 40"),
    );
    expect(report).toContain(
      "> Add a reference here.\n\n> Also fix the indentation here.\n",
    );
  });

  it("extends the fence when the quoted line contains backticks", () => {
    const lines = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`);
    lines[1] = "look at ``` inline";
    const report = renderReport(
      makeInput({
        lines,
        comments: [{ id: 1, line: 2, text: "hmm" }],
      }),
    );
    expect(report).toContain("````text\nlook at ``` inline\n````\n");
  });

  it("emits metadata only when there are no comments", () => {
    const report = renderReport(makeInput());
    expect(report).toContain("- **Comments:** 0\n");
    expect(report).not.toContain("## Line ");
  });

  it("renders multi-line bodies with bare > for blank lines", () => {
    const report = renderReport(
      makeInput({
        comments: [{ id: 1, line: 2, text: "first\n\nsecond" }],
      }),
    );
    expect(report).toContain("> first\n>\n> second\n");
  });

  it("ends with exactly one trailing newline", () => {
    const report = renderReport(
      makeInput({
        comments: [{ id: 1, line: 40, text: "last" }],
      }),
    );
    expect(report.endsWith("\n")).toBe(true);
    expect(report.endsWith("\n\n")).toBe(false);
  });

  it("emits the full 64-hex-character hash verbatim", () => {
    const report = renderReport(
      makeInput({
        comments: [{ id: 1, line: 2, text: "x" }],
      }),
    );
    expect(HASH).toMatch(/^[0-9a-f]{64}$/);
    expect(report).toContain(`\`${HASH}\``);
  });
});
