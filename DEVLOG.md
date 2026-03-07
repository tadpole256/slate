# Slate Development Log — Road to Local NocoDB

**Goal:** Evolve Slate from a minimal Tauri 2 + React + SQLite CRUD app into a local, single-user NocoDB equivalent — with rich field types, multiple view types, per-view filters/sorts, and a polished UX.

**Stack:** Tauri 2 · React 18 · TypeScript · Vite · Rust · SQLite (rusqlite) · Zustand

**How to contribute:** Pick any incomplete task below, implement it, mark it `[x]`, and open a PR.
**Run tests:** `~/.cargo/bin/cargo test` (backend) · `npm run dev` (frontend)

---

## Phase 1: Rich Field Types
> Expand beyond the 5 current types (text, long_text, date, checkbox, link/URL) to match NocoDB's most-used field types.

### Backend
- [ ] `db/init.rs` — Extend `field_type` CHECK constraint to include all new types
- [ ] `db/mod.rs` — Update `is_supported_field_type()` and `to_sql_column_type()`
- [ ] `record_service.rs` — Extend `json_to_sql()` for new types (REAL for number/currency/percent/rating)
- [ ] `db/init.rs` — Add `app_field_options` table: `(id, field_id, label, color, sort_order)` for single/multi select options
- [ ] `commands.rs` — Add commands: `create_field_option`, `update_field_option`, `delete_field_option`, `list_field_options`
- [ ] `table_service.rs` or new `field_option_service.rs` — Implement field option CRUD
- [ ] `schema_service.rs` / `search_service.rs` — Exclude non-text types (number, rating, etc.) from LIKE search; include email/phone/url

### Field Types to Add
| Type | SQL Storage | Notes |
|------|-------------|-------|
| `number` | REAL | integer or float |
| `currency` | REAL | display only — no special storage |
| `percent` | REAL | display only |
| `email` | TEXT | render as `mailto:` link in grid |
| `url` | TEXT | rename existing `link` type to `url` |
| `phone` | TEXT | render as `tel:` link |
| `single_select` | TEXT | label stored; options in `app_field_options` |
| `multi_select` | TEXT | comma-separated labels |
| `rating` | INTEGER | 0–5 |
| `duration` | INTEGER | stored as seconds |

### Frontend
- [ ] `src/types/slate.ts` — Add new field type strings to `FieldType` union
- [ ] `AddColumnModal.tsx` — Add all new types to the picker with icons/descriptions
- [ ] `TableCell.tsx` — Add grid cell renderers for each new type
- [ ] `FieldEditor.tsx` — Add detail panel editors for each new type
- [ ] New: `SelectFieldEditor.tsx` — chip-based multi/single select editor with dropdown
- [ ] New: `FieldOptionsModal.tsx` — UI to manage select options (add/rename/recolor/reorder/delete)
- [ ] `workspaceStore.ts` — Add state + actions for field options

---

## Phase 2: Column Controls (Sort, Filter, Reorder, Visibility)
> Per-view column controls that make Slate feel like a real query tool.

### Sort
- [ ] `record_service.rs` — `list_records()` accepts `sort: Vec<{field_id, direction}>`, replaces hardcoded `ORDER BY updated_at DESC`
- [ ] `commands.rs` — Pass sort params through `get_table_snapshot`
- [ ] Frontend: Column header click cycles asc → desc → none; sort indicator icon
- [ ] `workspaceStore.ts` — Add `sortsByTable` state; pass to snapshot call

### Filter
- [ ] `record_service.rs` — Accept `filters: Vec<{field_id, op, value}>` appended to WHERE clause
  - Ops: `eq`, `neq`, `contains`, `not_contains`, `is_empty`, `is_not_empty`, `gt`, `lt`, `gte`, `lte`
- [ ] `commands.rs` — Pass filter params through `get_table_snapshot`
- [ ] New: `FilterBar.tsx` — "Add filter" button → per-filter row (field + op + value)
- [ ] `workspaceStore.ts` — Add `filtersByTable` state

### Column Reordering
- [ ] `commands.rs` — New command `reorder_fields(table_id, field_ids_in_order)` updates `field_order`
- [ ] `table_service.rs` — Implement batch `field_order` update
- [ ] Frontend: Drag-and-drop column headers (recommend `@dnd-kit/core`)

### Column Visibility
- [ ] `commands.rs` — New command `toggle_field_visibility(field_id)`
- [ ] `table_service.rs` — Update `app_fields.is_visible`
- [ ] `get_table_snapshot` — Filter hidden fields from response
- [ ] Frontend: "Hide fields" panel in toolbar showing field toggles

### Column Resize
- [ ] Frontend only: Draggable column edge handle; persist widths to `localStorage` keyed by `table_id:field_id`

---

## Phase 3: Named Views System
> Multiple saved views per table, each with its own sorts/filters/field visibility. `app_views` table already exists in schema.

### Backend
- [ ] New: `view_service.rs` — CRUD on `app_views`; `config_json` stores `{sorts, filters, hidden_fields, row_height}`
- [ ] `commands.rs` — New commands: `create_view`, `rename_view`, `delete_view`, `list_views`, `update_view_config`
- [ ] `record_service.rs` / `get_table_snapshot` — Accept optional `view_id`; apply view's config
- [ ] `commands.rs` — `get_table_snapshot` applies view config when `view_id` is passed

### View Types (in implementation order)
1. **Grid** (already exists — migrate to named view model)
   - [ ] Ensure existing grid becomes "Grid 1" default view on first load
2. **Gallery**
   - [ ] New: `GalleryView.tsx` — card grid; shows primary label + attachments thumbnail if present
3. **Kanban**
   - [ ] New: `KanbanView.tsx` — group by `single_select` field; drag cards between columns (updates record value)
   - [ ] `commands.rs` — Add `move_record_to_group(record_id, field_id, new_value)` shorthand
4. **Calendar**
   - [ ] New: `CalendarView.tsx` — group by `date` field; month/week toggle

### Frontend
- [ ] View tabs bar below toolbar: "Grid 1 ▾", "+ Add view" button
- [ ] View type picker modal with icons (Grid, Gallery, Kanban, Calendar)
- [ ] `workspaceStore.ts` — Add `viewsByTable`, `activeViewId` state

---

## Phase 4: Record UX Improvements
> Row-level features that complete the database UI feel.

- [ ] **Full-screen record expand** — Double-click row opens `RecordDetailPanel` as a modal overlay
- [ ] **Record notes/activity** — Internal `_notes` text field per record (or separate `record_comments` table)
- [ ] **Bulk operations** — Checkbox column; shift+click range select; bulk delete + bulk field update toolbar
- [ ] **Row height toggle** — Short / Medium / Tall; stored per view in `config_json`
- [ ] **Keyboard navigation** — Arrow keys move between cells; Enter opens detail; Escape closes; Tab advances cell

---

## Phase 5: Import / Export
> Get data in and out of Slate easily.

- [ ] **CSV Import** — New command `import_csv(table_id, file_path)`: parse CSV, infer/map columns, insert records; frontend: "Import" button → file picker → column mapping step
- [ ] **CSV Export** — New command `export_csv(table_id, view_id?)`: respects current view's filters/sorts; frontend: "Export" button → immediate download
- [ ] **JSON Export** — Same pattern; includes field metadata

---

## Phase 6: Formula & Rollup Fields *(Advanced)*
> Computed fields — highest complexity, implement last.

- [ ] **Formula fields** — Store expression in new `app_field_formula` table; evaluate at read time in Rust using `evalexpr` crate; support arithmetic, string concat, IF, DATEADD
- [ ] **Lookup fields** — Pull a field value from a linked record
- [ ] **Rollup fields** — Aggregate (SUM, COUNT, MIN, MAX, AVG) across all linked records

---

## Architecture Notes

| Concept | Location |
|---------|----------|
| Single SQLite connection | `Mutex<Connection>` in `AppState` |
| All IPC | `with_conn()` in `commands.rs` |
| Schema repair | `repair_all_table_storage` in `init_app` (NOT in `initialize_database`) |
| Tauri commands | `src-tauri/src/commands.rs` |
| State management | `src/store/workspaceStore.ts` (Zustand) |
| Field options table | `app_field_options` (to be created in Phase 1) |
| View config | `app_views.config_json` JSON blob (table already exists) |
| Tests | `src-tauri/src/tests.rs` — run with `~/.cargo/bin/cargo test` |

**Security notes:** All SQL identifiers go through `quote_ident()` in `schema_service.rs`. Filter/sort values must be parameterized (use `rusqlite` params, not string interpolation).

---

## Progress Tracker

| Phase | Status |
|-------|--------|
| 1 — Field Types | 🔲 Not started |
| 2 — Sort / Filter / Column Controls | 🔲 Not started |
| 3 — Named Views | 🔲 Not started |
| 4 — Record UX | 🔲 Not started |
| 5 — Import / Export | 🔲 Not started |
| 6 — Formula / Rollup | 🔲 Not started |
