import { Dialog } from "./Dialog";
import { SHORTCUTS } from "../shortcuts";

interface ShortcutHelpProps {
  onClose: () => void;
}

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <ul className="flex flex-col gap-1.5">
        {SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.keys}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-xs text-fg">
              {shortcut.keys}
            </span>
            <span className="text-muted">{shortcut.description}</span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
