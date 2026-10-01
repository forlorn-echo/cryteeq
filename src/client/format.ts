const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 10_000) return "just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const month = MONTHS[then.getUTCMonth()];
  const day = then.getUTCDate();
  if (then.getUTCFullYear() === now.getUTCFullYear()) return `${month} ${day}`;
  return `${month} ${day}, ${then.getUTCFullYear()}`;
}

export function excerpt(text: string, max = 80): string {
  const first = text.split("\n")[0] ?? "";
  const collapsed = first.replace(/\s+/g, " ").trim();
  if (collapsed.length > max) {
    return `${collapsed.slice(0, Math.max(0, max - 1))}…`;
  }
  return collapsed;
}
