use std::collections::HashMap;

use serde_json::Value;
use tauri::State;

use crate::models::{
    AppField,
    AppTable,
    InitResponse,
    RecordAttachment,
    RecordLink,
    RecordOption,
    RecordRow,
    TableSnapshot,
};
use crate::services::{attachment_service, link_service, metadata_service, record_service, table_service};
use crate::AppState;

type CommandResult<T> = Result<T, String>;

fn open_connection(db_path: &std::path::Path) -> anyhow::Result<rusqlite::Connection> {
    let conn = rusqlite::Connection::open(db_path)?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    crate::db::init::initialize_database(&conn)?;
    Ok(conn)
}

async fn with_conn<T, F>(state: tauri::State<'_, std::sync::Arc<AppState>>, operation: F) -> CommandResult<T>
where
    F: FnOnce(&rusqlite::Connection) -> anyhow::Result<T> + Send + 'static,
    T: Send + 'static,
{
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = state_clone
            .conn
            .lock()
            .map_err(|_| "Failed to acquire database lock".to_string())?;

        if guard.is_none() {
            let conn = open_connection(&state_clone.db_path).map_err(|e| e.to_string())?;
            *guard = Some(conn);
        }

        operation(guard.as_ref().unwrap()).map_err(|error| error.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn init_app(state: State<'_, std::sync::Arc<AppState>>) -> CommandResult<InitResponse> {
    with_conn(state, move |conn| {
        table_service::repair_all_table_storage(conn)?;
        let tables = metadata_service::list_tables(conn)?;
        Ok(InitResponse { tables })
    }).await
}

#[tauri::command]
pub async fn list_tables(state: State<'_, std::sync::Arc<AppState>>) -> CommandResult<Vec<AppTable>> {
    with_conn(state, metadata_service::list_tables).await
}

#[tauri::command]
pub async fn get_table_snapshot(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    query: Option<String>,
) -> CommandResult<TableSnapshot> {
    with_conn(state, move |conn| {
        let table = metadata_service::get_table(conn, &table_id)?;
        let fields = metadata_service::list_fields(conn, &table_id)?;
        let records = record_service::list_records(conn, &table_id, query.as_deref())?;
        Ok(TableSnapshot {
            table,
            fields,
            records,
        })
    }).await
}

#[tauri::command]
pub async fn create_table(state: State<'_, std::sync::Arc<AppState>>, display_name: String) -> CommandResult<AppTable> {
    with_conn(state, move |conn| table_service::create_table(conn, &display_name)).await
}

#[tauri::command]
pub async fn rename_table(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    display_name: String,
) -> CommandResult<AppTable> {
    with_conn(state, move |conn| table_service::rename_table(conn, &table_id, &display_name)).await
}

#[tauri::command]
pub async fn delete_table(state: State<'_, std::sync::Arc<AppState>>, table_id: String) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(state, move |conn| {
        attachment_service::delete_attachments_for_table(conn, &attachments_dir, &table_id)?;
        link_service::delete_links_for_table(conn, &table_id)?;
        table_service::delete_table(conn, &table_id)
    }).await
}

#[tauri::command]
pub async fn create_field(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    display_name: String,
    field_type: String,
) -> CommandResult<AppField> {
    with_conn(state, move |conn| {
        table_service::create_field(conn, &table_id, &display_name, &field_type)
    }).await
}

#[tauri::command]
pub async fn rename_field(
    state: State<'_, std::sync::Arc<AppState>>,
    field_id: String,
    display_name: String,
) -> CommandResult<AppField> {
    with_conn(state, move |conn| table_service::rename_field(conn, &field_id, &display_name)).await
}

#[tauri::command]
pub async fn delete_field(state: State<'_, std::sync::Arc<AppState>>, field_id: String) -> CommandResult<()> {
    with_conn(state, move |conn| table_service::delete_field(conn, &field_id)).await
}

#[tauri::command]
pub async fn create_record(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    values: HashMap<String, Value>,
) -> CommandResult<RecordRow> {
    with_conn(state, move |conn| record_service::create_record(conn, &table_id, &values)).await
}

#[tauri::command]
pub async fn update_record(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
    values: HashMap<String, Value>,
) -> CommandResult<RecordRow> {
    with_conn(state, move |conn| record_service::update_record(conn, &table_id, &record_id, &values)).await
}

#[tauri::command]
pub async fn delete_record(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(state, move |conn| {
        attachment_service::delete_attachments_for_record(conn, &attachments_dir, &table_id, &record_id)?;
        link_service::delete_links_for_record(conn, &table_id, &record_id)?;
        record_service::delete_record(conn, &table_id, &record_id)
    }).await
}

#[tauri::command]
pub async fn list_record_attachments(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
) -> CommandResult<Vec<RecordAttachment>> {
    with_conn(state, move |conn| {
        attachment_service::list_record_attachments(conn, &table_id, &record_id)
    }).await
}

#[tauri::command]
pub async fn attach_file_to_record(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
) -> CommandResult<Option<RecordAttachment>> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(state, move |conn| {
        attachment_service::attach_file_to_record(conn, &attachments_dir, &table_id, &record_id)
    }).await
}

#[tauri::command]
pub async fn delete_attachment(state: State<'_, std::sync::Arc<AppState>>, attachment_id: String) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(state, move |conn| {
        attachment_service::delete_attachment(conn, &attachments_dir, &attachment_id)
    }).await
}

#[tauri::command]
pub async fn open_attachment(state: State<'_, std::sync::Arc<AppState>>, attachment_id: String) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(state, move |conn| {
        attachment_service::open_attachment(conn, &attachments_dir, &attachment_id)
    }).await
}

#[tauri::command]
pub async fn list_record_links(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
) -> CommandResult<Vec<RecordLink>> {
    with_conn(state, move |conn| link_service::list_record_links(conn, &table_id, &record_id)).await
}

#[tauri::command]
pub async fn create_record_link(
    state: State<'_, std::sync::Arc<AppState>>,
    from_table_id: String,
    from_record_id: String,
    to_table_id: String,
    to_record_id: String,
    link_type: Option<String>,
) -> CommandResult<RecordLink> {
    with_conn(state, move |conn| {
        link_service::create_record_link(
            conn,
            &from_table_id,
            &from_record_id,
            &to_table_id,
            &to_record_id,
            link_type.as_deref(),
        )
    }).await
}

#[tauri::command]
pub async fn delete_record_link(state: State<'_, std::sync::Arc<AppState>>, link_id: String) -> CommandResult<()> {
    with_conn(state, move |conn| link_service::delete_record_link(conn, &link_id)).await
}

#[tauri::command]
pub async fn list_record_options(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    query: Option<String>,
) -> CommandResult<Vec<RecordOption>> {
    with_conn(state, move |conn| link_service::list_record_options(conn, &table_id, query.as_deref())).await
}
