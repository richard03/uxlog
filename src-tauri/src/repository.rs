//! SQLite repository pro embedded storage UXLog.
//!
//! Tento modul je jediný zdroj pravdy pro:
//! - hlavní aplikační data (`uxlog_data`) rozpadlá po entitách,
//! - jednoduché key-value záznamy pro zrcadlené pomocné klíče.

use chrono::DateTime;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{Map, Value};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

/// Název SQLite souboru v adresáři aplikace.
const DB_FILENAME: &str = "uxlog.db";

/// Klíč metadat pro verzi schématu.
const SCHEMA_VERSION_KEY: &str = "schema_version";

/// Aktuální verze schématu databáze.
const SCHEMA_VERSION: &str = "1";

/// Kolekce entit ukládané v hlavním aplikačním stavu.
pub const ENTITY_COLLECTIONS: &[&str] = &[
    "projects",
    "goals",
    "stakeholders",
    "competitions",
    "hypotheses",
    "personas",
    "scenarios",
    "requirements",
    "activities",
    "teamMembers",
    "tasks",
    "bugs",
    "connections",
];

/// Kolekce, které musejí odkazovat na existující `projectId`.
const PROJECT_ENTITY_COLLECTIONS: &[&str] = &[
    "goals",
    "stakeholders",
    "competitions",
    "hypotheses",
    "personas",
    "scenarios",
    "requirements",
    "activities",
    "teamMembers",
    "tasks",
    "bugs",
    "connections",
];

/// Datový adresář pro DB a legacy import.
static STORAGE_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Inicializuje repozitář, vytvoří schéma a případně migruje legacy soubory.
pub fn init_repository(app_data_dir: PathBuf) -> Result<(), String> {
    let storage_dir = app_data_dir.join("storage");
    if !storage_dir.exists() {
        fs::create_dir_all(&storage_dir).map_err(|err| {
            format!(
                "Nelze vytvořit storage adresář {}: {err}",
                storage_dir.display()
            )
        })?;
    }
    let _ = STORAGE_DIR.set(storage_dir);

    let mut connection = open_connection()?;
    run_migrations(&connection)?;
    migrate_legacy_files_if_needed(&mut connection)?;
    Ok(())
}

/// Uloží textovou hodnotu do key-value tabulky.
pub fn save_key_value(key: &str, value: &str) -> Result<(), String> {
    let connection = open_connection()?;
    connection
        .execute(
            "INSERT INTO key_value_store (key, value, updated_at)
             VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET
               value = excluded.value,
               updated_at = CURRENT_TIMESTAMP",
            params![key, value],
        )
        .map_err(|err| format!("Nelze uložit key-value záznam {key}: {err}"))?;
    Ok(())
}

/// Načte textovou hodnotu z key-value tabulky.
pub fn load_key_value(key: &str) -> Result<Option<String>, String> {
    let connection = open_connection()?;
    connection
        .query_row(
            "SELECT value FROM key_value_store WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| format!("Nelze načíst key-value záznam {key}: {err}"))
}

/// Vrátí seznam všech uložených key-value klíčů a případně `uxlog_data`.
pub fn list_key_values() -> Result<Vec<String>, String> {
    let connection = open_connection()?;
    let mut statement = connection
        .prepare("SELECT key FROM key_value_store ORDER BY key")
        .map_err(|err| format!("Nelze připravit výpis key-value klíčů: {err}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|err| format!("Nelze číst key-value klíče: {err}"))?;

    let mut keys = Vec::new();
    for row in rows {
        keys.push(row.map_err(|err| format!("Nelze dekódovat key-value klíč: {err}"))?);
    }

    if has_any_app_data(&connection)? {
        keys.push("uxlog_data".to_string());
    }

    Ok(keys)
}

/// Uloží celý stav aplikace z JSON objektu do tabulky entit.
pub fn save_app_data_json(json: &str) -> Result<(), String> {
    let value: Value =
        serde_json::from_str(json).map_err(|err| format!("Neplatný JSON pro uxlog_data: {err}"))?;
    let data = sanitize_app_data_value(value);
    save_app_data_map(&data)
}

/// Uloží celý stav aplikace do tabulky entit.
pub fn save_app_data_map(data: &Map<String, Value>) -> Result<(), String> {
    let sanitized = sanitize_app_data_value(Value::Object(data.clone()));
    let mut connection = open_connection()?;
    let transaction = connection
        .transaction()
        .map_err(|err| format!("Nelze otevřít transakci pro uložení app state: {err}"))?;

    transaction
        .execute("DELETE FROM entity_records", [])
        .map_err(|err| format!("Nelze vymazat staré entity: {err}"))?;

    for collection in ENTITY_COLLECTIONS {
        let records = sanitized
            .get(*collection)
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        insert_collection_records(&transaction, collection, &records)?;
    }

    transaction
        .commit()
        .map_err(|err| format!("Nelze potvrdit transakci app state: {err}"))?;
    Ok(())
}

/// Načte celý stav aplikace jako JSON řetězec kompatibilní s původním blobem.
pub fn load_app_data_json() -> Result<Option<String>, String> {
    let data = load_app_data_map()?;
    if is_app_data_empty(&data) {
        return Ok(None);
    }
    serde_json::to_string(&Value::Object(data))
        .map(Some)
        .map_err(|err| format!("Nelze serializovat app state: {err}"))
}

/// Načte celý stav aplikace jako mapu kolekcí.
pub fn load_app_data_map() -> Result<Map<String, Value>, String> {
    let connection = open_connection()?;
    let mut data = empty_app_data_map();

    let mut statement = connection
        .prepare(
            "SELECT entity_type, payload_json
             FROM entity_records
             ORDER BY entity_type, rowid",
        )
        .map_err(|err| format!("Nelze připravit čtení app state: {err}"))?;
    let rows = statement
        .query_map([], |row| {
            let entity_type: String = row.get(0)?;
            let payload_json: String = row.get(1)?;
            Ok((entity_type, payload_json))
        })
        .map_err(|err| format!("Nelze číst app state: {err}"))?;

    for row in rows {
        let (entity_type, payload_json) =
            row.map_err(|err| format!("Nelze dekódovat řádek app state: {err}"))?;
        if !is_supported_collection(&entity_type) {
            continue;
        }
        let value: Value = serde_json::from_str(&payload_json)
            .map_err(|err| format!("Poškozený payload v kolekci {entity_type}: {err}"))?;
        let entry = data
            .entry(entity_type)
            .or_insert_with(|| Value::Array(Vec::new()));
        if let Some(array) = entry.as_array_mut() {
            array.push(value);
        }
    }

    Ok(sanitize_app_data_value(Value::Object(data)))
}

/// Vrátí všechny entity z vybrané kolekce.
pub fn get_collection_entities(collection: &str) -> Result<Vec<Value>, String> {
    if !is_supported_collection(collection) {
        return Err(format!("Neznámá kolekce: {collection}"));
    }
    let data = load_app_data_map()?;
    Ok(data
        .get(collection)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default())
}

/// Vrátí jednu entitu podle kolekce a id.
pub fn get_entity(collection: &str, id: &str) -> Result<Option<Value>, String> {
    if !is_supported_collection(collection) {
        return Err(format!("Neznámá kolekce: {collection}"));
    }
    let connection = open_connection()?;
    let payload = connection
        .query_row(
            "SELECT payload_json
             FROM entity_records
             WHERE entity_type = ?1 AND id = ?2",
            params![collection, id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| format!("Nelze načíst entitu {collection}/{id}: {err}"))?;

    payload
        .map(|json| serde_json::from_str::<Value>(&json))
        .transpose()
        .map_err(|err| format!("Poškozený payload entity {collection}/{id}: {err}"))
}

/// Upsertne jednu entitu přímo do tabulky bez načítání celého blobu.
pub fn upsert_entity(collection: &str, id: &str, record: &Value) -> Result<(), String> {
    if !is_supported_collection(collection) {
        return Err(format!("Neznámá kolekce: {collection}"));
    }

    let mut normalized = record.clone();
    let object = normalized
        .as_object_mut()
        .ok_or_else(|| format!("Entita {collection}/{id} musí být JSON objekt"))?;
    object.insert("id".to_string(), Value::String(id.to_string()));

    let mut connection = open_connection()?;
    let transaction = connection
        .transaction()
        .map_err(|err| format!("Nelze otevřít transakci pro upsert entity: {err}"))?;
    upsert_entity_in_transaction(&transaction, collection, &Value::Object(object.clone()))?;
    prune_orphans_in_transaction(&transaction)?;
    transaction
        .commit()
        .map_err(|err| format!("Nelze potvrdit transakci entity {collection}/{id}: {err}"))?;
    Ok(())
}

/// Vrátí true, pokud je kolekce podporovaná app modelem.
pub fn is_supported_collection(collection: &str) -> bool {
    ENTITY_COLLECTIONS.contains(&collection)
}

/// Vrátí čas poslední změny záznamu v ms epoch.
pub fn record_change_ts(record: &Value) -> i64 {
    let mut best = 0_i64;
    if let Some(ts) = record.get("_ts").and_then(Value::as_i64) {
        best = best.max(ts);
    }
    if let Some(ts) = record.get("_ts").and_then(Value::as_u64) {
        best = best.max(ts as i64);
    }
    if let Some(ts) = record
        .get("updatedAt")
        .or_else(|| record.get("lastWorkedAt"))
        .or_else(|| record.get("createdAt"))
        .and_then(Value::as_str)
        .and_then(parse_iso_timestamp_ms)
    {
        best = best.max(ts);
    }
    best
}

/// Otevře nové SQLite spojení nad datovým souborem aplikace.
fn open_connection() -> Result<Connection, String> {
    let path = database_path()?;
    let connection = Connection::open(&path)
        .map_err(|err| format!("Nelze otevřít databázi {}: {err}", path.display()))?;
    connection
        .execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = OFF;")
        .map_err(|err| format!("Nelze nastavit SQLite pragmas: {err}"))?;
    Ok(connection)
}

/// Vrátí cestu k SQLite souboru.
fn database_path() -> Result<PathBuf, String> {
    Ok(storage_dir()?.join(DB_FILENAME))
}

/// Vrátí inicializovaný storage adresář.
fn storage_dir() -> Result<&'static PathBuf, String> {
    STORAGE_DIR
        .get()
        .ok_or_else(|| "Repository není inicializován".to_string())
}

/// Vytvoří nebo aktualizuje databázové schéma.
fn run_migrations(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS app_meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS key_value_store (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS entity_records (
              entity_type TEXT NOT NULL,
              id TEXT NOT NULL,
              project_id TEXT,
              payload_json TEXT NOT NULL,
              updated_at TEXT,
              change_ts INTEGER NOT NULL DEFAULT 0,
              PRIMARY KEY (entity_type, id)
            );

            CREATE INDEX IF NOT EXISTS idx_entity_records_type
              ON entity_records (entity_type);
            CREATE INDEX IF NOT EXISTS idx_entity_records_project
              ON entity_records (project_id);
            CREATE INDEX IF NOT EXISTS idx_entity_records_change_ts
              ON entity_records (change_ts);
            ",
        )
        .map_err(|err| format!("Nelze vytvořit schéma SQLite: {err}"))?;

    connection
        .execute(
            "INSERT INTO app_meta (key, value)
             VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![SCHEMA_VERSION_KEY, SCHEMA_VERSION],
        )
        .map_err(|err| format!("Nelze uložit verzi schématu: {err}"))?;
    Ok(())
}

/// Naimportuje legacy souborové úložiště, pokud DB zatím neobsahuje žádná data.
fn migrate_legacy_files_if_needed(connection: &mut Connection) -> Result<(), String> {
    if !should_migrate_legacy(connection)? {
        return Ok(());
    }

    let legacy_entries = read_legacy_files()?;
    if legacy_entries.is_empty() {
        return Ok(());
    }

    let transaction = connection
        .transaction()
        .map_err(|err| format!("Nelze otevřít transakci pro legacy migraci: {err}"))?;

    for (key, value) in legacy_entries {
        if key == "uxlog_data" {
            let parsed: Value = serde_json::from_str(&value)
                .map_err(|err| format!("Legacy uxlog_data obsahuje neplatný JSON: {err}"))?;
            let sanitized = sanitize_app_data_value(parsed);
            for collection in ENTITY_COLLECTIONS {
                let records = sanitized
                    .get(*collection)
                    .and_then(Value::as_array)
                    .cloned()
                    .unwrap_or_default();
                insert_collection_records(&transaction, collection, &records)?;
            }
        } else {
            transaction
                .execute(
                    "INSERT INTO key_value_store (key, value, updated_at)
                     VALUES (?1, ?2, CURRENT_TIMESTAMP)
                     ON CONFLICT(key) DO UPDATE SET
                       value = excluded.value,
                       updated_at = CURRENT_TIMESTAMP",
                    params![key, value],
                )
                .map_err(|err| format!("Nelze migrovat legacy klíč {key}: {err}"))?;
        }
    }

    transaction
        .execute(
            "INSERT INTO app_meta (key, value)
             VALUES ('legacy_storage_migrated', '1')
             ON CONFLICT(key) DO UPDATE SET value = '1'",
            [],
        )
        .map_err(|err| format!("Nelze zapsat příznak legacy migrace: {err}"))?;

    transaction
        .commit()
        .map_err(|err| format!("Nelze potvrdit legacy migraci: {err}"))?;
    Ok(())
}

/// Vrátí true, pokud má smysl spustit migraci legacy souborů.
fn should_migrate_legacy(connection: &Connection) -> Result<bool, String> {
    if has_any_app_data(connection)? {
        return Ok(false);
    }

    let key_value_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM key_value_store", [], |row| row.get(0))
        .map_err(|err| format!("Nelze zjistit počet key-value záznamů: {err}"))?;
    if key_value_count > 0 {
        return Ok(false);
    }

    let migrated_flag = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'legacy_storage_migrated'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| format!("Nelze zjistit příznak legacy migrace: {err}"))?;

    Ok(migrated_flag.is_none())
}

/// Vrátí true, pokud tabulka entit obsahuje alespoň jeden záznam.
fn has_any_app_data(connection: &Connection) -> Result<bool, String> {
    let count: i64 = connection
        .query_row("SELECT COUNT(*) FROM entity_records", [], |row| row.get(0))
        .map_err(|err| format!("Nelze zjistit počet entit: {err}"))?;
    Ok(count > 0)
}

/// Načte všechny legacy `.json` soubory z původního storage adresáře.
fn read_legacy_files() -> Result<Vec<(String, String)>, String> {
    let storage_dir = storage_dir()?;
    let mut entries = Vec::new();
    let dir_entries = fs::read_dir(storage_dir).map_err(|err| {
        format!(
            "Nelze číst storage adresář {}: {err}",
            storage_dir.display()
        )
    })?;

    for entry in dir_entries {
        let entry = entry.map_err(|err| format!("Nelze číst položku storage adresáře: {err}"))?;
        let path = entry.path();
        if !path.is_file() || path.file_name().and_then(|name| name.to_str()) == Some(DB_FILENAME) {
            continue;
        }
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }

        let key = path
            .file_stem()
            .and_then(|name| name.to_str())
            .ok_or_else(|| format!("Nelze určit název legacy souboru {}", path.display()))?
            .to_string();
        let value = fs::read_to_string(&path)
            .map_err(|err| format!("Nelze načíst legacy soubor {}: {err}", path.display()))?;
        entries.push((key, value));
    }

    Ok(entries)
}

/// Vloží všechny entity z jedné kolekce do transakce.
fn insert_collection_records(
    transaction: &Transaction<'_>,
    collection: &str,
    records: &[Value],
) -> Result<(), String> {
    for record in records {
        upsert_entity_in_transaction(transaction, collection, record)?;
    }
    Ok(())
}

/// Upsertne jednu entitu uvnitř transakce.
fn upsert_entity_in_transaction(
    transaction: &Transaction<'_>,
    collection: &str,
    record: &Value,
) -> Result<(), String> {
    let id = record
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| format!("Entita v kolekci {collection} nemá platné id"))?;
    let payload_json = serde_json::to_string(record)
        .map_err(|err| format!("Nelze serializovat entitu {collection}/{id}: {err}"))?;
    let project_id = record
        .get("projectId")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let updated_at = record
        .get("updatedAt")
        .or_else(|| record.get("lastWorkedAt"))
        .or_else(|| record.get("createdAt"))
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let change_ts = record_change_ts(record);

    transaction
        .execute(
            "INSERT INTO entity_records (entity_type, id, project_id, payload_json, updated_at, change_ts)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(entity_type, id) DO UPDATE SET
               project_id = excluded.project_id,
               payload_json = excluded.payload_json,
               updated_at = excluded.updated_at,
               change_ts = excluded.change_ts",
            params![collection, id, project_id, payload_json, updated_at, change_ts],
        )
        .map_err(|err| format!("Nelze uložit entitu {collection}/{id}: {err}"))?;
    Ok(())
}

/// Odstraní sirotky, jejichž `projectId` už neukazuje na existující projekt.
fn prune_orphans_in_transaction(transaction: &Transaction<'_>) -> Result<(), String> {
    let mut statement = transaction
        .prepare("SELECT id FROM entity_records WHERE entity_type = 'projects'")
        .map_err(|err| format!("Nelze připravit čtení projektů pro prune: {err}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|err| format!("Nelze číst projekty pro prune: {err}"))?;

    let mut project_ids = HashSet::new();
    for row in rows {
        project_ids.insert(row.map_err(|err| format!("Nelze dekódovat projekt pro prune: {err}"))?);
    }

    for collection in PROJECT_ENTITY_COLLECTIONS {
        let mut statement = transaction
            .prepare(
                "SELECT id, project_id
                 FROM entity_records
                 WHERE entity_type = ?1",
            )
            .map_err(|err| format!("Nelze připravit čtení sirotků v {collection}: {err}"))?;
        let rows = statement
            .query_map(params![collection], |row| {
                let id: String = row.get(0)?;
                let project_id: Option<String> = row.get(1)?;
                Ok((id, project_id))
            })
            .map_err(|err| format!("Nelze číst entity pro prune v {collection}: {err}"))?;

        let mut orphan_ids = Vec::new();
        for row in rows {
            let (id, project_id) = row
                .map_err(|err| format!("Nelze dekódovat entitu pro prune v {collection}: {err}"))?;
            if let Some(project_id) = project_id {
                if !project_ids.contains(&project_id) {
                    orphan_ids.push(id);
                }
            }
        }

        for orphan_id in orphan_ids {
            transaction
                .execute(
                    "DELETE FROM entity_records
                     WHERE entity_type = ?1 AND id = ?2",
                    params![collection, orphan_id],
                )
                .map_err(|err| {
                    format!("Nelze odstranit sirotka {collection}/{orphan_id}: {err}")
                })?;
        }
    }

    Ok(())
}

/// Vrátí mapu se všemi kolekcemi inicializovanými na prázdná pole.
fn empty_app_data_map() -> Map<String, Value> {
    let mut data = Map::new();
    for collection in ENTITY_COLLECTIONS {
        data.insert((*collection).to_string(), Value::Array(Vec::new()));
    }
    data
}

/// Provede deduplikaci, prune a normalizaci top-level tvaru aplikačních dat.
fn sanitize_app_data_value(value: Value) -> Map<String, Value> {
    let source = value.as_object().cloned().unwrap_or_default();
    let mut data = empty_app_data_map();

    for collection in ENTITY_COLLECTIONS {
        let records = source
            .get(*collection)
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        data.insert(
            (*collection).to_string(),
            Value::Array(deduplicate_records(records)),
        );
    }

    prune_orphan_entities_map(&mut data);
    data
}

/// Odstraní duplicitní záznamy podle `id` a ponechá novější variantu.
fn deduplicate_records(records: Vec<Value>) -> Vec<Value> {
    let mut result = Vec::<Value>::new();

    for record in records {
        let Some(id) = record.get("id").and_then(Value::as_str) else {
            continue;
        };
        if let Some(existing_index) = result.iter().position(|item| {
            item.get("id")
                .and_then(Value::as_str)
                .map(|existing_id| existing_id == id)
                .unwrap_or(false)
        }) {
            if should_replace_record(&result[existing_index], &record) {
                result[existing_index] = record;
            }
        } else {
            result.push(record);
        }
    }

    result
}

/// Vrátí true, pokud má nová varianta nahradit původní záznam.
fn should_replace_record(current: &Value, candidate: &Value) -> bool {
    let current_ts = current.get("_ts").and_then(Value::as_i64).unwrap_or(0);
    let candidate_ts = candidate.get("_ts").and_then(Value::as_i64).unwrap_or(0);
    if candidate_ts != current_ts {
        return candidate_ts > current_ts;
    }

    let current_date = current
        .get("updatedAt")
        .or_else(|| current.get("lastWorkedAt"))
        .or_else(|| current.get("createdAt"))
        .and_then(Value::as_str)
        .unwrap_or("");
    let candidate_date = candidate
        .get("updatedAt")
        .or_else(|| candidate.get("lastWorkedAt"))
        .or_else(|| candidate.get("createdAt"))
        .and_then(Value::as_str)
        .unwrap_or("");

    candidate_date >= current_date
}

/// Odstraní entity, jejichž `projectId` neukazuje na existující projekt.
fn prune_orphan_entities_map(data: &mut Map<String, Value>) {
    let project_ids: HashSet<String> = data
        .get("projects")
        .and_then(Value::as_array)
        .map(|records| {
            records
                .iter()
                .filter_map(|record| record.get("id").and_then(Value::as_str))
                .map(ToString::to_string)
                .collect()
        })
        .unwrap_or_default();

    for collection in PROJECT_ENTITY_COLLECTIONS {
        let items = data
            .get(*collection)
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let filtered = items
            .into_iter()
            .filter(|record| {
                record
                    .get("projectId")
                    .and_then(Value::as_str)
                    .map(|project_id| project_ids.contains(project_id))
                    .unwrap_or(true)
            })
            .collect::<Vec<_>>();
        data.insert((*collection).to_string(), Value::Array(filtered));
    }
}

/// Vrátí true, pokud agregovaný stav neobsahuje žádné záznamy.
fn is_app_data_empty(data: &Map<String, Value>) -> bool {
    ENTITY_COLLECTIONS.iter().all(|collection| {
        data.get(*collection)
            .and_then(Value::as_array)
            .map(|records| records.is_empty())
            .unwrap_or(true)
    })
}

/// Převede ISO timestamp na ms epoch.
fn parse_iso_timestamp_ms(value: &str) -> Option<i64> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|datetime| datetime.timestamp_millis())
}

#[cfg(test)]
mod tests {
    use super::{record_change_ts, sanitize_app_data_value};
    use serde_json::json;

    /// Ověří, že sanitizace ponechá novější duplicitní záznam.
    #[test]
    fn sanitize_prefers_newer_duplicate_record() {
        let data = json!({
            "projects": [
                { "id": "p1", "name": "Projekt" }
            ],
            "tasks": [
                { "id": "t1", "projectId": "p1", "name": "Older", "_ts": 1 },
                { "id": "t1", "projectId": "p1", "name": "Newer", "_ts": 2 }
            ]
        });

        let sanitized = sanitize_app_data_value(data);
        let tasks = sanitized
            .get("tasks")
            .and_then(|value| value.as_array())
            .expect("tasks must be array");

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0]["name"], "Newer");
    }

    /// Ověří, že sanitizace odstraní sirotka bez existujícího projektu.
    #[test]
    fn sanitize_prunes_orphan_records() {
        let data = json!({
            "projects": [],
            "tasks": [
                { "id": "t1", "projectId": "missing", "name": "Task" }
            ]
        });

        let sanitized = sanitize_app_data_value(data);
        let tasks = sanitized
            .get("tasks")
            .and_then(|value| value.as_array())
            .expect("tasks must be array");

        assert!(tasks.is_empty());
    }

    /// Ověří, že `record_change_ts` vrací nejvyšší dostupnou změnovou hodnotu.
    #[test]
    fn record_change_ts_returns_max_available_value() {
        let record = json!({
            "_ts": 1_800_000_000_000_i64,
            "updatedAt": "2024-01-01T00:00:00.000Z"
        });

        assert_eq!(record_change_ts(&record), 1_800_000_000_000_i64);
    }
}
