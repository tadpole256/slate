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
use tauri::menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu};
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
            #[cfg(target_os = "macos")]
            {
                let app_name = &app.package_info().name;
                
                let about_meta = AboutMetadata {
                    version: Some(app.package_info().version.to_string()),
                    copyright: Some("Created by Anthony McCloskey\nhttps://anthonymccloskey.com\nGNU General Public License v3.0\nFree & Open Source Desktop Workspace.".to_string()),
                    ..Default::default()
                };
                    
                let about_item = PredefinedMenuItem::about(app, Some("About Slate"), Some(about_meta))?;
                
                let app_submenu = Submenu::with_items(
                    app,
                    app_name,
                    true,
                    &[
                        &about_item,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::services(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::hide(app, None)?,
                        &PredefinedMenuItem::hide_others(app, None)?,
                        &PredefinedMenuItem::show_all(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::quit(app, None)?,
                    ],
                )?;
                
                let edit_submenu = Submenu::with_id_and_items(
                    app,
                    "edit",
                    "Edit",
                    true,
                    &[
                        &PredefinedMenuItem::undo(app, None)?,
                        &PredefinedMenuItem::redo(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::cut(app, None)?,
                        &PredefinedMenuItem::copy(app, None)?,
                        &PredefinedMenuItem::paste(app, None)?,
                        &PredefinedMenuItem::select_all(app, None)?,
                    ],
                )?;

                let window_submenu = Submenu::with_id_and_items(
                    app,
                    "window",
                    "Window",
                    true,
                    &[
                        &PredefinedMenuItem::minimize(app, None)?,
                        &PredefinedMenuItem::maximize(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::close_window(app, None)?,
                    ],
                )?;
                
                let menu = Menu::with_items(app, &[&app_submenu, &edit_submenu, &window_submenu])?;
                app.set_menu(menu)?;
            }

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
