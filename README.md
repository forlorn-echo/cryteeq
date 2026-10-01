# cryteeq

Pull-request-style review for any text file — locally. Comment line-by-line in
your browser, get a Markdown report to hand to the author (or to an AI agent).

## How it works

1. Run `cryteeq <file>` — your browser opens a familiar, PR-style view of
   the file with syntax highlighting.
2. Click any line to comment — or drag across line numbers (click one, then
   shift-click another) to quote a range of lines. Comments save instantly
   and survive restarts. The header's comment chip opens an overview of
   every comment; `j`/`k` jump between comments, `c` comments on the
   current line, `g` goes to a line number, and `?` lists all shortcuts.
3. Click **Complete Review** — a dialog shows the report rendered as
   formatted Markdown (with a source toggle) plus **Copy** and **Download**
   buttons, and the server stops.
4. Share the report with the author. They apply the feedback, you re-run — a
   fresh review cycle starts automatically.

If a review is interrupted (Ctrl+C, closed terminal), re-running the same
command resumes exactly where you left off.

## Quick start

Requirements: Node >= 20 on macOS or Linux.

```bash
git clone https://github.com/forlorn-echo/cryteeq.git
cd cryteeq
npm install
npm run build
npm link

cryteeq path/to/your/file.md
```

## Usage

```
cryteeq [--port <n>] [--no-open] [--stdout] [--help] [--version] <file>
```

| Flag | Effect |
|---|---|
| `--port <n>` | Use a specific port (default: first free port from 4173) |
| `--no-open` | Don't launch a browser; the URL is printed to stderr |
| `--stdout` | Emit the Markdown report on standard output upon completion |
| `--help` / `--version` | Usage / version |

**Exit codes:** `0` review completed · `1` usage/runtime error · `130`
interrupted (resumable).

Any UTF-8 text file works: Markdown, source code, configs, logs. Binary and
non-UTF-8 files are rejected with a clear error. Sessions live in
`~/.cryteeq/cryteeq.db` (one active review per file; completed history is
retained), and runtime errors append to a per-launch file under
`~/.cryteeq/logs/` — clean runs write nothing.

## Themes

The UI ships with three themes — **Catppuccin** (the default), **Dark**, and
**Light** — selectable from the header. Both the chrome and the syntax
highlighting follow the theme, and your choice is remembered across
launches. Switching themes never disturbs your review: open threads, composer
text, and scroll position are preserved.

## The report

The deliverable is a deterministic Markdown report — shown in the completion
dialog and, with `--stdout`, printed to stdout:

````markdown
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
````

A comment is always anchored to its **first** quoted line; a single-line
comment keeps the `## Line N` heading, a range comment produces
`## Lines N-M`. Reports containing only single-line comments are
byte-identical to the original format.

## AI-agent workflow

`cryteeq` is built for agentic loops: an agent runs the tool, a human reviews
in the browser, and the agent consumes the report from stdout and applies the
feedback.

```bash
REPORT=$(cryteeq draft-spec.md --stdout)
```

- The command **blocks** until the human clicks **Complete Review**.
- stdout carries **only** the Markdown report; all progress and errors go to
  stderr.
- Exit `0` + report on stdout = completed review. Exit `1` = failure (stdout
  empty). Exit `130` = interrupted, resumable.

The full agent contract — flags, exit codes, report format, parsing rules —
is in [SKILL.md](SKILL.md).

## Development

```bash
npm run build        # server bundle + client build
npm run typecheck    # both tsconfigs
npm run lint         # eslint
npm run format       # prettier --write
npm test             # vitest
```

Dev mode: `npm run dev:server -- --no-open --port 4173 <file>` (API only) plus
`npm run dev` (Vite client proxying `/api`).

| Document | Role |
|---|---|
| [specs/v-0.0-base.md](specs/v-0.0-base.md) | Normative baseline spec — requirements contracts and task breakdown |
| [specs/v-0.1-themes.md](specs/v-0.1-themes.md) | Theming spec — registry, persistence, themed highlighting |
| [specs/v-0.2-ux-overhaul.md](specs/v-0.2-ux-overhaul.md) | UX overhaul spec — comment overview, shortcuts, report dialog, feedback states |
| [SKILL.md](SKILL.md) | Agent-facing CLI usage contract |
| [AGENTS.md](AGENTS.md) | Repository conventions for agents and contributors |

## Status

Version `0.2.0` implements [specs/v-0.0-base.md](specs/v-0.0-base.md),
[specs/v-0.1-themes.md](specs/v-0.1-themes.md), and
[specs/v-0.2-ux-overhaul.md](specs/v-0.2-ux-overhaul.md).

## License

BSD 3-Clause — see [LICENSE](LICENSE).