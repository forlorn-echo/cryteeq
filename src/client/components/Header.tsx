import type { ThemeId, ThemeInfo } from "../../shared/themes";
import type { ReviewMeta } from "../../shared/types";

interface HeaderProps {
  review: ReviewMeta;
  commentCount: number;
  wrap: boolean;
  theme: ThemeId;
  themes: ThemeInfo[];
  themeSwitching: boolean;
  onToggleWrap: () => void;
  onThemeChange: (theme: ThemeId) => void;
  onComplete: () => void;
  onStartFresh: () => void;
}

export function Header({
  review,
  commentCount,
  wrap,
  theme,
  themes,
  themeSwitching,
  onToggleWrap,
  onThemeChange,
  onComplete,
  onStartFresh,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-app/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-fg">
            {review.file_name}
          </h1>
          <p className="truncate text-xs text-faint" title={review.file_path}>
            {review.file_path}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted">
          {commentCount} comment{commentCount === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onToggleWrap}
          className="shrink-0 rounded-md border border-line-strong px-2 py-1 text-xs text-fg hover:bg-raised"
        >
          {wrap ? "No wrap" : "Wrap"}
        </button>
        <select
          value={theme}
          disabled={themeSwitching}
          onChange={(event) => onThemeChange(event.target.value as ThemeId)}
          aria-label="Theme"
          title="Theme"
          className="shrink-0 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-fg disabled:opacity-50"
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onStartFresh}
          className="shrink-0 rounded-md border border-line-strong px-3 py-1.5 text-sm text-danger hover:bg-raised"
        >
          Start Fresh
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent-hover"
        >
          Complete Review
        </button>
      </div>
    </header>
  );
}
