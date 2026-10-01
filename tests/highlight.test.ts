import { describe, expect, it } from "vitest";
import { tokenize } from "../src/server/highlight";
import { SHIKI_THEMES } from "../src/server/highlight";
import { THEME_IDS } from "../src/shared/themes";
import type { Token } from "../src/shared/types";

function colors(lines: Token[][]): string {
  return lines
    .flat()
    .map((t) => t.color)
    .filter((c): c is string => c !== null)
    .join("|");
}

describe("tokenize", () => {
  it("returns one token line per content line for a known lang, in every theme", async () => {
    const content = "# Title\n\nsome text\n";
    for (const theme of THEME_IDS) {
      const lines = await tokenize(content, "markdown", theme);
      expect(lines.length, theme).toBe(content.split("\n").length);
      expect(lines.length, theme).toBe(4);
      expect(lines[0].map((t) => t.text).join(""), theme).toBe("# Title");
      expect(lines[2].map((t) => t.text).join(""), theme).toBe("some text");
      expect(
        lines[0].some((t) => t.color !== null),
        theme,
      ).toBe(true);
    }
  });

  it("colors the same content differently across themes", async () => {
    const content = "# Title\nsome `code`\n";
    const light = colors(await tokenize(content, "markdown", "light"));
    const dark = colors(await tokenize(content, "markdown", "dark"));
    const catppuccin = colors(
      await tokenize(content, "markdown", "catppuccin"),
    );
    expect(light).not.toBe(dark);
    expect(light).not.toBe(catppuccin);
    expect(dark).not.toBe(catppuccin);
  });

  it("falls back to plaintext for an unknown lang, per theme", async () => {
    const content = "just text\nwith two lines\n";
    for (const theme of THEME_IDS) {
      const lines = await tokenize(content, "definitely-not-a-lang", theme);
      expect(lines.length, theme).toBe(3);
      expect(lines[0].map((t) => t.text).join(""), theme).toBe("just text");
      expect(lines[1].map((t) => t.text).join(""), theme).toBe(
        "with two lines",
      );
    }
  });

  it("keeps parity for empty content (one empty line)", async () => {
    const lines = await tokenize("", "plaintext", "catppuccin");
    expect(lines.length).toBe(1);
    expect(lines[0].map((t) => t.text).join("")).toBe("");
  });

  it("maps every registry theme to a bundled shiki theme", () => {
    expect(Object.keys(SHIKI_THEMES).sort()).toEqual([...THEME_IDS].sort());
  });
});
