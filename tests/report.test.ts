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

  it("emits single-line sections byte-identically when line_end is absent", () => {
    const report = renderReport(
      makeInput({
        lines: ["a", "b", "c"],
        comments: [
          { id: 1, line: 1, text: "one" },
          { id: 2, line: 3, text: "two" },
        ],
      }),
    );
    const dateLine = report.match(/^- \*\*Date:\*\* .+$/m)?.[0] ?? "";
    expect(report).toBe(
      [
        "# Review: notes.md",
        "",
        "- **File:** `/abs/path/notes.md`",
        dateLine,
        `- **SHA-256:** \`${HASH}\``,
        "- **Comments:** 2",
        "",
        "## Line 1",
        "",
        "```text",
        "a",
        "```",
        "",
        "> one",
        "",
        "## Line 3",
        "",
        "```text",
        "c",
        "```",
        "",
        "> two",
      ].join("\n") + "\n",
    );
  });

  it("renders a range section with ## Lines N-M and the whole block quoted verbatim", () => {
    const report = renderReport(
      makeInput({
        lines: ["alpha", "beta", "gamma", "delta", "epsilon"],
        comments: [{ id: 1, line: 2, line_end: 4, text: "fix" }],
      }),
    );
    expect(report).toContain(
      "## Lines 2-4\n\n```text\nbeta\ngamma\ndelta\n```\n\n> fix\n",
    );
    expect(report).not.toContain("## Line 2");
  });

  it("counts comments, not sections", () => {
    const report = renderReport(
      makeInput({
        lines: ["a"],
        comments: [
          { id: 1, line: 1, text: "one" },
          { id: 2, line: 1, line_end: 1, text: "two" },
        ],
      }),
    );
    expect(report).toContain("- **Comments:** 2\n");
  });

  it("orders sections by (start, end) with overlaps permitted", () => {
    const report = renderReport(
      makeInput({
        lines: ["a", "b", "c"],
        comments: [
          { id: 3, line: 2, line_end: 3, text: "wide" },
          { id: 1, line: 1, text: "first" },
          { id: 2, line: 3, text: "third" },
        ],
      }),
    );
    const first = report.indexOf("## Line 1");
    const second = report.indexOf("## Lines 2-3");
    const third = report.indexOf("## Line 3");
    expect([first, second, third].every((index) => index > -1)).toBe(true);
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(third);
  });

  it("puts the narrower section first at the same anchor", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
    const report = renderReport(
      makeInput({
        lines,
        comments: [
          { id: 1, line: 10, line_end: 15, text: "wide" },
          { id: 2, line: 10, text: "narrow" },
        ],
      }),
    );
    const narrow = report.indexOf("## Line 10");
    const wide = report.indexOf("## Lines 10-15");
    expect(narrow).toBeGreaterThan(-1);
    expect(wide).toBeGreaterThan(-1);
    expect(narrow).toBeLessThan(wide);
  });

  it("shares one section between comments with the same range", () => {
    const lines = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`);
    const report = renderReport(
      makeInput({
        lines,
        comments: [
          { id: 2, line: 1, line_end: 2, text: "second" },
          { id: 1, line: 1, line_end: 2, text: "first" },
        ],
      }),
    );
    expect(report.match(/## Lines 1-2/g)).toHaveLength(1);
    expect(report).toContain("> first\n\n> second\n");
  });

  it("extends the fence over the entire multi-line block when it contains backticks", () => {
    const report = renderReport(
      makeInput({
        lines: ["ok", "look at ```", "still in range"],
        comments: [{ id: 1, line: 2, line_end: 3, text: "hmm" }],
      }),
    );
    expect(report).toContain("````text\nlook at ```\nstill in range\n````\n");
  });

  it("preserves blank lines inside a quoted range", () => {
    const report = renderReport(
      makeInput({
        lines: ["one", "", "three"],
        comments: [{ id: 1, line: 1, line_end: 3, text: "all" }],
      }),
    );
    expect(report).toContain("```text\none\n\nthree\n```\n");
  });
});
