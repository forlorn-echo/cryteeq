---
name: cryteeq
description: Get line-by-line review feedback from a human on any text file via the cryteeq CLI. Use when structured human feedback on file contents is needed. Do NOT use when the agent itself is asked to review code, for binary files, or for pull/merge requests.
---

# cryteeq — line-by-line structured file review from human

`cryteeq <file> --stdout` starts a local review server, opens a UI in the browser, allows them to comment on any line of the file — or select a contiguous line range to quote — and prints a Markdown report of the comments to **stdout** when they click **Complete Review**. The command then exits and the server stops.

## Prerequisites

- Verify before a blocking run: `cryteeq --version` (prints to stdout, exits `0`).

## When to use

- A human should review a UTF-8 text file and give per-line feedback (docs, specs, configs, code, logs).
- You need structured feedback (line number → comment) before editing or improving a file.
- Common use cases:
  - Spec review and update loop before agent starts working on it.
  - Execution plan review and update loop.

Do not use when:

- You (the agent) are doing the reviewing yourself — this tool routes feedback *from a human*.
- The file is binary or not valid UTF-8 (rejected with exit `1`).
- Multiple files need review in one session (single file per review, by design).

## Core workflow

1. Tell the user: a browser window will open to review the file; they add comments on lines and click **Complete Review** when done.
2. Run the command. It **blocks until the human completes the review** — reviews can take many minutes. Run it with a generous timeout (10+ minutes) or in the background, and never treat a slow exit as a hang:
   ```bash
   cryteeq path/to/file.md --stdout
   ```
   Capture **stdout only**; progress messages ("Review started: http://127.0.0.1:4173") and errors go to stderr, so piping/`$(...)` is safe.
3. The human comments on lines in the browser and clicks **Complete Review**.
4. The command exits `0`; stdout holds the Markdown report.
5. Apply the feedback: parse the report, edit the file to address each comment (see below).
6. Optional re-review cycle: after applying changes, re-run the same command — since the previous review is complete, a fresh session starts automatically on the updated file.

## Output contract

| Channel | Content |
|---|---|
| stdout | The Markdown report — and nothing else. Empty on failure. |
| stderr | Progress info, summary line, errors |
| Exit `0` | Review completed; report on stdout |
| Exit `1` | Usage or runtime error (missing file, binary/non-UTF-8 file, `--port` in use, report failure); stdout empty |
| Exit `130` | Interrupted (Ctrl+C / SIGTERM); in-progress comments are saved; re-running the same command resumes them |

## Report format

`````markdown
# Review: notes.md

- **File:** `/abs/path/notes.md`
- **Date:** 2026-09-30T18:22:41.000Z
- **SHA-256:** `9f2c1ab3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9`
- **Comments:** 4

## Line 2

```text
This is the reviewed line's content, quoted verbatim.
```

> Fix this sentence.

## Lines 40-42

```text
Another reviewed line.
A second line in the quoted range.

The third line, after a blank line, quoted verbatim.
```

> Rewrite this whole block.

> Also fix the indentation here.

## Line 41

```text
A second line in the quoted range.
```

> Only this line needs the import fix.
`````

Parsing rules:

- One section per reviewed quote, in ascending `(start, end)` order — sections **may overlap**; never assume non-overlap.
- Headings come in two forms: `## Line N` (single-line quote) and `## Lines N-M` (range quote, M inclusive). **N is the anchor line** the comment applies to.
- One comment = one **unbroken `> ` blockquote run** (strip the leading `> ` — blank body lines appear as bare `>`; preserve line breaks inside). Multiple comments on the same quote are consecutive runs separated by a blank line, in comment-id order.
- The fenced `text` block immediately after a heading quotes lines N..M verbatim (one line for `## Line N`). The fence length adapts if the quoted block contains backticks — take the whole fenced block regardless of delimiter length.
- `- **Comments:**` counts comments, not sections.
- Zero comments → metadata only; no sections.
- Line numbers refer to the file snapshot at review time, pinned by the full 64-hex-character SHA-256 in the metadata (the snapshot is CRLF-normalized).

## Applying feedback

1. Extract (anchor, comment) pairs from each section heading (`## Line N` / `## Lines N-M`) and its blockquote runs; use N as the anchor line and the fenced block as the quoted context spanning N..M.
2. Read the quoted content to anchor each comment precisely.
3. Edit the file to address every comment; the author-of-record is the human reviewer — do not silently reinterpret their feedback.
4. Summarize applied changes back to the user; offer a re-review cycle if they want to verify the fixes.

## Flags

| Flag | Effect | Agent guidance |
|---|---|---|
| `--stdout` | Emit the report on stdout | **Always pass this** when consuming the report programmatically |
| `--port <n>` | Use a specific port (default: first free port from 4173) | Omit — let it auto-pick |
| `--help` / `--version` | Usage / version to stdout | — |

## Rules & edge cases

- One review session per file path — do not run two instances against the same file concurrently.
- Interrupted runs (exit `130`) are resumable: the same command reloads saved comments; no partial report is written to stdout.
- Completion happens **only** via the **Complete Review** button — closing the browser tab or killing the process does not complete a review.
- There is no "resolve" workflow: the report is the deliverable. The author applies feedback; a new review cycle may follow.
- `--stdout` does not suppress the browser — the UI still opens for the human.

## Example

User: "Have me review draft-spec.md, then apply my comments."

```bash
# Blocks until the user clicks Complete Review in the browser
REPORT=$(cryteeq draft-spec.md --stdout)
```

Then parse `$REPORT`, apply each (line, comment) fix to `draft-spec.md`, and report the changes back to the user.