use anyhow::{anyhow, Result};
use rusqlite::{Connection, OptionalExtension};

use crate::db::{generate_id, now_iso, quote_ident};
use crate::models::{RecordLink, RecordOption};
use crate::services::{metadata_service, record_service, table_service};

struct LinkRow {
    id: String,
    from_table_id: String,
    from_record_id: String,
    to_table_id: String,
    to_record_id: String,
    to_table_name: Option<String>,
    link_type: String,
    created_at: String,
}

fn primary_field_column_key(conn: &Connection, table_id: &str) -> Result<Option<String>> {
    let table = metadata_service::get_table(conn, table_id)?;
    let Some(primary_field_id) = table.primary_field_id else {
        return Ok(None);
    };

    let field = metadata_service::get_field(conn, &primary_field_id)?;
    Ok(Some(field.column_key))
}

fn record_label(conn: &Connection, table_id: &str, record_id: &str) -> Result<String> {
    table_service::repair_table_storage(conn, table_id)?;
    let table = metadata_service::get_table(conn, table_id)?;

    let Some(column_key) = primary_field_column_key(conn, table_id)? else {
        return Ok(record_id.to_string());
    };

    let sql = format!(
        "SELECT CAST({} AS TEXT) FROM {} WHERE record_id = ?1",
        quote_ident(&column_key),
        quote_ident(&table.storage_name)
    );

    let value: Option<String> = conn.query_row(&sql, [record_id], |row| row.get(0)).optional()?;

    match value {
        Some(text) if !text.trim().is_empty() => Ok(text),
        _ => Ok(record_id.to_string()),
    }
}

fn get_link_by_id(conn: &Connection, link_id: &str) -> Result<RecordLink> {
    let row = conn
        .query_row(
            r#"
            SELECT rl.id, rl.from_table_id, rl.from_record_id,
                   rl.to_table_id, rl.to_record_id,
                   at.display_name,
                   rl.link_type, rl.created_at
            FROM record_links rl
            LEFT JOIN app_tables at ON at.id = rl.to_table_id
            WHERE rl.id = ?1
            "#,
            [link_id],
            |row| {
                Ok(LinkRow {
                    id: row.get(0)?,
                    from_table_id: row.get(1)?,
                    from_record_id: row.get(2)?,
                    to_table_id: row.get(3)?,
                    to_record_id: row.get(4)?,
                    to_table_name: row.get(5)?,
                    link_type: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        )
        .optional()?
        .ok_or_else(|| anyhow!("Linked record reference not found"))?;

    let to_record_label = record_label(conn, &row.to_table_id, &row.to_record_id)
        .unwrap_or_else(|_| row.to_record_id.clone());

    Ok(RecordLink {
        id: row.id,
        from_table_id: row.from_table_id,
        from_record_id: row.from_record_id,
        to_table_id: row.to_table_id,
        to_record_id: row.to_record_id,
        to_table_name: row.to_table_name.unwrap_or_else(|| "Unknown table".to_string()),
        to_record_label,
        link_type: row.link_type,
        created_at: row.created_at,
    })
}

pub fn list_record_links(conn: &Connection, table_id: &str, record_id: &str) -> Result<Vec<RecordLink>> {
    record_service::get_record(conn, table_id, record_id)?;

    let mut stmt = conn.prepare(
        r#"
        SELECT rl.id, rl.from_table_id, rl.from_record_id,
               rl.to_table_id, rl.to_record_id,
               at.display_name,
               rl.link_type, rl.created_at
        FROM record_links rl
        LEFT JOIN app_tables at ON at.id = rl.to_table_id
        WHERE rl.from_table_id = ?1
          AND rl.from_record_id = ?2
        ORDER BY rl.created_at DESC
        "#,
    )?;

    let rows = stmt
        .query_map((table_id, record_id), |row| {
            Ok(LinkRow {
                id: row.get(0)?,
                from_table_id: row.get(1)?,
                from_record_id: row.get(2)?,
                to_table_id: row.get(3)?,
                to_record_id: row.get(4)?,
                to_table_name: row.get(5)?,
                link_type: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut links = Vec::with_capacity(rows.len());
    for row in rows {
        let to_record_label = record_label(conn, &row.to_table_id, &row.to_record_id)
            .unwrap_or_else(|_| row.to_record_id.clone());

        links.push(RecordLink {
            id: row.id,
            from_table_id: row.from_table_id,
            from_record_id: row.from_record_id,
            to_table_id: row.to_table_id,
            to_record_id: row.to_record_id,
            to_table_name: row.to_table_name.unwrap_or_else(|| "Unknown table".to_string()),
            to_record_label,
            link_type: row.link_type,
            created_at: row.created_at,
        });
    }

    Ok(links)
}

pub fn create_record_link(
    conn: &Connection,
    from_table_id: &str,
    from_record_id: &str,
    to_table_id: &str,
    to_record_id: &str,
    link_type: Option<&str>,
) -> Result<RecordLink> {
    record_service::get_record(conn, from_table_id, from_record_id)?;
    record_service::get_record(conn, to_table_id, to_record_id)?;

    let normalized_type = link_type
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("related")
        .to_string();

    let link_id = generate_id("lnk");
    let now = now_iso();

    conn.execute(
        r#"
        INSERT OR IGNORE INTO record_links
          (id, from_table_id, from_record_id, to_table_id, to_record_id, link_type, metadata_json, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}', ?7)
        "#,
        (
            &link_id,
            from_table_id,
            from_record_id,
            to_table_id,
            to_record_id,
            &normalized_type,
            now,
        ),
    )?;

    let persisted_id: String = conn.query_row(
        r#"
        SELECT id
        FROM record_links
        WHERE from_table_id = ?1
          AND from_record_id = ?2
          AND to_table_id = ?3
          AND to_record_id = ?4
          AND link_type = ?5
        LIMIT 1
        "#,
        (
            from_table_id,
            from_record_id,
            to_table_id,
            to_record_id,
            &normalized_type,
        ),
        |row| row.get(0),
    )?;

    get_link_by_id(conn, &persisted_id)
}

pub fn delete_record_link(conn: &Connection, link_id: &str) -> Result<()> {
    conn.execute("DELETE FROM record_links WHERE id = ?1", [link_id])?;
    Ok(())
}

pub fn delete_links_for_record(conn: &Connection, table_id: &str, record_id: &str) -> Result<()> {
    conn.execute(
        r#"
        DELETE FROM record_links
        WHERE (from_table_id = ?1 AND from_record_id = ?2)
           OR (to_table_id = ?1 AND to_record_id = ?2)
        "#,
        (table_id, record_id),
    )?;
    Ok(())
}

pub fn delete_links_for_table(conn: &Connection, table_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM record_links WHERE from_table_id = ?1 OR to_table_id = ?1",
        [table_id],
    )?;
    Ok(())
}

pub fn list_record_options(conn: &Connection, table_id: &str, query: Option<&str>) -> Result<Vec<RecordOption>> {
    table_service::repair_table_storage(conn, table_id)?;
    let table = metadata_service::get_table(conn, table_id)?;

    let label_expr = match primary_field_column_key(conn, table_id)? {
        Some(column_key) => format!(
            "COALESCE(NULLIF(TRIM(CAST({} AS TEXT)), ''), record_id)",
            quote_ident(&column_key)
        ),
        None => "record_id".to_string(),
    };

    let mut sql = format!(
        "SELECT record_id, {} AS label FROM {}",
        label_expr,
        quote_ident(&table.storage_name)
    );

    let needle = query.map(str::trim).unwrap_or("");

    if !needle.is_empty() {
        sql.push_str(&format!(
            " WHERE ({} LIKE ?1 OR record_id LIKE ?1)",
            label_expr
        ));
    }

    sql.push_str(" ORDER BY updated_at DESC LIMIT 250");

    let mut stmt = conn.prepare(&sql)?;

    if needle.is_empty() {
        let rows = stmt
            .query_map([], |row| {
                Ok(RecordOption {
                    record_id: row.get(0)?,
                    label: row.get(1)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    } else {
        let like = format!("%{}%", needle);
        let rows = stmt
            .query_map([like], |row| {
                Ok(RecordOption {
                    record_id: row.get(0)?,
                    label: row.get(1)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }
}

#[allow(dead_code)]
pub fn create_link(
    conn: &Connection,
    from_table_id: &str,
    from_record_id: &str,
    to_table_id: &str,
    to_record_id: &str,
    link_type: Option<&str>,
) -> Result<()> {
    let _ = create_record_link(
        conn,
        from_table_id,
        from_record_id,
        to_table_id,
        to_record_id,
        link_type,
    )?;

    Ok(())
}
