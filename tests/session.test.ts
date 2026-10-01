import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type DB,
  type ReviewRow,
  completeReview,
  createReview,
  getActiveReview,
  getReviewById,
  getCommentById,
  insertComment,
  listComments,
  openDb,
} from "../src/server/db";
import { FileError } from "../src/server/fileinfo";
import { resolveSession } from "../src/server/session";

let dir: string;
let db: DB;
let filePath: string;
let absolutePath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cryteeq-session-"));
  filePath = join(dir, "notes.md");
  await writeFile(filePath, "# One\n\ntwo\n");
  absolutePath = filePath;
  db = openDb(join(dir, "test.db"));
});

afterEach(async () => {
  db.close();
  await rm(dir, { recursive: true, force: true });
});

function seedSession(content: string): ReviewRow {
  return createReview(db, absolutePath, `hash-${content.length}`, content);
}

describe("resolveSession — resume (flag absent)", () => {
  it("resumes an in-progress session from the DB snapshot, ignoring disk changes", async () => {
    const original = seedSession("# One\n\ntwo\n");
    insertComment(db, original.id, 1, null, "old comment");
    await writeFile(filePath, "# Changed on disk\n");

    const session = await resolveSession(db, filePath, absolutePath, false);

    expect(session.resumed).toBe(true);
    expect(session.fresh).toBe(false);
    expect(session.review.id).toBe(original.id);
    expect(session.fileMeta.content).toBe("# One\n\ntwo\n");
    expect(session.fileMeta.sha256).toBe(original.file_hash);
    expect(session.fileMeta.lineCount).toBe(4);
    expect(session.fileMeta.language).toBe("markdown");
    expect(listComments(db, original.id)).toHaveLength(1);
  });

  it("creates a new session when the latest is complete, retaining history", async () => {
    const done = seedSession("# One\n\ntwo\n");
    completeReview(db, done.id);

    const session = await resolveSession(db, filePath, absolutePath, false);

    expect(session.resumed).toBe(false);
    expect(session.fresh).toBe(false);
    expect(session.review.id).not.toBe(done.id);
    expect(session.review.status).toBe("in_progress");
    expect(getReviewById(db, done.id)?.status).toBe("complete");
    expect(getActiveReview(db, absolutePath)?.id).toBe(session.review.id);
  });
});

describe("resolveSession — --start-fresh", () => {
  it("discards an in-progress session and snapshots current disk content", async () => {
    const original = seedSession("# One\n\ntwo\n");
    const comment = insertComment(db, original.id, 1, null, "old comment");
    await writeFile(filePath, "# Two\n\nthree\n");

    const session = await resolveSession(db, filePath, absolutePath, true);

    expect(session.resumed).toBe(false);
    expect(session.fresh).toBe(true);
    expect(session.fileMeta.content).toBe("# Two\n\nthree\n");
    expect(session.review.content).toBe("# Two\n\nthree\n");
    expect(session.review.file_hash).toBe(session.fileMeta.sha256);
    expect(getActiveReview(db, absolutePath)?.id).toBe(session.review.id);
    expect(listComments(db, session.review.id)).toEqual([]);
    expect(getCommentById(db, comment.id)).toBeUndefined();
  });

  it("starts a new session when none exists", async () => {
    const session = await resolveSession(db, filePath, absolutePath, true);

    expect(session.resumed).toBe(false);
    expect(session.fresh).toBe(true);
    expect(session.review.status).toBe("in_progress");
    expect(session.fileMeta.content).toBe("# One\n\ntwo\n");
    expect(getActiveReview(db, absolutePath)?.id).toBe(session.review.id);
  });

  it("keeps completed history and starts a new session", async () => {
    const done = seedSession("# One\n\ntwo\n");
    completeReview(db, done.id);

    const session = await resolveSession(db, filePath, absolutePath, true);

    expect(session.fresh).toBe(true);
    expect(getReviewById(db, done.id)?.status).toBe("complete");
    expect(getActiveReview(db, absolutePath)?.id).toBe(session.review.id);
  });

  it("leaves an interrupted session untouched when the file fails to load", async () => {
    const original = seedSession("# One\n\ntwo\n");
    insertComment(db, original.id, 1, null, "saved comment");
    await rm(filePath);

    await expect(
      resolveSession(db, filePath, absolutePath, true),
    ).rejects.toBeInstanceOf(FileError);

    expect(getActiveReview(db, absolutePath)?.id).toBe(original.id);
    expect(listComments(db, original.id)).toHaveLength(1);
  });
});
