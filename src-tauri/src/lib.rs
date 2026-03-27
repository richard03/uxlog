//! UXLog Tauri backend – Tauri commands a inicializace.

use tauri::Manager;

mod http_api;
mod storage;

/// Uloží hodnotu do souboru (volá WebView přes invoke).
#[tauri::command]
fn save_storage(key: String, value: String) -> Result<(), String> {
    storage::save(&key, &value)
}

/// Načte hodnotu ze souboru (volá WebView při startu).
#[tauri::command]
fn load_storage(key: String) -> Result<Option<String>, String> {
    storage::load(&key)
}

/// Vrátí seznam všech uložených klíčů.
#[tauri::command]
fn list_storage_keys() -> Vec<String> {
    storage::list_keys()
}

/// Vrátí port, na kterém běží lokální HTTP API pro Figma plugin.
#[tauri::command]
fn get_api_port() -> u16 {
    17842
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Nelze zjistit app_data_dir");

            storage::init_storage_dir(data_dir);
            http_api::start_server(app.handle().clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_storage,
            load_storage,
            list_storage_keys,
            get_api_port,
        ])
        .run(tauri::generate_context!())
        .expect("Chyba při spuštění UXLog");
}
