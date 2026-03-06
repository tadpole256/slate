# Slate

Slate is a local-first desktop workspace: a stack of spreadsheet-like tables backed by a real SQLite database.

## Stack

- Tauri (Rust backend)
- React + TypeScript (Vite)
- SQLite (local `slate.db` in app data directory)

## Docs

- Architecture + MVP plan: `docs/SLATE_MVP_PLAN.md`
- Ongoing implementation log: `docs/DEVELOPMENT_LOG.md`

## Run

```bash
npm install
npm run tauri dev
```

Requirements:
- Node.js 20+
- Rust toolchain (`cargo`, `rustc`) installed and on `PATH`
