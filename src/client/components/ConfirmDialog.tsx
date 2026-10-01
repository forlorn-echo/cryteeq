import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "primary",
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClass =
    tone === "danger"
      ? "rounded-md bg-danger px-3 py-1.5 text-sm text-danger-fg hover:bg-danger-hover disabled:opacity-50"
      : "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-50";

  return (
    <Dialog title={title} onClose={busy ? undefined : onCancel}>
      <p className="text-sm text-fg">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-fg hover:bg-raised disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={confirmClass}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
