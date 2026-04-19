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
| `tags` | TEXT (CSV) | ✅ |

### Frontend ✅
- [x] `src/types/slate.ts` — Extended `FieldType` union to 16 types (incl. `tags`)
- [x] `AddColumnModal.tsx` — Grouped field type picker (Text / Number / Date / Selection / Toggle)
- [x] `TableCell.tsx` — Renderers for all new types (stars, chips, number inputs, mailto/tel links)
- [x] `FieldEditor.tsx` — Detail panel editors for all new types
- [x] New: `SelectFieldEditor.tsx` — Chip-based single/multi select editor with inline option creation
- [x] `workspaceStore.ts` — `fieldOptionsByField` state + createFieldOption/updateFieldOption/deleteFieldOption actions
- [x] New: `TagsCell.tsx` — Inline chip input; free-text tags with deterministic color hashing; Enter/comma to add, Backspace to remove, deduplication; CSV storage (same format as multi_select)

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

### Column Reordering ✅ COMPLETE
- [x] `table_service.rs` — `reorder_fields(table_id, field_ids)` updates field_order
- [x] `commands.rs` — `reorder_fields` command registered
- [x] Frontend: Drag-and-drop column headers via `@dnd-kit/core` + `@dnd-kit/sortable`
  - `TableHeaderCell.tsx` — `useSortable` hook + `GripVertical` drag handle (hidden until hover); listeners on handle only so sort-click still works
  - `TableGrid.tsx` — `DndContext` + `SortableContext` (horizontal); `PointerSensor` with `distance: 5` activation constraint; optimistic local state + `DragOverlay` ghost label
  - `MainTableView.tsx` — Hidden-field merge algorithm: visible fields reordered while hidden fields stay in place; full field ID list sent to `reorderFields` store action

### Column Visibility ✅
- [x] `table_service.rs` — `toggle_field_visibility(field_id)`
- [x] `commands.rs` — `toggle_field_visibility` command registered
- [x] Frontend: "Fields" panel in toolbar with checkboxes per field
- [x] `MainTableView.tsx` — Filters visible fields before passing to grid

### Column Resize ✅
- [x] Frontend only: Draggable column edge; persist widths to `localStorage` (keyed `slate-col-w-{fieldId}`); minimum 60px; `<colgroup>/<col>` via `table-layout: fixed`; resize handle via `.col-resize-handle` CSS; `mousedown`/`mousemove`/`mouseup` on document

---

## Phase 3: Named Views System ✅ COMPLETE
> Multiple saved views per table, each with its own sorts/filters/field visibility. `app_views` table already exists in schema.

### Backend ✅
- [x] New: `view_service.rs` — CRUD on `app_views`; `config_json` stores `{hiddenFieldIds, kanbanGroupByFieldId, rowHeight}`
- [x] `commands.rs` — New commands: `create_view`, `rename_view`, `delete_view`, `list_views`, `update_view_config`
- [x] `get_table_snapshot` — Applies view's sorts/filters/hidden fields when rendering

### View Types ✅ (Grid, Gallery, Kanban, Calendar complete)
1. **Grid** ✅ — Migrated to named view model; "Grid 1" created as default view
2. **Gallery** ✅
   - [x] New: `GalleryView.tsx` — card grid showing primary field + visible fields as label/value rows
3. **Kanban** ✅
   - [x] New: `KanbanView.tsx` — group by any `single_select` field; drag cards between columns (updates record value in DB)
   - [x] Group-by field selector in kanban toolbar; config persisted to `config_json`
4. **Calendar** ✅
   - [x] New: `CalendarView.tsx` — month grid; group by any `date` field; records appear on their date cells

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
- [x] **Bulk operations** — Checkbox multi-select column; shift+click range select; bulk delete action bar appears when selection > 0
- [x] **Record notes/activity** — `record_notes` SQLite table (id, table_id, record_id, body, created_at); `note_service.rs` for CRUD; notes section in `ExpandedRecordModal.tsx` with Cmd+Enter submit; notes delete button per-note

---

## Phase 5: Import / Export ✅ COMPLETE (CSV)
> Get data in and out of Slate easily.

- [x] **CSV Import** — `csv_service::import_csv` (Rust): native file picker via `rfd`, RFC-4180 parser, case-insensitive header→field matching by `display_name`; frontend "Import" button triggers immediately
- [x] **CSV Export** — `csv_service::export_csv` (Rust): RFC-4180 escaping, native save dialog via `rfd`; frontend "Export" button triggers immediately
- [x] **JSON Export** — `csv_service::export_json` (Rust): `serde_json::to_string_pretty`, native save dialog; records exported as array of objects keyed by `display_name`; frontend "JSON" button in `TableToolbar`

---

## Phase 6: UX Completions ✅ COMPLETE

- [x] **Grouped Grid View** — "Group By" toolbar dropdown; records bucketed by field value with collapsible section headers; ungrouped records in "No value" group
- [x] **Calendar View** — Month grid (7×6); records appear on date cells matched by a configurable date field; added as 4th view type in `AddViewModal`
- [x] **Bulk Operations** — Checkbox column (shift+click range select); "Delete N" action bar; backend `delete_records` batch command
- [x] **Command Palette** — Cmd+K global overlay; fuzzy search across tables + actions; arrow-key navigation; Escape to close

---

## Phase 7: Computed Fields ✅ COMPLETE

### Backend ✅
- [x] `db/init.rs` — `app_field_computed` table + `migrate_field_type_constraint_v2()` adds `lookup`, `rollup`, `formula` to CHECK constraint
- [x] `models.rs` — `AppField.computed_config: Option<String>`
- [x] `metadata_service.rs` — `list_fields` + `get_field` LEFT JOIN `app_field_computed`
- [x] `table_service.rs` — `is_computed_field_type()` helper; `create_field` writes to `app_field_computed`; `repair_table_storage` + `delete_field` skip computed fields
- [x] `record_service.rs` — `fetch_computed_configs` → `build_select_exprs` → `FROM {} r` alias → lookup/rollup SQL subqueries → `apply_formula_fields` (evalexpr post-processing)
- [x] `commands.rs` — `create_field` accepts `computed_config: Option<String>`
- [x] `Cargo.toml` — `evalexpr = "11"` for formula evaluation

### Computed Field Types
| Type | Strategy | Status |
|------|----------|--------|
| `lookup` | Correlated subquery via `record_links` (LIMIT 1) | ✅ |
| `rollup` | Aggregate subquery via `record_links` (COUNT/SUM/AVG/MIN/MAX) | ✅ |
| `formula` | Post-process with `evalexpr` after row fetch | ✅ |

### Frontend ✅
- [x] `src/types/slate.ts` — `isComputedFieldType`, `COMPUTED_FIELD_TYPES`, `AppField.computed_config`, `FieldMutationInput.computed_config`
- [x] `src/lib/tauri.ts` — `createField` passes `computedConfig`
- [x] `workspaceStore.ts` — `addField` action flows `computed_config` through
- [x] `AddColumnModal.tsx` — "Computed" group with inline config UI: table/field selectors for lookup+rollup; fn dropdown for rollup; formula textarea + field-insert chips
- [x] `App.tsx` — Passes `tables`, `fieldsByTable`, `currentTableId` to `<AddColumnModal>`
- [x] `TableCell.tsx` — Read-only `.computed-cell` rendering for all computed types
- [x] `FieldEditor.tsx` — Read-only `.computed-field-value` display in expand modal

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

## Phase 8: Form View + Backups ✅ COMPLETE

### Form View ✅
- [x] `ViewType` — Added `"form"` to union type
- [x] New: `FormView.tsx` — Card-style entry form; blank defaults; Submit creates record via `submitFormRecord`; Clear resets; 3-second "✓ Record added" confirmation; computed fields filtered out
- [x] `AddViewModal.tsx` — Form added as 5th view type with `ClipboardList` icon
- [x] `workspaceStore.ts` — `submitFormRecord` action calls `createRecord` with prefilled values
- [x] `App.tsx` — `viewType === "form"` branch renders `<FormView>`

### Backups ✅
- [x] New: `backup_service.rs` — `pick_backup_folder` (rfd dialog), `create_backup` (SQLite `.backup()` API via raw SQL `VACUUM INTO`), `list_backup_files` (reads dir sorted by mtime)
- [x] `commands.rs` — `pick_backup_folder`, `create_backup`, `list_backup_files` commands
- [x] `workspaceStore.ts` — `backupDir`, `lastBackupAt`, `backupFiles`, `backupsLoading` state; `pickBackupFolder`, `runBackup` actions; loaded in `initialize()`
- [x] `SettingsModal.tsx` — Backups section: folder picker, "Backup Now" button, last backup timestamp, recent backup file list

---

## Phase 9: Settings, Folders, Record Window, Light Mode ✅ COMPLETE

### Settings > Databases ✅
- [x] `external_db_service.rs` — `list_external_connections()` reads `app_meta` for `ext_db_*` keys; returns `ExternalConnection` summaries with alias, path, table IDs/names
- [x] `SettingsModal.tsx` — Databases section: internal DB path, external connection list with disconnect buttons, "Connect Database…" button

### Folders / Workspaces ✅
- [x] `db/init.rs` — `app_folders` table + `idx_app_folders_order` index; `migrate_add_folder_id()` adds `folder_id` column to `app_tables`
- [x] New: `folder_service.rs` — `list_folders`, `create_folder`, `rename_folder`, `delete_folder` (ungroups tables, does not delete them), `move_table_to_folder`, `reorder_folders`
- [x] `models.rs` — `AppFolder`, `folder_id: Option<String>` on `AppTable`
- [x] `metadata_service.rs` — `list_tables` + `get_table` include `folder_id`
- [x] New: `FolderListItem.tsx` — Collapsible folder group with chevron, rename/delete buttons, table list; collapse state persisted to `localStorage`
- [x] `TableListItem.tsx` — Move-to-folder popover (`FolderInput` icon); shows folder list; "Remove from folder" when already grouped
- [x] `TableList.tsx` — Passes `folders` + `onMoveToFolder` through to items
- [x] `Sidebar.tsx` — Restructured: ungrouped tables → folder groups → "External" labeled section; "+ New Folder" button

### Record Detail Window ✅
- [x] `commands.rs` — `get_record_detail` returns `RecordDetailPayload` (table + fields + options + record)
- [x] `capabilities/default.json` — `core:window:allow-create`, `core:window:allow-set-title`, `"record-*"` window pattern
- [x] New: `RecordDetailWindow.tsx` — Standalone OS window; fetches record on mount; auto-saves on field change; delete button closes window
- [x] `main.tsx` — `?mode=record` URL param routing renders `RecordDetailWindow` instead of `App`
- [x] `MainTableView.tsx` — `onOpenRecordWindow` prop; passed as `onDoubleClickRecord` (falls back to `onExpandRecord`)

### Light Mode ✅
- [x] New: `src/lib/theme.ts` — `initTheme()`, `setTheme()`, `getTheme()` with `localStorage` persistence
- [x] `styles.css` — `[data-theme="light"]` CSS variable overrides for all surfaces
- [x] `main.tsx` — Calls `initTheme()` before React render to prevent flash
- [x] `SettingsModal.tsx` — Appearance section: Dark / Light toggle buttons
- [x] `workspaceStore.ts` — `theme` state + `setTheme` action

---

## Phase 10: Column Resize, JSON Export, Record Notes ✅ COMPLETE

### Column Resize ✅
- [x] `TableHeaderCell.tsx` — `.col-resize-handle` div at right edge; `onMouseDown` starts drag; sets `cursor: col-resize` on body during drag; cleans up on `mouseup`
- [x] `TableGrid.tsx` — `colWidths` state (Record<fieldId, number>); `<colgroup>` + `<col>` elements with explicit widths; `table-layout: fixed`; widths persisted to `localStorage` (`slate-col-w-{fieldId}`); min 60px enforced
- [x] `styles.css` — `.col-resize-handle` absolute-positioned 5px handle; blue hover accent via `--accent-primary`

### JSON Export ✅
- [x] `csv_service.rs` — `export_json()`: `rfd::FileDialog` with `.json` filter; builds array of `serde_json::Map` keyed by `display_name`; writes via `serde_json::to_string_pretty`
- [x] `commands.rs` — `export_json` command
- [x] `lib.rs` — Command registered
- [x] `tauri.ts` — `exportJson(tableId)` IPC wrapper
- [x] `workspaceStore.ts` — `exportJsonTable` action
- [x] `TableToolbar.tsx` — "JSON" button alongside existing "CSV" button; `onExportJson` prop
- [x] `MainTableView.tsx` + `App.tsx` — `onExportJson` prop wired through

### Record Notes ✅
- [x] `db/init.rs` — `record_notes` table (id, table_id, record_id, body, created_at) + index on (table_id, record_id)
- [x] `models.rs` — `RecordNote` struct with `Serialize`/`Deserialize`
- [x] New: `services/note_service.rs` — `list_notes`, `create_note`, `delete_note`
- [x] `services/mod.rs` — `pub mod note_service` added
- [x] `commands.rs` — `list_record_notes`, `create_record_note`, `delete_record_note` commands
- [x] `lib.rs` — Three commands registered
- [x] `types/slate.ts` — `RecordNote` interface
- [x] `tauri.ts` — `listRecordNotes`, `createRecordNote`, `deleteRecordNote` IPC wrappers
- [x] `ExpandedRecordModal.tsx` — `tableId` prop added; notes section below fields: list with per-note delete, textarea input, Cmd+Enter to submit, Send button
- [x] `App.tsx` — `tableId={activeTableId ?? ""}` wired to `ExpandedRecordModal`
- [x] `styles.css` — `.record-notes-section`, `.record-notes-title`, `.record-notes-list`, `.record-note-item`, `.record-note-body`, `.record-note-meta`, `.record-note-time`, `.record-note-input-row`, `.record-note-input` classes

### Bug Fixes ✅
- [x] `db/mod.rs` — Added `"tags"` to `is_supported_field_type()` (was missing, caused "unsupported Field Type" error when creating Tags columns)
- [x] `App.tsx` — Removed `window.confirm` from `onDisconnectTable` handler (Tauri v2 WKWebView silently returns `false` from `window.confirm`; now calls `disconnectExternalDb` directly, matching the Settings panel behavior)

---

## Progress Tracker

| Phase | Status |
|-------|--------|
| 1 — Field Types (incl. Tags) | ✅ Complete |
| 2 — Sort / Filter / Column Controls (incl. drag-and-drop reorder) | ✅ Complete |
| 3 — Named Views (Grid, Gallery, Kanban, Calendar) | ✅ Complete |
| 4 — Record UX (incl. bulk delete) | ✅ Complete |
| 5 — Import / Export | ✅ Complete |
| 6 — UX Completions (Grouped Grid, Calendar, Bulk Ops, Cmd+K) | ✅ Complete |
| 7 — Computed Fields (Lookup, Rollup, Formula) | ✅ Complete |
| 8 — Form View + Backups | ✅ Complete |
| 9 — Settings, Folders, Record Window, Light Mode | ✅ Complete |
| 10 — Column Resize, JSON Export, Record Notes | ✅ Complete |
