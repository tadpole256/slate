use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};
use rusqlite::{Connection, OptionalExtension};

use crate::db::{generate_id, now_iso};
use crate::models::RecordAttachment;
use crate::services::record_service;

fn sanitize_file_name(name: &str) -> String {
    let sanitized = name
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_') {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();

    let trimmed = sanitized.trim_matches('_');
    if trimmed.is_empty() {
        "attachment".to_string()
    } else {
        trimmed.to_string()
    }
}

fn absolute_path(attachments_root: &Path, stored_path: &str) -> PathBuf {
    attachments_root.join(stored_path)
}

fn get_attachment(conn: &Connection, attachment_id: &str) -> Result<RecordAttachment> {
    conn.query_row(
        r#"
        SELECT id, table_id, record_id, file_name, stored_path, mime_type, size_bytes, created_at
        FROM record_attachments
        WHERE id = ?1
        "#,
        [attachment_id],
        |row| {
            Ok(RecordAttachment {
                id: row.get(0)?,
                table_id: row.get(1)?,
                record_id: row.get(2)?,
                file_name: row.get(3)?,
                stored_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| anyhow!("Attachment not found"))
}

pub fn list_record_attachments(
    conn: &Connection,
    table_id: &str,
    record_id: &str,
) -> Result<Vec<RecordAttachment>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, table_id, record_id, file_name, stored_path, mime_type, size_bytes, created_at
        FROM record_attachments
        WHERE table_id = ?1 AND record_id = ?2
        ORDER BY created_at DESC
        "#,
    )?;

    let rows = stmt
        .query_map((table_id, record_id), |row| {
            Ok(RecordAttachment {
                id: row.get(0)?,
                table_id: row.get(1)?,
                record_id: row.get(2)?,
                file_name: row.get(3)?,
                stored_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn attach_file_to_record(
    conn: &Connection,
    attachments_root: &Path,
    table_id: &str,
    record_id: &str,
) -> Result<Option<RecordAttachment>> {
    record_service::get_record(conn, table_id, record_id)?;

    let selected = rfd::FileDialog::new()
        .set_title("Select attachment")
        .pick_file();

    let Some(source_path) = selected else {
        return Ok(None);
    };

    let file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("attachment")
        .to_string();

    let safe_file_name = sanitize_file_name(&file_name);
    let attachment_id = generate_id("att");
    let now = now_iso();

    let relative_path = format!("{}/{}/{}_{}", table_id, record_id, attachment_id, safe_file_name);
    let destination_path = absolute_path(attachments_root, &relative_path);

    if let Some(parent) = destination_path.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::copy(&source_path, &destination_path)?;

    let size_bytes = fs::metadata(&destination_path).ok().map(|meta| meta.len() as i64);

    conn.execute(
        r#"
        INSERT INTO record_attachments
          (id, table_id, record_id, file_name, stored_path, mime_type, size_bytes, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7)
        "#,
        (
            &attachment_id,
            table_id,
            record_id,
            file_name,
            relative_path,
            size_bytes,
            now,
        ),
    )?;

    get_attachment(conn, &attachment_id).map(Some)
}

pub fn delete_attachment(conn: &Connection, attachments_root: &Path, attachment_id: &str) -> Result<()> {
    let attachment = get_attachment(conn, attachment_id)?;

    conn.execute(
        "DELETE FROM record_attachments WHERE id = ?1",
        [attachment_id],
    )?;

    let path = absolute_path(attachments_root, &attachment.stored_path);
    if path.exists() {
        let _ = fs::remove_file(path);
    }

    Ok(())
}

pub fn open_attachment(conn: &Connection, attachments_root: &Path, attachment_id: &str) -> Result<()> {
    let attachment = get_attachment(conn, attachment_id)?;
    let path = absolute_path(attachments_root, &attachment.stored_path);

    if !path.exists() {
        return Err(anyhow!("Attachment file is missing on disk"));
    }

    open::that(path)?;
    Ok(())
}

pub fn delete_attachments_for_record(
    conn: &Connection,
    attachments_root: &Path,
    table_id: &str,
    record_id: &str,
) -> Result<()> {
    let attachments = list_record_attachments(conn, table_id, record_id)?;

    conn.execute(
        "DELETE FROM record_attachments WHERE table_id = ?1 AND record_id = ?2",
        (table_id, record_id),
    )?;

    for attachment in attachments {
        let path = absolute_path(attachments_root, &attachment.stored_path);
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }

    Ok(())
}

pub fn delete_attachments_for_table(
    conn: &Connection,
    attachments_root: &Path,
    table_id: &str,
) -> Result<()> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, table_id, record_id, file_name, stored_path, mime_type, size_bytes, created_at
        FROM record_attachments
        WHERE table_id = ?1
        "#,
    )?;

    let attachments = stmt
        .query_map([table_id], |row| {
            Ok(RecordAttachment {
                id: row.get(0)?,
                table_id: row.get(1)?,
                record_id: row.get(2)?,
                file_name: row.get(3)?,
                stored_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    conn.execute("DELETE FROM record_attachments WHERE table_id = ?1", [table_id])?;

    for attachment in attachments {
        let path = absolute_path(attachments_root, &attachment.stored_path);
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }

    Ok(())
}
