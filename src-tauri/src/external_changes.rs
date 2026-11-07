//! Záznam změn dat, které přišly mimo WebView (lokální HTTP API).
//!
//! Každá změna dostane pořadové číslo (revizi) a nese celý zapsaný záznam. WebView se ptá
//! „co je nového od revize N“ a změněné záznamy sloučí do svého stavu – nemusí načítat
//! a porovnávat celou databázi a záznam se neztratí, ani když ho mezitím v databázi přepíše
//! uložení z WebView (to ukládá celý stav). Jen v paměti: po restartu WebView načte databázi celou.

use serde::Serialize;
use serde_json::Value;
use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};

/// Kolik posledních změn se drží; starší revize vedou k úplnému načtení (`reset`).
const MAX_CHANGES: usize = 1000;

/// Jedna změna záznamu.
#[derive(Clone, Serialize, Debug, PartialEq)]
pub struct ExternalChange {
    pub revision: u64,
    pub collection: String,
    pub record: Value,
}

/// Odpověď pro WebView.
#[derive(Serialize, Debug, PartialEq)]
pub struct ExternalChanges {
    /// Nejnovější revize (WebView si ji uloží pro další dotaz).
    pub revision: u64,
    /// Změny novější než dotazovaná revize, v pořadí, jak přišly.
    pub changes: Vec<ExternalChange>,
    /// Požadované změny už nejsou v paměti – WebView musí načíst databázi celou.
    pub reset: bool,
}

/// Log změn (čistá datová struktura, testovatelná bez globálního stavu).
#[derive(Default)]
pub struct ChangeLog {
    revision: u64,
    changes: VecDeque<ExternalChange>,
}

impl ChangeLog {
    /// Zaznamená změnu a vrátí její revizi.
    pub fn record(&mut self, collection: &str, record: Value) -> u64 {
        self.revision += 1;
        self.changes.push_back(ExternalChange {
            revision: self.revision,
            collection: collection.to_string(),
            record,
        });
        while self.changes.len() > MAX_CHANGES {
            self.changes.pop_front();
        }
        self.revision
    }

    /// Změny novější než `since`.
    pub fn since(&self, since: u64) -> ExternalChanges {
        // Dotaz z budoucnosti (WebView přežil restart backendu) i vypadlé změny = načíst vše
        let oldest_kept = self.changes.front().map(|c| c.revision).unwrap_or(self.revision + 1);
        let missing = since < self.revision && since + 1 < oldest_kept;
        let reset = since > self.revision || missing;
        let changes = if reset {
            Vec::new()
        } else {
            self.changes.iter().filter(|c| c.revision > since).cloned().collect()
        };
        ExternalChanges { revision: self.revision, changes, reset }
    }
}

static LOG: OnceLock<Mutex<ChangeLog>> = OnceLock::new();

fn log() -> &'static Mutex<ChangeLog> {
    LOG.get_or_init(|| Mutex::new(ChangeLog::default()))
}

/// Zaznamená změnu záznamu zapsaného mimo WebView.
pub fn record(collection: &str, record: Value) -> u64 {
    log().lock().map(|mut l| l.record(collection, record)).unwrap_or(0)
}

/// Změny novější než `since`.
pub fn since(since: u64) -> ExternalChanges {
    log()
        .lock()
        .map(|l| l.since(since))
        .unwrap_or(ExternalChanges { revision: 0, changes: Vec::new(), reset: true })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn empty_log_has_nothing_new() {
        let log = ChangeLog::default();
        assert_eq!(log.since(0), ExternalChanges { revision: 0, changes: vec![], reset: false });
    }

    #[test]
    fn returns_changes_after_revision_in_order() {
        let mut log = ChangeLog::default();
        log.record("goals", json!({ "id": "g1" }));
        log.record("bugs", json!({ "id": "b1" }));
        log.record("goals", json!({ "id": "g1", "name": "x" }));
        let out = log.since(1);
        assert_eq!(out.revision, 3);
        assert!(!out.reset);
        assert_eq!(out.changes.iter().map(|c| c.revision).collect::<Vec<_>>(), vec![2, 3]);
        assert_eq!(out.changes[1].record["name"], "x");
        assert!(log.since(3).changes.is_empty());
    }

    #[test]
    fn requests_reset_when_changes_were_dropped() {
        let mut log = ChangeLog::default();
        for i in 0..(MAX_CHANGES + 5) {
            log.record("goals", json!({ "id": format!("g{i}") }));
        }
        assert!(log.since(0).reset);
        assert!(log.since(4).reset);
        // Revize 5 je poslední vypadlá – změny od 6 jsou celé k dispozici
        let out = log.since(5);
        assert!(!out.reset);
        assert_eq!(out.changes.len(), MAX_CHANGES);
    }

    #[test]
    fn requests_reset_for_revision_from_the_future() {
        let mut log = ChangeLog::default();
        log.record("goals", json!({ "id": "g1" }));
        assert!(log.since(7).reset);
    }
}
