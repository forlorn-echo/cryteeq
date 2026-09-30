import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

const LANG_BY_EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "mdx",
  py: "python",
  pyi: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  cs: "csharp",
  php: "php",
  sql: "sql",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  ini: "ini",
  env: "shellscript",
  html: "html",
  htm: "html",
  xml: "xml",
  css: "css",
  scss: "scss",
  less: "less",
  txt: "plaintext",
  log: "plaintext",
};

export class FileError extends Error {}

export interface FileMeta {
  absolutePath: string;
  fileName: string;
  size: number;
  sha256: string;
  language: string;
  content: string;
  lineCount: number;
}

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function detectLanguage(filePath: string): string {
  const ext = extname(filePath).slice(1).toLowerCase();
  return LANG_BY_EXT[ext] ?? "plaintext";
}

export async function loadFile(input: string): Promise<FileMeta> {
  const absolutePath = resolve(input);
  let stats;
  try {
    stats = await stat(absolutePath);
  } catch {
    throw new FileError(`file not found: ${input}`);
  }
  if (!stats.isFile()) {
    throw new FileError(`not a regular file: ${input}`);
  }
  let raw: Buffer;
  try {
    raw = await readFile(absolutePath);
  } catch {
    throw new FileError(`file is not readable: ${input}`);
  }
  if (raw.includes(0)) {
    throw new FileError(`binary file is not supported: ${input}`);
  }
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    throw new FileError(`file is not valid UTF-8: ${input}`);
  }
  const content = decoded.replace(/\r\n/g, "\n");
  return {
    absolutePath,
    fileName: basename(absolutePath),
    size: Buffer.byteLength(content, "utf8"),
    sha256: sha256(content),
    language: detectLanguage(absolutePath),
    content,
    lineCount: content.split("\n").length,
  };
}
