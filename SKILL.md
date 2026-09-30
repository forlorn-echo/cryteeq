---
name: cryteeq
description: Collect line-by-line review feedback from a human on any text file via the cryteeq CLI, which opens a pull-request-style review UI in the browser and returns the comments as a Markdown report on stdout. Use when the user wants a human to review a document, spec, config, or code file with per-line comments — e.g. "have me review this file", "I'll give feedback on these lines", "get human review of this doc before you change it", "ask the author to comment on line X" — or whenever structured human feedback (line number + comment) on file contents is needed before editing. Do NOT use when the agent itself is asked to review code, for binary files, or for multi-file/PR-style review.
---

# cryteeq — human line-by-line file review

`cryteeq <file> --stdout` starts a local review server, opens a pull-request-style UI in the human's browser, lets them comment on any line of the file, and prints a Markdown report of the comments to **stdout** when they click **Complete Review**. The command then exits and the server stops.

## Prerequisites

- v0.0 installs locally from the repo: run `npm link` once, then `cryteeq` is on PATH (a published `npm i -g` / `npx` flow is post-v0.0). Node >= 20.
- Verify before a blocking run: `cryteeq --version` (prints to stdout, exits `0`).
- A human is present at the machine and can interact with a browser.

## When to use

- A human should review a UTF-8 text file and give per-line feedback (docs, specs, configs, code, logs).
- You need structured feedback (line number → comment) before editing or improving a file.

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

````markdown
# Review: notes.md

- **File:** `/abs/path/notes.md`
- **Date:** 2026-09-30T18:22:41.000Z
- **SHA-256:** `9f2c1ab3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9`
- **Comments:** 3

## Line 2

```text
This is the reviewed line's content, quoted verbatim.
```

> Fix this sentence.

## Line 40

```text
Another reviewed line.
```

> Add a reference here.

> Also fix the indentation here.
````

Parsing rules:

- One `## Line N` section per reviewed line, ascending by line number.
- One comment = one **unbroken `> ` blockquote run** (strip the leading `> ` — blank body lines appear as bare `>`; preserve line breaks inside). Multiple comments on the same line are consecutive runs separated by a blank line, in comment-id order.
- The fenced `text` block immediately after a `## Line N` heading quotes that line's content for context. The fence length adapts if the quoted line contains backticks — take the whole fenced block regardless of delimiter length.
- Zero comments → metadata only; no `## Line N` sections.
- Line numbers refer to the file snapshot at review time, pinned by the full 64-hex-character SHA-256 in the metadata (the snapshot is CRLF-normalized).

## Applying feedback

1. Extract (line, comment) pairs from the `## Line N` headings and their blockquote runs.
2. Read the quoted line content to anchor each comment precisely.
3. Edit the file to address every comment; the author-of-record is the human reviewer — do not silently reinterpret their feedback.
4. Summarize applied changes back to the user; offer a re-review cycle if they want to verify the fixes.

## Flags

| Flag | Effect | Agent guidance |
|---|---|---|
| `--stdout` | Emit the report on stdout | **Always pass this** when consuming the report programmatically |
| `--no-open` | Don't launch a browser; URL printed to stderr | Only if the user asks to open the URL themselves |
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