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

/// Uloží soubor do adresáře Dokumenty/UXLog a vrátí jeho plnou cestu.
#[tauri::command]
fn save_download_file(filename: String, data_base64: String) -> Result<String, String> {
    use std::fs;

    let bytes = base64_decode(&data_base64)
        .map_err(|e| format!("Base64 decode error: {e}"))?;

    let docs = dirs::document_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from(".")));
    let dir = docs.join("UXLog");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Nelze vytvořit adresář: {e}"))?;
    }

    let safe_name: String = filename
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let path = dir.join(&safe_name);
    fs::write(&path, bytes).map_err(|e| format!("Zápis souboru selhal: {e}"))?;

    Ok(path.to_string_lossy().to_string())
}

/// Jednoduchý base64 dekodér (standard alphabet).
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: [u8; 128] = {
        let mut t = [255u8; 128];
        let mut i = 0u8;
        while i < 26 { t[(b'A' + i) as usize] = i; i += 1; }
        i = 0;
        while i < 26 { t[(b'a' + i) as usize] = 26 + i; i += 1; }
        i = 0;
        while i < 10 { t[(b'0' + i) as usize] = 52 + i; i += 1; }
        t[b'+' as usize] = 62;
        t[b'/' as usize] = 63;
        t
    };
    let input = input.trim_end_matches('=');
    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let bytes = input.as_bytes();
    let chunks = bytes.len() / 4;
    for i in 0..chunks {
        let b = |j: usize| -> Result<u8, String> {
            let c = bytes[i * 4 + j];
            if c > 127 || TABLE[c as usize] == 255 {
                return Err(format!("Invalid base64 char: {c}"));
            }
            Ok(TABLE[c as usize])
        };
        let (a, b, c, d) = (b(0)?, b(1)?, b(2)?, b(3)?);
        let n = (a as u32) << 18 | (b as u32) << 12 | (c as u32) << 6 | d as u32;
        out.push((n >> 16) as u8);
        out.push((n >> 8) as u8);
        out.push(n as u8);
    }
    let rem = bytes.len() % 4;
    if rem >= 2 {
        let start = chunks * 4;
        let b = |j: usize| -> Result<u8, String> {
            let c = bytes[start + j];
            if c > 127 || TABLE[c as usize] == 255 {
                return Err(format!("Invalid base64 char: {c}"));
            }
            Ok(TABLE[c as usize])
        };
        let a = b(0)?;
        let bv = b(1)?;
        out.push((a << 2 | bv >> 4) as u8);
        if rem >= 3 {
            let c = b(2)?;
            out.push((bv << 4 | c >> 2) as u8);
        }
    }
    Ok(out)
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
            save_download_file,
        ])
        .run(tauri::generate_context!())
        .expect("Chyba při spuštění UXLog");
}
