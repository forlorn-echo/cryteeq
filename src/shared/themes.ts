export const THEME_IDS = ["light", "dark", "catppuccin"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeInfo {
  id: ThemeId;
  label: string;
}

export const THEMES: ThemeInfo[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "catppuccin", label: "Catppuccin" },
];

export const DEFAULT_THEME: ThemeId = "catppuccin";

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}
