use anyhow::{anyhow, Result};
use rusqlite::{Connection, OptionalExtension};

use crate::models::{AppField, AppTable};

pub fn list_tables(conn: &Connection) -> Result<Vec<AppTable>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, display_name, storage_name, primary_field_id, created_at, updated_at
        FROM app_tables
        ORDER BY lower(display_name) ASC
        "#,
    )?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AppTable {
                id: row.get(0)?,
                display_name: row.get(1)?,
                storage_name: row.get(2)?,
                primary_field_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn get_table(conn: &Connection, table_id: &str) -> Result<AppTable> {
    conn.query_row(
        r#"
        SELECT id, display_name, storage_name, primary_field_id, created_at, updated_at
        FROM app_tables
        WHERE id = ?1
        "#,
        [table_id],
        |row| {
            Ok(AppTable {
                id: row.get(0)?,
                display_name: row.get(1)?,
                storage_name: row.get(2)?,
                primary_field_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| anyhow!("Table not found"))
}

pub fn list_fields(conn: &Connection, table_id: &str) -> Result<Vec<AppField>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT af.id, af.table_id, af.column_key, af.display_name, af.field_type,
               af.field_order, af.is_visible, af.is_primary_label, af.created_at, af.updated_at,
               afc.config_json
        FROM app_fields af
        LEFT JOIN app_field_computed afc ON afc.field_id = af.id
        WHERE af.table_id = ?1
        ORDER BY af.field_order ASC
        "#,
    )?;

    let rows = stmt
        .query_map([table_id], |row| {
            Ok(AppField {
                id: row.get(0)?,
                table_id: row.get(1)?,
                column_key: row.get(2)?,
                display_name: row.get(3)?,
                field_type: row.get(4)?,
                field_order: row.get(5)?,
                is_visible: row.get(6)?,
                is_primary_label: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                computed_config: row.get(10)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn get_field(conn: &Connection, field_id: &str) -> Result<AppField> {
    conn.query_row(
        r#"
        SELECT af.id, af.table_id, af.column_key, af.display_name, af.field_type,
               af.field_order, af.is_visible, af.is_primary_label, af.created_at, af.updated_at,
               afc.config_json
        FROM app_fields af
        LEFT JOIN app_field_computed afc ON afc.field_id = af.id
        WHERE af.id = ?1
        "#,
        [field_id],
        |row| {
            Ok(AppField {
                id: row.get(0)?,
                table_id: row.get(1)?,
                column_key: row.get(2)?,
                display_name: row.get(3)?,
                field_type: row.get(4)?,
                field_order: row.get(5)?,
                is_visible: row.get(6)?,
                is_primary_label: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                computed_config: row.get(10)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| anyhow!("Field not found"))
}

pub fn next_field_order(conn: &Connection, table_id: &str) -> Result<i64> {
    let next: Option<i64> = conn.query_row(
        "SELECT MAX(field_order) + 1 FROM app_fields WHERE table_id = ?1",
        [table_id],
        |row| row.get(0),
    )?;

    Ok(next.unwrap_or(0))
}
