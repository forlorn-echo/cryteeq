import type { Token } from "../../shared/types";

interface LineRowProps {
  line: number;
  tokens: Token[];
  wrap: boolean;
  commentCount: number;
  threadOpen: boolean;
  onToggleThread: () => void;
  onAddComment: () => void;
}

export function LineRow({
  line,
  tokens,
  wrap,
  commentCount,
  threadOpen,
  onToggleThread,
  onAddComment,
}: LineRowProps) {
  return (
    <div
      className={`group flex items-start ${commentCount > 0 ? "bg-raised/30" : ""} hover:bg-raised/60`}
    >
      <div className="flex w-20 shrink-0 select-none items-center justify-end gap-1 pl-3 pr-2 text-xs leading-6 text-faint">
        {commentCount > 0 && (
          <button
            type="button"
            onClick={onToggleThread}
            title="Toggle comments"
            aria-label={`Toggle comments on line ${line}`}
            className={`rounded-full px-1.5 text-[11px] tabular-nums ${
              threadOpen
                ? "bg-accent/30 text-fg"
                : "bg-accent/15 text-accent-soft"
            }`}
          >
            {commentCount}
          </button>
        )}
        <span className="tabular-nums">{line}</span>
        <button
          type="button"
          onClick={onAddComment}
          title="Add comment"
          aria-label={`Add comment on line ${line}`}
          className="rounded border border-line-strong px-1 text-muted opacity-0 transition-opacity hover:bg-raised focus:opacity-100 group-hover:opacity-100"
        >
          +
        </button>
      </div>
      <div
        className={`min-h-6 flex-1 py-0.5 pr-4 leading-6 ${
          wrap ? "whitespace-pre-wrap" : "whitespace-pre"
        }`}
      >
        {tokens.map((token, index) =>
          token.color ? (
            <span key={index} style={{ color: token.color }}>
              {token.text}
            </span>
          ) : (
            <span key={index}>{token.text}</span>
          ),
        )}
      </div>
    </div>
  );
}
