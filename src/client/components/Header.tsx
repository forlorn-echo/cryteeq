import { useEffect, useRef, useState } from "react";
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
  onOpenOverview: () => void;
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
  onComplete,
  onStartFresh,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-app/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-fg">
            {review.file_name}
          </h1>
          <p className="truncate text-xs text-faint" title={review.file_path}>
            {review.file_path}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenOverview}
          title="Comment overview"
          aria-label="Open comment overview"
          className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-xs text-fg transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {commentCount} comment{commentCount === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          onClick={onToggleWrap}
          aria-label="Toggle line wrapping"
          className="shrink-0 rounded-md border border-line-strong px-2 py-1 text-xs text-fg transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {wrap ? "No wrap" : "Wrap"}
        </button>
        <select
          value={theme}
          disabled={themeSwitching}
          onChange={(event) => onThemeChange(event.target.value as ThemeId)}
          aria-label="Theme"
          title="Theme"
          className="shrink-0 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-fg transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md border border-line-strong px-2.5 py-1.5 text-sm text-fg transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-line-strong bg-surface py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onStartFresh();
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-sm text-danger transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Start Fresh…
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Complete Review
        </button>
      </div>
    </header>
  );
}
