import { Fragment, useEffect, useRef, useState } from "react";
import type { Comment, FilePayload } from "../../shared/types";
import { CommentThread } from "./CommentThread";
import { LineRow } from "./LineRow";

interface FileViewerProps {
  file: FilePayload;
  commentsByLine: Map<number, Comment[]>;
  wrap: boolean;
  onAdd: (line: number, text: string) => Promise<void>;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function FileViewer({
  file,
  commentsByLine,
  wrap,
  onAdd,
  onUpdate,
  onDelete,
}: FileViewerProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [composerLine, setComposerLine] = useState<number | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || commentsByLine.size === 0) return;
    initialized.current = true;
    setExpanded(new Set(commentsByLine.keys()));
  }, [commentsByLine]);

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
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 text-sm">
      {file.lines.map((tokens, index) => {
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
              onToggleThread={() => toggleLine(line)}
              onAddComment={() => openComposer(line)}
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
    </div>
  );
}
