import { basename } from "node:path";
import {
  type DB,
  type ReviewRow,
  createReview,
  getActiveReview,
  restartReview,
} from "./db";
import { detectLanguage, type FileMeta, loadFile } from "./fileinfo";

export interface SessionResolution {
  review: ReviewRow;
  fileMeta: FileMeta;
  resumed: boolean;
  fresh: boolean;
}

function metaFromSnapshot(absolutePath: string, row: ReviewRow): FileMeta {
  return {
    absolutePath,
    fileName: basename(absolutePath),
    size: Buffer.byteLength(row.content, "utf8"),
    sha256: row.file_hash,
    language: detectLanguage(absolutePath),
    content: row.content,
    lineCount: row.content.split("\n").length,
  };
}

export async function resolveSession(
  db: DB,
  fileInput: string,
  absolutePath: string,
  startFresh: boolean,
): Promise<SessionResolution> {
  const active = getActiveReview(db, absolutePath);
  if (active && !startFresh) {
    return {
      review: active,
      fileMeta: metaFromSnapshot(absolutePath, active),
      resumed: true,
      fresh: false,
    };
  }
  const freshMeta = await loadFile(fileInput);
  const review = active
    ? restartReview(
        db,
        freshMeta.absolutePath,
        freshMeta.sha256,
        freshMeta.content,
      )
    : createReview(
        db,
        freshMeta.absolutePath,
        freshMeta.sha256,
        freshMeta.content,
      );
  return { review, fileMeta: freshMeta, resumed: false, fresh: startFresh };
}
