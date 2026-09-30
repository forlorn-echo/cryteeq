import { useState } from "react";
import { useReview } from "./useReview";

export function App() {
  const review = useReview();
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (review.loading) {
    return <div className="p-8 text-neutral-400">Loading review…</div>;
  }
  if (review.error) {
    return (
      <div className="p-8 text-red-400">Failed to load: {review.error}</div>
    );
  }
  if (report !== null) {
    return (
      <div className="flex h-screen flex-col bg-neutral-950 p-6 text-neutral-200">
        <h1 className="mb-2 text-lg font-semibold">Review complete</h1>
        <p className="mb-4 text-sm text-neutral-400">
          The server has stopped. You may close this tab.
        </p>
        <pre className="flex-1 overflow-auto rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm">
          {report}
        </pre>
      </div>
    );
  }
  if (!review.review || !review.file) {
    return null;
  }

  const handleComplete = async () => {
    setBusy(true);
    try {
      setReport(await review.complete());
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    setBusy(true);
    try {
      await review.restart();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <header className="border-b border-neutral-800 p-4">
        <h1 className="text-sm font-semibold">{review.review.file_name}</h1>
        <p className="text-xs text-neutral-500">{review.review.file_path}</p>
        <p className="mt-1 text-xs text-neutral-400">
          {review.comments.length} comment
          {review.comments.length === 1 ? "" : "s"}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => void handleComplete()}
          >
            Complete Review
          </button>
          <button
            type="button"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-red-300 disabled:opacity-50"
            disabled={busy}
            onClick={() => void handleRestart()}
          >
            Start Fresh
          </button>
        </div>
      </header>
      {review.review.hash_changed && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          This file has changed on disk since the review started — line
          positions may no longer match.
        </div>
      )}
      <main className="p-4">
        <pre className="whitespace-pre text-xs leading-6">
          {review.file.content}
        </pre>
      </main>
    </div>
  );
}
