import {
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
  type SpecialLanguage,
  type ThemedToken,
} from "shiki";
import type { Token } from "../shared/types";

let highlighter: Highlighter | null = null;
const loadedLangs = new Set<string>();

type ShikiLang = BundledLanguage | SpecialLanguage;

async function getHighlighter(lang: string): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark"],
      langs: ["plaintext"],
    });
    loadedLangs.add("plaintext");
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
): Promise<Token[][]> {
  const expected = content.split("\n").length;
  let lines: Token[][];
  try {
    const h = await getHighlighter(language);
    lines = toLines(
      h.codeToTokens(content, {
        lang: language as ShikiLang,
        theme: "github-dark",
      }).tokens,
    );
  } catch {
    const h = await getHighlighter("plaintext");
    lines = toLines(
      h.codeToTokens(content, {
        lang: "plaintext",
        theme: "github-dark",
      }).tokens,
    );
  }
  while (lines.length < expected) lines.push([]);
  return lines.slice(0, expected);
}
