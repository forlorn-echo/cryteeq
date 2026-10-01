export interface EditableLike {
  tagName?: string;
  isContentEditable?: boolean;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditableTarget(
  target: EditableLike | null | undefined,
): boolean {
  if (!target) return false;
  const tag = target.tagName?.toUpperCase() ?? "";
  return EDITABLE_TAGS.has(tag) || target.isContentEditable === true;
}

export const SHORTCUTS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: "j", description: "Next comment" },
  { keys: "k", description: "Previous comment" },
  { keys: "c", description: "Comment on current line" },
  { keys: "g", description: "Go to line" },
  { keys: "?", description: "Show shortcuts" },
  { keys: "Esc", description: "Close dialogs and panel" },
  { keys: "⌘/Ctrl + Enter", description: "Submit comment" },
];
