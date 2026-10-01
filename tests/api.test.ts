import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type DB,
  type ReviewRow,
  createReview,
  getActiveReview,
  getSetting,
  openDb,
  setSetting,
} from "../src/server/db";
import { type FileMeta, loadFile } from "../src/server/fileinfo";
import { buildServer } from "../src/server/server";

let dir: string;
let db: DB;
let fileMeta: FileMeta;
let review: ReviewRow;
let app: FastifyInstance;
let completed: { report: string; count: number } | null;
let completeCalls: number;
let errorEvents: string[];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cryteeq-api-"));
  const filePath = join(dir, "notes.md");
  await writeFile(filePath, "# Hello\n\nWorld\n");
  fileMeta = await loadFile(filePath);
  db = openDb(join(dir, "test.db"));
  review = createReview(
    db,
    fileMeta.absolutePath,
    fileMeta.sha256,
    fileMeta.content,
  );
  completed = null;
  completeCalls = 0;
  errorEvents = [];
  app = await buildServer({
    db,
    fileMeta,
    review,
    onComplete: (report, count) => {
      completed = { report, count };
      completeCalls += 1;
    },
    onError: (message) => errorEvents.push(message),
    completeShutdownDelayMs: 10,
  });
});

afterEach(async () => {
  await app.close();
  db.close();
  await rm(dir, { recursive: true, force: true });
});

describe("GET /api/review", () => {
  it("returns metadata with hash_changed false", async () => {
    const res = await app.inject({ method: "GET", url: "/api/review" });
    expect(res.statusCode).toBe(200);
    const meta = res.json();
    expect(meta.file_name).toBe("notes.md");
    expect(meta.status).toBe("in_progress");
    expect(meta.file_hash).toBe(fileMeta.sha256);
    expect(meta.hash_changed).toBe(false);
    expect(meta.line_count).toBe(fileMeta.lineCount);
    expect(meta.language).toBe("markdown");
  });

  it("flags hash_changed when the file changes on disk", async () => {
    await writeFile(fileMeta.absolutePath, "# Changed\n");
    const res = await app.inject({ method: "GET", url: "/api/review" });
    expect(res.statusCode).toBe(200);
    expect(res.json().hash_changed).toBe(true);
  });

  it("flags hash_changed (still 200) when the file is deleted", async () => {
    await rm(fileMeta.absolutePath);
    const res = await app.inject({ method: "GET", url: "/api/review" });
    expect(res.statusCode).toBe(200);
    expect(res.json().hash_changed).toBe(true);
  });
});

describe("GET /api/file", () => {
  it("serves the session snapshot with token parity", async () => {
    const res = await app.inject({ method: "GET", url: "/api/file" });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.content).toBe("# Hello\n\nWorld\n");
    expect(payload.lines.length).toBe(fileMeta.lineCount);
    expect(payload.language).toBe("markdown");
  });

  it("rejects an unknown theme query with 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/file?theme=solarized",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "unknown theme" });
  });

  it("tokenizes with the requested theme and keeps line parity", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/file?theme=light",
    });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.lines.length).toBe(fileMeta.lineCount);
  });

  it("uses the stored theme when the query is absent", async () => {
    setSetting(db, "theme", "light");
    const stored = await app.inject({ method: "GET", url: "/api/file" });
    const explicit = await app.inject({
      method: "GET",
      url: "/api/file?theme=light",
    });
    expect(stored.statusCode).toBe(200);
    expect(stored.json()).toEqual(explicit.json());
  });
});

describe("theme endpoints", () => {
  it("GET /api/theme defaults to catppuccin when no setting is stored", async () => {
    const res = await app.inject({ method: "GET", url: "/api/theme" });
    expect(res.statusCode).toBe(200);
    const state = res.json();
    expect(state.theme).toBe("catppuccin");
    expect(state.available.map((t: { id: string }) => t.id)).toEqual([
      "light",
      "dark",
      "catppuccin",
    ]);
  });

  it("GET /api/theme returns the stored theme and falls back on invalid stored values", async () => {
    setSetting(db, "theme", "dark");
    const res = await app.inject({ method: "GET", url: "/api/theme" });
    expect(res.json().theme).toBe("dark");

    setSetting(db, "theme", "not-a-theme");
    const fallback = await app.inject({ method: "GET", url: "/api/theme" });
    expect(fallback.json().theme).toBe("catppuccin");
  });

  it("PUT /api/theme persists a valid theme and returns the state", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/theme",
      payload: { theme: "light" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().theme).toBe("light");
    expect(getSetting(db, "theme")).toBe("light");

    const state = await app.inject({ method: "GET", url: "/api/theme" });
    expect(state.json().theme).toBe("light");
  });

  it("PUT /api/theme rejects an unknown theme with 400 and does not persist", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/theme",
      payload: { theme: "solarized" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "unknown theme" });
    expect(getSetting(db, "theme")).toBeNull();

    const missing = await app.inject({ method: "PUT", url: "/api/theme" });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toEqual({ error: "unknown theme" });
  });
});

describe("comments CRUD", () => {
  it("creates, lists, patches, deletes", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 1, text: "first" },
    });
    expect(first.statusCode).toBe(200);
    const c1 = first.json();
    expect(c1.line).toBe(1);
    expect(c1.line_end).toBeNull();
    expect(c1.text).toBe("first");

    const second = await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 3, text: "second" },
    });
    expect(second.statusCode).toBe(200);

    const list = await app.inject({ method: "GET", url: "/api/comments" });
    expect(list.json().map((c: { id: number }) => c.id)).toEqual([
      c1.id,
      second.json().id,
    ]);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/comments/${c1.id}`,
      payload: { text: "edited" },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().text).toBe("edited");

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/comments/${c1.id}`,
    });
    expect(deleted.statusCode).toBe(204);
    const gone = await app.inject({
      method: "DELETE",
      url: `/api/comments/${c1.id}`,
    });
    expect(gone.statusCode).toBe(404);
  });

  it("rejects invalid payloads with 400", async () => {
    const cases = [
      { line: 0, text: "x" },
      { line: fileMeta.lineCount + 1, text: "x" },
      { line: 1.5, text: "x" },
      { line: "1", text: "x" },
      { line: 1, text: "   " },
      { line: 1, text: "a".repeat(65 * 1024) },
    ];
    for (const payload of cases) {
      const res = await app.inject({
        method: "POST",
        url: "/api/comments",
        payload,
      });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(res.json().error).toBeTruthy();
    }
  });

  it("rejects non-numeric :id with 400 and unknown id with 404", async () => {
    const bad = await app.inject({
      method: "PATCH",
      url: "/api/comments/abc",
      payload: { text: "x" },
    });
    expect(bad.statusCode).toBe(400);
    const missing = await app.inject({
      method: "PATCH",
      url: "/api/comments/999",
      payload: { text: "x" },
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error).toBe("comment not found");
  });

  it("accepts a valid range and returns line_end on every comment", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 1, line_end: 3, text: "range" },
    });
    expect(created.statusCode).toBe(200);
    expect(created.json().line_end).toBe(3);
    const single = await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 3, line_end: 3, text: "explicit single" },
    });
    expect(single.statusCode).toBe(200);
    expect(single.json().line_end).toBe(3);
    const list = await app.inject({ method: "GET", url: "/api/comments" });
    const body = list.json();
    expect(body).toHaveLength(2);
    expect(body[0].line_end).toBe(3);
    expect(body[1].line_end).toBe(3);
  });

  it("treats absent and null line_end as single-line", async () => {
    const absent = await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 1, text: "absent" },
    });
    expect(absent.statusCode).toBe(200);
    expect(absent.json().line_end).toBeNull();
    const explicitNull = await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 1, line_end: null, text: "explicit null" },
    });
    expect(explicitNull.statusCode).toBe(200);
    expect(explicitNull.json().line_end).toBeNull();
  });

  it("rejects invalid line_end values with 400", async () => {
    const lineCount = fileMeta.lineCount;
    const cases = [
      { line: 2, line_end: 1, text: "reversed" },
      { line: 1, line_end: lineCount + 1, text: "past end" },
      { line: 1, line_end: 1.5, text: "fractional" },
      { line: 1, line_end: "3", text: "string" },
      { line: 1, line_end: 0, text: "zero" },
      { line: 1, line_end: -1, text: "negative" },
    ];
    for (const payload of cases) {
      const res = await app.inject({
        method: "POST",
        url: "/api/comments",
        payload,
      });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(res.json().error).toMatch(
        /^line_end must be an integer between \d+ and \d+$/,
      );
    }
  });
});

describe("POST /api/review/restart", () => {
  it("discards comments, snapshots fresh content, and reports ok", async () => {
    await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 1, text: "old" },
    });
    await writeFile(fileMeta.absolutePath, "# Changed\n");
    const res = await app.inject({
      method: "POST",
      url: "/api/review/restart",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const list = await app.inject({ method: "GET", url: "/api/comments" });
    expect(list.json()).toEqual([]);

    const file = await app.inject({ method: "GET", url: "/api/file" });
    expect(file.json().content).toBe("# Changed\n");

    const meta = await app.inject({ method: "GET", url: "/api/review" });
    expect(meta.json().hash_changed).toBe(false);
    expect(getActiveReview(db, fileMeta.absolutePath)?.content).toBe(
      "# Changed\n",
    );
  });

  it("returns 500 with an error body when the file became binary", async () => {
    await writeFile(fileMeta.absolutePath, Buffer.from([0x00, 0x01]));
    const res = await app.inject({
      method: "POST",
      url: "/api/review/restart",
    });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(typeof body.error).toBe("string");
    expect(Object.keys(body)).toEqual(["error"]);
  });
});

describe("POST /api/complete", () => {
  it("returns the report and triggers onComplete exactly once", async () => {
    await app.inject({
      method: "POST",
      url: "/api/comments",
      payload: { line: 1, text: "note" },
    });
    const res = await app.inject({ method: "POST", url: "/api/complete" });
    expect(res.statusCode).toBe(200);
    const report = res.json().report;
    expect(report).toContain("# Review: notes.md");
    expect(report).toContain("> note\n");

    const repeat = await app.inject({ method: "POST", url: "/api/complete" });
    expect(repeat.statusCode).toBe(200);
    expect(repeat.json().report).toBe(report);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(completeCalls).toBe(1);
    expect(completed?.count).toBe(1);
    expect(completed?.report).toBe(report);
    expect(errorEvents).toEqual([]);
  });

  it("marks the session complete while still servable", async () => {
    await app.inject({ method: "POST", url: "/api/complete" });
    const meta = await app.inject({ method: "GET", url: "/api/review" });
    expect(meta.json().status).toBe("complete");
  });
});

describe("error contract", () => {
  it("returns 404 {error} for unknown /api/* routes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "not found" });
  });

  it("error bodies never contain stack traces", async () => {
    await writeFile(fileMeta.absolutePath, Buffer.from([0x00, 0x01]));
    const res = await app.inject({
      method: "POST",
      url: "/api/review/restart",
    });
    expect(res.body).not.toContain(" at ");
    expect(Object.keys(res.json())).toEqual(["error"]);
  });
});
