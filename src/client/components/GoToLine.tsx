import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";

interface GoToLineProps {
  lineCount: number;
  onSubmit: (line: number) => void;
  onClose: () => void;
}

export function GoToLine({ lineCount, onSubmit, onClose }: GoToLineProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    const line = Number(trimmed);
    if (!/^\d+$/.test(trimmed) || line < 1 || line > lineCount) {
      setError(`Enter a line number between 1 and ${lineCount}`);
      return;
    }
    onSubmit(line);
  };

  return (
    <Dialog title="Go to line" onClose={onClose}>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          inputMode="numeric"
          aria-label="Line number"
          placeholder="Line number"
          className="w-32 rounded-md border border-line-strong bg-raised p-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
        <span className="text-xs text-faint tabular-nums">1 – {lineCount}</span>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:bg-raised"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Go
        </button>
      </div>
    </Dialog>
  );
}
