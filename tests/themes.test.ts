import { describe, expect, it } from "vitest";
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
});
