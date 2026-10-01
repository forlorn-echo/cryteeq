import { useState } from "react";
import type { Comment } from "../../shared/types";
import { relativeTime } from "../format";

interface CommentThreadProps {
  line: number;
  comments: Comment[];
  composerOpen: boolean;
  composerEnd: number | null;
  onAdd: (line: number, lineEnd: number, text: string) => Promise<void>;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onCancelComposer: () => void;
}

function rangeEndOf(comment: Comment): number | null {
  return comment.line_end !== null && comment.line_end > comment.line
    ? comment.line_end
    : null;
}

export function CommentThread({
  line,
  comments,
  composerOpen,
  composerEnd,
  onAdd,
  onUpdate,
  onDelete,
  onCancelComposer,
}: CommentThreadProps) {
  return (
    <div className="ml-20 border-l-2 border-accent/40 bg-surface/60 px-4 py-3 transition-colors">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      {composerOpen && (
        <Composer
          line={line}
          rangeEnd={composerEnd}
          onAdd={onAdd}
          onCancel={onCancelComposer}
        />
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function CommentItem({ comment, onUpdate, onDelete }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [busy, setBusy] = useState(false);
  const rangeEnd = rangeEndOf(comment);

  const save = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      await onUpdate(comment.id, text);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete(comment.id);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="mb-2">
        <textarea
          rows={3}
          autoFocus
          className="w-full rounded-md border border-line-strong bg-raised p-2 text-sm text-fg focus:border-accent focus:outline-none"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void save();
            }
            if (event.key === "Escape") {
              setEditing(false);
              setText(comment.text);
            }
          }}
        />
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded bg-accent px-2.5 py-1 text-xs text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setText(comment.text);
            }}
            className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <span className="ml-auto text-[11px] text-faint">
            ⌘/Ctrl + Enter to save · Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-md border border-line-strong bg-raised/70 p-2.5 transition-colors">
      <p className="whitespace-pre-wrap text-sm text-fg">{comment.text}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-faint">
        {rangeEnd !== null && (
          <span
            title={`Anchored to line ${comment.line}, quoting lines ${comment.line}–${rangeEnd}`}
            className="rounded bg-accent/15 px-1.5 py-0.5 text-accent-soft"
          >
            Lines {comment.line}–{rangeEnd}
          </span>
        )}
        <span title={comment.created_at}>
          {relativeTime(comment.created_at)}
        </span>
        {comment.updated_at !== comment.created_at && (
          <span title={comment.updated_at}>
            · edited {relativeTime(comment.updated_at)}
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-accent-soft transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="text-danger transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface ComposerProps {
  line: number;
  rangeEnd: number | null;
  onAdd: (line: number, lineEnd: number, text: string) => Promise<void>;
  onCancel: () => void;
}

function Composer({ line, rangeEnd, onAdd, onCancel }: ComposerProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const isRange = rangeEnd !== null && rangeEnd > line;

  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      await onAdd(line, rangeEnd ?? line, text);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {isRange && (
        <div className="mb-1.5 inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent-soft">
          Lines {line}–{rangeEnd}
          <span className="text-faint">· anchored to line {line}</span>
        </div>
      )}
      <textarea
        rows={3}
        autoFocus
        placeholder={
          isRange
            ? `Comment on lines ${line}–${rangeEnd}`
            : `Comment on line ${line}`
        }
        className="w-full rounded-md border border-line-strong bg-raised p-2 text-sm text-fg focus:border-accent focus:outline-none"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void submit();
          }
          if (event.key === "Escape") onCancel();
        }}
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="rounded bg-accent px-2.5 py-1 text-xs text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          Comment
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Cancel
        </button>
        <span className="ml-auto text-[11px] text-faint">
          ⌘/Ctrl + Enter to submit · Esc to close
        </span>
      </div>
    </div>
  );
}
