//! UXLog Tauri backend – Tauri commands a inicializace.

use tauri::Manager;

mod http_api;
mod repository;
mod storage;
mod vault;
mod vault_watch;

/// Uloží hodnotu do embedded storage backendu (volá WebView přes invoke).
#[tauri::command]
fn save_storage(key: String, value: String) -> Result<(), String> {
    storage::save(&key, &value)
}

/// Načte hodnotu z embedded storage backendu (volá WebView při startu).
#[tauri::command]
fn load_storage(key: String) -> Result<Option<String>, String> {
    storage::load(&key)
}

/// Vrátí seznam všech uložených storage klíčů.
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

    let bytes = base64_decode(&data_base64).map_err(|e| format!("Base64 decode error: {e}"))?;

    let docs = dirs::document_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from(".")));
    let dir = docs.join("UXLog");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Nelze vytvořit adresář: {e}"))?;
    }

    let safe_name: String = filename
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let path = dir.join(&safe_name);
    fs::write(&path, bytes).map_err(|e| format!("Zápis souboru selhal: {e}"))?;

    Ok(path.to_string_lossy().to_string())
}

/// Otevře uložený soubor ve výchozí aplikaci (reveal = false), nebo ho ukáže ve složce
/// ve správci souborů (reveal = true). Jen soubory v Dokumenty/UXLog – volá se po save_download_file.
/// Shell plugin `open` smí otevírat jen URL, proto vlastní příkaz.
#[tauri::command]
fn open_download_file(path: String, reveal: bool) -> Result<(), String> {
    use std::process::Command;

    let file = std::path::PathBuf::from(&path);
    let docs = dirs::document_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from(".")));
    let allowed = docs.join("UXLog");
    let canonical = file.canonicalize().map_err(|e| format!("Soubor nenalezen: {e}"))?;
    let allowed = allowed.canonicalize().map_err(|e| format!("Adresář nenalezen: {e}"))?;
    if !canonical.starts_with(&allowed) {
        return Err("Soubor není v adresáři exportů".into());
    }

    #[cfg(target_os = "windows")]
    let result = if reveal {
        Command::new("explorer").arg(format!("/select,{}", file.display())).spawn()
    } else {
        Command::new("explorer").arg(&file).spawn()
    };
    #[cfg(target_os = "macos")]
    let result = if reveal {
        Command::new("open").arg("-R").arg(&file).spawn()
    } else {
        Command::new("open").arg(&file).spawn()
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let result = Command::new("xdg-open")
        .arg(if reveal { file.parent().map(|p| p.to_path_buf()).unwrap_or(file.clone()) } else { file.clone() })
        .spawn();

    result.map(|_| ()).map_err(|e| format!("Nelze otevřít soubor: {e}"))
}

/// Výchozí složka vaultu (Dokumenty/UXLog/Data).
#[tauri::command]
fn vault_default_root() -> String {
    vault::default_root()
}

/// Seznam spravovaných souborů vaultu s hashi obsahu.
#[tauri::command]
fn vault_scan(root: String, layout: Option<String>) -> Result<Vec<vault::VaultFileInfo>, String> {
    vault::scan(&root, vault::Layout::parse(layout.as_deref()))
}

/// Přečte soubor vaultu (None = neexistuje).
#[tauri::command]
fn vault_read_file(root: String, path: String, layout: Option<String>) -> Result<Option<String>, String> {
    vault::read_file(&root, &path, vault::Layout::parse(layout.as_deref()))
}

/// Přečte datové soubory vaultu (projects/, .uxlog/) s obsahem – pro načtení změn do aplikace.
#[tauri::command]
fn vault_read_files(root: String, layout: Option<String>) -> Result<Vec<vault::VaultWrite>, String> {
    vault::read_data_files(&root, vault::Layout::parse(layout.as_deref()))
}

/// Zapíše a smaže soubory vaultu (atomicky po souborech).
#[tauri::command]
fn vault_apply(
    root: String,
    writes: Vec<vault::VaultWrite>,
    deletes: Vec<String>,
    layout: Option<String>,
) -> Result<vault::VaultApplyResult, String> {
    vault::apply(&root, writes, deletes, vault::Layout::parse(layout.as_deref()))
}

/// Nastaví sledované složky dat (událost uxlog-vault-changed); ostatní sledování ukončí.
#[tauri::command]
fn vault_watch(app: tauri::AppHandle, targets: Vec<vault_watch::WatchTarget>) -> Result<Vec<String>, String> {
    vault_watch::watch_all(app, targets)
}

/// Ukončí sledování všech složek dat.
#[tauri::command]
fn vault_unwatch() {
    vault_watch::unwatch()
}

/// Otevře složku vaultu ve správci souborů (vytvoří ji, pokud neexistuje).
#[tauri::command]
fn vault_open_root(root: String) -> Result<(), String> {
    use std::process::Command;

    let path = std::path::PathBuf::from(root.trim());
    if !path.is_absolute() {
        return Err("Složka dat musí být absolutní cesta".into());
    }
    std::fs::create_dir_all(&path).map_err(|e| format!("Nelze vytvořit složku: {e}"))?;

    #[cfg(target_os = "windows")]
    let result = Command::new("explorer").arg(&path).spawn();
    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(&path).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let result = Command::new("xdg-open").arg(&path).spawn();

    result.map(|_| ()).map_err(|e| format!("Nelze otevřít složku: {e}"))
}

/// Jednoduchý base64 dekodér (standard alphabet).
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: [u8; 128] = {
        let mut t = [255u8; 128];
        let mut i = 0u8;
        while i < 26 {
            t[(b'A' + i) as usize] = i;
            i += 1;
        }
        i = 0;
        while i < 26 {
            t[(b'a' + i) as usize] = 26 + i;
            i += 1;
        }
        i = 0;
        while i < 10 {
            t[(b'0' + i) as usize] = 52 + i;
            i += 1;
        }
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
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Nelze zjistit app_data_dir");

            repository::init_repository(data_dir)?;
            http_api::start_server(app.handle().clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_storage,
            load_storage,
            list_storage_keys,
            get_api_port,
            save_download_file,
            open_download_file,
            vault_default_root,
            vault_scan,
            vault_read_file,
            vault_read_files,
            vault_apply,
            vault_open_root,
            vault_watch,
            vault_unwatch,
        ])
        .run(tauri::generate_context!())
        .expect("Chyba při spuštění UXLog");
}
