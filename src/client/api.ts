import type { ThemeId } from "../shared/themes";
import type {
  Comment,
  CompletePayload,
  FilePayload,
  ReviewMeta,
  ThemeState,
} from "../shared/types";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const JSON_HEADERS = { "content-type": "application/json" };

export const api = {
  getReview: (): Promise<ReviewMeta> => json("/api/review"),
  getFile: (theme: ThemeId): Promise<FilePayload> =>
    json(`/api/file?theme=${encodeURIComponent(theme)}`),
  getTheme: (): Promise<ThemeState> => json("/api/theme"),
  setTheme: (theme: ThemeId): Promise<ThemeState> =>
    json("/api/theme", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ theme }),
    }),
  getComments: (): Promise<Comment[]> => json("/api/comments"),
  addComment: (line: number, text: string): Promise<Comment> =>
    json("/api/comments", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ line, text }),
    }),
  updateComment: (id: number, text: string): Promise<Comment> =>
    json(`/api/comments/${id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ text }),
    }),
  deleteComment: (id: number): Promise<void> =>
    fetch(`/api/comments/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    }),
  restart: (): Promise<{ ok: boolean }> =>
    json("/api/review/restart", { method: "POST" }),
  complete: (): Promise<CompletePayload> =>
    json("/api/complete", { method: "POST" }),
};
