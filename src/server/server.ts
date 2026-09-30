import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import fastify, { type FastifyError, type FastifyInstance } from "fastify";
import type { Comment, FilePayload, ReviewMeta } from "../shared/types";
import {
  type CommentRow,
  type DB,
  type ReviewRow,
  completeReview,
  deleteComment,
  getCommentById,
  getReviewById,
  insertComment,
  listComments,
  restartReview,
  updateComment,
} from "./db";
import { type FileMeta, loadFile, sha256 } from "./fileinfo";
import { renderReport } from "./report";
import { tokenize } from "./highlight";

export interface ServerDeps {
  db: DB;
  fileMeta: FileMeta;
  review: ReviewRow;
  onComplete: (report: string, commentCount: number) => void;
  onError?: (message: string) => void;
  completeShutdownDelayMs?: number;
}

const MAX_COMMENT_BYTES = 64 * 1024;

async function currentDiskHash(absolutePath: string): Promise<string | null> {
  try {
    const raw = await readFile(absolutePath);
    if (raw.includes(0)) return null;
    const content = new TextDecoder("utf-8", { fatal: true })
      .decode(raw)
      .replace(/\r\n/g, "\n");
    return sha256(content);
  } catch {
    return null;
  }
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    line: row.line_number,
    text: row.text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function commentTextError(text: unknown): string | null {
  if (typeof text !== "string" || text.trim().length === 0) {
    return "text must be a non-empty string";
  }
  if (Buffer.byteLength(text, "utf8") > MAX_COMMENT_BYTES) {
    return "text exceeds the 64 KiB limit";
  }
  return null;
}

export async function buildServer(deps: ServerDeps): Promise<FastifyInstance> {
  const app = fastify({ logger: false });
  let review = deps.review;
  let fileMeta = deps.fileMeta;
  let completionScheduled = false;
  let cachedReport: string | null = null;

  const clientDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "client",
  );
  const hasClient = existsSync(join(clientDir, "index.html"));
  if (hasClient) {
    await app.register(fastifyStatic, { root: clientDir });
  }

  app.get("/api/review", async (): Promise<ReviewMeta> => {
    const diskHash = await currentDiskHash(fileMeta.absolutePath);
    return {
      file_name: fileMeta.fileName,
      file_path: fileMeta.absolutePath,
      size: fileMeta.size,
      line_count: fileMeta.lineCount,
      language: fileMeta.language,
      status: review.status,
      file_hash: review.file_hash,
      hash_changed: diskHash === null || diskHash !== review.file_hash,
    };
  });

  app.get("/api/file", async (): Promise<FilePayload> => {
    const lines = await tokenize(fileMeta.content, fileMeta.language);
    return { content: fileMeta.content, language: fileMeta.language, lines };
  });

  app.get("/api/comments", async (): Promise<Comment[]> =>
    listComments(deps.db, review.id).map(toComment),
  );

  app.post("/api/comments", async (request, reply) => {
    const body = request.body as { line?: unknown; text?: unknown } | undefined;
    const line = body?.line;
    if (
      typeof line !== "number" ||
      !Number.isInteger(line) ||
      line < 1 ||
      line > fileMeta.lineCount
    ) {
      return reply.code(400).send({
        error: `line must be an integer between 1 and ${fileMeta.lineCount}`,
      });
    }
    const textError = commentTextError(body?.text);
    if (textError) return reply.code(400).send({ error: textError });
    return toComment(
      insertComment(deps.db, review.id, line, body?.text as string),
    );
  });

  app.patch("/api/comments/:id", async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ error: "invalid comment id" });
    }
    const existing = getCommentById(deps.db, id);
    if (!existing || existing.review_id !== review.id) {
      return reply.code(404).send({ error: "comment not found" });
    }
    const body = request.body as { text?: unknown } | undefined;
    const textError = commentTextError(body?.text);
    if (textError) return reply.code(400).send({ error: textError });
    return toComment(
      updateComment(deps.db, id, body?.text as string) as CommentRow,
    );
  });

  app.delete("/api/comments/:id", async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ error: "invalid comment id" });
    }
    const existing = getCommentById(deps.db, id);
    if (!existing || existing.review_id !== review.id) {
      return reply.code(404).send({ error: "comment not found" });
    }
    deleteComment(deps.db, id);
    return reply.code(204).send();
  });

  app.post("/api/review/restart", async () => {
    const fresh = await loadFile(fileMeta.absolutePath);
    review = restartReview(
      deps.db,
      fresh.absolutePath,
      fresh.sha256,
      fresh.content,
    );
    fileMeta = fresh;
    return { ok: true };
  });

  app.post("/api/complete", async () => {
    const rows = listComments(deps.db, review.id);
    if (cachedReport === null) {
      try {
        cachedReport = renderReport({
          fileName: fileMeta.fileName,
          filePath: fileMeta.absolutePath,
          sha256: review.file_hash,
          lines: fileMeta.content.split("\n"),
          comments: rows.map((r) => ({
            id: r.id,
            line: r.line_number,
            text: r.text,
          })),
        });
      } catch (err) {
        const message = `report generation failed: ${(err as Error).message}`;
        deps.onError?.(message);
        throw new Error(message);
      }
      const generated = cachedReport;
      if (!completionScheduled) {
        completionScheduled = true;
        completeReview(deps.db, review.id);
        review = getReviewById(deps.db, review.id) ?? review;
        const count = rows.length;
        setTimeout(
          () => deps.onComplete(generated, count),
          deps.completeShutdownDelayMs ?? 200,
        );
      }
    }
    return { report: cachedReport };
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith("/api/")) {
      return reply.code(404).send({ error: "not found" });
    }
    if (hasClient) {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send({ error: "client not built" });
  });

  app.setErrorHandler((err: FastifyError, _request, reply) => {
    const status = err.statusCode ?? 500;
    return reply.code(status).send({ error: err.message });
  });

  return app;
}
