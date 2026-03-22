//! Souborové úložiště pro zrcadlení WebView localStorage.
//!
//! Každý klíč se ukládá jako samostatný soubor v datovém adresáři aplikace:
//!   <app_data_dir>/storage/<key>.json
//!
//! Data jsou čistý text (JSON string přijatý z frontendu), ne binární formát.

use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

/// Kořenový adresář pro uložená data.
static STORAGE_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Inicializuje cestu k datovému adresáři. Volat jednou při startu.
pub fn init_storage_dir(app_data_dir: PathBuf) {
    let dir = app_data_dir.join("storage");
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("Nelze vytvořit storage adresář");
    }
    let _ = STORAGE_DIR.set(dir);
}

/// Vrátí cestu k souboru pro daný klíč.
fn key_path(key: &str) -> PathBuf {
    let safe_key = key
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect::<String>();
    STORAGE_DIR
        .get()
        .expect("storage_dir neinicializován")
        .join(format!("{safe_key}.json"))
}

/// Uloží hodnotu (JSON string) do souboru.
pub fn save(key: &str, value: &str) -> Result<(), String> {
    let path = key_path(key);
    fs::write(&path, value).map_err(|e| format!("Zápis {}: {e}", path.display()))
}

/// Načte hodnotu ze souboru. Vrátí None pokud soubor neexistuje.
pub fn load(key: &str) -> Result<Option<String>, String> {
    let path = key_path(key);
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("Čtení {}: {e}", path.display()))
}

/// Vrátí seznam všech uložených klíčů.
pub fn list_keys() -> Vec<String> {
    let dir = match STORAGE_DIR.get() {
        Some(d) => d,
        None => return vec![],
    };
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };
    entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.strip_suffix(".json").map(String::from)
        })
        .collect()
}
