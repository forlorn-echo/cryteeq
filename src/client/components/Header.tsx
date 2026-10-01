import type { ThemeId, ThemeInfo } from "../../shared/themes";
import type { ReviewMeta } from "../../shared/types";
import {
  ChevronDownIcon,
  CommentsIcon,
  ContrastIcon,
  HelpIcon,
  WrapIcon,
} from "./icons";

interface HeaderProps {
  review: ReviewMeta;
  commentCount: number;
  wrap: boolean;
  theme: ThemeId;
  themes: ThemeInfo[];
  themeSwitching: boolean;
  onToggleWrap: () => void;
  onThemeChange: (theme: ThemeId) => void;
  onOpenOverview: () => void;
  onOpenHelp: () => void;
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
  onOpenOverview,
  onOpenHelp,
  onComplete,
  onStartFresh,
}: HeaderProps) {
  const themeLabel = themes.find((t) => t.id === theme)?.label ?? theme;
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-app/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <span
          title={`Theme: ${themeLabel}`}
          className={`relative inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-muted transition-colors hover:bg-raised focus-within:outline focus-within:outline-2 focus-within:outline-accent${
            themeSwitching ? " opacity-50" : ""
          }`}
        >
          <ContrastIcon />
          <ChevronDownIcon />
          <select
            value={theme}
            disabled={themeSwitching}
            onChange={(event) => onThemeChange(event.target.value as ThemeId)}
            aria-label="Theme"
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 opacity-0"
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </span>
        <span className="h-5 w-px bg-line-strong" aria-hidden="true" />
        <div className="min-w-[160px] flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate font-mono text-[13px] font-semibold text-fg">
              {review.file_name}
            </h1>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
              · {review.line_count} lines
            </span>
          </div>
          <p
            className="truncate font-mono text-[11px] text-faint"
            title={review.file_path}
          >
            {review.file_path}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onOpenOverview}
            title="Comment overview"
            aria-label={`${commentCount} comment${commentCount === 1 ? "" : "s"} — open overview`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span
              className={commentCount > 0 ? "text-accent-soft" : "text-faint"}
            >
              <CommentsIcon />
            </span>
            <span className="tabular-nums">{commentCount}</span>
          </button>
          <button
            type="button"
            onClick={onToggleWrap}
            aria-label="Toggle line wrapping"
            title="Toggle line wrapping"
            aria-pressed={wrap}
            className={
              wrap
                ? "inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent-soft transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                : "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            }
          >
            <WrapIcon />
          </button>
          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <HelpIcon />
          </button>
          <span className="mx-1.5 h-5 w-px bg-line-strong" aria-hidden="true" />
          <button
            type="button"
            onClick={onStartFresh}
            className="inline-flex h-8 items-center rounded-md px-2.5 text-xs text-danger transition-colors hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Start Fresh
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="ml-1.5 inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Complete Review
          </button>
        </div>
      </div>
    </header>
  );
}
