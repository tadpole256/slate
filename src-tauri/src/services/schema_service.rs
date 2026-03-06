use anyhow::Result;
use rusqlite::Connection;

use crate::db::{quote_ident, to_sql_column_type};

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

pub fn drop_column(conn: &Connection, storage_name: &str, column_key: &str) -> Result<()> {
    let storage = quote_ident(storage_name);
    let column = quote_ident(column_key);
    let sql = format!("ALTER TABLE {} DROP COLUMN {}", storage, column);
    conn.execute(&sql, [])?;
    Ok(())
}
