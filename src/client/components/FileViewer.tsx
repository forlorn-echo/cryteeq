import { Fragment, useEffect, useRef, useState } from "react";
import type { Comment, FilePayload } from "../../shared/types";
import { CommentThread } from "./CommentThread";
import { LineRow } from "./LineRow";

const WINDOW_CHUNK = 500;
const FLASH_MS = 800;

export interface JumpTarget {
  line: number;
  expand: boolean;
  compose: boolean;
  nonce: number;
}

interface FileViewerProps {
  file: FilePayload;
  commentsByLine: Map<number, Comment[]>;
  wrap: boolean;
  jump: JumpTarget | null;
  currentLine: number | null;
  onCurrentLineChange: (line: number | null) => void;
  onAdd: (line: number, text: string) => Promise<void>;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function FileViewer({
  file,
  commentsByLine,
  wrap,
  jump,
  currentLine,
  onCurrentLineChange,
  onAdd,
  onUpdate,
  onDelete,
}: FileViewerProps) {
  const needsWindowing =
    file.lines.length > 20000 || file.content.length > 5_000_000;
  const [visible, setVisible] = useState(
    needsWindowing ? WINDOW_CHUNK : file.lines.length,
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [composerLine, setComposerLine] = useState<number | null>(null);
  const [flashLine, setFlashLine] = useState<number | null>(null);
  const initialized = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initialized.current = false;
    setExpanded(new Set());
    setComposerLine(null);
    setFlashLine(null);
    setVisible(needsWindowing ? WINDOW_CHUNK : file.lines.length);
  }, [file.content, file.lines.length, needsWindowing]);

  useEffect(() => {
    if (initialized.current || commentsByLine.size === 0) return;
    initialized.current = true;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const line of commentsByLine.keys()) next.add(line);
      return next;
    });
  }, [commentsByLine]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible((prev) => Math.min(prev + WINDOW_CHUNK, file.lines.length));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible, file.lines.length]);

  useEffect(() => {
    if (!jump) return;
    const { line, expand, compose } = jump;
    if (line < 1 || line > file.lines.length) return;
    setVisible((prev) =>
      line > prev ? Math.min(line + WINDOW_CHUNK, file.lines.length) : prev,
    );
    if (expand || compose) {
      setExpanded((prev) => (prev.has(line) ? prev : new Set(prev).add(line)));
    }
    if (compose) setComposerLine(line);
    setFlashLine(line);
    const timer = setTimeout(() => setFlashLine(null), FLASH_MS);
    let retry: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const scrollToRow = () => {
      if (cancelled) return;
      const row = document.querySelector(`[data-line="${line}"]`);
      if (row) {
        row.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        retry = setTimeout(scrollToRow, 25);
      }
    };
    const frame = requestAnimationFrame(scrollToRow);
    onCurrentLineChange(line);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (retry) clearTimeout(retry);
      cancelAnimationFrame(frame);
    };
  }, [jump, file.lines.length, onCurrentLineChange]);

  const toggleLine = (line: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const openComposer = (line: number) => {
    setComposerLine(line);
    setExpanded((prev) => (prev.has(line) ? prev : new Set(prev).add(line)));
  };

  const closeComposer = (line: number) => {
    setComposerLine(null);
    if (!commentsByLine.has(line)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(line);
        return next;
      });
    }
  };

  return (
    <div className="rounded-lg border border-line bg-surface text-sm">
      {file.lines.slice(0, visible).map((tokens, index) => {
        const line = index + 1;
        const lineComments = commentsByLine.get(line) ?? [];
        return (
          <Fragment key={line}>
            <LineRow
              line={line}
              tokens={tokens}
              wrap={wrap}
              commentCount={lineComments.length}
              threadOpen={expanded.has(line)}
              flash={flashLine === line}
              isCurrent={currentLine === line}
              onToggleThread={() => toggleLine(line)}
              onAddComment={() => openComposer(line)}
              onHoverLine={() => onCurrentLineChange(line)}
            />
            {(expanded.has(line) || composerLine === line) && (
              <CommentThread
                line={line}
                comments={lineComments}
                composerOpen={composerLine === line}
                onAdd={onAdd}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onCancelComposer={() => closeComposer(line)}
              />
            )}
          </Fragment>
        );
      })}
      {visible < file.lines.length && (
        <>
          <div ref={sentinelRef} className="h-8" />
          <div className="p-2 text-center text-xs text-faint">
            Loading more lines… ({visible} / {file.lines.length})
          </div>
        </>
      )}
    </div>
  );
}
