# Slate

Local-first desktop workspace for structured personal data.

Slate is a single-user app that feels like a stack of relational spreadsheets, backed by a local SQLite database. It is designed for fast personal workflows like contacts, research, projects, and notes.

Created by [Anthony McCloskey](https://anthonymccloskey.com).

## Status

- MVP in active development
- Primary development environment: macOS
- Local-only data model (no auth, no cloud sync, no subscriptions)

## Features

### Available now

**Tables & Fields**
- Local SQLite-backed tables and records
- Table CRUD: create, rename, delete
- Field CRUD: create, rename, delete
- 15 field types: `text`, `long_text`, `number`, `currency`, `percent`, `email`, `url`, `phone`, `date`, `checkbox`, `single_select`, `multi_select`, `rating`, `duration`
- Select field options: add, rename, recolor, reorder, delete chips

**Grid View**
- Inline grid editing with type-aware cell renderers (stars for rating, chips for select, mailto/tel links, etc.)
- Expandable record detail panel (side panel) and full-screen expand modal (double-click row)
- Per-table full-text search
- Column visibility toggles (show/hide fields panel)
- Column sort (click header to cycle asc → desc → none)
- Filters with 10 operators: `eq`, `neq`, `contains`, `not_contains`, `is_empty`, `is_not_empty`, `gt`, `lt`, `gte`, `lte`
- Row height modes: compact / default / tall
- Keyboard navigation: arrow keys, Tab, Enter to expand, Escape to close

**Multiple View Types**
- **Grid** — the default spreadsheet-style view
- **Gallery** — card grid with primary field and field preview
- **Kanban** — group by any single-select field; drag cards between columns
- Named views per table with independent sorts, filters, and field visibility

**Data In / Out**
- CSV import (maps columns to fields by name, case-insensitive)
- CSV export (native save dialog)
- Cross-table record linking
- Record attachments (attach, open, remove local files)

### Planned next

- **Calendar view** — group records by a date field in a month/week layout
- **Formula fields** — computed values using `evalexpr` (arithmetic, IF, string concat, DATEADD)
- **Lookup / Rollup fields** — aggregate linked record values (SUM, COUNT, MIN, MAX, AVG)
- **Bulk operations** — checkbox multi-select, bulk delete, bulk field update
- **Column drag-and-drop reorder**
- **JSON export**

## Stack

- Desktop shell: [Tauri 2](https://v2.tauri.app/)
- Frontend: [React](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/) + [Zustand](https://zustand-demo.pmnd.rs/)
- Database: SQLite via `rusqlite` (bundled)
- Icons: [Lucide](https://lucide.dev/)

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Rust toolchain (`rustup`, `cargo`, `rustc`)
- Tauri system dependencies for your OS: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

If Rust was just installed, open a new shell or run:

```bash
source "$HOME/.cargo/env"
```

### Install

```bash
git clone https://github.com/tadpole256/slate.git
cd slate
npm install
```

### Run in development

```bash
npm run tauri -- dev
```

### Build production bundle

```bash
npm run tauri build
```

Build output is written to `src-tauri/target/release/bundle/`.

### Verify locally

```bash
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

## Data Location and Backups

Slate stores data in your Tauri app data directory under app id `com.tadpole.slate`.

- Database file: `slate.db`
- Attachment directory: `attachments/`

macOS default path:

```text
~/Library/Application Support/com.tadpole.slate/
```

### Backup

1. Fully quit Slate.
2. Copy `slate.db` and `attachments/` to a backup location.
3. Keep both together so attachment references stay valid.

### Restore

1. Fully quit Slate.
2. Replace `slate.db` and `attachments/` with your backup copies.
3. Reopen Slate.

## Troubleshooting

- `cargo: command not found`
  Install Rust with `rustup`, then run `source "$HOME/.cargo/env"`.
- App hangs on startup
  Restart the app. If it persists, move the current DB directory aside and relaunch to regenerate a fresh local DB.
- Dev app does not start
  Re-run `npm install`, then `npm run tauri -- dev` and check Tauri prerequisite packages for your OS.

## Project Docs

- Architecture and delivery plan: [docs/SLATE_MVP_PLAN.md](./docs/SLATE_MVP_PLAN.md)
- Session-by-session implementation history: [docs/DEVELOPMENT_LOG.md](./docs/DEVELOPMENT_LOG.md)

## Contributing

Feedback and contributions are welcome.

- Bugs and feature requests: [GitHub Issues](https://github.com/tadpole256/slate/issues)
- Code contributions:
  1. Fork the repository.
  2. Create a branch: `git checkout -b feature/my-new-feature`
  3. Commit changes.
  4. Run: `npm run build` and `cargo test --manifest-path src-tauri/Cargo.toml`
  5. Open a pull request.

Code layout:

- Frontend (React/TypeScript): `src/`
- Tauri/Rust/SQLite backend: `src-tauri/`

## License

Slate is released under the [GNU General Public License v3.0](./LICENSE).
