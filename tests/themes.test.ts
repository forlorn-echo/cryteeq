import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SHIKI_THEMES } from "../src/server/highlight";
import {
  DEFAULT_THEME,
  THEME_IDS,
  THEMES,
  isThemeId,
} from "../src/shared/themes";

describe("theme registry", () => {
  it("has unique ids", () => {
    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length);
  });

  it("defaults to catppuccin and lists every theme with a label", () => {
    expect(DEFAULT_THEME).toBe("catppuccin");
    expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS]);
    for (const theme of THEMES) {
      expect(theme.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("validates theme ids", () => {
    expect(isThemeId("catppuccin")).toBe(true);
    expect(isThemeId("light")).toBe(true);
    expect(isThemeId("dark")).toBe(true);
    expect(isThemeId("solarized")).toBe(false);
    expect(isThemeId(42)).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
  });

  it("maps every theme id to a shiki theme", () => {
    expect(Object.keys(SHIKI_THEMES).sort()).toEqual([...THEME_IDS].sort());
  });

  it("defines a CSS palette block per theme id and all tokens in :root", () => {
    const cssPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "src",
      "client",
      "index.css",
    );
    const css = readFileSync(cssPath, "utf8");
    for (const id of THEME_IDS) {
      if (id === DEFAULT_THEME) continue;
      expect(css, id).toContain(`:root[data-theme="${id}"]`);
    }
    const rootBlock = css.slice(css.indexOf(":root {"));
    for (const token of [
      "app",
      "surface",
      "raised",
      "line",
      "line-strong",
      "fg",
      "muted",
      "faint",
      "accent",
      "accent-hover",
      "accent-fg",
      "accent-soft",
      "danger",
      "danger-hover",
      "danger-fg",
      "warning",
    ]) {
      expect(rootBlock, token).toContain(`--ct-${token}:`);
    }
  });
});
