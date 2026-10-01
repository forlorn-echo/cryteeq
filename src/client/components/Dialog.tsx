import { useEffect, type ReactNode } from "react";

interface DialogProps {
  title: string;
  onClose?: () => void;
  children: ReactNode;
}

export function Dialog({ title, onClose, children }: DialogProps) {
  useEffect(() => {
    if (!onClose) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-lg rounded-lg border border-line-strong bg-surface p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {onClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded px-2 text-muted hover:bg-raised hover:text-fg"
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
