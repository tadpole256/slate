use std::collections::HashMap;

use serde_json::Value;
use tauri::State;

use crate::models::{
    AppField,
    AppFolder,
    AppTable,
    AppView,
    BackupFile,
    ExternalConnection,
    FieldOption,
    FilterInput,
    InitResponse,
    RecordAttachment,
    RecordDetailPayload,
    RecordLink,
    RecordNote,
    RecordOption,
    RecordRow,
    SortInput,
    TableSnapshot,
};
use crate::services::{attachment_service, backup_service, csv_service, external_db_service, field_option_service, folder_service, link_service, metadata_service, note_service, record_service, table_service, view_service};
use crate::AppState;

type CommandResult<T> = Result<T, String>;

fn open_connection(db_path: &std::path::Path) -> anyhow::Result<rusqlite::Connection> {
    let conn = rusqlite::Connection::open(db_path)?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    crate::db::init::initialize_database(&conn)?;
    // Re-attach any previously connected external databases.
    // Errors are silenced so a missing/moved file never prevents startup.
    let _ = external_db_service::reattach_all_external_dbs(&conn);
    Ok(conn)
}

async fn with_conn<T, F>(state: tauri::State<'_, std::sync::Arc<AppState>>, operation: F) -> CommandResult<T>
where
    F: FnOnce(&rusqlite::Connection) -> anyhow::Result<T> + Send + 'static,
    T: Send + 'static,
{
    println!("with_conn: starting");
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        println!("with_conn: inside spawn_blocking, acquiring lock...");
        let mut guard = state_clone
            .conn
            .lock()
            .map_err(|_| "Failed to acquire database lock".to_string())?;

        println!("with_conn: acquired lock");
        if guard.is_none() {
            println!("with_conn: connection is None, opening...");
            let conn = open_connection(&state_clone.db_path).map_err(|e| e.to_string())?;
            *guard = Some(conn);
        }

        println!("with_conn: running operation...");
        let res = operation(guard.as_ref().unwrap()).map_err(|error| {
            println!("with_conn: operation error: {:?}", error);
            error.to_string()
        });
        println!("with_conn: operation completed");
        res
    })
    .await
    .map_err(|e| {
        println!("with_conn: spawn_blocking error: {:?}", e);
        e.to_string()
    })?
}

#[tauri::command]
pub async fn init_app(state: State<'_, std::sync::Arc<AppState>>) -> CommandResult<InitResponse> {
    println!("DEBUG: init_app invoked from frontend!");
    with_conn(state, move |conn| {
        println!("DEBUG: init_app executing within with_conn");
        table_service::repair_all_table_storage(conn)?;
        println!("DEBUG: init_app repaired table storage");
        // Run auto-backup silently — errors are swallowed so startup is never blocked.
        let _ = backup_service::auto_backup_if_needed(conn);
        let tables = metadata_service::list_tables(conn)?;
        println!("DEBUG: init_app listed tables, finishing");
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
    sorts: Option<Vec<SortInput>>,
    filters: Option<Vec<FilterInput>>,
) -> CommandResult<TableSnapshot> {
    with_conn(state, move |conn| {
        let table = metadata_service::get_table(conn, &table_id)?;
        let fields = metadata_service::list_fields(conn, &table_id)?;
        let records = record_service::list_records(
            conn,
            &table_id,
            query.as_deref(),
            sorts.as_deref(),
            filters.as_deref(),
        )?;
        let field_options = field_option_service::list_all_options_for_table(conn, &table_id)?;
        let views = view_service::ensure_default_view(conn, &table_id)?;
        Ok(TableSnapshot {
            table,
            fields,
            records,
            field_options,
            views,
        })
    }).await
}

#[tauri::command]
pub async fn list_views(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
) -> CommandResult<Vec<AppView>> {
    with_conn(state, move |conn| view_service::list_views(conn, &table_id)).await
}

#[tauri::command]
pub async fn create_view(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    name: String,
    view_type: String,
) -> CommandResult<AppView> {
    with_conn(state, move |conn| {
        view_service::create_view(conn, &table_id, &name, &view_type)
    }).await
}

#[tauri::command]
pub async fn rename_view(
    state: State<'_, std::sync::Arc<AppState>>,
    view_id: String,
    name: String,
) -> CommandResult<AppView> {
    with_conn(state, move |conn| view_service::rename_view(conn, &view_id, &name)).await
}

#[tauri::command]
pub async fn delete_view(
    state: State<'_, std::sync::Arc<AppState>>,
    view_id: String,
) -> CommandResult<()> {
    with_conn(state, move |conn| view_service::delete_view(conn, &view_id)).await
}

#[tauri::command]
pub async fn update_view_config(
    state: State<'_, std::sync::Arc<AppState>>,
    view_id: String,
    config_json: String,
) -> CommandResult<AppView> {
    with_conn(state, move |conn| {
        view_service::update_view_config(conn, &view_id, &config_json)
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
    computed_config: Option<String>,
) -> CommandResult<AppField> {
    with_conn(state, move |conn| {
        table_service::create_field(conn, &table_id, &display_name, &field_type, computed_config.as_deref())
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
pub async fn delete_records(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_ids: Vec<String>,
) -> CommandResult<()> {
    let attachments_dir = state.attachments_dir.clone();
    with_conn(state, move |conn| {
        for record_id in &record_ids {
            attachment_service::delete_attachments_for_record(conn, &attachments_dir, &table_id, record_id)?;
            link_service::delete_links_for_record(conn, &table_id, record_id)?;
            record_service::delete_record(conn, &table_id, record_id)?;
        }
        Ok(())
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

#[tauri::command]
pub async fn list_field_options(
    state: State<'_, std::sync::Arc<AppState>>,
    field_id: String,
) -> CommandResult<Vec<FieldOption>> {
    with_conn(state, move |conn| field_option_service::list_field_options(conn, &field_id)).await
}

#[tauri::command]
pub async fn create_field_option(
    state: State<'_, std::sync::Arc<AppState>>,
    field_id: String,
    label: String,
    color: String,
) -> CommandResult<FieldOption> {
    with_conn(state, move |conn| {
        field_option_service::create_field_option(conn, &field_id, &label, &color)
    }).await
}

#[tauri::command]
pub async fn update_field_option(
    state: State<'_, std::sync::Arc<AppState>>,
    option_id: String,
    label: String,
    color: String,
) -> CommandResult<FieldOption> {
    with_conn(state, move |conn| {
        field_option_service::update_field_option(conn, &option_id, &label, &color)
    }).await
}

#[tauri::command]
pub async fn delete_field_option(
    state: State<'_, std::sync::Arc<AppState>>,
    option_id: String,
) -> CommandResult<()> {
    with_conn(state, move |conn| {
        field_option_service::delete_field_option(conn, &option_id)
    }).await
}

#[tauri::command]
pub async fn reorder_field_options(
    state: State<'_, std::sync::Arc<AppState>>,
    option_ids: Vec<String>,
) -> CommandResult<()> {
    with_conn(state, move |conn| {
        field_option_service::reorder_field_options(conn, &option_ids)
    }).await
}

#[tauri::command]
pub async fn reorder_fields(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    field_ids: Vec<String>,
) -> CommandResult<()> {
    with_conn(state, move |conn| {
        table_service::reorder_fields(conn, &table_id, &field_ids)
    }).await
}

#[tauri::command]
pub async fn toggle_field_visibility(
    state: State<'_, std::sync::Arc<AppState>>,
    field_id: String,
) -> CommandResult<AppField> {
    with_conn(state, move |conn| {
        table_service::toggle_field_visibility(conn, &field_id)
    }).await
}

#[tauri::command]
pub async fn export_csv(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
) -> CommandResult<Option<String>> {
    with_conn(state, move |conn| {
        csv_service::export_csv(conn, &table_id)
    }).await
}

#[tauri::command]
pub async fn import_csv(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
) -> CommandResult<Option<usize>> {
    with_conn(state, move |conn| {
        csv_service::import_csv(conn, &table_id)
    }).await
}

#[tauri::command]
pub async fn export_json(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
) -> CommandResult<Option<String>> {
    with_conn(state, move |conn| {
        csv_service::export_json(conn, &table_id)
    }).await
}

// ── Backup commands ───────────────────────────────────────────────────────────

/// Opens a native folder-picker dialog. Returns the chosen path or null if
/// the user cancelled. Does NOT persist the choice — call `set_app_meta`
/// with key `"backup_dir"` to save it.
#[tauri::command]
pub async fn pick_backup_folder() -> CommandResult<Option<String>> {
    tauri::async_runtime::spawn_blocking(|| {
        backup_service::pick_folder().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Creates a `VACUUM INTO` backup of the database in `dest_dir`.
/// Returns the full path of the created backup file.
#[tauri::command]
pub async fn create_backup(
    state: State<'_, std::sync::Arc<AppState>>,
    dest_dir: String,
) -> CommandResult<String> {
    with_conn(state, move |conn| {
        backup_service::create_backup(conn, &dest_dir)
    }).await
}

/// Lists `slate-backup-*.db` files in `dest_dir`, newest-first, up to 10.
#[tauri::command]
pub async fn list_backups(dest_dir: String) -> CommandResult<Vec<BackupFile>> {
    tauri::async_runtime::spawn_blocking(move || {
        backup_service::list_backups(&dest_dir).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Reads a value from the `app_meta` key-value store.
#[tauri::command]
pub async fn get_app_meta(
    state: State<'_, std::sync::Arc<AppState>>,
    key: String,
) -> CommandResult<Option<String>> {
    with_conn(state, move |conn| {
        use rusqlite::OptionalExtension;
        let val: Option<String> = conn
            .query_row(
                "SELECT value FROM app_meta WHERE key = ?1",
                [&key],
                |row| row.get(0),
            )
            .optional()?;
        Ok(val)
    }).await
}

/// Upserts a value in the `app_meta` key-value store.
#[tauri::command]
pub async fn set_app_meta(
    state: State<'_, std::sync::Arc<AppState>>,
    key: String,
    value: String,
) -> CommandResult<()> {
    with_conn(state, move |conn| {
        let now = crate::db::now_iso();
        conn.execute(
            "INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?1, ?2, ?3)",
            [&key, &value, &now],
        )?;
        Ok(())
    }).await
}

// ── External database commands ────────────────────────────────────────────────

/// Opens a native file-picker for SQLite databases.
/// Returns the chosen path or null if the user cancelled. Stateless — does not ATTACH yet.
#[tauri::command]
pub async fn pick_external_db_file() -> CommandResult<Option<String>> {
    tauri::async_runtime::spawn_blocking(|| {
        external_db_service::pick_db_file().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Connects an external SQLite database at `path`.
/// ATTACHes it, introspects tables/columns, creates metadata, and persists the path
/// in `app_meta` for automatic re-attachment on future launches.
/// Returns the list of newly created `AppTable` entries.
#[tauri::command]
pub async fn connect_external_db(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> CommandResult<Vec<AppTable>> {
    with_conn(state, move |conn| {
        external_db_service::connect_external_db(conn, path)
    }).await
}

/// Disconnects the external database that owns the given `table_id`.
/// Removes all related metadata, cleans `app_meta`, and DETACHes the database.
#[tauri::command]
pub async fn disconnect_external_db(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
) -> CommandResult<()> {
    with_conn(state, move |conn| {
        external_db_service::disconnect_external_db(conn, &table_id)
    }).await
}

/// Returns all currently connected external databases as summaries for the Settings panel.
#[tauri::command]
pub async fn list_external_connections(
    state: State<'_, std::sync::Arc<AppState>>,
) -> CommandResult<Vec<ExternalConnection>> {
    with_conn(state, move |conn| {
        external_db_service::list_external_connections(conn)
    }).await
}

/// Returns the absolute path to the main Slate database file.
#[tauri::command]
pub async fn get_db_path(state: State<'_, std::sync::Arc<AppState>>) -> CommandResult<String> {
    Ok(state.db_path.to_string_lossy().to_string())
}

// ── Folder commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_folders(
    state: State<'_, std::sync::Arc<AppState>>,
) -> CommandResult<Vec<AppFolder>> {
    with_conn(state, move |conn| folder_service::list_folders(conn)).await
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, std::sync::Arc<AppState>>,
    name: String,
) -> CommandResult<AppFolder> {
    with_conn(state, move |conn| folder_service::create_folder(conn, &name)).await
}

#[tauri::command]
pub async fn rename_folder(
    state: State<'_, std::sync::Arc<AppState>>,
    id: String,
    name: String,
) -> CommandResult<AppFolder> {
    with_conn(state, move |conn| folder_service::rename_folder(conn, &id, &name)).await
}

#[tauri::command]
pub async fn delete_folder(
    state: State<'_, std::sync::Arc<AppState>>,
    id: String,
) -> CommandResult<()> {
    with_conn(state, move |conn| folder_service::delete_folder(conn, &id)).await
}

#[tauri::command]
pub async fn move_table_to_folder(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    folder_id: Option<String>,
) -> CommandResult<()> {
    with_conn(state, move |conn| {
        folder_service::move_table_to_folder(conn, &table_id, folder_id.as_deref())
    }).await
}

#[tauri::command]
pub async fn reorder_folders(
    state: State<'_, std::sync::Arc<AppState>>,
    folder_ids: Vec<String>,
) -> CommandResult<()> {
    with_conn(state, move |conn| folder_service::reorder_folders(conn, &folder_ids)).await
}

// ── Record detail window ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_record_detail(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
) -> CommandResult<RecordDetailPayload> {
    with_conn(state, move |conn| {
        let table = metadata_service::get_table(conn, &table_id)?;
        let fields = metadata_service::list_fields(conn, &table_id)?;
        let all_options = field_option_service::list_all_options_for_table(conn, &table_id)?;
        let record = record_service::get_record(conn, &table_id, &record_id)?;

        // Group options by field_id
        let mut field_options: std::collections::HashMap<String, Vec<FieldOption>> =
            std::collections::HashMap::new();
        for opt in all_options {
            field_options.entry(opt.field_id.clone()).or_default().push(opt);
        }

        Ok(RecordDetailPayload {
            table,
            fields,
            field_options,
            record,
        })
    }).await
}

// ── Record Note commands ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_record_notes(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
) -> CommandResult<Vec<RecordNote>> {
    with_conn(state, move |conn| {
        note_service::list_notes(conn, &table_id, &record_id)
    }).await
}

#[tauri::command]
pub async fn create_record_note(
    state: State<'_, std::sync::Arc<AppState>>,
    table_id: String,
    record_id: String,
    body: String,
) -> CommandResult<RecordNote> {
    with_conn(state, move |conn| {
        note_service::create_note(conn, &table_id, &record_id, &body)
    }).await
}

#[tauri::command]
pub async fn delete_record_note(
    state: State<'_, std::sync::Arc<AppState>>,
    note_id: String,
) -> CommandResult<()> {
    with_conn(state, move |conn| {
        note_service::delete_note(conn, &note_id)
    }).await
}
