import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THEME, type ThemeId, type ThemeInfo } from "../shared/themes";
import type { Comment, FilePayload, ReviewMeta } from "../shared/types";
import { api } from "./api";

export function useReview() {
  const [review, setReview] = useState<ReviewMeta | null>(null);
  const [file, setFile] = useState<FilePayload | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [themeState, reviewMeta, commentList] = await Promise.all([
      api.getTheme(),
      api.getReview(),
      api.getComments(),
    ]);
    setThemeState(themeState.theme);
    setThemes(themeState.available);
    setReview(reviewMeta);
    setComments(commentList);
    setFile(await api.getFile(themeState.theme));
  }, []);

  useEffect(() => {
    reload()
      .then(() => setLoading(false))
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [reload]);

  const retry = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [reload]);

  const addComment = useCallback(
    async (line: number, lineEnd: number, text: string) => {
      const created = await api.addComment(line, lineEnd, text);
      setComments((prev) => [...prev, created]);
    },
    [],
  );

  const updateComment = useCallback(async (id: number, text: string) => {
    const updated = await api.updateComment(id, text);
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const deleteComment = useCallback(async (id: number) => {
    await api.deleteComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const restart = useCallback(async () => {
    await api.restart();
    await reload();
  }, [reload]);

  const complete = useCallback(async (): Promise<string> => {
    const payload = await api.complete();
    return payload.report;
  }, []);

  const setTheme = useCallback(
    async (id: ThemeId) => {
      if (switching) return;
      setSwitching(true);
      try {
        const state = await api.setTheme(id);
        setThemeState(state.theme);
        setThemes(state.available);
        setFile(await api.getFile(state.theme));
      } finally {
        setSwitching(false);
      }
    },
    [switching],
  );

  return {
    review,
    file,
    comments,
    theme,
    themes,
    switching,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    restart,
    complete,
    setTheme,
    retry,
  };
}
