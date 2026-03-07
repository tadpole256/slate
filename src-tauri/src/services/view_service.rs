use anyhow::Result;
use rusqlite::Connection;

use crate::db::{generate_id, now_iso};
use crate::models::AppView;

fn row_to_view(row: &rusqlite::Row<'_>) -> rusqlite::Result<AppView> {
    Ok(AppView {
        id: row.get(0)?,
        table_id: row.get(1)?,
        name: row.get(2)?,
        view_type: row.get(3)?,
        config_json: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

pub fn get_view(conn: &Connection, view_id: &str) -> Result<AppView> {
    Ok(conn.query_row(
        "SELECT id, table_id, name, view_type, config_json, created_at, updated_at
         FROM app_views WHERE id = ?1",
        [view_id],
        row_to_view,
    )?)
}

pub fn list_views(conn: &Connection, table_id: &str) -> Result<Vec<AppView>> {
    let mut stmt = conn.prepare(
        "SELECT id, table_id, name, view_type, config_json, created_at, updated_at
         FROM app_views WHERE table_id = ?1 ORDER BY created_at ASC",
    )?;
    let views = stmt
        .query_map([table_id], row_to_view)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(views)
}

pub fn create_view(
    conn: &Connection,
    table_id: &str,
    name: &str,
    view_type: &str,
) -> Result<AppView> {
    let id = generate_id("view");
    let now = now_iso();
    conn.execute(
        "INSERT INTO app_views (id, table_id, name, view_type, config_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, '{}', ?5, ?6)",
        rusqlite::params![id, table_id, name, view_type, now, now],
    )?;
    get_view(conn, &id)
}

pub fn rename_view(conn: &Connection, view_id: &str, name: &str) -> Result<AppView> {
    let now = now_iso();
    conn.execute(
        "UPDATE app_views SET name = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![name, now, view_id],
    )?;
    get_view(conn, view_id)
}

pub fn delete_view(conn: &Connection, view_id: &str) -> Result<()> {
    conn.execute("DELETE FROM app_views WHERE id = ?1", [view_id])?;
    Ok(())
}

pub fn update_view_config(conn: &Connection, view_id: &str, config_json: &str) -> Result<AppView> {
    let now = now_iso();
    conn.execute(
        "UPDATE app_views SET config_json = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![config_json, now, view_id],
    )?;
    get_view(conn, view_id)
}

/// Guarantees at least one view exists for the table. Returns the view list.
pub fn ensure_default_view(conn: &Connection, table_id: &str) -> Result<Vec<AppView>> {
    let views = list_views(conn, table_id)?;
    if views.is_empty() {
        create_view(conn, table_id, "Grid View 1", "grid")?;
        list_views(conn, table_id)
    } else {
        Ok(views)
    }
}
