//! Lokální HTTP API server pro Figma plugin.
//!
//! Běží na 127.0.0.1:17842 a poskytuje REST endpointy kompatibilní
//! s tím, co Figma plugin očekává (stejný kontrakt jako Flexi API).
//!
//! Endpointy:
//!   GET  /api/uxlog_projects           – seznam projektů
//!   GET  /api/uxlog_{entityType}       – seznam entit daného typu
//!   PUT  /api/uxlog_{entityType}/{id}  – úprava existující entity: poslaná pole se sloučí
//!                                        do uloženého záznamu (ostatní pole zůstanou)
//!   GET  /api/uxlog_checksum           – kontrolní součty kolekcí
//!
//! Veškerá data čte/zapisuje ze stejné SQLite repository jako WebView.
//! Server naslouchá jen na 127.0.0.1.
//!
//! Zabezpečení (každý požadavek kromě preflightu OPTIONS):
//!   - hlavička `Host` musí být 127.0.0.1:PORT nebo localhost:PORT (ochrana proti DNS rebindingu),
//!   - `Authorization: Bearer <klíč>` musí odpovídat jednomu z API klíčů vytvořených v aplikaci
//!     (Konektory → Lokální API). Ukládá se jen SHA-256 otisk klíče (`uxlog_local_api_keys`,
//!     formát viz `src/lib/localApiKeys.js`). Bez klíčů API nepustí nikoho.

use crate::repository;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::{Mutex, OnceLock};
use std::thread;
use tauri::{AppHandle, Emitter};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

pub const PORT: u16 = 17842;
const LISTEN_ADDR: &str = "127.0.0.1:17842";

/// Uložený klíč s otisky API klíčů (zapisuje ho jen WebView).
const API_KEYS_STORAGE_KEY: &str = "uxlog_local_api_keys";

/// Čas posledního použití klíčů (id → ms epoch); jen v paměti, po restartu se začíná znovu.
static KEY_USAGE: OnceLock<Mutex<HashMap<String, i64>>> = OnceLock::new();

fn key_usage() -> &'static Mutex<HashMap<String, i64>> {
    KEY_USAGE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Kopie času posledního použití klíčů (pro obrazovku Konektory).
pub fn key_usage_snapshot() -> HashMap<String, i64> {
    key_usage().lock().map(|m| m.clone()).unwrap_or_default()
}

/// Je hlavička Host jedna z povolených adres serveru?
fn is_allowed_host(host: Option<&str>) -> bool {
    let Some(host) = host else { return false };
    let host = host.trim().to_ascii_lowercase();
    host == format!("127.0.0.1:{PORT}") || host == format!("localhost:{PORT}")
}

/// Token z hlavičky `Authorization: Bearer <token>`.
fn bearer_token(header: Option<&str>) -> Option<&str> {
    let value = header?.trim();
    let (scheme, token) = value.split_once(' ')?;
    if !scheme.eq_ignore_ascii_case("bearer") {
        return None;
    }
    let token = token.trim();
    (!token.is_empty()).then_some(token)
}

/// SHA-256 otisk tokenu jako hex (stejně jako `crypto.subtle` ve WebView).
fn sha256_hex(token: &str) -> String {
    Sha256::digest(token.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

/// Porovnání v konstantním čase (délka se neskrývá – otisky mají pevnou délku).
fn constant_time_eq(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// Id klíče, jehož otisk odpovídá tokenu (uložená data poškozená nebo bez klíčů = None).
fn authorized_key_id(token: &str, keys_json: Option<&str>) -> Option<String> {
    let data: serde_json::Value = serde_json::from_str(keys_json?).ok()?;
    let hash = sha256_hex(token);
    let mut found = None;
    for key in data.get("keys")?.as_array()? {
        let (Some(id), Some(stored)) = (
            key.get("id").and_then(|v| v.as_str()),
            key.get("hash").and_then(|v| v.as_str()),
        ) else {
            continue;
        };
        // Projde všechny klíče bez předčasného konce
        if constant_time_eq(&stored.to_ascii_lowercase(), &hash) && found.is_none() {
            found = Some(id.to_string());
        }
    }
    found
}

/// Hodnota hlavičky požadavku (bez ohledu na velikost písmen v názvu).
fn header_value<'a>(request: &'a Request, name: &str) -> Option<&'a str> {
    request
        .headers()
        .iter()
        .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case(name))
        .map(|h| h.value.as_str())
}

/// Ověří klíč požadavku; při úspěchu zaznamená čas použití.
fn authorize(request: &Request) -> bool {
    let Some(token) = bearer_token(header_value(request, "Authorization")) else {
        return false;
    };
    let stored = repository::load_key_value(API_KEYS_STORAGE_KEY).ok().flatten();
    let Some(id) = authorized_key_id(token, stored.as_deref()) else {
        return false;
    };
    if let Ok(mut usage) = key_usage().lock() {
        usage.insert(id, chrono::Utc::now().timestamp_millis());
    }
    true
}

/// Payload události oznamující změnu zrcadleného storage klíče.
#[derive(Clone, Serialize)]
struct StorageUpdatedEvent<'a> {
    key: &'a str,
}

/// Spustí HTTP server na pozadí. Vrací JoinHandle (volající ho nemusí joinovat).
pub fn start_server(app_handle: AppHandle) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let server = match Server::http(LISTEN_ADDR) {
            Ok(s) => {
                println!("[UXLog HTTP] Server naslouchá na http://{LISTEN_ADDR}");
                s
            }
            Err(e) => {
                eprintln!("[UXLog HTTP] Nelze spustit server: {e}");
                return;
            }
        };

        for mut request in server.incoming_requests() {
            let response = handle_request(&mut request, &app_handle);
            let _ = request.respond(response);
        }
    })
}

/// Zpracuje HTTP požadavek a vrátí odpověď.
fn handle_request(
    request: &mut Request,
    app_handle: &AppHandle,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if !is_allowed_host(header_value(request, "Host")) {
        return cors_response(StatusCode(403), r#"{"error":"Forbidden host"}"#);
    }
    // Preflight prohlížeče hlavičku Authorization neposílá
    if request.method() == &Method::Options {
        return cors_response(StatusCode(204), "");
    }
    if !authorize(request) {
        return cors_response(StatusCode(401), r#"{"error":"Unauthorized"}"#);
    }

    let url = request.url().to_string();
    let method = request.method().clone();

    let path = url.split('?').next().unwrap_or(&url);

    match (&method, path) {
        (Method::Get, "/api/uxlog_checksum") => handle_checksum(),
        (Method::Get, p) if p.starts_with("/api/uxlog_") => handle_get_collection(&url),
        (Method::Put, p) if p.starts_with("/api/uxlog_") => {
            handle_put_entity(request, p, app_handle)
        }
        _ => cors_response(StatusCode(404), r#"{"error":"Not found"}"#),
    }
}

/// GET /api/uxlog_{entityType} – vrátí pole entit pro danou kolekci.
fn handle_get_collection(url: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let path = url.split('?').next().unwrap_or(url);
    let collection_name = path.trim_start_matches("/api/uxlog_");
    let since = parse_since_param(url).unwrap_or(0);

    if collection_name.contains('/') {
        let base = collection_name.split('/').next().unwrap_or("");
        return handle_get_single_entity(base, collection_name);
    }

    if !repository::is_supported_collection(collection_name) {
        return cors_response(StatusCode(404), r#"{"error":"Unknown collection"}"#);
    }

    let entities = match repository::get_collection_entities(collection_name) {
        Ok(records) => serde_json::Value::Array(records),
        Err(err) => return server_error_response(&err),
    };

    let body = if since > 0 {
        let filtered = entities
            .as_array()
            .map(|records| {
                records
                    .iter()
                    .filter(|record| repository::record_change_ts(record) > since)
                    .cloned()
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        serde_json::to_string(&serde_json::json!({
            "records": filtered,
            "deleted": [],
        }))
        .unwrap_or_else(|_| r#"{"records":[],"deleted":[]}"#.to_string())
    } else {
        serde_json::to_string(&entities).unwrap_or_else(|_| "[]".to_string())
    };
    cors_response(StatusCode(200), &body)
}

/// GET /api/uxlog_{entityType}/{id} – vrátí jednu entitu.
fn handle_get_single_entity(
    collection: &str,
    full_path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let id = full_path
        .strip_prefix(collection)
        .and_then(|s| s.strip_prefix('/'))
        .unwrap_or("");
    if id.is_empty() {
        return cors_response(StatusCode(400), r#"{"error":"Missing id"}"#);
    }

    match repository::get_entity(collection, id) {
        Ok(Some(entity)) => {
            let body = serde_json::to_string(&entity).unwrap_or_else(|_| "null".to_string());
            cors_response(StatusCode(200), &body)
        }
        Ok(None) => cors_response(StatusCode(404), r#"{"error":"Entity not found"}"#),
        Err(err) => server_error_response(&err),
    }
}

/// PUT /api/uxlog_{entityType}/{id} – aktualizuje entitu a uloží zpět.
fn handle_put_entity(
    request: &mut Request,
    path: &str,
    app_handle: &AppHandle,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let trimmed = path.trim_start_matches("/api/uxlog_");
    let parts: Vec<&str> = trimmed.splitn(2, '/').collect();
    if parts.len() < 2 || parts[1].is_empty() {
        return cors_response(StatusCode(400), r#"{"error":"Missing entity id"}"#);
    }
    let collection = parts[0];
    let put_id = parts[1];

    if !repository::is_supported_collection(collection) {
        return cors_response(StatusCode(404), r#"{"error":"Unknown collection"}"#);
    }

    let mut body_bytes = Vec::new();
    if std::io::Read::read_to_end(&mut request.as_reader(), &mut body_bytes).is_err() {
        return cors_response(StatusCode(400), r#"{"error":"Cannot read body"}"#);
    }

    let incoming: serde_json::Value = match serde_json::from_slice(&body_bytes) {
        Ok(v) => v,
        Err(_) => return cors_response(StatusCode(400), r#"{"error":"Invalid JSON"}"#),
    };

    if !incoming.is_object() {
        return cors_response(
            StatusCode(400),
            r#"{"error":"Entity body must be an object"}"#,
        );
    }
    let uxlog_id = put_id;

    // Jen úprava existujícího záznamu; poslaná pole se sloučí do uloženého
    let existing = match repository::get_entity(collection, uxlog_id) {
        Ok(Some(existing)) => existing,
        Ok(None) => return cors_response(StatusCode(404), r#"{"error":"Entity not found"}"#),
        Err(err) => return server_error_response(&err),
    };
    let record = merge_record(&existing, &incoming);

    if let Err(err) = repository::upsert_entity(collection, uxlog_id, &record) {
        return server_error_response(&err);
    }
    // WebView si vyzvedne jen poslaná pole a sloučí je do svého aktuálního záznamu
    // (celý záznam z databáze by mohl vrátit úpravu, jejíž uložení z WebView ještě běží)
    crate::external_changes::record(collection, record_patch(uxlog_id, &incoming));
    emit_storage_updated(app_handle, "uxlog_data");
    cors_response(StatusCode(200), r#"{"ok":true}"#)
}

/// Pole, která zápis přes API nesmí změnit (identita a příslušnost k projektu) nebo se neukládají.
const PROTECTED_FIELDS: &[&str] = &["id", "projectId", "createdAt", "_uxlog_id", "_ts"];

/// Sloučí poslaná pole do uloženého záznamu (mělce: pole na nejvyšší úrovni se nahradí celá).
/// Chráněná pole zůstanou z uloženého záznamu; zastaralá pole starší synchronizace se zahodí.
fn merge_record(existing: &serde_json::Value, incoming: &serde_json::Value) -> serde_json::Value {
    let mut merged = existing.as_object().cloned().unwrap_or_default();
    if let Some(fields) = incoming.as_object() {
        for (key, value) in fields {
            if !PROTECTED_FIELDS.contains(&key.as_str()) {
                merged.insert(key.clone(), value.clone());
            }
        }
    }
    merged.remove("_uxlog_id");
    merged.remove("_ts");
    serde_json::Value::Object(merged)
}

/// Změna pro WebView: id záznamu a poslaná pole bez chráněných.
fn record_patch(id: &str, incoming: &serde_json::Value) -> serde_json::Value {
    let mut patch = serde_json::Map::new();
    if let Some(fields) = incoming.as_object() {
        for (key, value) in fields {
            if !PROTECTED_FIELDS.contains(&key.as_str()) {
                patch.insert(key.clone(), value.clone());
            }
        }
    }
    patch.insert("id".to_string(), serde_json::Value::String(id.to_string()));
    serde_json::Value::Object(patch)
}

/// GET /api/uxlog_checksum – checksum per kolekce podle skutečného obsahu.
fn handle_checksum() -> Response<std::io::Cursor<Vec<u8>>> {
    let mut checksums = serde_json::Map::new();
    for col in repository::ENTITY_COLLECTIONS {
        let records = match repository::get_collection_entities(col) {
            Ok(records) => records,
            Err(err) => return server_error_response(&err),
        };
        let checksum = checksum_records(&records);
        checksums.insert(col.to_string(), serde_json::Value::String(checksum));
    }
    let body = serde_json::to_string(&checksums).unwrap_or_else(|_| "{}".to_string());
    cors_response(StatusCode(200), &body)
}

/// Načte číselný query parametr since z URL, pokud je přítomen.
fn parse_since_param(url: &str) -> Option<i64> {
    let query = url.split_once('?')?.1;
    for pair in query.split('&') {
        let (key, value) = pair.split_once('=')?;
        if key == "since" {
            return value.parse::<i64>().ok();
        }
    }
    None
}

/// Spočítá deterministický checksum seznamu záznamů.
fn checksum_records(records: &[serde_json::Value]) -> String {
    let mut ordered = records.to_vec();
    ordered.sort_by_key(|record| {
        record
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string()
    });
    let serialized = serde_json::to_string(&ordered).unwrap_or_else(|_| "[]".to_string());
    let mut hasher = DefaultHasher::new();
    serialized.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

/// Vytvoří JSON odpověď 500 pro interní chyby repository vrstvy.
fn server_error_response(message: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = serde_json::json!({ "error": message }).to_string();
    cors_response(StatusCode(500), &body)
}

/// Pošle do Tauri WebView událost o externí změně storage.
fn emit_storage_updated(app_handle: &AppHandle, key: &str) {
    let payload = StorageUpdatedEvent { key };
    if let Err(err) = app_handle.emit("uxlog-storage-updated", payload) {
        eprintln!("[UXLog HTTP] Nelze emitovat uxlog-storage-updated: {err}");
    }
}

/// Vytvoří HTTP odpověď s CORS hlavičkami (Figma plugin potřebuje Access-Control-Allow-Origin).
fn cors_response(status: StatusCode, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let data = body.as_bytes().to_vec();
    let cursor = std::io::Cursor::new(data.clone());
    let mut resp = Response::new(status, vec![], cursor, Some(data.len()), None);
    resp.add_header(Header::from_bytes("Content-Type", "application/json; charset=utf-8").unwrap());
    resp.add_header(Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap());
    resp.add_header(
        Header::from_bytes(
            "Access-Control-Allow-Methods",
            "GET, PUT, OPTIONS",
        )
        .unwrap(),
    );
    resp.add_header(
        Header::from_bytes(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type",
        )
        .unwrap(),
    );
    resp.add_header(
        Header::from_bytes("Cache-Control", "no-store, no-cache, must-revalidate").unwrap(),
    );
    resp.add_header(Header::from_bytes("Access-Control-Max-Age", "86400").unwrap());
    resp
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOKEN: &str = "uxlog_0123456789abcdef";

    fn keys_json(hash: &str) -> String {
        serde_json::json!({ "keys": [
            { "id": "other", "hash": "0".repeat(64) },
            { "id": "k1", "hash": hash },
        ] })
        .to_string()
    }

    #[test]
    fn host_must_be_local_server_address() {
        assert!(is_allowed_host(Some("127.0.0.1:17842")));
        assert!(is_allowed_host(Some("LOCALHOST:17842")));
        assert!(!is_allowed_host(Some("evil.example:17842")));
        assert!(!is_allowed_host(Some("127.0.0.1")));
        assert!(!is_allowed_host(Some("127.0.0.1:80")));
        assert!(!is_allowed_host(None));
    }

    #[test]
    fn bearer_token_parsing() {
        assert_eq!(bearer_token(Some("Bearer abc")), Some("abc"));
        assert_eq!(bearer_token(Some("bearer   abc ")), Some("abc"));
        assert_eq!(bearer_token(Some("Basic abc")), None);
        assert_eq!(bearer_token(Some("Bearer ")), None);
        assert_eq!(bearer_token(Some("abc")), None);
        assert_eq!(bearer_token(None), None);
    }

    #[test]
    fn sha256_matches_known_vector() {
        assert_eq!(
            sha256_hex("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn authorizes_only_matching_key() {
        let json = keys_json(&sha256_hex(TOKEN));
        assert_eq!(authorized_key_id(TOKEN, Some(&json)), Some("k1".to_string()));
        assert_eq!(authorized_key_id("uxlog_wrong", Some(&json)), None);
        // Velká písmena v uloženém otisku nevadí
        let upper = keys_json(&sha256_hex(TOKEN).to_uppercase());
        assert_eq!(authorized_key_id(TOKEN, Some(&upper)), Some("k1".to_string()));
    }

    #[test]
    fn merge_keeps_other_fields_and_protects_identity() {
        let existing = serde_json::json!({
            "id": "g1", "projectId": "p1", "createdAt": "2026-01-01",
            "name": "Starý", "description": "Popis z aplikace", "customFields": { "a": 1 }
        });
        let incoming = serde_json::json!({
            "name": "Z Figmy", "id": "jiny", "projectId": "p9", "createdAt": "x",
            "_uxlog_id": "g1", "_ts": 5
        });
        let merged = merge_record(&existing, &incoming);
        assert_eq!(merged["name"], "Z Figmy");
        assert_eq!(merged["description"], "Popis z aplikace");
        assert_eq!(merged["customFields"]["a"], 1);
        assert_eq!(merged["id"], "g1");
        assert_eq!(merged["projectId"], "p1");
        assert_eq!(merged["createdAt"], "2026-01-01");
        assert!(merged.get("_uxlog_id").is_none());
        assert!(merged.get("_ts").is_none());
    }

    #[test]
    fn patch_contains_only_sent_fields_and_id() {
        let patch = record_patch("g1", &serde_json::json!({ "name": "X", "projectId": "p9", "_ts": 1 }));
        assert_eq!(patch, serde_json::json!({ "id": "g1", "name": "X" }));
    }

    #[test]
    fn no_or_corrupt_keys_deny_everyone() {
        assert_eq!(authorized_key_id(TOKEN, None), None);
        assert_eq!(authorized_key_id(TOKEN, Some("{nope")), None);
        assert_eq!(authorized_key_id(TOKEN, Some(r#"{"keys":[]}"#)), None);
        assert_eq!(authorized_key_id(TOKEN, Some(r#"{"keys":[{"hash":"x"}]}"#)), None);
    }
}
