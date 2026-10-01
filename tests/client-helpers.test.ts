import { describe, expect, it } from "vitest";
import { excerpt, relativeTime } from "../src/client/format";
import { SHORTCUTS, isEditableTarget } from "../src/client/shortcuts";

const NOW = new Date("2026-10-01T12:00:00Z");

describe("relativeTime", () => {
  it("returns 'just now' under 10s and clamps future timestamps", () => {
    expect(relativeTime("2026-10-01T11:59:55Z", NOW)).toBe("just now");
    expect(relativeTime("2026-10-01T12:00:30Z", NOW)).toBe("just now");
  });

  it("buckets seconds, minutes, hours, and days", () => {
    expect(relativeTime("2026-10-01T11:59:30Z", NOW)).toBe("30s ago");
    expect(relativeTime("2026-10-01T11:47:00Z", NOW)).toBe("13m ago");
    expect(relativeTime("2026-10-01T05:00:00Z", NOW)).toBe("7h ago");
    expect(relativeTime("2026-09-28T12:00:00Z", NOW)).toBe("3d ago");
    expect(relativeTime("2026-09-27T00:00:00Z", NOW)).toBe("4d ago");
  });

  it("renders month-day past a week, adding the year when it differs", () => {
    expect(relativeTime("2026-09-20T00:00:00Z", NOW)).toBe("Sep 20");
    expect(relativeTime("2025-12-31T00:00:00Z", NOW)).toBe("Dec 31, 2025");
  });

  it("returns empty for an invalid timestamp", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });
});

describe("excerpt", () => {
  it("collapses whitespace and trims to the first line", () => {
    expect(excerpt("  first   line  \nsecond line", 40)).toBe("first line");
    expect(excerpt("\nleading blank first line", 40)).toBe("");
  });

  it("truncates with an ellipsis at the limit", () => {
    expect(excerpt("abcdefghij", 5)).toBe("abcd…");
    expect(excerpt("abcdefghij", 10)).toBe("abcdefghij");
    expect(excerpt("abcdefghij", 11)).toBe("abcdefghij");
  });
});

describe("isEditableTarget", () => {
  it("detects inputs, textareas, selects, and contenteditable", () => {
    expect(isEditableTarget({ tagName: "input" })).toBe(true);
    expect(isEditableTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isEditableTarget({ tagName: "select" })).toBe(true);
    expect(isEditableTarget({ tagName: "div", isContentEditable: true })).toBe(
      true,
    );
  });

  it("passes through non-editable and missing targets", () => {
    expect(isEditableTarget({ tagName: "DIV" })).toBe(false);
    expect(isEditableTarget({ tagName: "body" })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
  });
});

describe("SHORTCUTS", () => {
  it("is non-empty with unique keys and non-blank descriptions", () => {
    expect(SHORTCUTS.length).toBeGreaterThan(0);
    const keys = SHORTCUTS.map((s) => s.keys);
    expect(new Set(keys).size).toBe(keys.length);
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.description.trim().length).toBeGreaterThan(0);
    }
  });
});
