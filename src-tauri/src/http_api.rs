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
use std::thread;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

const LISTEN_ADDR: &str = "127.0.0.1:17842";

/// Spustí HTTP server na pozadí. Vrací JoinHandle (volající ho nemusí joinovat).
pub fn start_server() -> thread::JoinHandle<()> {
    thread::spawn(|| {
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
            let response = handle_request(&mut request);
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
fn handle_request(request: &mut Request) -> Response<std::io::Cursor<Vec<u8>>> {
    if request.method() == &Method::Options {
        return cors_response(StatusCode(204), "");
    }

    let url = request.url().to_string();
    let method = request.method().clone();

    let path = url.split('?').next().unwrap_or(&url);

    match (&method, path) {
        (Method::Get, "/api/uxlog_checksum") => handle_checksum(),
        (Method::Get, p) if p.starts_with("/api/uxlog_") => handle_get_collection(p),
        (Method::Put, p) if p.starts_with("/api/uxlog_") => handle_put_entity(request, p),
        _ => cors_response(StatusCode(404), r#"{"error":"Not found"}"#),
    }
}

/// GET /api/uxlog_{entityType} – vrátí pole entit pro danou kolekci.
fn handle_get_collection(path: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let collection_name = path.trim_start_matches("/api/uxlog_");

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

    let body = serde_json::to_string(&entities).unwrap_or_else(|_| "[]".to_string());
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
    cors_response(StatusCode(200), r#"{"ok":true}"#)
}

/// GET /api/uxlog_checksum – jednoduchý checksum per kolekce (počet záznamů).
fn handle_checksum() -> Response<std::io::Cursor<Vec<u8>>> {
    let data = load_app_data();
    let mut checksums = serde_json::Map::new();
    for col in ENTITY_COLLECTIONS {
        let count = data
            .get(*col)
            .and_then(|v| v.as_array())
            .map(|a| a.len())
            .unwrap_or(0);
        checksums.insert(
            col.to_string(),
            serde_json::Value::String(format!("count:{count}")),
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
    resp.add_header(Header::from_bytes("Access-Control-Max-Age", "86400").unwrap());
    resp
}
