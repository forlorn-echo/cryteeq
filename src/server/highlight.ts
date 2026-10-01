import {
  createHighlighter,
  type BundledLanguage,
  type BundledTheme,
  type Highlighter,
  type SpecialLanguage,
  type ThemedToken,
} from "shiki";
import type { ThemeId } from "../shared/themes";
import type { Token } from "../shared/types";

export const SHIKI_THEMES: Record<ThemeId, BundledTheme> = {
  light: "github-light",
  dark: "github-dark",
  catppuccin: "catppuccin-mocha",
};

let highlighter: Highlighter | null = null;
const loadedLangs = new Set<string>();
const loadedThemes = new Set<string>();

type ShikiLang = BundledLanguage | SpecialLanguage;

async function getHighlighter(
  lang: string,
  theme: ThemeId,
): Promise<Highlighter> {
  const shikiTheme = SHIKI_THEMES[theme];
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: [shikiTheme],
      langs: ["plaintext"],
    });
    loadedThemes.add(shikiTheme);
    loadedLangs.add("plaintext");
  }
  if (!loadedThemes.has(shikiTheme)) {
    await highlighter.loadTheme(shikiTheme);
    loadedThemes.add(shikiTheme);
  }
  if (!loadedLangs.has(lang)) {
    await highlighter.loadLanguage(lang as ShikiLang);
    loadedLangs.add(lang);
  }
  return highlighter;
}

function toLines(tokens: ThemedToken[][]): Token[][] {
  return tokens.map((line) =>
    line.map((t) => ({ text: t.content, color: t.color ?? null })),
  );
}

export async function tokenize(
  content: string,
  language: string,
  theme: ThemeId,
): Promise<Token[][]> {
  const expected = content.split("\n").length;
  let lines: Token[][];
  try {
    const h = await getHighlighter(language, theme);
    lines = toLines(
      h.codeToTokens(content, {
        lang: language as ShikiLang,
        theme: SHIKI_THEMES[theme],
      }).tokens,
    );
  } catch {
    const h = await getHighlighter("plaintext", theme);
    lines = toLines(
      h.codeToTokens(content, {
        lang: "plaintext",
        theme: SHIKI_THEMES[theme],
      }).tokens,
    );
  }
  while (lines.length < expected) lines.push([]);
  return lines.slice(0, expected);
}
