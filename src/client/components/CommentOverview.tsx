interface OverviewEntry {
  line: number;
  count: number;
  excerpt: string;
}

export type { OverviewEntry };

interface CommentOverviewProps {
  open: boolean;
  entries: OverviewEntry[];
  totalComments: number;
  onClose: () => void;
  onJump: (line: number) => void;
}

export function CommentOverview({
  open,
  entries,
  totalComments,
  onClose,
  onJump,
}: CommentOverviewProps) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label="Comment overview"
        className="fixed right-0 top-0 z-40 flex h-full w-80 max-w-[85vw] flex-col border-l border-line bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-fg">
            {totalComments} comment{totalComments === 1 ? "" : "s"} on{" "}
            {entries.length} line{entries.length === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            aria-label="Close overview"
            onClick={onClose}
            className="rounded px-2 text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {entries.map((entry) => (
            <button
              key={entry.line}
              type="button"
              onClick={() => onJump(entry.line)}
              className="flex w-full items-start gap-3 border-b border-line/50 px-4 py-2.5 text-left transition-colors hover:bg-raised/60"
            >
              <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] tabular-nums text-accent-soft">
                {entry.line}
              </span>
              <span className="min-w-0 flex-1 text-xs text-muted">
                {entry.excerpt || "—"}
              </span>
              {entry.count > 1 && (
                <span className="shrink-0 text-[11px] tabular-nums text-faint">
                  ×{entry.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
