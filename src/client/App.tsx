import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HEARTBEAT_INTERVAL_MS } from "../shared/heartbeat";
import type { ThemeId } from "../shared/themes";
import type { Comment } from "../shared/types";
import {
  CommentOverview,
  type OverviewEntry,
} from "./components/CommentOverview";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FileViewer, type JumpTarget } from "./components/FileViewer";
import { GoToLine } from "./components/GoToLine";
import { Loading } from "./components/Loading";
import { Header } from "./components/Header";
import { ReportDialog } from "./components/ReportDialog";
import { ShortcutHelp } from "./components/ShortcutHelp";
import { WarningBanner } from "./components/WarningBanner";
import { startHeartbeat } from "./heartbeat";
import { excerpt } from "./format";
import { isEditableTarget } from "./shortcuts";
import { useReview } from "./useReview";

type JumpMode = "expand" | "scroll" | "compose";

export function App() {
  const review = useReview();
  const [wrap, setWrap] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"complete" | "restart" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [gotoOpen, setGotoOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [jump, setJump] = useState<JumpTarget | null>(null);
  const jumpNonce = useRef(0);

  const commentsByLine = useMemo(
    () => groupByLine(review.comments),
    [review.comments],
  );

  const overviewEntries = useMemo<OverviewEntry[]>(() => {
    const entries: OverviewEntry[] = [];
    for (const [line, list] of commentsByLine) {
      entries.push({
        line,
        lineEnd: list[0]?.line_end ?? null,
        count: list.length,
        excerpt: excerpt(list[0]?.text ?? ""),
      });
    }
    entries.sort((a, b) => a.line - b.line);
    return entries;
  }, [commentsByLine]);

  const handleJump = useCallback((line: number, mode: JumpMode = "expand") => {
    jumpNonce.current += 1;
    setJump({
      line,
      expand: mode === "expand" || mode === "compose",
      compose: mode === "compose",
      nonce: jumpNonce.current,
    });
  }, []);

  const handleCurrentLine = useCallback((line: number | null) => {
    setCurrentLine(line);
  }, []);

  const commentedLines = useMemo(
    () => [...commentsByLine.keys()].sort((a, b) => a - b),
    [commentsByLine],
  );

  const stepComment = useCallback(
    (dir: 1 | -1) => {
      if (commentedLines.length === 0) return;
      let target: number;
      if (currentLine === null) {
        target =
          dir === 1
            ? commentedLines[0]
            : commentedLines[commentedLines.length - 1];
      } else if (dir === 1) {
        target =
          commentedLines.find((line) => line > currentLine) ??
          commentedLines[0];
      } else {
        target =
          [...commentedLines].reverse().find((line) => line < currentLine) ??
          commentedLines[commentedLines.length - 1];
      }
      handleJump(target, "expand");
    },
    [commentedLines, currentLine, handleJump],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && isEditableTarget(event.target))
        return;
      switch (event.key) {
        case "j":
          stepComment(1);
          break;
        case "k":
          stepComment(-1);
          break;
        case "c":
          if (currentLine !== null) handleJump(currentLine, "compose");
          break;
        case "g":
          setGotoOpen(true);
          break;
        case "?":
          setHelpOpen(true);
          break;
        case "Escape":
          if (helpOpen) setHelpOpen(false);
          else if (gotoOpen) setGotoOpen(false);
          else if (overviewOpen) setOverviewOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stepComment, currentLine, handleJump, helpOpen, gotoOpen, overviewOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = review.theme;
  }, [review.theme]);

  useEffect(() => {
    document.title = review.review
      ? `cryteeq-ing ${review.review.file_name}`
      : "cryteeq-ing…";
  }, [review.review]);

  useEffect(() => startHeartbeat(fetch, HEARTBEAT_INTERVAL_MS), []);

  if (review.loading) {
    return <Loading />;
  }
  if (review.error) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-app p-8">
        <div className="w-full max-w-md rounded-lg border border-danger/40 bg-surface p-5">
          <h1 className="text-base font-semibold text-fg">
            Failed to load review
          </h1>
          <p className="mt-2 text-sm text-muted">{review.error}</p>
          <button
            type="button"
            onClick={() => void review.retry()}
            className="mt-4 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Retry
          </button>
        </div>
      </div>
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

  const handleThemeChange = async (theme: ThemeId) => {
    setActionError(null);
    try {
      await review.setTheme(theme);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-app text-fg">
      <Header
        review={review.review}
        commentCount={review.comments.length}
        wrap={wrap}
        theme={review.theme}
        themes={review.themes}
        themeSwitching={review.switching}
        onToggleWrap={() => setWrap((w) => !w)}
        onThemeChange={(theme) => void handleThemeChange(theme)}
        onOpenOverview={() => setOverviewOpen((open) => !open)}
        onOpenHelp={() => setHelpOpen(true)}
        onComplete={() => setDialog("complete")}
        onStartFresh={() => setDialog("restart")}
      />
      {review.review.hash_changed && <WarningBanner />}
      {actionError && (
        <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {actionError}
        </div>
      )}
      <CommentOverview
        open={overviewOpen}
        entries={overviewEntries}
        totalComments={review.comments.length}
        onClose={() => setOverviewOpen(false)}
        onJump={(line) => handleJump(line, "expand")}
      />
      <main className="mx-auto max-w-5xl px-4 py-4">
        {review.comments.length === 0 && (
          <div className="mb-3 rounded-md border border-line bg-surface/60 px-4 py-2 text-sm text-muted">
            No comments yet — hover a line and press{" "}
            <kbd className="rounded border border-line-strong bg-raised px-1 font-mono text-xs text-fg">
              +
            </kbd>{" "}
            or{" "}
            <kbd className="rounded border border-line-strong bg-raised px-1 font-mono text-xs text-fg">
              c
            </kbd>{" "}
            to add one.
          </div>
        )}
        <FileViewer
          file={review.file}
          commentsByLine={commentsByLine}
          wrap={wrap}
          jump={jump}
          currentLine={currentLine}
          onCurrentLineChange={handleCurrentLine}
          onAdd={review.addComment}
          onUpdate={review.updateComment}
          onDelete={review.deleteComment}
        />
      </main>
      {gotoOpen && (
        <GoToLine
          lineCount={review.review.line_count}
          onSubmit={(line) => {
            setGotoOpen(false);
            handleJump(line, "scroll");
          }}
          onClose={() => setGotoOpen(false)}
        />
      )}
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
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
