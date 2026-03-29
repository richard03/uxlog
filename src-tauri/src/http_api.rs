//! Lokální HTTP API server pro Figma plugin.
//!
//! Běží na 127.0.0.1:17842 a poskytuje REST endpointy kompatibilní
//! s tím, co Figma plugin očekává (stejný kontrakt jako Flexi API).
//!
//! Endpointy:
//!   GET  /api/uxlog_projects           – seznam projektů
//!   GET  /api/uxlog_{entityType}       – seznam entit daného typu
//!   PUT  /api/uxlog_{entityType}/{id}  – aktualizace entity
//!   GET  /api/uxlog_checksum           – kontrolní součty kolekcí
//!
//! Veškerá data čte/zapisuje ze stejných souborů jako WebView (storage modul).
//! Server je dostupný pouze z localhost.

use crate::storage;
use chrono::DateTime;
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::thread;
use tauri::{AppHandle, Emitter};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

const LISTEN_ADDR: &str = "127.0.0.1:17842";

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

/// Kolekce entit mapované na klíče v storage (odpovídá hlavní app).
const ENTITY_COLLECTIONS: &[&str] = &[
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

/// Zpracuje HTTP požadavek a vrátí odpověď.
fn handle_request(
    request: &mut Request,
    app_handle: &AppHandle,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if request.method() == &Method::Options {
        return cors_response(StatusCode(204), "");
    }

    let url = request.url().to_string();
    let method = request.method().clone();

    let path = url.split('?').next().unwrap_or(&url);

    match (&method, path) {
        (Method::Get, "/api/uxlog_checksum") => handle_checksum(),
        (Method::Get, p) if p.starts_with("/api/uxlog_") => handle_get_collection(&url),
        (Method::Put, p) if p.starts_with("/api/uxlog_") => handle_put_entity(request, p, app_handle),
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

    if !ENTITY_COLLECTIONS.contains(&collection_name) {
        return cors_response(StatusCode(404), r#"{"error":"Unknown collection"}"#);
    }

    let data = load_app_data();
    let entities = data
        .get(collection_name)
        .cloned()
        .unwrap_or_else(|| serde_json::Value::Array(vec![]));

    let body = if since > 0 {
        let filtered = entities
            .as_array()
            .map(|records| {
                records
                    .iter()
                    .filter(|record| record_change_ts(record) > since)
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

    let data = load_app_data();
    let entities = data
        .get(collection)
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let entity = entities.iter().find(|e| {
        e.get("id")
            .and_then(|v| v.as_str())
            .map(|s| s == id)
            .unwrap_or(false)
    });

    match entity {
        Some(e) => {
            let body = serde_json::to_string(e).unwrap_or_else(|_| "null".to_string());
            cors_response(StatusCode(200), &body)
        }
        None => cors_response(StatusCode(404), r#"{"error":"Entity not found"}"#),
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

    if !ENTITY_COLLECTIONS.contains(&collection) {
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

    let uxlog_id = incoming
        .get("_uxlog_id")
        .or_else(|| incoming.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or(put_id);

    let mut data = load_app_data();
    let arr = data
        .entry(collection)
        .or_insert_with(|| serde_json::Value::Array(vec![]));

    if let Some(entities) = arr.as_array_mut() {
        let idx = entities.iter().position(|e| {
            e.get("id")
                .and_then(|v| v.as_str())
                .map(|s| s == uxlog_id)
                .unwrap_or(false)
        });

        let mut record = incoming.clone();
        if let Some(obj) = record.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(uxlog_id.to_string()));
        }

        match idx {
            Some(i) => entities[i] = record,
            None => entities.push(record),
        }
    }

    save_app_data(&data);
    emit_storage_updated(app_handle, "uxlog_data");
    cors_response(StatusCode(200), r#"{"ok":true}"#)
}

/// GET /api/uxlog_checksum – checksum per kolekce podle skutečného obsahu.
fn handle_checksum() -> Response<std::io::Cursor<Vec<u8>>> {
    let data = load_app_data();
    let mut checksums = serde_json::Map::new();
    for col in ENTITY_COLLECTIONS {
        let records = data
            .get(*col)
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        let checksum = checksum_records(&records);
        checksums.insert(
            col.to_string(),
            serde_json::Value::String(checksum),
        );
    }
    let body = serde_json::to_string(&checksums).unwrap_or_else(|_| "{}".to_string());
    cors_response(StatusCode(200), &body)
}

/// Načte hlavní data aplikace (uxlog_data) ze storage.
fn load_app_data() -> serde_json::Map<String, serde_json::Value> {
    let raw = storage::load("uxlog_data").ok().flatten().unwrap_or_default();
    if raw.is_empty() {
        return serde_json::Map::new();
    }
    serde_json::from_str::<serde_json::Value>(&raw)
        .ok()
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default()
}

/// Uloží hlavní data aplikace do storage.
fn save_app_data(data: &serde_json::Map<String, serde_json::Value>) {
    let json = serde_json::to_string(&serde_json::Value::Object(data.clone()))
        .unwrap_or_else(|_| "{}".to_string());
    let _ = storage::save("uxlog_data", &json);
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

/// Vrátí čas poslední změny záznamu v ms epoch.
/// Použije maximum z _ts a ISO timestampů, aby zachytil změny z obou směrů.
fn record_change_ts(record: &serde_json::Value) -> i64 {
    let mut best = 0_i64;
    if let Some(ts) = record.get("_ts").and_then(|v| v.as_i64()) {
        best = best.max(ts);
    }
    if let Some(ts) = record.get("_ts").and_then(|v| v.as_u64()) {
        best = best.max(ts as i64);
    }
    if let Some(ts) = record
        .get("updatedAt")
        .or_else(|| record.get("lastWorkedAt"))
        .or_else(|| record.get("createdAt"))
        .and_then(|v| v.as_str())
        .and_then(parse_iso_timestamp_ms)
    {
        best = best.max(ts);
    }
    best
}

/// Převede ISO timestamp na ms epoch. Vrací None pro neplatné hodnoty.
fn parse_iso_timestamp_ms(value: &str) -> Option<i64> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|dt| dt.timestamp_millis())
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
    resp.add_header(
        Header::from_bytes("Content-Type", "application/json; charset=utf-8").unwrap(),
    );
    resp.add_header(Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap());
    resp.add_header(
        Header::from_bytes(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        )
        .unwrap(),
    );
    resp.add_header(
        Header::from_bytes("Access-Control-Allow-Headers", "Authorization, Content-Type")
            .unwrap(),
    );
    resp.add_header(
        Header::from_bytes("Cache-Control", "no-store, no-cache, must-revalidate")
            .unwrap(),
    );
    resp.add_header(Header::from_bytes("Access-Control-Max-Age", "86400").unwrap());
    resp
}
