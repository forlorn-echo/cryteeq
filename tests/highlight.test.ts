import { describe, expect, it } from "vitest";
import { tokenize } from "../src/server/highlight";

describe("tokenize", () => {
  it("returns one token line per content line for a known lang", async () => {
    const content = "# Title\n\nsome text\n";
    const lines = await tokenize(content, "markdown");
    expect(lines.length).toBe(content.split("\n").length);
    expect(lines.length).toBe(4);
    expect(lines[0].map((t) => t.text).join("")).toBe("# Title");
    expect(lines[2].map((t) => t.text).join("")).toBe("some text");
    expect(lines[0].some((t) => t.color !== null)).toBe(true);
  });

  it("falls back to plaintext for an unknown lang", async () => {
    const content = "just text\nwith two lines\n";
    const lines = await tokenize(content, "definitely-not-a-lang");
    expect(lines.length).toBe(3);
    expect(lines[0].map((t) => t.text).join("")).toBe("just text");
    expect(lines[1].map((t) => t.text).join("")).toBe("with two lines");
  });

  it("keeps parity for empty content (one empty line)", async () => {
    const lines = await tokenize("", "plaintext");
    expect(lines.length).toBe(1);
    expect(lines[0].map((t) => t.text).join("")).toBe("");
  });
});
