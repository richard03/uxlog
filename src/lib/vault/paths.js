/**
 * Vault (data jako soubory) – názvy složek a souborů.
 *
 * Struktura vaultu:
 *   .uxlog/workspace.yaml               verze formátu
 *   .uxlog/canvas/<projectId>.yaml      rozvržení plátna (spravuje jen aplikace)
 *   .uxlog/notebook/<projectId>.yaml    historie chatu Zápisníku (spravuje jen aplikace)
 *   .uxlog/config/<projectId>.yaml      konfigurace projektu – atributy, šablony aktivit, termíny (spravuje jen aplikace)
 *   projects/<Název projektu>/project.md
 *   projects/<Název projektu>/connections.yaml
 *   projects/<Název projektu>/INDEX.md          rejstřík záznamů (generovaný, při čtení se ignoruje)
 *   projects/<Název projektu>/<složka typu>/<KÓD-slug>.md
 *
 * Identitu entity i projektu nese `id` uvnitř souboru, názvy souborů a složek jsou jen
 * čitelné odvozeniny – při kolizi dostanou příponu, při přejmenování se smí změnit.
 * Čisté funkce bez side effects.
 */

/** Kolekce entit projektu, které se ukládají jako samostatné soubory, a jejich složky. */
export const VAULT_COLLECTIONS = Object.freeze([
  { collection: 'goals', entityType: 'goal', dir: 'goals' },
  { collection: 'stakeholders', entityType: 'stakeholder', dir: 'stakeholders' },
  { collection: 'competitions', entityType: 'competition', dir: 'competitions' },
  { collection: 'hypotheses', entityType: 'hypothesis', dir: 'hypotheses' },
  { collection: 'personas', entityType: 'persona', dir: 'personas' },
  { collection: 'scenarios', entityType: 'scenario', dir: 'scenarios' },
  { collection: 'requirements', entityType: 'requirement', dir: 'requirements' },
  { collection: 'risks', entityType: 'risk', dir: 'risks' },
  { collection: 'sources', entityType: 'source', dir: 'sources' },
  { collection: 'activities', entityType: 'activity', dir: 'activities' },
  { collection: 'teamMembers', entityType: 'teamMember', dir: 'team' },
  { collection: 'tasks', entityType: 'task', dir: 'tasks' },
  { collection: 'bugs', entityType: 'bug', dir: 'bugs' },
].map(Object.freeze))

export const PROJECTS_DIR = 'projects'
export const PROJECT_FILE = 'project.md'
export const CONNECTIONS_FILE = 'connections.yaml'
export const INDEX_FILE = 'INDEX.md'
export const META_DIR = '.uxlog'
export const WORKSPACE_FILE = `${META_DIR}/workspace.yaml`
export const CANVAS_DIR = `${META_DIR}/canvas`
export const NOTEBOOK_DIR = `${META_DIR}/notebook`
export const CONFIG_DIR = `${META_DIR}/config`

/** Maximální délka slugu v názvu souboru entity (znaků). */
const MAX_SLUG_LENGTH = 60
/** Maximální délka názvu složky projektu (znaků) – rezerva pro dlouhé cesty ve Windows. */
const MAX_FOLDER_LENGTH = 80

/** Názvy, které Windows nedovolí jako název souboru/složky (bez ohledu na příponu). */
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/**
 * Vrátí popis kolekce podle názvu složky typu.
 * @param {string} dir
 * @returns {{ collection: string, entityType: string, dir: string }|null}
 */
export function collectionByDir(dir) {
  return VAULT_COLLECTIONS.find((c) => c.dir === dir) ?? null
}

/**
 * Vrátí popis kolekce podle klíče kolekce ve stavu aplikace.
 * @param {string} collection - např. 'personas'
 * @returns {{ collection: string, entityType: string, dir: string }|null}
 */
export function collectionInfo(collection) {
  return VAULT_COLLECTIONS.find((c) => c.collection === collection) ?? null
}

/**
 * Převede text na slug pro název souboru: bez diakritiky, malá písmena, pomlčky.
 * @param {unknown} text
 * @returns {string} '' pokud z textu nic nezbude
 */
export function slugify(text) {
  const slug = String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '')
}

/**
 * Upraví název projektu na bezpečný název složky. Zachová mezery, diakritiku i velikost písmen,
 * nahradí jen znaky zakázané ve Windows, odstraní tečky a mezery na konci a zakázané názvy
 * opatří podtržítkem. Výsledek je v Unicode NFC (stejná složka na Windows, macOS i v gitu).
 * @param {unknown} name
 * @returns {string} '' pokud z názvu nic nezbude
 */
export function sanitizeFolderName(name) {
  let out = String(name ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '-')
    .trim()
  out = out.slice(0, MAX_FOLDER_LENGTH).replace(/[. ]+$/, '').trim()
  if (WINDOWS_RESERVED.test(out)) out = `${out}_`
  return out
}

/** Pořadí pro deterministické přidělení přípon při kolizi (nezávislé na pořadí v poli). */
function compareForNaming(a, b) {
  const ca = String(a?.createdAt ?? '')
  const cb = String(b?.createdAt ?? '')
  if (ca !== cb) return ca < cb ? -1 : 1
  const ia = String(a?.id ?? '')
  const ib = String(b?.id ?? '')
  return ia < ib ? -1 : ia > ib ? 1 : 0
}

/**
 * Přidělí každé položce unikátní název (porovnání bez ohledu na velikost písmen – Windows/macOS).
 * Starší položka (createdAt, pak id) dostane název bez přípony, další `suffix(base, n)`.
 * @param {Array<Object>} items
 * @param {(item: Object) => string} baseName
 * @param {(base: string, n: number) => string} suffix
 * @param {Set<string>} [taken] - už obsazené názvy (malými písmeny)
 * @returns {Map<Object, string>}
 */
function assignUniqueNames(items, baseName, suffix, taken = new Set()) {
  const result = new Map()
  const used = new Set(taken)
  for (const item of [...items].sort(compareForNaming)) {
    const base = baseName(item)
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n++) name = suffix(base, n)
    used.add(name.toLowerCase())
    result.set(item, name)
  }
  return result
}

/**
 * Přidělí projektům názvy složek podle názvu projektu; kolize řeší příponou „ (2)“.
 * Projekt bez použitelného názvu dostane složku podle id.
 * @param {Array<Object>} projects
 * @returns {Map<string, string>} id projektu → název složky
 */
export function assignProjectFolders(projects) {
  const list = (Array.isArray(projects) ? projects : []).filter((p) => p && p.id)
  const names = assignUniqueNames(
    list,
    (p) => sanitizeFolderName(p.name) || sanitizeFolderName(p.id) || 'project',
    (base, n) => `${base} (${n})`,
  )
  const out = new Map()
  for (const [project, name] of names) out.set(project.id, name)
  return out
}

/**
 * Základ názvu souboru entity: „KÓD-slug“, „slug“, nebo id, když nic jiného není.
 * @param {Object} entity
 * @returns {string}
 */
export function entityFileBase(entity) {
  const code = slugify(entity?.code).toUpperCase()
  const slug = slugify(entity?.name)
  const base = [code, slug].filter(Boolean).join('-')
  return base || slugify(entity?.id) || 'entity'
}

/**
 * Přidělí entitám jedné kolekce unikátní názvy souborů (bez přípony .md); kolize → „-2“.
 * @param {Array<Object>} entities
 * @returns {Map<string, string>} id entity → název souboru (s příponou .md)
 */
export function assignEntityFileNames(entities) {
  const list = (Array.isArray(entities) ? entities : []).filter((e) => e && e.id)
  const names = assignUniqueNames(list, entityFileBase, (base, n) => `${base}-${n}`)
  const out = new Map()
  for (const [entity, name] of names) out.set(entity.id, `${name}.md`)
  return out
}

/**
 * Bezpečný název souboru rozvržení plátna podle id projektu.
 * @param {string} projectId
 * @returns {string}
 */
export function canvasFilePath(projectId) {
  return `${CANVAS_DIR}/${safeProjectFileName(projectId)}`
}

/**
 * Bezpečný název souboru historie chatu Zápisníku podle id projektu.
 * @param {string} projectId
 * @returns {string}
 */
export function notebookFilePath(projectId) {
  return `${NOTEBOOK_DIR}/${safeProjectFileName(projectId)}`
}

/**
 * Bezpečný název souboru konfigurace projektu podle id projektu.
 * @param {string} projectId
 * @returns {string}
 */
export function configFilePath(projectId) {
  return `${CONFIG_DIR}/${safeProjectFileName(projectId)}`
}

function safeProjectFileName(projectId) {
  return `${String(projectId ?? '').replace(/[^\w-]/g, '_') || 'project'}.yaml`
}

/**
 * Normalizuje relativní cestu ve vaultu: lomítka „/“, bez „./“ a úvodního lomítka, NFC.
 * @param {unknown} path
 * @returns {string}
 */
export function normalizeVaultPath(path) {
  return String(path ?? '')
    .normalize('NFC')
    .replace(/\\/g, '/')
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
}

/**
 * Rozložení složky dat:
 *   shared   výchozí složka – projekty v projects/<Název projektu>/…
 *   project  vlastní složka jednoho projektu – project.md, personas/… přímo v kořeni
 * Aplikace i CLI uvnitř pracují vždy s logickými cestami projects/<složka>/…; u vlastní složky
 * projektu je logická složka pevná (PROJECT_LAYOUT_FOLDER) a na disk se cesty převádějí
 * (toPhysicalPath / toLogicalPath – stejné pravidlo má Rust ve vault.rs).
 */
export const VAULT_LAYOUT = Object.freeze({ SHARED: 'shared', PROJECT: 'project' })

/** Logická složka projektu ve vlastní složce projektu (na disku neexistuje). */
export const PROJECT_LAYOUT_FOLDER = '__project__'

/** Logická předpona souborů projektu ve vlastní složce projektu. */
export const PROJECT_LAYOUT_PREFIX = `${PROJECTS_DIR}/${PROJECT_LAYOUT_FOLDER}/`

/** Soubory dat v kořeni vlastní složky projektu. */
export const PROJECT_LAYOUT_ROOT_FILES = Object.freeze([PROJECT_FILE, CONNECTIONS_FILE, INDEX_FILE])

/** Normalizuje rozložení (neznámá hodnota = výchozí složka). */
export function normalizeLayout(layout) {
  return layout === VAULT_LAYOUT.PROJECT ? VAULT_LAYOUT.PROJECT : VAULT_LAYOUT.SHARED
}

/** Cesta, kterou spravuje aplikace i v rozložení project beze změny (metadata a soubory pro Clauda). */
function isMetaPath(path) {
  return path.startsWith(`${META_DIR}/`) || path.startsWith('.claude/') || path === 'CLAUDE.md'
}

/**
 * Je fyzická cesta ve vlastní složce projektu soubor dat projektu (project.md, connections.yaml,
 * INDEX.md v kořeni, nebo soubor ve složce typu záznamu)?
 * @param {string} path
 * @returns {boolean}
 */
export function isProjectLayoutDataPath(path) {
  const p = normalizeVaultPath(path)
  const parts = p.split('/')
  if (parts.length === 1) return PROJECT_LAYOUT_ROOT_FILES.includes(parts[0])
  return parts.length === 2 && VAULT_COLLECTIONS.some((c) => c.dir === parts[0])
}

/**
 * Logická cesta → cesta na disku (relativně ke kořeni složky).
 * V rozložení project se odřízne předpona projects/<složka>/; cesta mimo projekt a metadata = null.
 * @param {string} path
 * @param {string} layout
 * @returns {string|null}
 */
export function toPhysicalPath(path, layout) {
  const p = normalizeVaultPath(path)
  if (normalizeLayout(layout) === VAULT_LAYOUT.SHARED || isMetaPath(p)) return p
  const parts = p.split('/')
  if (parts[0] !== PROJECTS_DIR || parts.length < 3) return null
  const rest = parts.slice(2).join('/')
  return isProjectLayoutDataPath(rest) ? rest : null
}

/**
 * Cesta na disku → logická cesta. V rozložení project dostanou soubory dat projektu
 * předponu PROJECT_LAYOUT_PREFIX; neznámé soubory = null.
 * @param {string} path
 * @param {string} layout
 * @returns {string|null}
 */
export function toLogicalPath(path, layout) {
  const p = normalizeVaultPath(path)
  if (normalizeLayout(layout) === VAULT_LAYOUT.SHARED || isMetaPath(p)) return p
  return isProjectLayoutDataPath(p) ? `${PROJECT_LAYOUT_PREFIX}${p}` : null
}

/**
 * Klíč složky pro porovnání cest (lomítka, bez koncového lomítka, bez ohledu na velikost písmen).
 * @param {unknown} root
 * @returns {string}
 */
export function rootKey(root) {
  return String(root ?? '').trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

/**
 * Leží složka `inner` uvnitř složky `outer` (nebo je stejná)?
 * @param {string} inner
 * @param {string} outer
 * @returns {boolean}
 */
export function isSameOrInside(inner, outer) {
  const a = rootKey(inner)
  const b = rootKey(outer)
  return Boolean(a && b) && (a === b || a.startsWith(`${b}/`))
}
