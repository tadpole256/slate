mod commands;
mod db;
mod models;
mod services;
#[cfg(test)]
mod tests;

use std::fs;
use std::sync::Mutex;

use rusqlite::Connection;
use tauri::Manager;

pub struct AppState {
    pub conn: Mutex<Connection>,
}

fn initialize_state(
    app: &tauri::App,
) -> Result<AppState, Box<dyn std::error::Error>> {
    let mut db_path = app.path().app_data_dir()?;
    fs::create_dir_all(&db_path)?;
    db_path.push("slate.db");

    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    db::init::initialize_database(&conn)?;

    Ok(AppState {
        conn: Mutex::new(conn),
    })
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let state = initialize_state(app)?;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Slate application");
}
