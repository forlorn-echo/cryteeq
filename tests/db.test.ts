import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type DB,
  completeReview,
  createReview,
  deleteComment,
  getActiveReview,
  getCommentById,
  getLatestReview,
  getReviewById,
  getSetting,
  insertComment,
  listComments,
  openDb,
  restartReview,
  setSetting,
  updateComment,
} from "../src/server/db";

let dir: string;
let db: DB;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cryteeq-db-"));
  db = openDb(join(dir, "test.db"));
});

afterEach(async () => {
  db.close();
  await rm(dir, { recursive: true, force: true });
});

describe("reviews", () => {
  it("creates an in_progress review and fetches it with content", () => {
    const r = createReview(db, "/tmp/a.md", "hash1", "line1\nline2");
    expect(r.status).toBe("in_progress");
    expect(r.content).toBe("line1\nline2");
    const active = getActiveReview(db, "/tmp/a.md");
    expect(active?.id).toBe(r.id);
    expect(active?.content).toBe("line1\nline2");
  });

  it("rejects a second in_progress review for the same path", () => {
    createReview(db, "/tmp/a.md", "h1", "c");
    expect(() => createReview(db, "/tmp/a.md", "h2", "c2")).toThrow();
  });

  it("resume-latest: completed latest -> new creation keeps history", () => {
    const r1 = createReview(db, "/tmp/a.md", "h1", "one");
    completeReview(db, r1.id);
    expect(getActiveReview(db, "/tmp/a.md")).toBeUndefined();
    expect(getLatestReview(db, "/tmp/a.md")?.id).toBe(r1.id);
    const r2 = createReview(db, "/tmp/a.md", "h2", "two");
    expect(getLatestReview(db, "/tmp/a.md")?.id).toBe(r2.id);
    expect(getActiveReview(db, "/tmp/a.md")?.id).toBe(r2.id);
    expect(getReviewById(db, r1.id)?.status).toBe("complete");
    expect(getReviewById(db, r1.id)?.content).toBe("one");
  });

  it("restart deletes the active session (cascading comments) and stores the new snapshot", () => {
    const r1 = createReview(db, "/tmp/a.md", "h1", "old");
    const c1 = insertComment(db, r1.id, 1, null, "note");
    const r2 = restartReview(db, "/tmp/a.md", "h2", "new");
    expect(r2.status).toBe("in_progress");
    expect(r2.content).toBe("new");
    expect(r2.file_hash).toBe("h2");
    const active = getActiveReview(db, "/tmp/a.md");
    expect(active?.id).toBe(r2.id);
    expect(active?.content).toBe("new");
    expect(listComments(db, r2.id)).toEqual([]);
    expect(getCommentById(db, c1.id)).toBeUndefined();
  });

  it("opens the same DB twice with idempotent DDL", () => {
    const second = openDb(join(dir, "test.db"));
    expect(getActiveReview(second, "/tmp/a.md")).toBeUndefined();
    second.close();
  });
});

describe("comments", () => {
  it("CRUD round-trip ordered by (line, id)", () => {
    const r = createReview(db, "/tmp/b.md", "h", "x");
    const c1 = insertComment(db, r.id, 2, null, "first");
    const c2 = insertComment(db, r.id, 1, null, "second");
    const c3 = insertComment(db, r.id, 2, null, "third");
    expect(listComments(db, r.id).map((c) => c.id)).toEqual([
      c2.id,
      c1.id,
      c3.id,
    ]);
    const updated = updateComment(db, c1.id, "edited");
    expect(updated?.text).toBe("edited");
    expect(updated && updated.updated_at >= updated.created_at).toBe(true);
    expect(deleteComment(db, c2.id)).toBe(true);
    expect(deleteComment(db, c2.id)).toBe(false);
    expect(listComments(db, r.id).map((c) => c.id)).toEqual([c1.id, c3.id]);
  });

  it("updateComment on an unknown id returns undefined", () => {
    expect(updateComment(db, 999, "x")).toBeUndefined();
  });

  it("stores and returns line_end for range comments", () => {
    const r = createReview(db, "/tmp/r.md", "h", "x");
    const single = insertComment(db, r.id, 1, null, "single");
    const range = insertComment(db, r.id, 2, 5, "range");
    expect(single.line_end).toBeNull();
    expect(range.line_end).toBe(5);
    expect(getCommentById(db, range.id)?.line_end).toBe(5);
    expect(listComments(db, r.id).map((c) => c.line_end)).toEqual([null, 5]);
  });
});

describe("migration", () => {
  it("upgrades a pre-v0.3 database losslessly and idempotently", () => {
    db.close();
    const dbPath = join(dir, "old.db");
    const legacy = new Database(dbPath);
    legacy.pragma("journal_mode = WAL");
    legacy.pragma("foreign_keys = ON");
    legacy.exec(`
      CREATE TABLE reviews (
        id           INTEGER PRIMARY KEY,
        file_path    TEXT NOT NULL,
        file_hash    TEXT NOT NULL,
        content      TEXT NOT NULL,
        status       TEXT NOT NULL CHECK (status IN ('in_progress', 'complete')),
        created_at   TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE TABLE comments (
        id          INTEGER PRIMARY KEY,
        review_id   INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        text        TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE UNIQUE INDEX idx_reviews_active
        ON reviews (file_path) WHERE status = 'in_progress';
      CREATE INDEX idx_comments_review_line
        ON comments (review_id, line_number);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    const ts = new Date().toISOString();
    const info = legacy
      .prepare(
        "INSERT INTO reviews (file_path, file_hash, content, status, created_at) VALUES ('/tmp/old.md', 'h', 'old', 'in_progress', ?)",
      )
      .run(ts);
    const reviewId = Number(info.lastInsertRowid);
    legacy
      .prepare(
        "INSERT INTO comments (review_id, line_number, text, created_at, updated_at) VALUES (?, 3, 'legacy', ?, ?)",
      )
      .run(reviewId, ts, ts);
    legacy.close();

    const upgraded = openDb(dbPath);
    const comments = listComments(upgraded, reviewId);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.line_end).toBeNull();
    expect(comments[0]?.text).toBe("legacy");
    insertComment(upgraded, reviewId, 3, 7, "range");
    expect(listComments(upgraded, reviewId).map((c) => c.line_end)).toEqual([
      null,
      7,
    ]);

    const reopened = openDb(dbPath);
    expect(listComments(reopened, reviewId).map((c) => c.line_end)).toEqual([
      null,
      7,
    ]);
    reopened.close();
    upgraded.close();
  });
});

describe("settings", () => {
  it("getSetting returns null for a missing key and round-trips a set value", () => {
    expect(getSetting(db, "theme")).toBeNull();
    setSetting(db, "theme", "dark");
    expect(getSetting(db, "theme")).toBe("dark");
  });

  it("setSetting upserts (overwrites the existing value)", () => {
    setSetting(db, "theme", "dark");
    setSetting(db, "theme", "light");
    expect(getSetting(db, "theme")).toBe("light");
  });

  it("survives idempotent reopen", () => {
    setSetting(db, "theme", "catppuccin");
    const second = openDb(join(dir, "test.db"));
    expect(getSetting(second, "theme")).toBe("catppuccin");
    second.close();
  });
});
