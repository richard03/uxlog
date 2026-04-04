//! Kompatibilní storage facade pro frontend Tauri commands.
//!
//! Historicky šlo o souborové key-value úložiště. Nyní deleguje do
//! SQLite repository, ale zachovává stejný kontrakt `save/load/list`
//! pro WebView a ostatní části aplikace.

use crate::repository;

/// Klíč hlavního agregovaného stavu aplikace.
const APP_DATA_KEY: &str = "uxlog_data";

/// Uloží storage klíč do SQLite backendu.
pub fn save(key: &str, value: &str) -> Result<(), String> {
    if key == APP_DATA_KEY {
        repository::save_app_data_json(value)
    } else {
        repository::save_key_value(key, value)
    }
}

/// Načte storage klíč ze SQLite backendu.
pub fn load(key: &str) -> Result<Option<String>, String> {
    if key == APP_DATA_KEY {
        repository::load_app_data_json()
    } else {
        repository::load_key_value(key)
    }
}

/// Vrátí seznam všech dostupných storage klíčů.
pub fn list_keys() -> Vec<String> {
    repository::list_key_values().unwrap_or_default()
}
