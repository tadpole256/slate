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

fn with_conn<T>(state: &State<'_, AppState>, operation: impl FnOnce(&rusqlite::Connection) -> anyhow::Result<T>) -> CommandResult<T> {
    let guard = state
        .conn
        .lock()
        .map_err(|_| "Failed to acquire database lock".to_string())?;

    operation(&guard).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn init_app(state: State<'_, AppState>) -> CommandResult<InitResponse> {
    with_conn(&state, |conn| {
        let tables = metadata_service::list_tables(conn)?;
        Ok(InitResponse { tables })
    })
}

#[tauri::command]
pub fn list_tables(state: State<'_, AppState>) -> CommandResult<Vec<AppTable>> {
    with_conn(&state, metadata_service::list_tables)
}

#[tauri::command]
pub fn get_table_snapshot(
    state: State<'_, AppState>,
    table_id: String,
    query: Option<String>,
) -> CommandResult<TableSnapshot> {
    with_conn(&state, |conn| {
        let table = metadata_service::get_table(conn, &table_id)?;
        let fields = metadata_service::list_fields(conn, &table_id)?;
        let records = record_service::list_records(conn, &table_id, query.as_deref())?;
        Ok(TableSnapshot {
            table,
            fields,
            records,
        })
    })
}

#[tauri::command]
pub fn create_table(state: State<'_, AppState>, display_name: String) -> CommandResult<AppTable> {
    with_conn(&state, |conn| table_service::create_table(conn, &display_name))
}

#[tauri::command]
pub fn rename_table(
    state: State<'_, AppState>,
    table_id: String,
    display_name: String,
) -> CommandResult<AppTable> {
    with_conn(&state, |conn| table_service::rename_table(conn, &table_id, &display_name))
}

#[tauri::command]
pub fn delete_table(state: State<'_, AppState>, table_id: String) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(&state, |conn| {
        attachment_service::delete_attachments_for_table(conn, &attachments_dir, &table_id)?;
        link_service::delete_links_for_table(conn, &table_id)?;
        table_service::delete_table(conn, &table_id)
    })
}

#[tauri::command]
pub fn create_field(
    state: State<'_, AppState>,
    table_id: String,
    display_name: String,
    field_type: String,
) -> CommandResult<AppField> {
    with_conn(&state, |conn| {
        table_service::create_field(conn, &table_id, &display_name, &field_type)
    })
}

#[tauri::command]
pub fn rename_field(
    state: State<'_, AppState>,
    field_id: String,
    display_name: String,
) -> CommandResult<AppField> {
    with_conn(&state, |conn| table_service::rename_field(conn, &field_id, &display_name))
}

#[tauri::command]
pub fn delete_field(state: State<'_, AppState>, field_id: String) -> CommandResult<()> {
    with_conn(&state, |conn| table_service::delete_field(conn, &field_id))
}

#[tauri::command]
pub fn create_record(
    state: State<'_, AppState>,
    table_id: String,
    values: HashMap<String, Value>,
) -> CommandResult<RecordRow> {
    with_conn(&state, |conn| record_service::create_record(conn, &table_id, &values))
}

#[tauri::command]
pub fn update_record(
    state: State<'_, AppState>,
    table_id: String,
    record_id: String,
    values: HashMap<String, Value>,
) -> CommandResult<RecordRow> {
    with_conn(&state, |conn| record_service::update_record(conn, &table_id, &record_id, &values))
}

#[tauri::command]
pub fn delete_record(
    state: State<'_, AppState>,
    table_id: String,
    record_id: String,
) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(&state, |conn| {
        attachment_service::delete_attachments_for_record(conn, &attachments_dir, &table_id, &record_id)?;
        link_service::delete_links_for_record(conn, &table_id, &record_id)?;
        record_service::delete_record(conn, &table_id, &record_id)
    })
}

#[tauri::command]
pub fn list_record_attachments(
    state: State<'_, AppState>,
    table_id: String,
    record_id: String,
) -> CommandResult<Vec<RecordAttachment>> {
    with_conn(&state, |conn| {
        attachment_service::list_record_attachments(conn, &table_id, &record_id)
    })
}

#[tauri::command]
pub fn attach_file_to_record(
    state: State<'_, AppState>,
    table_id: String,
    record_id: String,
) -> CommandResult<Option<RecordAttachment>> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(&state, |conn| {
        attachment_service::attach_file_to_record(conn, &attachments_dir, &table_id, &record_id)
    })
}

#[tauri::command]
pub fn delete_attachment(state: State<'_, AppState>, attachment_id: String) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(&state, |conn| {
        attachment_service::delete_attachment(conn, &attachments_dir, &attachment_id)
    })
}

#[tauri::command]
pub fn open_attachment(state: State<'_, AppState>, attachment_id: String) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(&state, |conn| {
        attachment_service::open_attachment(conn, &attachments_dir, &attachment_id)
    })
}

#[tauri::command]
pub fn list_record_links(
    state: State<'_, AppState>,
    table_id: String,
    record_id: String,
) -> CommandResult<Vec<RecordLink>> {
    with_conn(&state, |conn| link_service::list_record_links(conn, &table_id, &record_id))
}

#[tauri::command]
pub fn create_record_link(
    state: State<'_, AppState>,
    from_table_id: String,
    from_record_id: String,
    to_table_id: String,
    to_record_id: String,
    link_type: Option<String>,
) -> CommandResult<RecordLink> {
    with_conn(&state, |conn| {
        link_service::create_record_link(
            conn,
            &from_table_id,
            &from_record_id,
            &to_table_id,
            &to_record_id,
            link_type.as_deref(),
        )
    })
}

#[tauri::command]
pub fn delete_record_link(state: State<'_, AppState>, link_id: String) -> CommandResult<()> {
    with_conn(&state, |conn| link_service::delete_record_link(conn, &link_id))
}

#[tauri::command]
pub fn list_record_options(
    state: State<'_, AppState>,
    table_id: String,
    query: Option<String>,
) -> CommandResult<Vec<RecordOption>> {
    with_conn(&state, |conn| link_service::list_record_options(conn, &table_id, query.as_deref()))
}
