mod commands;
mod db;
mod models;
mod services;
#[cfg(test)]
mod tests;

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use tauri::Manager;

pub struct AppState {
    pub conn: Mutex<Option<Connection>>,
    pub db_path: PathBuf,
    pub attachments_dir: PathBuf,
}

fn initialize_state(
    app: &tauri::App,
) -> Result<AppState, Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;

    let db_path = app_data_dir.join("slate.db");
    let attachments_dir = app_data_dir.join("attachments");
    fs::create_dir_all(&attachments_dir)?;

    Ok(AppState {
        conn: Mutex::new(None),
        db_path,
        attachments_dir,
    })
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let state = std::sync::Arc::new(initialize_state(app)?);
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::init_app,
            commands::list_tables,
            commands::get_table_snapshot,
            commands::create_table,
            commands::rename_table,
            commands::delete_table,
            commands::create_field,
            commands::rename_field,
            commands::delete_field,
            commands::create_record,
            commands::update_record,
            commands::delete_record,
            commands::list_record_attachments,
            commands::attach_file_to_record,
            commands::delete_attachment,
            commands::open_attachment,
            commands::list_record_links,
            commands::create_record_link,
            commands::delete_record_link,
            commands::list_record_options,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Slate application");
}
