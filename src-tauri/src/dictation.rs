//! Diktování přes službu Recognita – WebSocket klient pro živý přepis.
//!
//! Spojení drží Rust, protože WebSocket v prohlížeči neumí poslat hlavičku `Authorization`
//! a API klíč nemá být v kódu WebView vidět v URL. WebView posílá zvuk (PCM s16le 16 kHz mono,
//! base64) přes `dictation_audio`, zprávy serveru dostává beze změny v události `uxlog-dictation`.
//! Výklad zpráv, časové limity a stav diktování řeší čistá logika v `src/lib/dictation.js`.
//!
//! Spolehlivost: připojení má časový limit, každých 5 s se posílá ping (pong = událost `alive`,
//! podle ní WebView pozná pomalý nebo ztracený server), každá chyba spojení končí událostí `error`
//! s kódem a sezení se uvolní. Najednou běží nejvýš jedno sezení – nové staré ukončí.

use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::tungstenite::Error as WsError;

const EVENT: &str = "uxlog-dictation";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const PING_INTERVAL: Duration = Duration::from_secs(5);

enum Command {
    Audio(Vec<u8>),
    End,
    Abort,
}

struct Session {
    id: u64,
    tx: mpsc::UnboundedSender<Command>,
}

static SESSION: Mutex<Option<Session>> = Mutex::new(None);
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

/// Událost pro WebView. `kind`: message (data = JSON zpráva serveru), alive (pong),
/// error (code = kód chyby), closed (closeCode = kód zavření spojení, může chybět).
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DictationEvent {
    session: u64,
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    close_code: Option<u16>,
}

fn emit(app: &AppHandle, session: u64, kind: &'static str, data: Option<String>, code: Option<&'static str>, close_code: Option<u16>) {
    if let Err(err) = app.emit(EVENT, DictationEvent { session, kind, data, code, close_code }) {
        eprintln!("[UXLog Dictation] Nelze emitovat {EVENT}: {err}");
    }
}

/// Přiřadí chybě navazování spojení kód, kterému rozumí WebView.
fn classify_connect_error(err: &WsError) -> &'static str {
    match err {
        WsError::Http(response) => match response.status().as_u16() {
            401 | 403 => "unauthorized",
            409 => "busy",
            404 => "notFound",
            _ => "server",
        },
        WsError::Url(_) => "invalidUrl",
        _ => "unreachable",
    }
}

fn send_command(session: u64, command: Command) -> Result<(), String> {
    let guard = SESSION.lock().map_err(|_| "Zámek diktování je poškozený".to_string())?;
    match guard.as_ref() {
        Some(s) if s.id == session => s.tx.send(command).map_err(|_| "Diktování už skončilo".to_string()),
        _ => Err("Diktování už skončilo".to_string()),
    }
}

fn release(session: u64) {
    if let Ok(mut guard) = SESSION.lock() {
        if guard.as_ref().map(|s| s.id) == Some(session) {
            *guard = None;
        }
    }
}

/// Zahájí sezení: připojí se k `url` (ws/wss včetně parametrů) s API klíčem v hlavičce.
/// Vrací id sezení; výsledek připojení přijde jako událost.
pub fn start(app: AppHandle, url: String, api_key: String) -> Result<u64, String> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("wss://") || trimmed.starts_with("ws://")) {
        return Err("invalidUrl".into());
    }
    let mut request = trimmed.into_client_request().map_err(|_| "invalidUrl".to_string())?;
    let auth = HeaderValue::from_str(&format!("Bearer {}", api_key.trim())).map_err(|_| "invalidKey".to_string())?;
    request.headers_mut().insert("Authorization", auth);

    let id = NEXT_ID.fetch_add(1, Ordering::SeqCst);
    let (tx, rx) = mpsc::unbounded_channel();
    {
        let mut guard = SESSION.lock().map_err(|_| "Zámek diktování je poškozený".to_string())?;
        if let Some(old) = guard.take() {
            let _ = old.tx.send(Command::Abort);
        }
        *guard = Some(Session { id, tx });
    }
    tauri::async_runtime::spawn(run(app, id, request, rx));
    Ok(id)
}

pub fn audio(session: u64, bytes: Vec<u8>) -> Result<(), String> {
    send_command(session, Command::Audio(bytes))
}

pub fn stop(session: u64) -> Result<(), String> {
    send_command(session, Command::End)
}

pub fn abort(session: u64) {
    let _ = send_command(session, Command::Abort);
    release(session);
}

async fn run(
    app: AppHandle,
    id: u64,
    request: tokio_tungstenite::tungstenite::handshake::client::Request,
    mut rx: mpsc::UnboundedReceiver<Command>,
) {
    let connected = tokio::time::timeout(CONNECT_TIMEOUT, tokio_tungstenite::connect_async(request)).await;
    let ws = match connected {
        Err(_) => {
            emit(&app, id, "error", None, Some("timeout"), None);
            release(id);
            return;
        }
        Ok(Err(err)) => {
            emit(&app, id, "error", None, Some(classify_connect_error(&err)), None);
            release(id);
            return;
        }
        Ok(Ok((ws, _response))) => ws,
    };

    let (mut sink, mut stream) = ws.split();
    let mut ping = tokio::time::interval(PING_INTERVAL);
    ping.tick().await; // první tick je okamžitý
    let mut ended = false;

    loop {
        tokio::select! {
            command = rx.recv() => match command {
                Some(Command::Audio(bytes)) => {
                    if ended { continue; }
                    if sink.send(Message::binary(bytes)).await.is_err() {
                        emit(&app, id, "error", None, Some("connectionLost"), None);
                        break;
                    }
                }
                Some(Command::End) => {
                    if ended { continue; }
                    ended = true;
                    if sink.send(Message::text(String::from("{\"type\":\"end\"}"))).await.is_err() {
                        emit(&app, id, "error", None, Some("connectionLost"), None);
                        break;
                    }
                }
                Some(Command::Abort) | None => {
                    let _ = sink.send(Message::Close(None)).await;
                    break;
                }
            },
            message = stream.next() => match message {
                Some(Ok(Message::Text(text))) => emit(&app, id, "message", Some(text.as_str().to_string()), None, None),
                Some(Ok(Message::Pong(_))) => emit(&app, id, "alive", None, None, None),
                Some(Ok(Message::Close(frame))) => {
                    emit(&app, id, "closed", None, None, frame.map(|f| u16::from(f.code)));
                    break;
                }
                Some(Ok(_)) => {}
                Some(Err(_)) => {
                    emit(&app, id, "error", None, Some("connectionLost"), None);
                    break;
                }
                None => {
                    emit(&app, id, "closed", None, None, None);
                    break;
                }
            },
            _ = ping.tick() => {
                if sink.send(Message::Ping(Default::default())).await.is_err() {
                    emit(&app, id, "error", None, Some("connectionLost"), None);
                    break;
                }
            }
        }
    }
    release(id);
}
