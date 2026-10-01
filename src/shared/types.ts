import type { ThemeId, ThemeInfo } from "./themes";

export type ReviewStatus = "in_progress" | "complete";

export interface ReviewMeta {
  file_name: string;
  file_path: string; // absolute
  size: number; // bytes, session snapshot
  line_count: number;
  language: string; // shiki lang id
  status: ReviewStatus;
  file_hash: string; // session's stored snapshot hash (full 64-hex SHA-256)
  hash_changed: boolean; // FR-2.2: current on-disk hash differs from session hash
}

export interface Token {
  text: string;
  color: string | null;
}

export interface FilePayload {
  content: string; // session snapshot, raw, line-preserving (FR-2.3)
  language: string; // shiki lang id
  lines: Token[][]; // per-line shiki tokens, theme github-dark
}

// content + full tokenization travel in one payload — accepted for v0.0 (local-only transport)

export interface Comment {
  id: number; // DB id; not guaranteed contiguous
  line: number; // 1-based anchor
  line_end: number | null; // inclusive quote end; null = single-line comment
  text: string;
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface CompletePayload {
  report: string;
}

export interface ThemeState {
  theme: ThemeId; // current persisted theme (validated; invalid stored value -> DEFAULT_THEME)
  available: ThemeInfo[];
}
