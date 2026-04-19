use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Sort specification sent from the frontend for `get_table_snapshot`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortInput {
    /// ID of the field to sort by.
    pub field_id: String,
    /// "asc" or "desc"
    pub direction: String,
}

/// Filter specification sent from the frontend for `get_table_snapshot`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterInput {
    /// ID of the field to filter on.
    pub field_id: String,
    /// Operator: "eq" | "neq" | "contains" | "not_contains" |
    ///           "is_empty" | "is_not_empty" | "gt" | "lt" | "gte" | "lte"
    pub op: String,
    /// Value to compare against (None for is_empty / is_not_empty).
    pub value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppTable {
    pub id: String,
    pub display_name: String,
    pub storage_name: String,
    pub primary_field_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    /// 1 if this table maps to an external ATTACH'd SQLite DB, 0 otherwise.
    pub is_external: i64,
    /// Optional folder this table belongs to.
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppFolder {
    pub id: String,
    pub name: String,
    pub folder_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// Summary of one externally ATTACH'd SQLite database shown in Settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalConnection {
    pub alias: String,
    pub file_path: String,
    pub table_ids: Vec<String>,
    pub table_names: Vec<String>,
}

/// Payload returned by `get_record_detail` for the record detail window.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordDetailPayload {
    pub table: AppTable,
    pub fields: Vec<AppField>,
    pub field_options: std::collections::HashMap<String, Vec<FieldOption>>,
    pub record: RecordRow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppField {
    pub id: String,
    pub table_id: String,
    pub column_key: String,
    pub display_name: String,
    pub field_type: String,
    pub field_order: i64,
    pub is_visible: i64,
    pub is_primary_label: i64,
    pub created_at: String,
    pub updated_at: String,
    /// JSON config for computed fields (lookup/rollup/formula). None for regular fields.
    pub computed_config: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordRow {
    pub record_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub values: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldOption {
    pub id: String,
    pub field_id: String,
    pub label: String,
    pub color: String,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppView {
    pub id: String,
    pub table_id: String,
    pub name: String,
    pub view_type: String,
    pub config_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSnapshot {
    pub table: AppTable,
    pub fields: Vec<AppField>,
    pub records: Vec<RecordRow>,
    pub field_options: Vec<FieldOption>,
    pub views: Vec<AppView>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitResponse {
    pub tables: Vec<AppTable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordAttachment {
    pub id: String,
    pub table_id: String,
    pub record_id: String,
    pub file_name: String,
    pub stored_path: String,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordOption {
    pub record_id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordNote {
    pub id: String,
    pub table_id: String,
    pub record_id: String,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupFile {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordLink {
    pub id: String,
    pub from_table_id: String,
    pub from_record_id: String,
    pub to_table_id: String,
    pub to_record_id: String,
    pub to_table_name: String,
    pub to_record_label: String,
    pub link_type: String,
    pub created_at: String,
}
