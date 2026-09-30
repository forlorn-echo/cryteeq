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
      className={`group flex items-start ${commentCount > 0 ? "bg-neutral-800/30" : ""} hover:bg-neutral-800/60`}
    >
      <div className="flex w-20 shrink-0 select-none items-center justify-end gap-1 pl-3 pr-2 text-xs leading-6 text-neutral-500">
        {commentCount > 0 && (
          <button
            type="button"
            onClick={onToggleThread}
            title="Toggle comments"
            aria-label={`Toggle comments on line ${line}`}
            className={`rounded-full px-1.5 text-[11px] tabular-nums ${
              threadOpen
                ? "bg-blue-500/30 text-blue-200"
                : "bg-blue-500/15 text-blue-300"
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
          className="rounded border border-neutral-700 px-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-700 focus:opacity-100 group-hover:opacity-100"
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
