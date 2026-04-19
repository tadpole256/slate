use std::collections::HashMap;
use std::io::{BufRead, Write};

use anyhow::{bail, Context, Result};
use rusqlite::Connection;
use serde_json::Value;

use crate::services::{metadata_service, record_service};

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/// Escape a single CSV field: wrap in double-quotes if it contains
/// commas, double-quotes, or newlines; escape internal double-quotes as "".
fn escape_csv_field(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') || s.contains('\r') {
        let escaped = s.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        s.to_string()
    }
}

/// Parse a single CSV line into fields, respecting quoted fields with
/// embedded commas / newlines.  This is a minimal but correct RFC-4180
/// parser for single lines produced by `escape_csv_field`.
fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '"' if in_quotes => {
                // Check for escaped quote ("")
                if chars.peek() == Some(&'"') {
                    chars.next();
                    current.push('"');
                } else {
                    in_quotes = false;
                }
            }
            '"' => {
                in_quotes = true;
            }
            ',' if !in_quotes => {
                fields.push(current.trim_end_matches('\r').to_string());
                current = String::new();
            }
            other => {
                current.push(other);
            }
        }
    }
    // Last field
    fields.push(current.trim_end_matches('\r').to_string());
    fields
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/// Export the given table to a CSV file chosen via a native save dialog.
/// Returns the path of the written file, or None if the user cancelled.
pub fn export_csv(conn: &Connection, table_id: &str) -> Result<Option<String>> {
    let fields = metadata_service::list_fields(conn, table_id)?;
    if fields.is_empty() {
        bail!("Table has no columns to export");
    }

    let records = record_service::list_records(conn, table_id, None, None, None)?;

    // Pick save location
    let path = rfd::FileDialog::new()
        .set_title("Export as CSV")
        .set_file_name("export.csv")
        .add_filter("CSV files", &["csv"])
        .save_file();

    let path = match path {
        Some(p) => p,
        None => return Ok(None), // user cancelled
    };

    // Build CSV in memory then write atomically
    let mut out = String::new();

    // Header row
    let header_parts: Vec<String> = fields
        .iter()
        .map(|f| escape_csv_field(&f.display_name))
        .collect();
    out.push_str(&header_parts.join(","));
    out.push('\n');

    // Data rows
    for record in &records {
        let row_parts: Vec<String> = fields
            .iter()
            .map(|f| {
                let v = record.values.get(&f.column_key);
                let s = match v {
                    None | Some(Value::Null) => String::new(),
                    Some(Value::String(s)) => s.clone(),
                    Some(other) => other.to_string(),
                };
                escape_csv_field(&s)
            })
            .collect();
        out.push_str(&row_parts.join(","));
        out.push('\n');
    }

    // Write to disk
    let mut file =
        std::fs::File::create(&path).with_context(|| format!("Cannot create {:?}", path))?;
    file.write_all(out.as_bytes())
        .with_context(|| format!("Cannot write {:?}", path))?;

    Ok(Some(path.to_string_lossy().into_owned()))
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

/// Export the given table to a JSON file chosen via a native save dialog.
/// Returns the path of the written file, or None if the user cancelled.
pub fn export_json(conn: &Connection, table_id: &str) -> Result<Option<String>> {
    let fields = metadata_service::list_fields(conn, table_id)?;
    if fields.is_empty() {
        bail!("Table has no columns to export");
    }

    let records = record_service::list_records(conn, table_id, None, None, None)?;

    // Pick save location
    let path = rfd::FileDialog::new()
        .set_title("Export as JSON")
        .set_file_name("export.json")
        .add_filter("JSON files", &["json"])
        .save_file();

    let path = match path {
        Some(p) => p,
        None => return Ok(None),
    };

    // Build array of objects keyed by display_name
    let mut rows: Vec<serde_json::Value> = Vec::with_capacity(records.len());
    for record in &records {
        let mut obj = serde_json::Map::new();
        for field in &fields {
            let v = record.values.get(&field.column_key).cloned().unwrap_or(Value::Null);
            obj.insert(field.display_name.clone(), v);
        }
        rows.push(Value::Object(obj));
    }

    let json_str = serde_json::to_string_pretty(&rows)
        .with_context(|| "Failed to serialize records to JSON")?;

    std::fs::write(&path, json_str.as_bytes())
        .with_context(|| format!("Cannot write {:?}", path))?;

    Ok(Some(path.to_string_lossy().into_owned()))
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/// Import records from a CSV file chosen via a native open dialog.
/// The first row is treated as a header; headers are matched to field
/// display_names (case-insensitive). Unmatched columns are skipped.
/// Returns the number of records created, or None if user cancelled.
pub fn import_csv(conn: &Connection, table_id: &str) -> Result<Option<usize>> {
    let path = rfd::FileDialog::new()
        .set_title("Import CSV")
        .add_filter("CSV files", &["csv", "txt"])
        .pick_file();

    let path = match path {
        Some(p) => p,
        None => return Ok(None), // user cancelled
    };

    let file = std::fs::File::open(&path)
        .with_context(|| format!("Cannot open {:?}", path))?;
    let reader = std::io::BufReader::new(file);
    let mut lines = reader.lines();

    // Read header row
    let header_line = match lines.next() {
        Some(Ok(line)) => line,
        Some(Err(e)) => bail!("Failed to read CSV header: {}", e),
        None => bail!("CSV file is empty"),
    };
    let headers = parse_csv_line(&header_line);
    if headers.is_empty() {
        bail!("CSV header row is empty");
    }

    // Map header name → field column_key (case-insensitive match on display_name)
    let fields = metadata_service::list_fields(conn, table_id)?;
    let field_map: HashMap<String, String> = fields
        .iter()
        .map(|f| (f.display_name.to_lowercase(), f.column_key.clone()))
        .collect();

    // Build column index → column_key mapping
    let col_to_key: Vec<Option<String>> = headers
        .iter()
        .map(|h| field_map.get(&h.to_lowercase()).cloned())
        .collect();

    let has_any_match = col_to_key.iter().any(|k| k.is_some());
    if !has_any_match {
        bail!("No CSV columns matched any table fields. Check column names.");
    }

    // Parse data rows and create records
    let mut created = 0usize;
    for raw in lines {
        let line = raw.with_context(|| "Failed to read CSV line")?;
        if line.trim().is_empty() {
            continue;
        }
        let values_raw = parse_csv_line(&line);

        let mut row_values: HashMap<String, Value> = HashMap::new();
        for (idx, raw_val) in values_raw.iter().enumerate() {
            if let Some(Some(col_key)) = col_to_key.get(idx) {
                if !raw_val.is_empty() {
                    row_values.insert(col_key.clone(), Value::String(raw_val.clone()));
                }
            }
        }

        if !row_values.is_empty() {
            record_service::create_record(conn, table_id, &row_values)?;
            created += 1;
        }
    }

    Ok(Some(created))
}
