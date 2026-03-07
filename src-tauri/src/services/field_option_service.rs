use anyhow::{anyhow, Result};
use rusqlite::{Connection, Row};

use crate::db::{generate_id, now_iso};
use crate::models::FieldOption;

fn row_to_option(row: &Row<'_>) -> rusqlite::Result<FieldOption> {
    Ok(FieldOption {
        id: row.get(0)?,
        field_id: row.get(1)?,
        label: row.get(2)?,
        color: row.get(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
    })
}

pub fn list_field_options(conn: &Connection, field_id: &str) -> Result<Vec<FieldOption>> {
    let mut stmt = conn.prepare(
        "SELECT id, field_id, label, color, sort_order, created_at \
         FROM app_field_options WHERE field_id = ?1 \
         ORDER BY sort_order ASC, created_at ASC",
    )?;
    let options = stmt
        .query_map([field_id], row_to_option)?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(options)
}

pub fn list_all_options_for_table(conn: &Connection, table_id: &str) -> Result<Vec<FieldOption>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT fo.id, fo.field_id, fo.label, fo.color, fo.sort_order, fo.created_at
        FROM app_field_options fo
        INNER JOIN app_fields af ON fo.field_id = af.id
        WHERE af.table_id = ?1
        ORDER BY fo.field_id, fo.sort_order ASC, fo.created_at ASC
        "#,
    )?;
    let options = stmt
        .query_map([table_id], row_to_option)?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(options)
}

pub fn create_field_option(
    conn: &Connection,
    field_id: &str,
    label: &str,
    color: &str,
) -> Result<FieldOption> {
    let label = label.trim();
    if label.is_empty() {
        return Err(anyhow!("Option label cannot be empty"));
    }

    let id = generate_id("fopt");
    let now = now_iso();

    let max_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM app_field_options WHERE field_id = ?1",
        [field_id],
        |row| row.get(0),
    )?;

    conn.execute(
        "INSERT INTO app_field_options (id, field_id, label, color, sort_order, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&id, field_id, label, color, max_order + 1, &now),
    )?;

    conn.query_row(
        "SELECT id, field_id, label, color, sort_order, created_at \
         FROM app_field_options WHERE id = ?1",
        [&id],
        row_to_option,
    )
    .map_err(Into::into)
}

pub fn update_field_option(
    conn: &Connection,
    option_id: &str,
    label: &str,
    color: &str,
) -> Result<FieldOption> {
    let label = label.trim();
    if label.is_empty() {
        return Err(anyhow!("Option label cannot be empty"));
    }

    conn.execute(
        "UPDATE app_field_options SET label = ?1, color = ?2 WHERE id = ?3",
        (label, color, option_id),
    )?;

    conn.query_row(
        "SELECT id, field_id, label, color, sort_order, created_at \
         FROM app_field_options WHERE id = ?1",
        [option_id],
        row_to_option,
    )
    .map_err(Into::into)
}

pub fn delete_field_option(conn: &Connection, option_id: &str) -> Result<()> {
    conn.execute("DELETE FROM app_field_options WHERE id = ?1", [option_id])?;
    Ok(())
}

pub fn reorder_field_options(conn: &Connection, option_ids: &[String]) -> Result<()> {
    for (idx, option_id) in option_ids.iter().enumerate() {
        conn.execute(
            "UPDATE app_field_options SET sort_order = ?1 WHERE id = ?2",
            (idx as i64, option_id),
        )?;
    }
    Ok(())
}
