import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dir: string;
let logDir: string;
let savedEnv: string | undefined;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cryteeq-logger-"));
  logDir = join(dir, "logs");
  savedEnv = process.env.CRYTEEQ_LOG_DIR;
  process.env.CRYTEEQ_LOG_DIR = logDir;
});

afterEach(async () => {
  vi.useRealTimers();
  if (savedEnv === undefined) {
    delete process.env.CRYTEEQ_LOG_DIR;
  } else {
    process.env.CRYTEEQ_LOG_DIR = savedEnv;
  }
  await rm(dir, { recursive: true, force: true });
});

async function importLogger() {
  vi.resetModules();
  return import("../src/server/logger");
}

describe("logError", () => {
  it("creates nothing until the first emit", async () => {
    await importLogger();
    expect(existsSync(logDir)).toBe(false);
  });

  it("creates the directory and a correctly named file on first emit, then appends", async () => {
    const { logError } = await importLogger();
    logError("first failure");
    expect(existsSync(logDir)).toBe(true);
    const files = readdirSync(logDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-\d+\.log$/,
    );
    const first = readFileSync(join(logDir, files[0]), "utf8");
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}T[^\n]+ ERROR first failure\n$/);
    logError("second failure");
    const second = readFileSync(join(logDir, files[0]), "utf8");
    expect(second).toContain("ERROR second failure\n");
    expect(second.split("\n").filter((l) => l.length > 0).length).toBe(2);
  });

  it("gives a second launch its own file", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T18:22:41.000Z"));
    const first = await importLogger();
    first.logError("launch one");
    vi.setSystemTime(new Date("2026-09-30T18:23:41.000Z"));
    const second = await importLogger();
    second.logError("launch two");
    vi.useRealTimers();
    const files = readdirSync(logDir).sort();
    expect(files.length).toBe(2);
    expect(files[0]).toContain("18-22-41");
    expect(files[1]).toContain("18-23-41");
    expect(readFileSync(join(logDir, files[0]), "utf8")).toContain(
      "launch one",
    );
    expect(readFileSync(join(logDir, files[1]), "utf8")).toContain(
      "launch two",
    );
  });

  it("swallows write failures when the log path is blocked", async () => {
    writeFileSync(logDir, "not a directory");
    const { logError } = await importLogger();
    expect(() => logError("blocked")).not.toThrow();
  });
});
