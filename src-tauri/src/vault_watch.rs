//! Sledování složek dat (vault): změny souborů dat hlásí frontendu událostí
//! `uxlog-vault-changed` ({ root, paths }). Co se změnilo a jak to načíst, řeší JS (plugin vault)
//! – po události jen naplánuje kontrolu složek (s prodlevou, takže dávka změn = jedna kontrola).
//! Vlastní zápisy aplikace událost také vyvolají; kontrola je pozná podle hashe a nic neudělá.
//!
//! Sleduje se víc složek najednou: výchozí složka (`projects/`) a vlastní složky projektů
//! (celá složka, hlásí se jen soubory dat projektu – ostatní obsah, např. repozitář, se ignoruje).

use crate::vault::{self, Layout};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

/// Aktivní sledování podle klíče složky (cesta malými písmeny).
static WATCHERS: Mutex<Option<HashMap<String, RecommendedWatcher>>> = Mutex::new(None);

/// Přípona dočasných souborů atomického zápisu (vault.rs) – tyto změny se nehlásí.
const TEMP_SUFFIX: &str = ".uxlog-tmp";

/// Složka ke sledování (z JS).
#[derive(Deserialize)]
pub struct WatchTarget {
    pub root: String,
    pub layout: Option<String>,
}

/// Relativní cesty změněných souborů dat (s „/“), bez dočasných souborů a souborů mimo data.
fn relative_paths(root: &Path, paths: &[PathBuf], layout: Layout) -> Vec<String> {
    paths
        .iter()
        .filter(|p| !p.to_string_lossy().ends_with(TEMP_SUFFIX))
        .filter_map(|p| p.strip_prefix(root).ok())
        .map(|p| {
            p.components()
                .map(|c| c.as_os_str().to_string_lossy().to_string())
                .collect::<Vec<_>>()
                .join("/")
        })
        .filter(|p| match layout {
            Layout::Shared => p.starts_with("projects/"),
            // Smazání celé složky typu (např. personas/) hlásí jen složku – i to je změna dat
            Layout::Project => vault::is_project_data_path(p) || vault::PROJECT_LAYOUT_DIRS.contains(&p.as_str()),
        })
        .collect()
}

fn watch_key(root: &str) -> String {
    root.trim().replace('\\', "/").trim_end_matches('/').to_lowercase()
}

/// Začne sledovat jednu složku dat.
fn start(app: AppHandle, root: &str, layout: Layout) -> Result<RecommendedWatcher, String> {
    let root_path = PathBuf::from(root.trim());
    if !root_path.is_absolute() {
        return Err("Složka dat musí být absolutní cesta".into());
    }
    let (watched, mode) = match layout {
        Layout::Shared => (root_path.join("projects"), RecursiveMode::Recursive),
        Layout::Project => (root_path.clone(), RecursiveMode::Recursive),
    };
    std::fs::create_dir_all(&watched).map_err(|e| format!("Nelze vytvořit složku: {e}"))?;

    let callback_root = root_path.clone();
    let root_label = root.to_string();
    let mut watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
        let Ok(event) = result else { return };
        if matches!(event.kind, EventKind::Access(_)) {
            return;
        }
        let paths = relative_paths(&callback_root, &event.paths, layout);
        if paths.is_empty() {
            return;
        }
        if let Err(err) = app.emit("uxlog-vault-changed", serde_json::json!({ "root": root_label, "paths": paths })) {
            eprintln!("[UXLog Vault] Nelze emitovat uxlog-vault-changed: {err}");
        }
    })
    .map_err(|e| format!("Nelze spustit sledování složky: {e}"))?;
    watcher
        .watch(&watched, mode)
        .map_err(|e| format!("Nelze sledovat složku: {e}"))?;
    Ok(watcher)
}

/// Nastaví sledované složky: nové spustí, nepotřebné ukončí, běžící ponechá.
/// Vrací chyby jednotlivých složek (ostatní se sledují dál).
pub fn watch_all(app: AppHandle, targets: Vec<WatchTarget>) -> Result<Vec<String>, String> {
    let mut guard = WATCHERS.lock().map_err(|_| "Sledování složky je nedostupné".to_string())?;
    let current = guard.get_or_insert_with(HashMap::new);
    let mut wanted: HashMap<String, (String, Layout)> = HashMap::new();
    for t in targets {
        let layout = Layout::parse(t.layout.as_deref());
        wanted.insert(format!("{}|{:?}", watch_key(&t.root), layout), (t.root, layout));
    }
    current.retain(|key, _| wanted.contains_key(key));
    let mut errors = Vec::new();
    for (key, (root, layout)) in wanted {
        if current.contains_key(&key) {
            continue;
        }
        match start(app.clone(), &root, layout) {
            Ok(watcher) => {
                current.insert(key, watcher);
            }
            Err(err) => errors.push(format!("{root}: {err}")),
        }
    }
    Ok(errors)
}

/// Ukončí sledování všech složek dat.
pub fn unwatch() {
    if let Ok(mut slot) = WATCHERS.lock() {
        *slot = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relative_paths_skip_temp_files_and_foreign_paths() {
        let root = PathBuf::from(if cfg!(windows) { "C:\\vault" } else { "/vault" });
        let paths = vec![
            root.join("projects").join("Á").join("goals").join("g.md"),
            root.join("projects").join("A").join("g.md.uxlog-tmp"),
            PathBuf::from(if cfg!(windows) { "D:\\jinde\\x.md" } else { "/jinde/x.md" }),
        ];
        assert_eq!(relative_paths(&root, &paths, Layout::Shared), vec!["projects/Á/goals/g.md".to_string()]);
    }

    #[test]
    fn project_layout_reports_only_project_data() {
        let root = PathBuf::from(if cfg!(windows) { "C:\\repo" } else { "/repo" });
        let paths = vec![
            root.join("personas").join("PER-001-a.md"),
            root.join("project.md"),
            root.join("src").join("main.rs"),
            root.join("README.md"),
            root.join(".uxlog").join("manifest.json"),
            root.join("goals"),
        ];
        assert_eq!(
            relative_paths(&root, &paths, Layout::Project),
            vec!["personas/PER-001-a.md".to_string(), "project.md".to_string(), "goals".to_string()]
        );
    }
}
