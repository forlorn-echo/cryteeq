import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FileError,
  detectLanguage,
  loadFile,
  sha256,
} from "../src/server/fileinfo";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cryteeq-fileinfo-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadFile", () => {
  it("rejects a missing file", async () => {
    await expect(loadFile(join(dir, "nope.md"))).rejects.toThrow(FileError);
  });

  it("rejects a directory", async () => {
    await expect(loadFile(dir)).rejects.toThrow(FileError);
  });

  it("rejects a binary file (NUL byte)", async () => {
    const p = join(dir, "blob.bin");
    await writeFile(p, Buffer.from([0x61, 0x00, 0x62]));
    await expect(loadFile(p)).rejects.toThrow(FileError);
  });

  it("rejects invalid UTF-8", async () => {
    const p = join(dir, "bad.txt");
    await writeFile(p, Buffer.from([0xff, 0xfe, 0xff]));
    await expect(loadFile(p)).rejects.toThrow(FileError);
  });

  it("loads a valid file with stable hash and language", async () => {
    const p = join(dir, "notes.md");
    await writeFile(p, "hello\nworld\n");
    const meta = await loadFile(p);
    expect(meta.fileName).toBe("notes.md");
    expect(meta.absolutePath).toBe(p);
    expect(meta.language).toBe("markdown");
    expect(meta.content).toBe("hello\nworld\n");
    expect(meta.size).toBe(12);
    expect(meta.sha256).toBe(sha256("hello\nworld\n"));
    expect(meta.lineCount).toBe(3);
  });

  it("normalizes CRLF before hashing", async () => {
    const p = join(dir, "crlf.md");
    await writeFile(p, "a\r\nb\r\n");
    const meta = await loadFile(p);
    expect(meta.content).toBe("a\nb\n");
    expect(meta.sha256).toBe(sha256("a\nb\n"));
    expect(meta.lineCount).toBe(3);
  });

  it("treats an empty file as one empty line", async () => {
    const p = join(dir, "empty.txt");
    await writeFile(p, "");
    const meta = await loadFile(p);
    expect(meta.content).toBe("");
    expect(meta.lineCount).toBe(1);
    expect(meta.language).toBe("plaintext");
  });
});

describe("detectLanguage", () => {
  it("maps common extensions and falls back to plaintext", () => {
    expect(detectLanguage("x.ts")).toBe("typescript");
    expect(detectLanguage("x.MD")).toBe("markdown");
    expect(detectLanguage("x.unknownext")).toBe("plaintext");
  });
});
