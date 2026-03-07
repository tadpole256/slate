use tauri::menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu};
use tauri::Manager;

pub fn set_macos_menu(app: &tauri::App) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        let handle = app.handle();
        let app_name = &app.package_info().name;
        
        let about_meta = AboutMetadata::new()
            .authors(vec!["Anthony McCloskey".to_string()])
            .website("https://anthonymccloskey.com")
            .license("GNU General Public License v3.0")
            .comments("Free & Open Source Desktop Workspace.");
            
        let about_item = PredefinedMenuItem::about(handle, Some("About Slate"), Some(about_meta))?;
        
        // Build App Submenu
        let app_submenu = Submenu::with_items(
            handle,
            app_name,
            true,
            &[
                &about_item,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::services(handle, None)?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::hide(handle, None)?,
                &PredefinedMenuItem::hide_others(handle, None)?,
                &PredefinedMenuItem::show_all(handle, None)?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::quit(handle, None)?,
            ],
        )?;
        
        let edit_submenu = Submenu::with_id_and_items(
            handle,
            "edit",
            "Edit",
            true,
            &[
                &PredefinedMenuItem::undo(handle, None)?,
                &PredefinedMenuItem::redo(handle, None)?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::cut(handle, None)?,
                &PredefinedMenuItem::copy(handle, None)?,
                &PredefinedMenuItem::paste(handle, None)?,
                &PredefinedMenuItem::select_all(handle, None)?,
            ],
        )?;

        let window_submenu = Submenu::with_id_and_items(
            handle,
            "window",
            "Window",
            true,
            &[
                &PredefinedMenuItem::minimize(handle, None)?,
                &PredefinedMenuItem::maximize(handle, None)?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::close_window(handle, None)?,
            ],
        )?;
        
        let menu = Menu::with_items(handle, &[&app_submenu, &edit_submenu, &window_submenu])?;
        app.set_menu(menu)?;
    }
    
    Ok(())
}
