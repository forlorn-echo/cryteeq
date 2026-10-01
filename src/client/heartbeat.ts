export type HeartbeatFetch = (
  url: string,
  init: { method: string },
) => Promise<unknown>;

export function startHeartbeat(
  fetchFn: HeartbeatFetch,
  intervalMs: number,
): () => void {
  const ping = () => {
    void fetchFn("/api/heartbeat", { method: "POST" }).catch(() => {});
  };
  ping();
  const id = setInterval(ping, intervalMs);
  return () => clearInterval(id);
}
