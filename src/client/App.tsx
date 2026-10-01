import { useMemo, useState } from "react";
import type { Comment } from "../shared/types";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FileViewer } from "./components/FileViewer";
import { Header } from "./components/Header";
import { ReportDialog } from "./components/ReportDialog";
import { WarningBanner } from "./components/WarningBanner";
import { useReview } from "./useReview";

export function App() {
  const review = useReview();
  const [wrap, setWrap] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"complete" | "restart" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const commentsByLine = useMemo(
    () => groupByLine(review.comments),
    [review.comments],
  );

  if (review.loading) {
    return <div className="p-8 text-muted">Loading review…</div>;
  }
  if (review.error) {
    return (
      <div className="p-8 text-danger">Failed to load: {review.error}</div>
    );
  }
  if (!review.review || !review.file) {
    return null;
  }
  if (report !== null) {
    return <ReportDialog report={report} fileName={review.review.file_name} />;
  }

  const handleComplete = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const generated = await review.complete();
      setReport(generated);
    } catch (err) {
      setActionError((err as Error).message);
      setDialog(null);
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await review.restart();
      setDialog(null);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-fg">
      <Header
        review={review.review}
        commentCount={review.comments.length}
        wrap={wrap}
        onToggleWrap={() => setWrap((w) => !w)}
        onComplete={() => setDialog("complete")}
        onStartFresh={() => setDialog("restart")}
      />
      {review.review.hash_changed && <WarningBanner />}
      {actionError && (
        <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {actionError}
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-4">
        <FileViewer
          file={review.file}
          commentsByLine={commentsByLine}
          wrap={wrap}
          onAdd={review.addComment}
          onUpdate={review.updateComment}
          onDelete={review.deleteComment}
        />
      </main>
      {dialog === "complete" && (
        <ConfirmDialog
          title="Complete review"
          message={
            review.comments.length === 0
              ? "There are no comments. Complete the review anyway?"
              : `Complete the review with ${review.comments.length} comment${review.comments.length === 1 ? "" : "s"}? The report will be generated and the server will stop.`
          }
          confirmLabel="Complete review"
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() => void handleComplete()}
        />
      )}
      {dialog === "restart" && (
        <ConfirmDialog
          title="Start fresh"
          message="This discards all current comments and starts a new review. This cannot be undone."
          confirmLabel="Discard and start fresh"
          tone="danger"
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() => void handleRestart()}
        />
      )}
    </div>
  );
}

function groupByLine(comments: Comment[]): Map<number, Comment[]> {
  const grouped = new Map<number, Comment[]>();
  const sorted = [...comments].sort((a, b) => a.line - b.line || a.id - b.id);
  for (const comment of sorted) {
    const list = grouped.get(comment.line) ?? [];
    list.push(comment);
    grouped.set(comment.line, list);
  }
  return grouped;
}
