//! Vault – data UXLog jako složka souborů (.md/.yaml) pro externí nástroje (Claude Code).
//!
//! Tento modul dělá jen souborové operace. Formát souborů i rozhodnutí, co zapsat nebo smazat,
//! jsou v JS (`src/lib/vault/`). Ochrana:
//! - relativní cesty nesmí obsahovat `..`, kořen ani prefix disku,
//! - zapisovat a mazat se smí jen v `projects/`, `.uxlog/`, `.claude/` a soubor `CLAUDE.md` v kořeni,
//!   jen soubory .md/.yaml/.json/.mjs,
//! - zápis je atomický (dočasný soubor + přejmenování).
//!
//! Rozložení (`layout`): `shared` = výchozí složka (projekty v `projects/<název>/`), `project` = vlastní
//! složka jednoho projektu (`project.md`, `personas/`… přímo v kořeni). JS pracuje vždy s logickými
//! cestami `projects/<složka>/…`; v rozložení `project` je převádí na disk tento modul (stejné pravidlo
//! jako `toPhysicalPath`/`toLogicalPath` v `src/lib/vault/paths.js`). V cizí složce (např. repozitář
//! projektu) se pak sahá jen na soubory dat projektu, `.uxlog/`, `.claude/` a `CLAUDE.md`.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Component, Path, PathBuf};

/// Složky vaultu, které spravuje aplikace (čte je, zapisuje a maže v nich).
const MANAGED_DIRS: &[&str] = &["projects", ".uxlog", ".claude"];

/// Soubory v kořeni vaultu, které spravuje aplikace.
const MANAGED_ROOT_FILES: &[&str] = &["CLAUDE.md"];

/// Složky, jejichž soubory se čtou pro načtení změn do aplikace (data, ne nastavení Clauda).
const DATA_DIRS: &[&str] = &["projects", ".uxlog"];

/// Přípony souborů, které vault smí zapisovat a mazat.
const MANAGED_EXTENSIONS: &[&str] = &["md", "yaml", "json", "mjs"];

/// Přípony souborů dat (čtení pro načtení změn).
const DATA_EXTENSIONS: &[&str] = &["md", "yaml", "json"];

/// Přípona dočasného souboru při atomickém zápisu.
const TEMP_SUFFIX: &str = ".uxlog-tmp";

/// Složky typů záznamů ve vlastní složce projektu – musí odpovídat `VAULT_COLLECTIONS` (paths.js, hlídá test).
pub const PROJECT_LAYOUT_DIRS: &[&str] = &[
    "goals", "stakeholders", "competitions", "hypotheses", "personas", "scenarios",
    "requirements", "risks", "activities", "team", "tasks", "bugs", "sources",
];

/// Soubory dat v kořeni vlastní složky projektu.
pub const PROJECT_LAYOUT_ROOT_FILES: &[&str] = &["project.md", "connections.yaml", "INDEX.md"];

/// Logická předpona souborů projektu ve vlastní složce projektu (`PROJECT_LAYOUT_PREFIX` v paths.js).
const PROJECT_LAYOUT_PREFIX: &str = "projects/__project__/";

/// Složky metadat a nastavení Clauda (v obou rozloženích stejné).
const META_DIRS: &[&str] = &[".uxlog", ".claude"];

/// Rozložení složky dat.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Layout {
    Shared,
    Project,
}

impl Layout {
    /// Z hodnoty z JS (neznámá nebo chybějící = výchozí složka).
    pub fn parse(value: Option<&str>) -> Layout {
        match value {
            Some("project") => Layout::Project,
            _ => Layout::Shared,
        }
    }
}

/// Je cesta metadata nebo soubor pro Clauda (v obou rozloženích beze změny)?
fn is_meta_path(path: &str) -> bool {
    path == "CLAUDE.md" || META_DIRS.iter().any(|d| path.starts_with(&format!("{d}/")))
}

/// Je fyzická cesta ve vlastní složce projektu soubor dat projektu?
pub fn is_project_data_path(path: &str) -> bool {
    let parts: Vec<&str> = path.split('/').collect();
    match parts.len() {
        1 => PROJECT_LAYOUT_ROOT_FILES.contains(&parts[0]),
        2 => PROJECT_LAYOUT_DIRS.contains(&parts[0]),
        _ => false,
    }
}

/// Logická cesta → cesta na disku (relativní, s „/“).
pub fn to_physical(path: &str, layout: Layout) -> Result<String, String> {
    if layout == Layout::Shared || is_meta_path(path) {
        return Ok(path.to_string());
    }
    let parts: Vec<&str> = path.split('/').collect();
    if parts.len() >= 3 && parts[0] == "projects" {
        let rest = parts[2..].join("/");
        if is_project_data_path(&rest) {
            return Ok(rest);
        }
    }
    Err(format!("Cesta mimo data projektu: {path}"))
}

/// Cesta na disku → logická cesta (None = soubor, který rozložení nezná).
pub fn to_logical(path: &str, layout: Layout) -> Option<String> {
    if layout == Layout::Shared || is_meta_path(path) {
        return Some(path.to_string());
    }
    if is_project_data_path(path) {
        Some(format!("{PROJECT_LAYOUT_PREFIX}{path}"))
    } else {
        None
    }
}

/// Soubor ve vaultu s hashem obsahu (SHA-256, hex).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFileInfo {
    pub path: String,
    pub hash: String,
}

/// Soubor s obsahem (zápis i čtení).
#[derive(Deserialize, Serialize)]
pub struct VaultWrite {
    pub path: String,
    pub content: String,
}

/// Chyba operace s jedním souborem (ostatní soubory se zpracují dál).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFileError {
    pub path: String,
    pub message: String,
}

/// Výsledek zápisu.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultApplyResult {
    pub written: Vec<String>,
    pub deleted: Vec<String>,
    pub errors: Vec<VaultFileError>,
}

/// Výchozí složka vaultu: Dokumenty/UXLog/Data.
pub fn default_root() -> String {
    let docs = dirs::document_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")));
    docs.join("UXLog").join("Data").to_string_lossy().to_string()
}

/// Ověří kořen vaultu: absolutní cesta, ne kořen disku ani domovská složka.
fn validate_root(root: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(root.trim());
    if root.trim().is_empty() || !path.is_absolute() {
        return Err("Složka dat musí být absolutní cesta".into());
    }
    if path.parent().is_none() {
        return Err("Složka dat nesmí být kořen disku".into());
    }
    if let Some(home) = dirs::home_dir() {
        if path == home {
            return Err("Složka dat nesmí být domovská složka".into());
        }
    }
    Ok(path)
}

/// Ověří logickou relativní cestu uvnitř vaultu, převede ji podle rozložení a vrátí plnou cestu.
/// `managed` = cesta musí ležet ve spravované složce a mít povolenou příponu.
fn resolve(root: &Path, relative: &str, managed: bool, layout: Layout) -> Result<PathBuf, String> {
    let physical = to_physical(&relative.replace('\\', "/"), layout)?;
    let rel = Path::new(&physical);
    let mut parts = Vec::new();
    for component in rel.components() {
        match component {
            Component::Normal(part) => parts.push(part.to_string_lossy().to_string()),
            _ => return Err(format!("Nepovolená cesta: {relative}")),
        }
    }
    if parts.is_empty() {
        return Err("Prázdná cesta".into());
    }
    if managed {
        let first = parts[0].as_str();
        let allowed = match (layout, parts.len()) {
            (Layout::Shared, 1) => MANAGED_ROOT_FILES.contains(&first),
            (Layout::Shared, _) => MANAGED_DIRS.contains(&first),
            (Layout::Project, 1) => MANAGED_ROOT_FILES.contains(&first) || PROJECT_LAYOUT_ROOT_FILES.contains(&first),
            (Layout::Project, _) => META_DIRS.contains(&first) || PROJECT_LAYOUT_DIRS.contains(&first),
        };
        if !allowed {
            return Err(format!("Cesta mimo spravované složky: {relative}"));
        }
        let ext = rel.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        if !MANAGED_EXTENSIONS.contains(&ext.as_str()) {
            return Err(format!("Nepovolený typ souboru: {relative}"));
        }
    }
    Ok(parts.iter().fold(root.to_path_buf(), |acc, p| acc.join(p)))
}

/// Hash obsahu souboru (SHA-256, hex).
fn hash_bytes(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

/// Sesbírá soubory spravovaných složek a kořenových souborů podle rozložení (fyzické cesty).
fn collect_managed(root: &Path, layout: Layout, data_only: bool) -> Result<Vec<(String, PathBuf)>, String> {
    let extensions = if data_only { DATA_EXTENSIONS } else { MANAGED_EXTENSIONS };
    let mut paths = Vec::new();
    let (dirs, root_files): (Vec<&str>, Vec<&str>) = match (layout, data_only) {
        (Layout::Shared, false) => (MANAGED_DIRS.to_vec(), MANAGED_ROOT_FILES.to_vec()),
        (Layout::Shared, true) => (DATA_DIRS.to_vec(), Vec::new()),
        (Layout::Project, false) => (
            META_DIRS.iter().chain(PROJECT_LAYOUT_DIRS.iter()).copied().collect(),
            MANAGED_ROOT_FILES.iter().chain(PROJECT_LAYOUT_ROOT_FILES.iter()).copied().collect(),
        ),
        (Layout::Project, true) => (
            std::iter::once(".uxlog").chain(PROJECT_LAYOUT_DIRS.iter().copied()).collect(),
            PROJECT_LAYOUT_ROOT_FILES.to_vec(),
        ),
    };
    for dir in dirs {
        collect_files(root, &root.join(dir), extensions, &mut paths)?;
    }
    for file in root_files {
        if root.join(file).is_file() {
            paths.push((file.to_string(), root.join(file)));
        }
    }
    Ok(paths)
}

/// Projde spravované složky vaultu a vrátí soubory s povolenou příponou a jejich hashe (logické cesty).
/// Neexistující vault = prázdný seznam.
pub fn scan(root: &str, layout: Layout) -> Result<Vec<VaultFileInfo>, String> {
    let root = validate_root(root)?;
    let paths = collect_managed(&root, layout, false)?;
    let mut out: Vec<VaultFileInfo> = paths
        .into_iter()
        .filter_map(|(rel, full)| {
            let logical = to_logical(&rel, layout)?;
            fs::read(&full).ok().map(|bytes| VaultFileInfo { path: logical, hash: hash_bytes(&bytes) })
        })
        .collect();
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

/// Přečte všechny datové soubory vaultu (data projektů a .uxlog/; .md/.yaml/.json) s obsahem (logické cesty).
/// Soubor, který nejde přečíst jako UTF-8, se vynechá.
pub fn read_data_files(root: &str, layout: Layout) -> Result<Vec<VaultWrite>, String> {
    let root = validate_root(root)?;
    let paths = collect_managed(&root, layout, true)?;
    let mut out: Vec<VaultWrite> = paths
        .into_iter()
        .filter_map(|(rel, full)| {
            let logical = to_logical(&rel, layout)?;
            fs::read_to_string(&full).ok().map(|content| VaultWrite { path: logical, content })
        })
        .collect();
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

/// Rekurzivně sesbírá soubory s danými příponami (relativní cesta s „/“, plná cesta). Symlinky přeskočí.
fn collect_files(root: &Path, dir: &Path, extensions: &[&str], out: &mut Vec<(String, PathBuf)>) -> Result<(), String> {
    if !dir.is_dir() {
        return Ok(());
    }
    let entries = fs::read_dir(dir).map_err(|e| format!("Nelze číst složku {}: {e}", dir.display()))?;
    for entry in entries.flatten() {
        let path = entry.path();
        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            collect_files(root, &path, extensions, out)?;
            continue;
        }
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        if !extensions.contains(&ext.as_str()) {
            continue;
        }
        let Ok(rel) = path.strip_prefix(root) else { continue };
        let rel = rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join("/");
        out.push((rel, path));
    }
    Ok(())
}

/// Přečte textový soubor ve vaultu; neexistující soubor = None.
pub fn read_file(root: &str, path: &str, layout: Layout) -> Result<Option<String>, String> {
    let root = validate_root(root)?;
    let full = resolve(&root, path, false, layout)?;
    if !full.is_file() {
        return Ok(None);
    }
    fs::read_to_string(&full)
        .map(Some)
        .map_err(|e| format!("Nelze přečíst {path}: {e}"))
}

/// Zapíše a smaže soubory. Chyba jednoho souboru nezastaví ostatní.
/// Po smazání odstraní prázdné nadřazené složky (až po kořen vaultu, ten ne).
pub fn apply(root: &str, writes: Vec<VaultWrite>, deletes: Vec<String>, layout: Layout) -> Result<VaultApplyResult, String> {
    let root = validate_root(root)?;
    fs::create_dir_all(&root).map_err(|e| format!("Nelze vytvořit složku dat: {e}"))?;
    let mut result = VaultApplyResult { written: Vec::new(), deleted: Vec::new(), errors: Vec::new() };

    for write in writes {
        match resolve(&root, &write.path, true, layout).and_then(|full| write_atomic(&full, write.content.as_bytes())) {
            Ok(()) => result.written.push(write.path),
            Err(message) => result.errors.push(VaultFileError { path: write.path, message }),
        }
    }

    for path in deletes {
        let outcome = resolve(&root, &path, true, layout).and_then(|full| {
            if full.is_file() {
                fs::remove_file(&full).map_err(|e| format!("Nelze smazat: {e}"))?;
            }
            remove_empty_parents(&root, &full);
            Ok(())
        });
        match outcome {
            Ok(()) => result.deleted.push(path),
            Err(message) => result.errors.push(VaultFileError { path, message }),
        }
    }
    Ok(result)
}

/// Atomický zápis: dočasný soubor vedle cílového, pak přejmenování (přepíše existující).
fn write_atomic(full: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Nelze vytvořit složku: {e}"))?;
    }
    let mut temp = full.as_os_str().to_owned();
    temp.push(TEMP_SUFFIX);
    let temp = PathBuf::from(temp);
    fs::write(&temp, bytes).map_err(|e| format!("Zápis selhal: {e}"))?;
    fs::rename(&temp, full).map_err(|e| {
        let _ = fs::remove_file(&temp);
        format!("Přejmenování selhalo: {e}")
    })
}

/// Odstraní prázdné složky od rodiče souboru směrem ke kořeni vaultu (kořen ani spravované složky ne).
fn remove_empty_parents(root: &Path, file: &Path) {
    let mut current = file.parent();
    while let Some(dir) = current {
        if dir == root || MANAGED_DIRS.iter().chain(META_DIRS.iter()).any(|d| root.join(d) == dir) {
            break;
        }
        if fs::remove_dir(dir).is_err() {
            break; // není prázdná nebo nejde smazat
        }
        current = dir.parent();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("uxlog-vault-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn resolve_rejects_traversal_and_unmanaged_paths() {
        let root = PathBuf::from(if cfg!(windows) { "C:\\vault" } else { "/vault" });
        assert!(resolve(&root, "../x.md", true, Layout::Shared).is_err());
        assert!(resolve(&root, "projects/../../x.md", true, Layout::Shared).is_err());
        assert!(resolve(&root, "README.md", true, Layout::Shared).is_err());
        assert!(resolve(&root, "projects/A/x.exe", true, Layout::Shared).is_err());
        assert!(resolve(&root, "projects/A/goals/x.md", true, Layout::Shared).is_ok());
        assert!(resolve(&root, ".uxlog/manifest.json", true, Layout::Shared).is_ok());
        assert!(resolve(&root, ".uxlog/bin/uxlog.mjs", true, Layout::Shared).is_ok());
        assert!(resolve(&root, ".claude/skills/uxlog-data/SKILL.md", true, Layout::Shared).is_ok());
        assert!(resolve(&root, "CLAUDE.md", true, Layout::Shared).is_ok());
        assert!(resolve(&root, "OTHER.md", true, Layout::Shared).is_err());
        assert!(resolve(&root, "projects/A/x.mjs", true, Layout::Shared).is_ok());
    }

    #[test]
    fn validate_root_rejects_relative_and_drive_root() {
        assert!(validate_root("relative/path").is_err());
        assert!(validate_root("").is_err());
        assert!(validate_root(if cfg!(windows) { "C:\\" } else { "/" }).is_err());
    }

    #[test]
    fn apply_writes_scans_and_deletes() {
        let root = temp_root("apply");
        let root_str = root.to_string_lossy().to_string();
        let result = apply(
            &root_str,
            vec![VaultWrite { path: "projects/Á/goals/g.md".into(), content: "ahoj".into() }],
            vec![],
            Layout::Shared,
        )
        .unwrap();
        assert_eq!(result.written, vec!["projects/Á/goals/g.md"]);

        let files = scan(&root_str, Layout::Shared).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "projects/Á/goals/g.md");
        assert_eq!(files[0].hash, hash_bytes("ahoj".as_bytes()));
        assert_eq!(read_file(&root_str, "projects/Á/goals/g.md", Layout::Shared).unwrap().as_deref(), Some("ahoj"));

        let data = read_data_files(&root_str, Layout::Shared).unwrap();
        assert_eq!(data.len(), 1);
        assert_eq!(data[0].content, "ahoj");

        apply(&root_str, vec![VaultWrite { path: "CLAUDE.md".into(), content: "x".into() }], vec![], Layout::Shared).unwrap();
        assert!(scan(&root_str, Layout::Shared).unwrap().iter().any(|f| f.path == "CLAUDE.md"));
        assert_eq!(read_data_files(&root_str, Layout::Shared).unwrap().len(), 1);

        let result = apply(&root_str, vec![], vec!["projects/Á/goals/g.md".into()], Layout::Shared).unwrap();
        assert_eq!(result.deleted.len(), 1);
        assert!(!root.join("projects").join("Á").exists());
        assert!(root.join("projects").exists());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn apply_reports_invalid_paths_without_stopping() {
        let root = temp_root("invalid");
        let root_str = root.to_string_lossy().to_string();
        let result = apply(
            &root_str,
            vec![
                VaultWrite { path: "../evil.md".into(), content: "x".into() },
                VaultWrite { path: "projects/A/project.md".into(), content: "ok".into() },
            ],
            vec![],
            Layout::Shared,
        )
        .unwrap();
        assert_eq!(result.written, vec!["projects/A/project.md"]);
        assert_eq!(result.errors.len(), 1);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn project_layout_maps_paths_and_touches_only_project_files() {
        let root = temp_root("project-layout");
        let root_str = root.to_string_lossy().to_string();
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("README.md"), "repozitář").unwrap();
        fs::write(root.join("src").join("app.md"), "kód").unwrap();

        let result = apply(
            &root_str,
            vec![
                VaultWrite { path: "projects/__project__/project.md".into(), content: "p".into() },
                VaultWrite { path: "projects/Cokoli/personas/PER-001-a.md".into(), content: "a".into() },
                VaultWrite { path: ".uxlog/manifest.json".into(), content: "{}".into() },
                VaultWrite { path: "projects/__project__/README.md".into(), content: "x".into() },
            ],
            vec![],
            Layout::Project,
        )
        .unwrap();
        assert_eq!(result.written.len(), 3);
        assert_eq!(result.errors.len(), 1);
        assert!(root.join("project.md").is_file());
        assert!(root.join("personas").join("PER-001-a.md").is_file());
        assert_eq!(fs::read_to_string(root.join("README.md")).unwrap(), "repozitář");

        let mut paths: Vec<String> = scan(&root_str, Layout::Project).unwrap().into_iter().map(|f| f.path).collect();
        paths.sort();
        assert_eq!(paths, vec![
            ".uxlog/manifest.json".to_string(),
            "projects/__project__/personas/PER-001-a.md".to_string(),
            "projects/__project__/project.md".to_string(),
        ]);
        let data = read_data_files(&root_str, Layout::Project).unwrap();
        assert_eq!(data.len(), 3);
        assert_eq!(
            read_file(&root_str, "projects/__project__/project.md", Layout::Project).unwrap().as_deref(),
            Some("p")
        );
        assert!(read_file(&root_str, "projects/__project__/src/app.md", Layout::Project).is_err());

        apply(&root_str, vec![], vec!["projects/__project__/personas/PER-001-a.md".into()], Layout::Project).unwrap();
        assert!(!root.join("personas").exists());
        assert!(root.join("src").join("app.md").is_file());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn layout_path_mapping() {
        assert_eq!(to_physical("projects/X/goals/g.md", Layout::Project).unwrap(), "goals/g.md");
        assert_eq!(to_physical("projects/X/goals/g.md", Layout::Shared).unwrap(), "projects/X/goals/g.md");
        assert!(to_physical("projects/X/a/b/c.md", Layout::Project).is_err());
        assert_eq!(to_logical("team/t.md", Layout::Project).as_deref(), Some("projects/__project__/team/t.md"));
        assert_eq!(to_logical("CLAUDE.md", Layout::Project).as_deref(), Some("CLAUDE.md"));
        assert_eq!(to_logical("README.md", Layout::Project), None);
    }
}
