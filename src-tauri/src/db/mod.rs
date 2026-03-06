pub mod init;

use uuid::Uuid;

pub fn now_iso() -> String {
    // SQLite stores timestamps as UTC text. This format is lexicographically sortable.
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Convert to a compact UTC-like string without external time crates.
    // This is intentionally simple for MVP; exact formatting is not user-facing.
    format!("{}", now)
}

pub fn generate_id(prefix: &str) -> String {
    format!("{}_{}", prefix, Uuid::new_v4().simple())
}

pub fn quote_ident(identifier: &str) -> String {
    let escaped = identifier.replace('"', "\"\"");
    format!("\"{}\"", escaped)
}

pub fn is_supported_field_type(field_type: &str) -> bool {
    matches!(field_type, "text" | "long_text" | "date" | "checkbox" | "link")
}

pub fn to_sql_column_type(field_type: &str) -> &'static str {
    match field_type {
        "checkbox" => "INTEGER",
        _ => "TEXT",
    }
}
