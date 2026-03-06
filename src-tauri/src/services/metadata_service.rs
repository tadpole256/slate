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
        SELECT id, table_id, column_key, display_name, field_type,
               field_order, is_visible, is_primary_label, created_at, updated_at
        FROM app_fields
        WHERE table_id = ?1
        ORDER BY field_order ASC
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
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn get_field(conn: &Connection, field_id: &str) -> Result<AppField> {
    conn.query_row(
        r#"
        SELECT id, table_id, column_key, display_name, field_type,
               field_order, is_visible, is_primary_label, created_at, updated_at
        FROM app_fields
        WHERE id = ?1
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
