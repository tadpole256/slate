use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::Result;
use rusqlite::{Connection, OptionalExtension};

use crate::db::now_iso;
use crate::models::BackupFile;

/// Converts Unix seconds to a "YYYY-MM-DD" UTC date string.
/// Uses the Euclidean algorithm (Howard Hinnant) — no external crates needed.
fn unix_secs_to_date_str(secs: u64) -> String {
    let days = secs / 86400;
    let z = days as i64 + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}", y, m, d)
}

/// Opens a native folder-picker dialog and returns the selected path.
/// Returns `None` if the user cancelled.
pub fn pick_folder() -> Result<Option<String>> {
    let path = rfd::FileDialog::new()
        .set_title("Choose Backup Folder")
        .pick_folder();
    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

/// Creates a backup of the live database using SQLite's `VACUUM INTO`.
/// The backup file is named `slate-backup-YYYY-MM-DD.db` inside `dest_dir`.
/// If that filename already exists a Unix-epoch suffix is appended to ensure
/// uniqueness (e.g. a second manual backup on the same day).
/// Updates `app_meta.last_backup_at` on success.
pub fn create_backup(conn: &Connection, dest_dir: &str) -> Result<String> {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let date = unix_secs_to_date_str(secs);

    let base = Path::new(dest_dir).join(format!("slate-backup-{}.db", date));
    let final_path = if base.exists() {
        Path::new(dest_dir).join(format!("slate-backup-{}-{}.db", date, secs))
    } else {
        base
    };

    let path_str = final_path.to_string_lossy().to_string();

    // VACUUM INTO copies the entire DB into a new file with no page slack —
    // it reads the live WAL-committed state and produces a single consistent file.
    conn.execute_batch(&format!(
        "VACUUM INTO '{}'",
        path_str.replace('\'', "''")
    ))?;

    // Record when the last backup ran so auto-backup can skip for 24 h.
    let now = now_iso();
    conn.execute(
        "INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES ('last_backup_at', ?1, ?1)",
        [&now],
    )?;

    Ok(path_str)
}

/// Lists `slate-backup-*.db` files in `dest_dir`, sorted newest-first by
/// filename (lexicographic, which is newest-first given the `YYYY-MM-DD` prefix).
/// Returns at most 10 entries.
pub fn list_backups(dest_dir: &str) -> Result<Vec<BackupFile>> {
    let dir = Path::new(dest_dir);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut files: Vec<BackupFile> = std::fs::read_dir(dir)?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.starts_with("slate-backup-") || !name.ends_with(".db") {
                return None;
            }
            let metadata = entry.metadata().ok()?;
            let size_bytes = metadata.len();
            let path = entry.path().to_string_lossy().to_string();
            Some(BackupFile { name, path, size_bytes })
        })
        .collect();

    files.sort_by(|a, b| b.name.cmp(&a.name)); // newest first (lexicographic on date prefix)
    files.truncate(10);
    Ok(files)
}

/// Called from `init_app` at startup. If a backup folder is configured and the
/// last backup is more than 24 hours old (or has never run), creates a silent
/// auto-backup. Errors are swallowed so a backup failure never blocks startup.
pub fn auto_backup_if_needed(conn: &Connection) -> Result<()> {
    let backup_dir: Option<String> = conn
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'backup_dir'",
            [],
            |row| row.get(0),
        )
        .optional()?;

    let Some(dir) = backup_dir else {
        return Ok(());
    };

    let last_backup: Option<i64> = conn
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM app_meta WHERE key = 'last_backup_at'",
            [],
            |row| row.get(0),
        )
        .optional()?;

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let should_backup = last_backup.map_or(true, |t| now_secs - t > 86_400);

    if should_backup {
        // Silently ignore auto-backup errors — don't fail app startup.
        let _ = create_backup(conn, &dir);
    }

    Ok(())
}
