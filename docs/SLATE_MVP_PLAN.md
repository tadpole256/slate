# Slate MVP Architecture & Delivery Plan

Last updated: 2026-03-06

## 1) Concise Technical Architecture Summary

Slate is a local-first, single-user desktop app built with:
- Tauri (native shell + Rust backend)
- React + TypeScript (desktop UI)
- SQLite (single local `.db` file)

Core architectural decisions:
- Metadata-driven workspace model (tables/fields/views are app metadata, not inferred from raw SQL schema).
- One physical SQLite data table per logical Slate table.
- Stable IDs for tables, fields, and records (UUID-like text IDs generated in backend).
- Generalized cross-table links via a `record_links` table (`from_table_id/from_record_id` -> `to_table_id/to_record_id`).
- Backend services own schema and data mutations so frontend remains simple and predictable.

## 2) SQLite Schema Proposal (Metadata + Generalized Links)

Database file location (Tauri app data dir):
- `slate.db`

### 2.1 Metadata Tables

```sql
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_tables (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  storage_name TEXT NOT NULL UNIQUE,
  primary_field_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_fields (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  column_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'long_text', 'date', 'checkbox', 'link')),
  field_order INTEGER NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  is_primary_label INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(table_id) REFERENCES app_tables(id) ON DELETE CASCADE,
  UNIQUE(table_id, column_key)
);

CREATE TABLE IF NOT EXISTS app_views (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  name TEXT NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'grid',
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(table_id) REFERENCES app_tables(id) ON DELETE CASCADE
);
```

### 2.2 Generalized Record Linking

```sql
CREATE TABLE IF NOT EXISTS record_links (
  id TEXT PRIMARY KEY,
  from_table_id TEXT NOT NULL,
  from_record_id TEXT NOT NULL,
  to_table_id TEXT NOT NULL,
  to_record_id TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'related',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE(from_table_id, from_record_id, to_table_id, to_record_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_record_links_from
  ON record_links(from_table_id, from_record_id);

CREATE INDEX IF NOT EXISTS idx_record_links_to
  ON record_links(to_table_id, to_record_id);
```

### 2.3 Physical Data Table Strategy

Each logical table has a physical SQLite table with name from `app_tables.storage_name`.

Base columns:
- `record_id TEXT PRIMARY KEY`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- one SQL column per app field (`column_key`) for straightforward grid reads/writes

Type mapping:
- `text` -> `TEXT`
- `long_text` -> `TEXT`
- `date` -> `TEXT` (ISO date)
- `checkbox` -> `INTEGER` (`0/1`)
- `link` -> `TEXT` (placeholder for future relation-field mode)

Naming strategy:
- Logical table ID: `tbl_<hex>` (stable)
- Storage name: `data_<hex>` (stable and decoupled from display name)
- Record ID: `rec_<hex>`
- Field ID: `fld_<hex>`
- Column key: `col_<hex>` (stable internal column identity; display name is mutable)

This keeps rename operations metadata-only where possible and avoids coupling UX labels to SQL identifiers.

## 3) Proposed Folder Structure

```text
slate/
  docs/
    SLATE_MVP_PLAN.md
    DEVELOPMENT_LOG.md
  src/
    main.tsx
    App.tsx
    styles.css
    types/
      slate.ts
    lib/
      tauri.ts
      format.ts
    store/
      workspaceStore.ts
    components/
      layout/
        AppLayout.tsx
        TopBar.tsx
        Sidebar.tsx
      table/
        MainTableView.tsx
        TableToolbar.tsx
        TableGrid.tsx
        TableHeaderCell.tsx
        TableCell.tsx
      record/
        RecordDetailPanel.tsx
        FieldEditor.tsx
      common/
        Modal.tsx
        SearchInput.tsx
        EmptyState.tsx
  src-tauri/
    Cargo.toml
    tauri.conf.json
    build.rs
    src/
      main.rs
      commands.rs
      models.rs
      db/
        mod.rs
        init.rs
      services/
        schema_service.rs
        metadata_service.rs
        table_service.rs
        record_service.rs
        search_service.rs
        link_service.rs
```

## 4) React Component Tree

```text
App
  AppLayout
    TopBar
      SearchInput
      PrimaryActions (+Record, +Table)
    Sidebar
      TableList
        TableListItem[]
      NewTableButton
    MainTableView
      TableToolbar
      TableGrid
        TableHeaderCell[]
        Row[]
          TableCell[]
      AddRowBar
    RecordDetailPanel
      FieldEditor[]
      RecordActions
    ModalHost
      CreateTableModal
      AddColumnModal
      ConfirmDeleteModal
```

## 5) Backend Service Structure

- `db::init`
  - open db connection, enforce foreign keys, run metadata schema migrations, seed starter tables.
- `schema_service`
  - create physical data tables, add/rename/delete columns safely.
- `metadata_service`
  - CRUD for `app_tables`, `app_fields`, `app_views`, app-level metadata.
- `table_service`
  - public orchestration for create/rename/delete table and field operations.
- `record_service`
  - row CRUD and detail retrieval using field metadata.
- `search_service`
  - current-table search (simple `LIKE` over text-like columns).
- `link_service`
  - placeholder CRUD for generalized cross-table links (`record_links`).

## 6) Initial State/Data Flow

1. App boots -> frontend invokes `init_app` command.
2. Backend initializes db, ensures schema, seeds starter tables if first launch.
3. Frontend loads workspace metadata (`tables + fields`) and selects first table.
4. Frontend loads records for selected table.
5. UI interactions dispatch Tauri commands:
   - table CRUD
   - field CRUD
   - record CRUD
   - search records
6. Backend applies updates in SQLite and returns normalized payload.
7. Frontend store updates table/fields/rows and keeps selected record synced.

## 7) Implementation Phases

### Phase 1 (UI shell)
- Dark-themed layout with top bar, sidebar, table area, detail panel.
- Static starter table names shown.

### Phase 2 (database foundation)
- Initialize SQLite.
- Create metadata schema + generalized link table.
- Seed starter tables/fields.

### Phase 3 (record CRUD)
- Load records into grid.
- Add/edit/delete rows.
- Detail panel editing.

### Phase 4 (field management + search)
- Create/rename/delete columns.
- Handle field types for editor controls.
- Search current table and basic filtering.

### Phase 5 (polish + extension points)
- Refine spacing, visual hierarchy, interactions, and error states.
- Keep service boundaries clear for future link-field UI, tags, attachments, and saved views.

## 8) MVP Scope Guardrails

Explicitly out of scope:
- auth, permissions, cloud sync, collaboration, formulas, automation systems, enterprise role management.

MVP focus:
- local-first usability
- metadata-driven data model
- polished daily-use UI
- maintainable extension-ready architecture
