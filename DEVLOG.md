# Slate Development Log — Road to Local NocoDB

**Goal:** Evolve Slate from a minimal Tauri 2 + React + SQLite CRUD app into a local, single-user NocoDB equivalent — with rich field types, multiple view types, per-view filters/sorts, and a polished UX.

**Stack:** Tauri 2 · React 18 · TypeScript · Vite · Rust · SQLite (rusqlite) · Zustand

**How to contribute:** Pick any incomplete task below, implement it, mark it `[x]`, and open a PR.
**Run tests:** `~/.cargo/bin/cargo test` (backend) · `npm run dev` (frontend)

---

## Phase 1: Rich Field Types ✅ COMPLETE
> Expand beyond the 5 current types (text, long_text, date, checkbox, link/URL) to match NocoDB's most-used field types.

### Backend ✅
- [x] `db/init.rs` — Extend `field_type` CHECK constraint + SQLite table-recreation migration
- [x] `db/mod.rs` — Updated `is_supported_field_type()` and `to_sql_column_type()`
- [x] `record_service.rs` — Extend `json_to_sql()` for REAL/INTEGER types
- [x] `db/init.rs` — Add `app_field_options` table
- [x] New: `field_option_service.rs` — Full CRUD for select options
- [x] `commands.rs` — Added 5 field option commands + updated `get_table_snapshot` to include options
- [x] `search_service.rs` — Include email/phone/url/select in LIKE search

### Field Types Added
| Type | SQL Storage | Status |
|------|-------------|--------|
| `number` | REAL | ✅ |
| `currency` | REAL | ✅ |
| `percent` | REAL | ✅ |
| `email` | TEXT | ✅ |
| `url` | TEXT | ✅ |
| `phone` | TEXT | ✅ |
| `single_select` | TEXT | ✅ |
| `multi_select` | TEXT | ✅ |
| `rating` | INTEGER | ✅ |
| `duration` | INTEGER | ✅ |

### Frontend ✅
- [x] `src/types/slate.ts` — Extended `FieldType` union to 15 types
- [x] `AddColumnModal.tsx` — Grouped field type picker (Text / Number / Date / Selection / Toggle)
- [x] `TableCell.tsx` — Renderers for all new types (stars, chips, number inputs, mailto/tel links)
- [x] `FieldEditor.tsx` — Detail panel editors for all new types
- [x] New: `SelectFieldEditor.tsx` — Chip-based single/multi select editor with inline option creation
- [x] `workspaceStore.ts` — `fieldOptionsByField` state + createFieldOption/updateFieldOption/deleteFieldOption actions

---

## Phase 2: Column Controls (Sort, Filter, Reorder, Visibility) ✅ COMPLETE
> Per-view column controls that make Slate feel like a real query tool.

### Sort ✅
- [x] New: `filter_service.rs` — `build_sort_clause()` builds ORDER BY from SortInput array
- [x] `record_service.rs` — `list_records()` accepts `sorts: Option<&[SortInput]>`
- [x] `commands.rs` — Pass sort params through `get_table_snapshot`
- [x] `TableHeaderCell.tsx` — Click cycles asc → desc → none with ▲▼⇅ indicator
- [x] `workspaceStore.ts` — `sortsByTable` state + `setSorts` action

### Filter ✅
- [x] `filter_service.rs` — `build_filter_clause()` supports eq/neq/contains/not_contains/is_empty/is_not_empty/gt/lt/gte/lte
- [x] `record_service.rs` — Accept `filters: Option<&[FilterInput]>`
- [x] `commands.rs` — Pass filter params through `get_table_snapshot`
- [x] New: `FilterBar.tsx` — Per-filter rows (field + op + value), "+Add filter" button
- [x] `workspaceStore.ts` — `filtersByTable` state + `setFilters` action

### Column Reordering ✅ (backend; drag-and-drop frontend pending)
- [x] `table_service.rs` — `reorder_fields(table_id, field_ids)` updates field_order
- [x] `commands.rs` — `reorder_fields` command registered
- [ ] Frontend: Drag-and-drop column headers (recommend `@dnd-kit/core`) — pending

### Column Visibility ✅
- [x] `table_service.rs` — `toggle_field_visibility(field_id)`
- [x] `commands.rs` — `toggle_field_visibility` command registered
- [x] Frontend: "Fields" panel in toolbar with checkboxes per field
- [x] `MainTableView.tsx` — Filters visible fields before passing to grid

### Column Resize
- [ ] Frontend only: Draggable column edge; persist widths to `localStorage`

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
