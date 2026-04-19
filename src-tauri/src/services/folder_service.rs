use anyhow::{anyhow, Result};
use rusqlite::Connection;

use crate::db::{generate_id, now_iso};
use crate::models::AppFolder;

pub fn list_folders(conn: &Connection) -> Result<Vec<AppFolder>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, folder_order, created_at, updated_at
         FROM app_folders
         ORDER BY folder_order ASC, lower(name) ASC",
    )?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AppFolder {
                id: row.get(0)?,
                name: row.get(1)?,
                folder_order: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn create_folder(conn: &Connection, name: &str) -> Result<AppFolder> {
    let id = generate_id("fdr");
    let now = now_iso();

    // Place new folder at the end
    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(folder_order), -1) FROM app_folders",
            [],
            |row| row.get(0),
        )
        .unwrap_or(-1);
    let folder_order = max_order + 1;

    conn.execute(
        "INSERT INTO app_folders (id, name, folder_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, name, folder_order, now, now],
    )?;

    get_folder(conn, &id)
}

pub fn rename_folder(conn: &Connection, id: &str, name: &str) -> Result<AppFolder> {
    let now = now_iso();
    let changed = conn.execute(
        "UPDATE app_folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![name, now, id],
    )?;
    if changed == 0 {
        return Err(anyhow!("Folder not found: {}", id));
    }
    get_folder(conn, id)
}

/// Delete a folder and move its tables to the top level (folder_id = NULL).
pub fn delete_folder(conn: &Connection, id: &str) -> Result<()> {
    let now = now_iso();
    conn.execute(
        "UPDATE app_tables SET folder_id = NULL, updated_at = ?1 WHERE folder_id = ?2",
        rusqlite::params![now, id],
    )?;
    conn.execute("DELETE FROM app_folders WHERE id = ?1", [id])?;
    Ok(())
}

/// Move a table into a folder, or remove it from any folder (`folder_id = None`).
pub fn move_table_to_folder(
    conn: &Connection,
    table_id: &str,
    folder_id: Option<&str>,
) -> Result<()> {
    let now = now_iso();
    conn.execute(
        "UPDATE app_tables SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![folder_id, now, table_id],
    )?;
    Ok(())
}

/// Reorder folders by assigning each ID its position in the slice.
pub fn reorder_folders(conn: &Connection, folder_ids: &[String]) -> Result<()> {
    let now = now_iso();
    for (idx, id) in folder_ids.iter().enumerate() {
        conn.execute(
            "UPDATE app_folders SET folder_order = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![idx as i64, now, id],
        )?;
    }
    Ok(())
}

fn get_folder(conn: &Connection, id: &str) -> Result<AppFolder> {
    conn.query_row(
        "SELECT id, name, folder_order, created_at, updated_at FROM app_folders WHERE id = ?1",
        [id],
        |row| {
            Ok(AppFolder {
                id: row.get(0)?,
                name: row.get(1)?,
                folder_order: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|_| anyhow!("Folder not found: {}", id))
}
