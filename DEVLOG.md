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

## Phase 3: Named Views System ✅ COMPLETE
> Multiple saved views per table, each with its own sorts/filters/field visibility. `app_views` table already exists in schema.

### Backend ✅
- [x] New: `view_service.rs` — CRUD on `app_views`; `config_json` stores `{hiddenFieldIds, kanbanGroupByFieldId, rowHeight}`
- [x] `commands.rs` — New commands: `create_view`, `rename_view`, `delete_view`, `list_views`, `update_view_config`
- [x] `get_table_snapshot` — Applies view's sorts/filters/hidden fields when rendering

### View Types ✅ (Grid, Gallery, Kanban complete; Calendar pending)
1. **Grid** ✅ — Migrated to named view model; "Grid 1" created as default view
2. **Gallery** ✅
   - [x] New: `GalleryView.tsx` — card grid showing primary field + visible fields as label/value rows
3. **Kanban** ✅
   - [x] New: `KanbanView.tsx` — group by any `single_select` field; drag cards between columns (updates record value in DB)
   - [x] Group-by field selector in kanban toolbar; config persisted to `config_json`
4. **Calendar** — pending (complex; deferred to Phase 6-era)
   - [ ] New: `CalendarView.tsx` — group by `date` field; month/week toggle

### Frontend ✅
- [x] `ViewTabsBar.tsx` — View tabs below toolbar: click to switch, "+" to add, rename/delete context menu
- [x] `AddViewModal.tsx` — View type picker with icons (Grid, Gallery, Kanban)
- [x] `workspaceStore.ts` — `viewsByTable`, `activeViewIdByTable`, `hiddenFieldIdsByTable`, `kanbanGroupByFieldIdByTable` state
- [x] `workspaceStore.ts` — `setActiveView`, `saveActiveViewConfig`, `setKanbanGroupByField` actions

---

## Phase 4: Record UX Improvements ✅ COMPLETE (core features)
> Row-level features that complete the database UI feel.

- [x] **Full-screen record expand** — Double-click row opens `ExpandedRecordModal.tsx` as a full-screen overlay; Escape or backdrop-click to close
- [x] **Row height toggle** — Compact / Default / Tall modes in toolbar; stored per view in `config_json`; applied as CSS class on `<table>`
- [x] **Keyboard navigation** — Arrow keys move between cells; Tab advances cell (wraps to next row); Enter expands record modal; Escape clears focus
- [ ] **Bulk operations** — Checkbox multi-select, bulk delete + bulk field update toolbar (pending)
- [ ] **Record notes/activity** — `_notes` field or `record_comments` table (pending)

---

## Phase 5: Import / Export ✅ COMPLETE (CSV)
> Get data in and out of Slate easily.

- [x] **CSV Import** — `csv_service::import_csv` (Rust): native file picker via `rfd`, RFC-4180 parser, case-insensitive header→field matching by `display_name`; frontend "Import" button triggers immediately
- [x] **CSV Export** — `csv_service::export_csv` (Rust): RFC-4180 escaping, native save dialog via `rfd`; frontend "Export" button triggers immediately
- [ ] **JSON Export** — Same pattern; includes field metadata (pending)

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
| Field options table | `app_field_options` (created in Phase 1) |
| View config | `app_views.config_json` JSON blob (table already exists) |
| Tests | `src-tauri/src/tests.rs` — run with `~/.cargo/bin/cargo test` |

**Security notes:** All SQL identifiers go through `quote_ident()` in `schema_service.rs`. Filter/sort values must be parameterized (use `rusqlite` params, not string interpolation).

---

## Progress Tracker

| Phase | Status |
|-------|--------|
| 1 — Field Types | ✅ Complete |
| 2 — Sort / Filter / Column Controls | ✅ Complete |
| 3 — Named Views | ✅ Complete (Calendar view pending) |
| 4 — Record UX | ✅ Complete (bulk ops pending) |
| 5 — Import / Export | ✅ Complete (JSON export pending) |
| 6 — Formula / Rollup | 🔲 Not started |
