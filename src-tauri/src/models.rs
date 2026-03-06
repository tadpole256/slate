use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppTable {
    pub id: String,
    pub display_name: String,
    pub storage_name: String,
    pub primary_field_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordRow {
    pub record_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub values: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSnapshot {
    pub table: AppTable,
    pub fields: Vec<AppField>,
    pub records: Vec<RecordRow>,
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
