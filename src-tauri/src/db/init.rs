use anyhow::Result;
use rusqlite::Connection;

use crate::db::{now_iso, generate_id};
use crate::services::table_service;

pub fn initialize_database(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

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
          field_type TEXT NOT NULL CHECK (field_type IN (
            'text', 'long_text', 'date', 'checkbox', 'link',
            'number', 'currency', 'percent', 'email', 'url', 'phone',
            'single_select', 'multi_select', 'rating', 'duration'
          )),
          field_order INTEGER NOT NULL,
          is_visible INTEGER NOT NULL DEFAULT 1,
          is_primary_label INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(table_id) REFERENCES app_tables(id) ON DELETE CASCADE,
          UNIQUE(table_id, column_key)
        );

        CREATE TABLE IF NOT EXISTS app_field_options (
          id TEXT PRIMARY KEY,
          field_id TEXT NOT NULL,
          label TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT 'default',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY(field_id) REFERENCES app_fields(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_field_options_field_id
          ON app_field_options(field_id);

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

        CREATE TABLE IF NOT EXISTS record_attachments (
          id TEXT PRIMARY KEY,
          table_id TEXT NOT NULL,
          record_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          stored_path TEXT NOT NULL,
          mime_type TEXT,
          size_bytes INTEGER,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_record_attachments_record
          ON record_attachments(table_id, record_id);

        CREATE TABLE IF NOT EXISTS app_field_computed (
          field_id TEXT PRIMARY KEY,
          computed_type TEXT NOT NULL,
          config_json TEXT NOT NULL DEFAULT '{}',
          FOREIGN KEY(field_id) REFERENCES app_fields(id) ON DELETE CASCADE
        );
        "#,
    )?;

    migrate_field_type_constraint(conn)?;
    migrate_field_type_constraint_v2(conn)?;

    seed_starter_tables(conn)?;

    Ok(())
}

fn seed_starter_tables(conn: &Connection) -> Result<()> {
    let existing_count: i64 = conn.query_row("SELECT COUNT(1) FROM app_tables", [], |row| row.get(0))?;

    if existing_count > 0 {
        return Ok(());
    }

    let now = now_iso();
    conn.execute(
        "INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?1, ?2, ?3)",
        ("first_launch_at", now.clone(), now),
    )?;

    let starter_specs: [(&str, [(&str, &str); 4]); 4] = [
        (
            "Contacts",
            [
                ("Name", "text"),
                ("Email", "text"),
                ("Phone", "text"),
                ("Notes", "long_text"),
            ],
        ),
        (
            "Notes",
            [
                ("Title", "text"),
                ("Body", "long_text"),
                ("Date", "date"),
                ("Pinned", "checkbox"),
            ],
        ),
        (
            "Projects",
            [
                ("Name", "text"),
                ("Description", "long_text"),
                ("Status", "text"),
                ("Notes", "long_text"),
            ],
        ),
        (
            "Ideas",
            [
                ("Title", "text"),
                ("Description", "long_text"),
                ("Category", "text"),
                ("Active", "checkbox"),
            ],
        ),
    ];

    for (table_name, fields) in starter_specs {
        let field_defs = fields
            .iter()
            .enumerate()
            .map(|(idx, (name, field_type))| table_service::FieldSeed {
                display_name: (*name).to_string(),
                field_type: (*field_type).to_string(),
                is_primary_label: idx == 0,
            })
            .collect::<Vec<_>>();

        table_service::create_table_with_fields(conn, table_name, &field_defs)?;
    }

    conn.execute(
        "INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?1, ?2, ?3)",
        (
            "workspace_id",
            generate_id("ws"),
            crate::db::now_iso(),
        ),
    )?;

    Ok(())
}

/// Migrates the app_fields table to expand the field_type CHECK constraint.
/// Uses the table-recreation pattern since SQLite does not support ALTER COLUMN.
/// Idempotent: checks the existing schema before running.
fn migrate_field_type_constraint(conn: &Connection) -> Result<()> {
    let schema_sql: String = conn.query_row(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='app_fields'",
        [],
        |row| row.get(0),
    )?;

    if schema_sql.contains("'number'") {
        return Ok(()); // Already on the expanded schema
    }

    conn.execute_batch(r#"
        PRAGMA foreign_keys = OFF;

        CREATE TABLE IF NOT EXISTS app_fields_v2 (
          id TEXT PRIMARY KEY,
          table_id TEXT NOT NULL,
          column_key TEXT NOT NULL,
          display_name TEXT NOT NULL,
          field_type TEXT NOT NULL CHECK (field_type IN (
            'text', 'long_text', 'date', 'checkbox', 'link',
            'number', 'currency', 'percent', 'email', 'url', 'phone',
            'single_select', 'multi_select', 'rating', 'duration'
          )),
          field_order INTEGER NOT NULL,
          is_visible INTEGER NOT NULL DEFAULT 1,
          is_primary_label INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(table_id) REFERENCES app_tables(id) ON DELETE CASCADE,
          UNIQUE(table_id, column_key)
        );

        INSERT INTO app_fields_v2 SELECT * FROM app_fields;
        DROP TABLE app_fields;
        ALTER TABLE app_fields_v2 RENAME TO app_fields;

        PRAGMA foreign_keys = ON;
    "#)?;

    Ok(())
}

/// Migrates the app_fields table to add computed field types: 'lookup', 'rollup', 'formula'.
/// Uses the same table-recreation pattern as migrate_field_type_constraint.
/// Idempotent: checks the existing schema before running.
fn migrate_field_type_constraint_v2(conn: &Connection) -> Result<()> {
    let schema_sql: String = conn.query_row(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='app_fields'",
        [],
        |row| row.get(0),
    )?;

    if schema_sql.contains("'lookup'") {
        return Ok(()); // Already on the expanded schema
    }

    conn.execute_batch(r#"
        PRAGMA foreign_keys = OFF;

        CREATE TABLE IF NOT EXISTS app_fields_v3 (
          id TEXT PRIMARY KEY,
          table_id TEXT NOT NULL,
          column_key TEXT NOT NULL,
          display_name TEXT NOT NULL,
          field_type TEXT NOT NULL CHECK (field_type IN (
            'text', 'long_text', 'date', 'checkbox', 'link',
            'number', 'currency', 'percent', 'email', 'url', 'phone',
            'single_select', 'multi_select', 'rating', 'duration',
            'lookup', 'rollup', 'formula'
          )),
          field_order INTEGER NOT NULL,
          is_visible INTEGER NOT NULL DEFAULT 1,
          is_primary_label INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(table_id) REFERENCES app_tables(id) ON DELETE CASCADE,
          UNIQUE(table_id, column_key)
        );

        INSERT INTO app_fields_v3 SELECT * FROM app_fields;
        DROP TABLE app_fields;
        ALTER TABLE app_fields_v3 RENAME TO app_fields;

        PRAGMA foreign_keys = ON;
    "#)?;

    Ok(())
}
