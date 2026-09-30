import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

let logFile: string | null = null;

function filenameSafeTimestamp(date: Date): string {
  const pad = (value: number, width = 2): string =>
    String(value).padStart(width, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}` +
    `-${pad(date.getUTCMilliseconds(), 3)}Z`
  );
}

function resolveLogFile(): string | null {
  if (logFile) return logFile;
  const dir =
    process.env.CRYTEEQ_LOG_DIR ?? join(homedir(), ".cryteeq", "logs");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return null;
  }
  logFile = join(
    dir,
    `${filenameSafeTimestamp(new Date())}-${process.pid}.log`,
  );
  return logFile;
}

export function logError(message: string): void {
  const file = resolveLogFile();
  if (!file) return;
  try {
    appendFileSync(
      file,
      `${new Date().toISOString()} ERROR ${message}\n`,
      "utf8",
    );
  } catch {}
}
