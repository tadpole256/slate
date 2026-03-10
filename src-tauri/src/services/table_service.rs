use anyhow::{anyhow, Result};
use rusqlite::{Connection, OptionalExtension};

use crate::db::{generate_id, is_supported_field_type, now_iso};
use crate::models::{AppField, AppTable};
use crate::services::{metadata_service, schema_service};

#[derive(Debug, Clone)]
pub struct FieldSeed {
    pub display_name: String,
    pub field_type: String,
    pub is_primary_label: bool,
}

/// Returns true for field types whose value is computed at read time (no physical DB column).
pub fn is_computed_field_type(field_type: &str) -> bool {
    matches!(field_type, "lookup" | "rollup" | "formula")
}

fn normalized_name(name: &str) -> Result<String> {
    let normalized = name.split_whitespace().collect::<Vec<_>>().join(" ");
    if normalized.is_empty() {
        return Err(anyhow!("Name cannot be empty"));
    }
    Ok(normalized)
}

fn short_id(id: &str) -> String {
    id.chars().filter(|ch| *ch != '_').take(12).collect()
}

fn make_storage_name(table_id: &str) -> String {
    format!("data_{}", short_id(table_id))
}

fn make_column_key(field_id: &str) -> String {
    format!("col_{}", short_id(field_id))
}

pub fn create_table(conn: &Connection, display_name: &str) -> Result<AppTable> {
    let seed_fields = vec![FieldSeed {
        display_name: "Name".to_string(),
        field_type: "text".to_string(),
        is_primary_label: true,
    }];

    create_table_with_fields(conn, display_name, &seed_fields)
}

pub fn repair_all_table_storage(conn: &Connection) -> Result<()> {
    let tables = metadata_service::list_tables(conn)?;
    for table in tables {
        repair_table_storage(conn, &table.id)?;
    }
    Ok(())
}

pub fn repair_table_storage(conn: &Connection, table_id: &str) -> Result<()> {
    let table = metadata_service::get_table(conn, table_id)?;
    schema_service::create_data_table(conn, &table.storage_name)?;

    let fields = metadata_service::list_fields(conn, table_id)?;
    if fields.is_empty() {
        return Ok(());
    }

    // One PRAGMA call for all fields, down from one per field
    let existing_columns = schema_service::get_existing_columns(conn, &table.storage_name)?;
    for field in fields {
        // Computed fields have no physical column — skip them
        if is_computed_field_type(&field.field_type) {
            continue;
        }
        if !existing_columns.contains(&field.column_key) {
            schema_service::add_column(conn, &table.storage_name, &field.column_key, &field.field_type)?;
        }
    }

    Ok(())
}

pub fn create_table_with_fields(
    conn: &Connection,
    display_name: &str,
    fields: &[FieldSeed],
) -> Result<AppTable> {
    let name = normalized_name(display_name)?;
    if fields.is_empty() {
        return Err(anyhow!("A table needs at least one field"));
    }

    let table_id = generate_id("tbl");
    let storage_name = make_storage_name(&table_id);
    let now = now_iso();

    conn.execute(
        r#"
        INSERT INTO app_tables
          (id, display_name, storage_name, primary_field_id, created_at, updated_at)
        VALUES (?1, ?2, ?3, NULL, ?4, ?4)
        "#,
        (&table_id, name, &storage_name, &now),
    )?;

    schema_service::create_data_table(conn, &storage_name)?;

    let mut primary_field_id: Option<String> = None;

    for (idx, seed) in fields.iter().enumerate() {
        if !is_supported_field_type(&seed.field_type) {
            return Err(anyhow!("Unsupported field type"));
        }

        let field_id = generate_id("fld");
        let column_key = make_column_key(&field_id);
        let field_name = normalized_name(&seed.display_name)?;
        let now = now_iso();

        conn.execute(
            r#"
            INSERT INTO app_fields
              (id, table_id, column_key, display_name, field_type, field_order,
               is_visible, is_primary_label, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?8)
            "#,
            (
                &field_id,
                &table_id,
                &column_key,
                field_name,
                &seed.field_type,
                idx as i64,
                if seed.is_primary_label { 1 } else { 0 },
                &now,
            ),
        )?;

        schema_service::add_column(conn, &storage_name, &column_key, &seed.field_type)?;

        if seed.is_primary_label || (idx == 0 && primary_field_id.is_none()) {
            primary_field_id = Some(field_id);
        }
    }

    conn.execute(
        "UPDATE app_tables SET primary_field_id = ?1, updated_at = ?2 WHERE id = ?3",
        (primary_field_id, now_iso(), &table_id),
    )?;

    metadata_service::get_table(conn, &table_id)
}

pub fn rename_table(conn: &Connection, table_id: &str, display_name: &str) -> Result<AppTable> {
    let name = normalized_name(display_name)?;
    let now = now_iso();

    conn.execute(
        "UPDATE app_tables SET display_name = ?1, updated_at = ?2 WHERE id = ?3",
        (&name, &now, table_id),
    )?;

    metadata_service::get_table(conn, table_id)
}

pub fn delete_table(conn: &Connection, table_id: &str) -> Result<()> {
    let table = metadata_service::get_table(conn, table_id)?;
    schema_service::drop_data_table(conn, &table.storage_name)?;
    conn.execute("DELETE FROM app_tables WHERE id = ?1", [table_id])?;
    Ok(())
}

pub fn create_field(
    conn: &Connection,
    table_id: &str,
    display_name: &str,
    field_type: &str,
    computed_config: Option<&str>,
) -> Result<AppField> {
    if !is_supported_field_type(field_type) {
        return Err(anyhow!("Unsupported field type"));
    }

    repair_table_storage(conn, table_id)?;
    let table = metadata_service::get_table(conn, table_id)?;
    let field_name = normalized_name(display_name)?;

    let field_id = generate_id("fld");
    let column_key = make_column_key(&field_id);
    let order = metadata_service::next_field_order(conn, table_id)?;
    let now = now_iso();

    conn.execute(
        r#"
        INSERT INTO app_fields
          (id, table_id, column_key, display_name, field_type, field_order,
           is_visible, is_primary_label, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 0, ?7, ?7)
        "#,
        (
            &field_id,
            table_id,
            &column_key,
            field_name,
            field_type,
            order,
            &now,
        ),
    )?;

    if is_computed_field_type(field_type) {
        // Computed fields have no physical column; store their config instead
        let config = computed_config.unwrap_or("{}");
        conn.execute(
            "INSERT INTO app_field_computed (field_id, computed_type, config_json) VALUES (?1, ?2, ?3)",
            [&field_id, field_type, config],
        )?;
    } else {
        schema_service::add_column(conn, &table.storage_name, &column_key, field_type)?;
    }

    metadata_service::get_field(conn, &field_id)
}

pub fn rename_field(conn: &Connection, field_id: &str, display_name: &str) -> Result<AppField> {
    let field_name = normalized_name(display_name)?;
    let now = now_iso();

    conn.execute(
        "UPDATE app_fields SET display_name = ?1, updated_at = ?2 WHERE id = ?3",
        (&field_name, &now, field_id),
    )?;

    metadata_service::get_field(conn, field_id)
}

pub fn reorder_fields(conn: &Connection, table_id: &str, field_ids: &[String]) -> Result<()> {
    for (idx, field_id) in field_ids.iter().enumerate() {
        conn.execute(
            "UPDATE app_fields SET field_order = ?1, updated_at = ?2 WHERE id = ?3 AND table_id = ?4",
            (idx as i64, now_iso(), field_id, table_id),
        )?;
    }
    Ok(())
}

pub fn toggle_field_visibility(conn: &Connection, field_id: &str) -> Result<AppField> {
    let field = metadata_service::get_field(conn, field_id)?;
    let next_visibility = if field.is_visible != 0 { 0i64 } else { 1i64 };
    conn.execute(
        "UPDATE app_fields SET is_visible = ?1, updated_at = ?2 WHERE id = ?3",
        (next_visibility, now_iso(), field_id),
    )?;
    metadata_service::get_field(conn, field_id)
}

pub fn delete_field(conn: &Connection, field_id: &str) -> Result<()> {
    let field = metadata_service::get_field(conn, field_id)?;
    let table = metadata_service::get_table(conn, &field.table_id)?;

    let field_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM app_fields WHERE table_id = ?1",
        [&field.table_id],
        |row| row.get(0),
    )?;

    if field_count <= 1 {
        return Err(anyhow!("A table must have at least one column"));
    }

    // Computed fields have no physical column; CASCADE on app_fields FK handles app_field_computed cleanup
    if !is_computed_field_type(&field.field_type) {
        schema_service::drop_column(conn, &table.storage_name, &field.column_key)?;
    }
    conn.execute("DELETE FROM app_fields WHERE id = ?1", [field_id])?;

    let next_primary: Option<String> = conn
        .query_row(
            r#"
            SELECT id
            FROM app_fields
            WHERE table_id = ?1
            ORDER BY field_order ASC
            LIMIT 1
            "#,
            [&field.table_id],
            |row| row.get(0),
        )
        .optional()?;

    conn.execute(
        "UPDATE app_tables SET primary_field_id = ?1, updated_at = ?2 WHERE id = ?3",
        (next_primary, now_iso(), &field.table_id),
    )?;

    Ok(())
}
