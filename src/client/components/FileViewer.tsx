import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  onAdd: (line: number, lineEnd: number, text: string) => Promise<void>;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

interface ComposerTarget {
  start: number;
  end: number;
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
  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [flashLine, setFlashLine] = useState<number | null>(null);
  const [anchorLine, setAnchorLine] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const initialized = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    initialized.current = false;
    dragRef.current = null;
    setExpanded(new Set());
    setComposer(null);
    setFlashLine(null);
    setAnchorLine(null);
    setDragPreview(null);
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
    if (compose) setComposer({ start: line, end: line });
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

  const openComposerRange = useCallback((start: number, end: number) => {
    setComposer({ start, end });
    setExpanded((prev) => (prev.has(start) ? prev : new Set(prev).add(start)));
  }, []);

  useEffect(() => {
    const onPointerUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setDragPreview(null);
      const start = Math.min(drag.start, drag.end);
      const end = Math.max(drag.start, drag.end);
      if (start !== end) {
        openComposerRange(start, end);
        setAnchorLine(null);
      } else {
        setAnchorLine((prev) => (prev === start ? null : start));
      }
    };
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [openComposerRange]);

  const handleRowHover = useCallback(
    (line: number) => {
      const drag = dragRef.current;
      if (drag) {
        drag.end = line;
        setDragPreview({ start: drag.start, end: line });
        return;
      }
      onCurrentLineChange(line);
    },
    [onCurrentLineChange],
  );

  const handleGutterPointerDown = useCallback(
    (event: ReactPointerEvent, line: number) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button")) return;
      event.preventDefault();
      if (event.shiftKey && anchorLine !== null && anchorLine !== line) {
        openComposerRange(
          Math.min(anchorLine, line),
          Math.max(anchorLine, line),
        );
        setAnchorLine(null);
        return;
      }
      dragRef.current = { start: line, end: line };
      setDragPreview({ start: line, end: line });
    },
    [anchorLine, openComposerRange],
  );

  const toggleLine = (line: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const closeComposer = (line: number) => {
    setComposer(null);
    if (!commentsByLine.has(line)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(line);
        return next;
      });
    }
  };

  const handleAdd = useCallback(
    async (line: number, lineEnd: number, text: string) => {
      await onAdd(line, lineEnd, text);
      setComposer(null);
    },
    [onAdd],
  );

  const dragMin = dragPreview
    ? Math.min(dragPreview.start, dragPreview.end)
    : null;
  const dragMax = dragPreview
    ? Math.max(dragPreview.start, dragPreview.end)
    : null;

  return (
    <div
      className={`rounded-lg border border-line bg-surface text-sm ${
        dragPreview ? "select-none" : ""
      }`}
    >
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
              isAnchor={anchorLine === line}
              inDragRange={
                dragMin !== null &&
                dragMax !== null &&
                line >= dragMin &&
                line <= dragMax
              }
              onToggleThread={() => toggleLine(line)}
              onAddComment={() => openComposerRange(line, line)}
              onHoverLine={() => handleRowHover(line)}
              onGutterPointerDown={handleGutterPointerDown}
            />
            {(expanded.has(line) || composer?.start === line) && (
              <CommentThread
                line={line}
                comments={lineComments}
                composerOpen={composer?.start === line}
                composerEnd={composer?.start === line ? composer.end : null}
                onAdd={handleAdd}
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
