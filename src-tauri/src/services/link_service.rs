use anyhow::Result;
use rusqlite::Connection;

use crate::db::{generate_id, now_iso};

#[allow(dead_code)]
pub fn create_link(
    conn: &Connection,
    from_table_id: &str,
    from_record_id: &str,
    to_table_id: &str,
    to_record_id: &str,
    link_type: Option<&str>,
) -> Result<()> {
    let id = generate_id("lnk");
    let now = now_iso();
    conn.execute(
        r#"
        INSERT OR IGNORE INTO record_links
          (id, from_table_id, from_record_id, to_table_id, to_record_id, link_type, metadata_json, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}', ?7)
        "#,
        (
            id,
            from_table_id,
            from_record_id,
            to_table_id,
            to_record_id,
            link_type.unwrap_or("related"),
            now,
        ),
    )?;

    Ok(())
}
