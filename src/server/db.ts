import Database from "better-sqlite3";

export type DB = Database.Database;

export type ReviewStatus = "in_progress" | "complete";

export interface ReviewRow {
  id: number;
  file_path: string;
  file_hash: string;
  content: string;
  status: ReviewStatus;
  created_at: string;
  completed_at: string | null;
}

export interface CommentRow {
  id: number;
  review_id: number;
  line_number: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export function openDb(dbPath: string): DB {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id           INTEGER PRIMARY KEY,
      file_path    TEXT NOT NULL,
      file_hash    TEXT NOT NULL,
      content      TEXT NOT NULL,
      status       TEXT NOT NULL CHECK (status IN ('in_progress', 'complete')),
      created_at   TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          INTEGER PRIMARY KEY,
      review_id   INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      line_number INTEGER NOT NULL,
      text        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_active
      ON reviews (file_path) WHERE status = 'in_progress';

    CREATE INDEX IF NOT EXISTS idx_comments_review_line
      ON comments (review_id, line_number);
  `);
  return db;
}

function now(): string {
  return new Date().toISOString();
}

export function getReviewById(db: DB, id: number): ReviewRow | undefined {
  return db.prepare("SELECT * FROM reviews WHERE id = ?").get(id) as
    ReviewRow | undefined;
}

export function getActiveReview(
  db: DB,
  filePath: string,
): ReviewRow | undefined {
  return db
    .prepare(
      "SELECT * FROM reviews WHERE file_path = ? AND status = 'in_progress'",
    )
    .get(filePath) as ReviewRow | undefined;
}

export function getLatestReview(
  db: DB,
  filePath: string,
): ReviewRow | undefined {
  return db
    .prepare(
      "SELECT * FROM reviews WHERE file_path = ? ORDER BY id DESC LIMIT 1",
    )
    .get(filePath) as ReviewRow | undefined;
}

export function createReview(
  db: DB,
  filePath: string,
  fileHash: string,
  content: string,
): ReviewRow {
  const info = db
    .prepare(
      "INSERT INTO reviews (file_path, file_hash, content, status, created_at) VALUES (?, ?, ?, 'in_progress', ?)",
    )
    .run(filePath, fileHash, content, now());
  return getReviewById(db, Number(info.lastInsertRowid)) as ReviewRow;
}

export function completeReview(db: DB, id: number): void {
  db.prepare(
    "UPDATE reviews SET status = 'complete', completed_at = ? WHERE id = ?",
  ).run(now(), id);
}

export function restartReview(
  db: DB,
  filePath: string,
  fileHash: string,
  content: string,
): ReviewRow {
  const run = db.transaction(() => {
    db.prepare(
      "DELETE FROM reviews WHERE file_path = ? AND status = 'in_progress'",
    ).run(filePath);
    return createReview(db, filePath, fileHash, content);
  });
  return run();
}

export function getCommentById(db: DB, id: number): CommentRow | undefined {
  return db.prepare("SELECT * FROM comments WHERE id = ?").get(id) as
    CommentRow | undefined;
}

export function listComments(db: DB, reviewId: number): CommentRow[] {
  return db
    .prepare(
      "SELECT * FROM comments WHERE review_id = ? ORDER BY line_number, id",
    )
    .all(reviewId) as CommentRow[];
}

export function insertComment(
  db: DB,
  reviewId: number,
  line: number,
  text: string,
): CommentRow {
  const ts = now();
  const info = db
    .prepare(
      "INSERT INTO comments (review_id, line_number, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(reviewId, line, text, ts, ts);
  return getCommentById(db, Number(info.lastInsertRowid)) as CommentRow;
}

export function updateComment(
  db: DB,
  id: number,
  text: string,
): CommentRow | undefined {
  const res = db
    .prepare("UPDATE comments SET text = ?, updated_at = ? WHERE id = ?")
    .run(text, now(), id);
  if (res.changes === 0) return undefined;
  return getCommentById(db, id);
}

export function deleteComment(db: DB, id: number): boolean {
  return db.prepare("DELETE FROM comments WHERE id = ?").run(id).changes > 0;
}
