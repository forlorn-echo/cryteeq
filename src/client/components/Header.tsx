import type { ReviewMeta } from "../../shared/types";

interface HeaderProps {
  review: ReviewMeta;
  commentCount: number;
  wrap: boolean;
  onToggleWrap: () => void;
  onComplete: () => void;
  onStartFresh: () => void;
}

export function Header({
  review,
  commentCount,
  wrap,
  onToggleWrap,
  onComplete,
  onStartFresh,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-neutral-100">
            {review.file_name}
          </h1>
          <p
            className="truncate text-xs text-neutral-500"
            title={review.file_path}
          >
            {review.file_path}
          </p>
        </div>
        <span className="shrink-0 text-xs text-neutral-400">
          {commentCount} comment{commentCount === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onToggleWrap}
          className="shrink-0 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          {wrap ? "No wrap" : "Wrap"}
        </button>
        <button
          type="button"
          onClick={onStartFresh}
          className="shrink-0 rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-red-300 hover:bg-neutral-800"
        >
          Start Fresh
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Complete Review
        </button>
      </div>
    </header>
  );
}
