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

/// Uloží jen změněné a smazané záznamy hlavního stavu aplikace.
pub fn save_app_data_changes(
    upserts: &[repository::RecordUpsert],
    deletes: &[repository::RecordDelete],
) -> Result<(), String> {
    repository::save_app_data_changes(upserts, deletes)
}

/// Smaže storage klíč (hlavní stav aplikace smazat nejde).
pub fn remove(key: &str) -> Result<(), String> {
    if key == APP_DATA_KEY {
        return Err("Hlavní stav aplikace nelze smazat".into());
    }
    repository::remove_key_value(key)
}

/// Načte všechny uložené klíče najednou (start aplikace – jedno volání místo jednoho na klíč).
pub fn load_all() -> Result<std::collections::HashMap<String, String>, String> {
    let mut out = std::collections::HashMap::new();
    if let Some(data) = repository::load_app_data_json()? {
        out.insert(APP_DATA_KEY.to_string(), data);
    }
    for key in repository::list_key_values()? {
        if key == APP_DATA_KEY {
            continue;
        }
        if let Some(value) = repository::load_key_value(&key)? {
            out.insert(key, value);
        }
    }
    Ok(out)
}

/// Vrátí seznam všech dostupných storage klíčů.
pub fn list_keys() -> Vec<String> {
    repository::list_key_values().unwrap_or_default()
}
