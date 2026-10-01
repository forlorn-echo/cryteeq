import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    const c1 = insertComment(db, r1.id, 1, "note");
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
    const c1 = insertComment(db, r.id, 2, "first");
    const c2 = insertComment(db, r.id, 1, "second");
    const c3 = insertComment(db, r.id, 2, "third");
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
