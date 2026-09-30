import { useCallback, useEffect, useState } from "react";
import type { Comment, FilePayload, ReviewMeta } from "../shared/types";
import { api } from "./api";

export function useReview() {
  const [review, setReview] = useState<ReviewMeta | null>(null);
  const [file, setFile] = useState<FilePayload | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [reviewMeta, filePayload, commentList] = await Promise.all([
      api.getReview(),
      api.getFile(),
      api.getComments(),
    ]);
    setReview(reviewMeta);
    setFile(filePayload);
    setComments(commentList);
  }, []);

  useEffect(() => {
    reload()
      .then(() => setLoading(false))
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [reload]);

  const addComment = useCallback(async (line: number, text: string) => {
    const created = await api.addComment(line, text);
    setComments((prev) => [...prev, created]);
  }, []);

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

  return {
    review,
    file,
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    restart,
    complete,
  };
}
