use anyhow::{anyhow, Result};
use rusqlite::{Connection, OptionalExtension};

use crate::db::{generate_id, now_iso, quote_ident};
use crate::models::ExternalConnection;
use crate::services::metadata_service;

// ── File picker ───────────────────────────────────────────────────────────────

/// Open a native file-picker dialog for SQLite databases.
/// Returns the chosen path or `None` if the user cancelled.
pub fn pick_db_file() -> Result<Option<String>> {
    let path = rfd::FileDialog::new()
        .set_title("Open External SQLite Database")
        .add_filter("SQLite", &["db", "sqlite", "sqlite3", "db3"])
        .add_filter("All Files", &["*"])
        .pick_file();
    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

// ── Alias helpers ─────────────────────────────────────────────────────────────

/// Sanitize a filename stem into a valid, unquoted SQLite ATTACH alias.
/// Keeps ASCII alphanumerics and underscores; replaces everything else with `_`.
fn make_alias_stem(stem: &str) -> String {
    let sanitized: String = stem
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' { c } else { '_' })
        .collect();
    if sanitized.is_empty() {
        return "extdb".to_string();
    }
    // Aliases must not start with a digit
    if sanitized.starts_with(|c: char| c.is_ascii_digit()) {
        format!("ext_{}", sanitized)
    } else {
        sanitized
    }
}

/// Return a unique ATTACH alias that isn't already in `app_meta`.
fn unique_alias(conn: &Connection, base: &str) -> Result<String> {
    let mut alias = base.to_string();
    let mut n = 2u32;
    loop {
        let key = format!("ext_db_{}", alias);
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(1) FROM app_meta WHERE key = ?1",
                [&key],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);
        if !exists {
            return Ok(alias);
        }
        alias = format!("{}_{}", base, n);
        n += 1;
    }
}

// ── Type mapping ──────────────────────────────────────────────────────────────

/// Map a SQLite declared column type string to the closest Slate field type.
/// Defaults to "text" for unknown/empty types.
fn map_sqlite_type(declared: &str) -> &'static str {
    let upper = declared.to_uppercase();
    if upper.contains("INT") {
        "number"
    } else if upper.contains("REAL") || upper.contains("FLOA") || upper.contains("DOUB") {
        "number"
    } else if upper.contains("NUM") || upper.contains("DEC") {
        "number"
    } else {
        "text"
    }
}

// ── Core operations ───────────────────────────────────────────────────────────

/// Connect an external SQLite database.
///
/// - `path` — absolute path to the `.db` / `.sqlite` file.
/// - ATTACHes the file under a unique alias derived from the filename stem.
/// - Introspects every user table and creates `app_tables` + `app_fields` entries
///   with `is_external = 1`.
/// - Persists `ext_db_{alias}` → `path` in `app_meta` so the connection can be
///   re-established automatically on the next app launch.
///
/// Returns the list of `AppTable` entries that were created.
pub fn connect_external_db(conn: &Connection, path: String) -> Result<Vec<crate::models::AppTable>> {
    // Derive a clean alias from the filename stem
    let file_path = std::path::Path::new(&path);
    let stem = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("extdb");
    let base = make_alias_stem(stem);
    let alias = unique_alias(conn, &base)?;

    // ATTACH the database
    conn.execute_batch(&format!(
        "ATTACH DATABASE '{}' AS {}",
        path.replace('\'', "''"),
        quote_ident(&alias),
    ))?;

    // Persist the alias → path so we can re-attach on future launches
    let now = now_iso();
    conn.execute(
        "INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?1, ?2, ?3)",
        [&format!("ext_db_{}", alias), &path, &now],
    )?;

    // List all user-defined tables in the attached database
    let list_sql = format!(
        "SELECT name FROM {}.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        quote_ident(&alias)
    );
    let mut list_stmt = conn.prepare(&list_sql)?;
    let table_names: Vec<String> = list_stmt
        .query_map([], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    if table_names.is_empty() {
        // Detach and clean up — nothing useful to show
        let _ = conn.execute_batch(&format!("DETACH DATABASE {}", quote_ident(&alias)));
        conn.execute("DELETE FROM app_meta WHERE key = ?1", [&format!("ext_db_{}", alias)])?;
        return Err(anyhow!("No user tables found in the external database."));
    }

    let mut created_tables: Vec<crate::models::AppTable> = Vec::new();

    for table_name in table_names {
        // Insert into app_tables with is_external = 1
        let table_id = generate_id("tbl");
        let storage_name = format!("{}.{}", alias, table_name);
        let now = now_iso();

        conn.execute(
            "INSERT INTO app_tables (id, display_name, storage_name, primary_field_id, created_at, updated_at, is_external) \
             VALUES (?1, ?2, ?3, NULL, ?4, ?5, 1)",
            rusqlite::params![table_id, table_name, storage_name, now, now],
        )?;

        // Introspect columns with PRAGMA alias.table_info(tablename)
        // Note: alias is sanitized (alphanumeric+underscore), so it's safe unquoted in PRAGMA.
        // The table name is quoted with quote_ident to handle special characters.
        let pragma_sql = format!(
            "PRAGMA {}.table_info({})",
            alias,
            quote_ident(&table_name)
        );
        let mut col_stmt = conn.prepare(&pragma_sql)?;
        let columns: Vec<(usize, String, String)> = col_stmt
            .query_map([], |row| {
                let cid: i64 = row.get(0)?;
                let name: String = row.get(1)?;
                let decl_type: String = row.get::<_, Option<String>>(2)?.unwrap_or_default();
                Ok((cid as usize, name, decl_type))
            })?
            .filter_map(|r| r.ok())
            .collect();

        let mut primary_field_id: Option<String> = None;

        for (order, (_, col_name, col_type)) in columns.iter().enumerate() {
            let field_id = generate_id("fld");
            let slate_type = map_sqlite_type(col_type);
            let is_primary = if order == 0 { 1i64 } else { 0i64 };
            if order == 0 {
                primary_field_id = Some(field_id.clone());
            }
            let now = now_iso();
            conn.execute(
                "INSERT INTO app_fields \
                 (id, table_id, column_key, display_name, field_type, field_order, is_visible, is_primary_label, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9)",
                rusqlite::params![
                    field_id,
                    table_id,
                    col_name,
                    col_name,
                    slate_type,
                    order as i64,
                    is_primary,
                    now,
                    now,
                ],
            )?;
        }

        // Set primary_field_id on the table
        if let Some(pfid) = primary_field_id {
            conn.execute(
                "UPDATE app_tables SET primary_field_id = ?1 WHERE id = ?2",
                [&pfid, &table_id],
            )?;
        }

        let table = metadata_service::get_table(conn, &table_id)?;
        created_tables.push(table);
    }

    Ok(created_tables)
}

/// Disconnect an external database identified by one of its table IDs.
///
/// - Looks up the ATTACH alias from the table's `storage_name`.
/// - Deletes all `app_tables` rows for that alias (cascades to `app_fields`, `app_views`).
/// - Removes the `ext_db_{alias}` entry from `app_meta`.
/// - DETACHes the database (errors are silenced — the data is already cleaned up).
pub fn disconnect_external_db(conn: &Connection, table_id: &str) -> Result<()> {
    let storage_name: Option<String> = conn
        .query_row(
            "SELECT storage_name FROM app_tables WHERE id = ?1",
            [table_id],
            |row| row.get(0),
        )
        .optional()?;

    let storage_name = storage_name.ok_or_else(|| anyhow!("Table not found: {}", table_id))?;

    // The alias is everything before the first dot
    let alias = storage_name
        .split('.')
        .next()
        .ok_or_else(|| anyhow!("Invalid external storage_name: {}", storage_name))?
        .to_string();

    // Delete all app_tables rows for this alias (CASCADE cleans fields + views)
    let pattern = format!("{}.%", alias);
    println!("[disconnect_external_db] alias={:?} pattern={:?}", alias, pattern);
    let deleted = conn.execute(
        "DELETE FROM app_tables WHERE storage_name LIKE ?1",
        [&pattern],
    )?;
    println!("[disconnect_external_db] deleted {} row(s) from app_tables", deleted);

    // Remove persisted path from app_meta
    conn.execute(
        "DELETE FROM app_meta WHERE key = ?1",
        [&format!("ext_db_{}", alias)],
    )?;

    // DETACH (silently ignore errors — the metadata is already gone)
    let _ = conn.execute_batch(&format!("DETACH DATABASE {}", quote_ident(&alias)));

    Ok(())
}

/// List all currently connected external databases as `ExternalConnection` summaries.
///
/// Each entry describes one ATTACH alias: its file path (from `app_meta`) and the
/// `app_tables` rows that map to it.
pub fn list_external_connections(conn: &Connection) -> Result<Vec<ExternalConnection>> {
    // Fetch all ext_db_* entries from app_meta
    let mut stmt = conn.prepare(
        "SELECT key, value FROM app_meta WHERE key LIKE 'ext_db_%'",
    )?;
    let entries: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .filter_map(|r| r.ok())
        .collect();

    let mut connections: Vec<ExternalConnection> = Vec::new();

    for (key, file_path) in entries {
        // key = "ext_db_{alias}"  →  alias = key[8..]
        let alias = key["ext_db_".len()..].to_string();
        let pattern = format!("{}.%", alias);

        // Fetch all app_tables rows that belong to this alias
        let mut tbl_stmt = conn.prepare(
            "SELECT id, display_name FROM app_tables WHERE storage_name LIKE ?1 ORDER BY display_name ASC",
        )?;
        let table_rows: Vec<(String, String)> = tbl_stmt
            .query_map([&pattern], |row| Ok((row.get(0)?, row.get(1)?)))?
            .filter_map(|r| r.ok())
            .collect();

        let table_ids: Vec<String> = table_rows.iter().map(|(id, _)| id.clone()).collect();
        let table_names: Vec<String> = table_rows.iter().map(|(_, name)| name.clone()).collect();

        connections.push(ExternalConnection {
            alias,
            file_path,
            table_ids,
            table_names,
        });
    }

    // Sort by alias for stable ordering
    connections.sort_by(|a, b| a.alias.cmp(&b.alias));
    Ok(connections)
}

/// Re-attach all previously connected external databases.
///
/// Called from `open_connection` every time the SQLite connection is (re-)opened.
/// Silently swallows per-database errors so a missing/moved file never blocks startup.
pub fn reattach_all_external_dbs(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare(
        "SELECT key, value FROM app_meta WHERE key LIKE 'ext_db_%'",
    )?;
    let entries: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .filter_map(|r| r.ok())
        .collect();

    for (key, path) in entries {
        // key = "ext_db_{alias}"  →  alias = key[8..]
        let alias = &key["ext_db_".len()..];
        // Silently ignore failures (file may have been moved or deleted)
        let _ = conn.execute_batch(&format!(
            "ATTACH DATABASE '{}' AS {}",
            path.replace('\'', "''"),
            quote_ident(alias),
        ));
    }

    Ok(())
}
