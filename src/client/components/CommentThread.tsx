import { useState } from "react";
import type { Comment } from "../../shared/types";

interface CommentThreadProps {
  line: number;
  comments: Comment[];
  composerOpen: boolean;
  onAdd: (line: number, text: string) => Promise<void>;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onCancelComposer: () => void;
}

export function CommentThread({
  line,
  comments,
  composerOpen,
  onAdd,
  onUpdate,
  onDelete,
  onCancelComposer,
}: CommentThreadProps) {
  return (
    <div className="ml-20 border-l-2 border-accent/40 bg-surface/60 px-4 py-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      {composerOpen && (
        <Composer line={line} onAdd={onAdd} onCancel={onCancelComposer} />
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
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded bg-accent px-2.5 py-1 text-xs text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setText(comment.text);
            }}
            className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg hover:bg-raised"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-md border border-line-strong bg-raised/70 p-2.5">
      <p className="whitespace-pre-wrap text-sm text-fg">{comment.text}</p>
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-faint">
        <span title={comment.created_at}>
          {new Date(comment.created_at).toLocaleString()}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-accent-soft hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="text-danger hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface ComposerProps {
  line: number;
  onAdd: (line: number, text: string) => Promise<void>;
  onCancel: () => void;
}

function Composer({ line, onAdd, onCancel }: ComposerProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      await onAdd(line, text);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <textarea
        rows={3}
        autoFocus
        placeholder={`Comment on line ${line}`}
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
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="rounded bg-accent px-2.5 py-1 text-xs text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          Comment
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg hover:bg-raised"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
