use anyhow::Result;
use rusqlite::Connection;

use crate::db::{generate_id, now_iso};
use crate::models::RecordNote;

pub fn list_notes(conn: &Connection, table_id: &str, record_id: &str) -> Result<Vec<RecordNote>> {
    let mut stmt = conn.prepare(
        "SELECT id, table_id, record_id, body, created_at
         FROM record_notes
         WHERE table_id = ?1 AND record_id = ?2
         ORDER BY created_at ASC",
    )?;
    let notes = stmt
        .query_map([table_id, record_id], |row| {
            Ok(RecordNote {
                id: row.get(0)?,
                table_id: row.get(1)?,
                record_id: row.get(2)?,
                body: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(notes)
}

pub fn create_note(conn: &Connection, table_id: &str, record_id: &str, body: &str) -> Result<RecordNote> {
    let id = generate_id("note");
    let now = now_iso();
    conn.execute(
        "INSERT INTO record_notes (id, table_id, record_id, body, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, table_id, record_id, body, now],
    )?;
    Ok(RecordNote {
        id,
        table_id: table_id.to_string(),
        record_id: record_id.to_string(),
        body: body.to_string(),
        created_at: now,
    })
}

pub fn delete_note(conn: &Connection, note_id: &str) -> Result<()> {
    conn.execute("DELETE FROM record_notes WHERE id = ?1", [note_id])?;
    Ok(())
}
