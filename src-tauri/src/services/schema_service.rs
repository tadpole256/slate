use anyhow::Result;
use rusqlite::Connection;

use crate::db::{quote_ident, to_sql_column_type};

pub fn data_table_exists(conn: &Connection, storage_name: &str) -> Result<bool> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        [storage_name],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

pub fn create_data_table(conn: &Connection, storage_name: &str) -> Result<()> {
    let storage = quote_ident(storage_name);
    let sql = format!(
        "CREATE TABLE IF NOT EXISTS {} (record_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
        storage
    );
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn drop_data_table(conn: &Connection, storage_name: &str) -> Result<()> {
    let storage = quote_ident(storage_name);
    let sql = format!("DROP TABLE IF EXISTS {}", storage);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn add_column(conn: &Connection, storage_name: &str, column_key: &str, field_type: &str) -> Result<()> {
    let storage = quote_ident(storage_name);
    let column = quote_ident(column_key);
    let sql_type = to_sql_column_type(field_type);
    let sql = format!("ALTER TABLE {} ADD COLUMN {} {}", storage, column, sql_type);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn get_existing_columns(
    conn: &Connection,
    storage_name: &str,
) -> Result<std::collections::HashSet<String>> {
    if !data_table_exists(conn, storage_name)? {
        return Ok(std::collections::HashSet::new());
    }

    let pragma_sql = format!("PRAGMA table_info({})", quote_ident(storage_name));
    let mut stmt = conn.prepare(&pragma_sql)?;
    let mut rows = stmt.query([])?;
    let mut columns = std::collections::HashSet::new();

    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        columns.insert(name);
    }

    Ok(columns)
}

pub fn drop_column(conn: &Connection, storage_name: &str, column_key: &str) -> Result<()> {
    let storage = quote_ident(storage_name);
    let column = quote_ident(column_key);
    let sql = format!("ALTER TABLE {} DROP COLUMN {}", storage, column);
    conn.execute(&sql, [])?;
    Ok(())
}
