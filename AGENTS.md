# AGENTS.md — cryteeq Repository Guidelines

Global context and mandatory conventions for every agent working in this repository. Read fully before starting any task. These rules persist across all tasks.

## Project Context

`cryteeq` is a locally-run CLI + web app for single-reviewer, line-by-line commenting on any UTF-8 text file, with a pull-request-style review interface. The Markdown review report is the deliverable: shown in a completion dialog in the browser, and optionally emitted to stdout (`--stdout`) so an AI agent can capture it and apply the human's feedback.

There are two consumers of every change:

- the **human reviewer**, who interacts with the browser UI, and
- the **AI agent**, which parses the report from stdout.

Two contracts must never break: the **stdout purity contract** (FR-1.5) and the **report format** (`specs/v-0.0-base.md` §4.5). Agents parse both.

### Document hierarchy

| Document | Role |
|---|---|
| `specs/v-0.0-base.md` | Normative MVP baseline: requirements contracts (FR tables, NFRs, report format, acceptance criteria) + task breakdown. Frozen once implemented. Any behavior change requires a new `specs/v-0.x-<topic>.md` in the same change. |
| `specs/v-0.x-<topic>.md` | Later behavior changes append new spec files — never edit released specs in place. |
| `SKILL.md` | Normative agent-facing usage contract (flags, exit codes, report format, parsing rules). Any change to the CLI contract or report format must update `SKILL.md` in the same change. |
| `AGENTS.md` | This file — persistent conventions. |

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node >= 20, TypeScript (strict), ESM |
| Server | Fastify 5, `@fastify/static` |
| Database | `better-sqlite3` (WAL, foreign keys ON); plain SQL migrations |
| Highlighting | `shiki` — server-side tokenization, theme `github-dark`, lazily loaded grammars |
| Browser launch | `open` |
| Client | Vite + React 18 + TypeScript, Tailwind CSS 4 |
| Tests | vitest (node environment; `fastify.inject`; never live servers) |
| Lint / format | ESLint 9 flat config + typescript-eslint; Prettier (defaults) |
| Build | `tsup` (server bundle, `bin` entry, shebang banner; external: `better-sqlite3`, `shiki`) + `vite build` (client → `dist/client`) |

### Runtime setup

```
npm install                # Node >= 20 required
```

- Dev API server (watch mode, API-only — the UI is served by Vite): `npm run dev:server -- --no-open --port 4173 <file>`; the Vite dev proxy targets this port, so they must match
- Dev client (Vite, proxies `/api` → http://127.0.0.1:4173): `npm run dev`
- Production CLI: `npm run build` then `node dist/server/cli.js <file>` (or `npm link` for the `cryteeq` bin)

## Folder Structure

```
cryteeq/
├── AGENTS.md
├── SKILL.md                    # agent-facing CLI usage contract
├── specs/
│   └── v-0.0-base.md           # frozen MVP baseline plan
├── index.html                  # Vite entry
├── package.json
├── eslint.config.js
├── prettier.config.js
├── tsconfig.json               # server + shared + tests + build configs
├── tsconfig.client.json        # client + shared (DOM libs, react-jsx)
├── tsup.config.ts
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── shared/
│   │   └── types.ts            # API / payload types shared by server and client
│   ├── server/
│   │   ├── cli.ts              # entry: args, port, session resolve, signals, --stdout
│   │   ├── server.ts           # Fastify app, routes, static serving, SPA fallback
│   │   ├── fileinfo.ts         # file validation, SHA-256, language detection
│   │   ├── db.ts               # SQLite schema + queries
│   │   ├── report.ts           # §4.5 report generator
│   │   ├── highlight.ts        # Shiki tokenization (server-side)
│   │   └── logger.ts           # errors-only launch log (FR-1.6, lazy creation)
│   └── client/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts              # fetch wrappers
│       ├── useReview.ts        # the single state hook
│       ├── index.css           # @import "tailwindcss";
│       └── components/         # Header, WarningBanner, FileViewer, LineRow,
│                             #   CommentThread, Dialog, ConfirmDialog, ReportDialog
└── tests/
    ├── fileinfo.test.ts
    ├── db.test.ts
    ├── report.test.ts
    ├── highlight.test.ts
    ├── logger.test.ts
    └── api.test.ts
```

## Commands

| Purpose | Command |
|---|---|
| Build everything (server then client) | `npm run build` |
| Build server only / client only | `npm run build:server` / `npm run build:client` |
| Type-check both projects | `npm run typecheck` |
| Lint | `npm run lint` |
| Format / check formatting | `npm run format` / `npm run format:check` |
| Run tests once / watch | `npm test` / `npm run test:watch` |
| Dev API server / dev client | `npm run dev:server -- <file>` / `npm run dev` |

**Verification gate** — run before declaring any task complete:

```
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

## Mandatory Conventions

### Error handling

- File validation throws `FileError` (`src/server/fileinfo.ts`); the CLI prints its message to stderr and exits `1`.
- API errors respond as JSON `{"error": "<message>"}` — `400` for validation, `404` for a missing/out-of-session comment. Never leak stack traces.
- The client `api.ts` wrapper throws `Error(message)` from the API error body.
- Comment text is validated server-side (non-empty after trim; 64 KiB cap → `400`); client validation is a convenience, not the enforcement point.
- CLI exit codes are normative (FR-1 exit-code table, `specs/v-0.0-base.md` §2.1): `0` complete · `1` usage/runtime error · `130` SIGINT/SIGTERM.

### Logging rules (STRICT)

- **stdout is reserved for the report.** In `--stdout` mode stdout must carry only the Markdown report (FR-1.5) — therefore all CLI progress, URLs, summaries, and errors go to **stderr**, always, even without `--stdout`.
- The **per-launch error log** (FR-1.6) is the only file output channel: runtime errors append to `~/.cryteeq/logs/<launch>.log`, created lazily on the first write — clean runs emit nothing and create no files. Log write failures are swallowed; logging never breaks a run. Entries carry metadata only — never file, comment, or report content. Usage errors are not logged.
- No `console.log` anywhere in server or client code. Fastify runs with `logger: false`; no request logging.
- On any failure path, stdout stays empty — never print a partial report.

### State management

- SQLite is the only persistent store; nothing durable lives in memory or files.
- Every comment mutation commits immediately (NFR-4) — no batching, no write-behind.
- The server keeps only the session snapshot (`FileMeta`) and the current review row in memory; all reads/writes go through the DB.
- Client state is owned solely by the `useReview()` hook; components are presentational and receive props. No global state libraries.
- One in-progress review session per absolute file path (partial unique index); completed sessions are retained for history (FR-4.5).

### Testing policy

- **Do not perform manual testing.** Never launch the server and click through the UI, open browsers, or curl a running instance to verify work. The user performs all manual/QA testing.
- Verification is automated only: the verification gate above.
- API tests use `fastify.inject`; DB tests use `:memory:` or temp-file databases; file tests use `os.tmpdir()` fixtures. Tests never open ports or spawn processes.

### Code style

- TypeScript strict mode; no `any`; type-only imports use `import type` (`verbatimModuleSyntax`).
- No comments in code unless explicitly asked.
- Two tsconfigs: `tsconfig.json` (server, shared, tests, build configs) and `tsconfig.client.json` (client, shared; DOM libs; `jsx: react-jsx`).
- `better-sqlite3` and `shiki` stay external in the tsup bundle.
- Styling is Tailwind utility classes inline; `src/client/index.css` contains only the Tailwind import.

### Git

- The repository is initialized in task T1 of the base spec (`git init`, default branch `main`, `.gitignore` for `node_modules/`, `dist/`, logs).
- **Conventional Commits** required: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` (scope optional, e.g. `feat(server): ...`).
- Commit once per completed spec task; stage only the files that task touched.
- Never amend or rebase published commits, never force-push, never commit secrets or local paths.

### Specs convention

- `specs/v-0.0-base.md` is frozen once implemented. New behavior changes append `specs/v-0.x-<topic>.md` (monotonic version, e.g. `v-0.1-dark-theme.md`), referencing the FR contracts they change and using the same task format.
- Before implementing a spec task, re-read its contract section. Never rewrite a spec file's contracts after implementation — open a new spec instead.