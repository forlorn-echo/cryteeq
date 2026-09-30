import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import net from "node:net";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import open from "open";
import {
  type DB,
  type ReviewRow,
  createReview,
  getActiveReview,
  openDb,
} from "./db";
import { FileError, detectLanguage, type FileMeta, loadFile } from "./fileinfo";
import { logError } from "./logger";
import { buildServer } from "./server";

const USAGE =
  "usage: cryteeq [--port <n>] [--no-open] [--stdout] [--help] [--version] <file>";

function info(message: string): void {
  process.stderr.write(`${message}\n`);
}

function fail(message: string): never {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function version(): string {
  try {
    const pkgPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "package.json",
    );
    return (JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string })
      .version;
  } catch {
    return "0.0.0";
  }
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const probe = net.createServer();
    probe.once("error", () => resolvePromise(false));
    probe.once("listening", () => probe.close(() => resolvePromise(true)));
    probe.listen(port, "127.0.0.1");
  });
}

async function findPort(start: number): Promise<number | null> {
  for (let candidate = start; candidate < start + 100; candidate++) {
    if (await isPortFree(candidate)) return candidate;
  }
  return null;
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

async function main(): Promise<void> {
  const parsed = (() => {
    try {
      return parseArgs({
        allowPositionals: true,
        options: {
          port: { type: "string" },
          "no-open": { type: "boolean" },
          stdout: { type: "boolean" },
          help: { type: "boolean" },
          version: { type: "boolean" },
        },
      });
    } catch {
      process.stderr.write(`error: invalid arguments\n${USAGE}\n`);
      process.exit(1);
    }
  })();
  const { values, positionals } = parsed;

  if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (values.version) {
    process.stdout.write(`${version()}\n`);
    return;
  }

  const fileInput = positionals[0];
  if (!fileInput) {
    fail(`no file specified\n${USAGE}`);
  }

  let port: number;
  if (values.port !== undefined) {
    port = Number.parseInt(values.port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      fail(`invalid --port value: ${values.port}`);
    }
    if (!(await isPortFree(port))) {
      const message = `port ${port} is already in use`;
      logError(message);
      fail(message);
    }
  } else {
    const found = await findPort(4173);
    if (found === null) {
      const message = "no free port found after 100 attempts";
      logError(message);
      fail(message);
    }
    port = found;
  }

  const dbPath =
    process.env.CRYTEEQ_DB ?? join(homedir(), ".cryteeq", "cryteeq.db");
  let db: DB;
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
    db = openDb(dbPath);
  } catch (err) {
    const message = `failed to open database: ${(err as Error).message}`;
    logError(message);
    fail(message);
  }

  const absolutePath = resolve(fileInput);
  let resumed = false;
  let fileMeta: FileMeta;
  let review: ReviewRow;
  const active = getActiveReview(db, absolutePath);
  if (active) {
    resumed = true;
    review = active;
    fileMeta = metaFromSnapshot(absolutePath, active);
  } else {
    try {
      fileMeta = await loadFile(fileInput);
    } catch (err) {
      const message =
        err instanceof FileError
          ? err.message
          : `failed to load file: ${(err as Error).message}`;
      logError(message);
      fail(message);
    }
    review = createReview(db, absolutePath, fileMeta.sha256, fileMeta.content);
  }

  let completion: { report: string; count: number } | null = null;
  let closing = false;
  let completionStarted = false;

  async function finish(code: number): Promise<void> {
    if (closing) return;
    closing = true;
    try {
      await app.close();
    } catch {}
    if (code === 0 && completion) {
      if (values.stdout) {
        const report = completion.report.endsWith("\n")
          ? completion.report
          : `${completion.report}\n`;
        process.stdout.write(report);
      }
      info(
        `Review complete: ${completion.count} comment${completion.count === 1 ? "" : "s"}.`,
      );
    }
    process.exit(code);
  }

  const app = await buildServer({
    db,
    fileMeta,
    review,
    onComplete: (report, count) => {
      completion = { report, count };
      completionStarted = true;
      void finish(0);
    },
    onError: (message) => {
      info(`error: ${message}`);
      logError(message);
    },
  });

  process.on("SIGINT", () => {
    if (completionStarted) return;
    info("\nInterrupted — comments are saved; re-run cryteeq to resume.");
    void finish(130);
  });
  process.on("SIGTERM", () => {
    if (completionStarted) return;
    info("\nTerminated — comments are saved; re-run cryteeq to resume.");
    void finish(130);
  });
  process.on("uncaughtException", (err) => {
    const message = `uncaught exception: ${err.message}`;
    process.stderr.write(`error: ${message}\n`);
    logError(message);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    const message =
      reason instanceof Error
        ? `unhandled rejection: ${reason.message}`
        : `unhandled rejection: ${String(reason)}`;
    process.stderr.write(`error: ${message}\n`);
    logError(message);
    process.exit(1);
  });

  try {
    await app.listen({ port, host: "127.0.0.1" });
  } catch (err) {
    const message = `failed to start server: ${(err as Error).message}`;
    logError(message);
    fail(message);
  }

  const url = `http://127.0.0.1:${port}`;
  info(`Review ${resumed ? "resumed" : "started"}: ${url}`);
  if (!values["no-open"]) {
    open(url).catch(() => {});
  }
}

main().catch((err) => {
  const message = (err as Error)?.message ?? String(err);
  process.stderr.write(`error: ${message}\n`);
  logError(message);
  process.exit(1);
});
