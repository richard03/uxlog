/**
 * Plugin: Složka dat (vault) – data aplikace jako složky souborů .md/.yaml pro Claude Code (jen desktop).
 *
 * Složky (lib/vault/targets.js): výchozí složka (projekty v projects/<název>/) a vlastní složky
 * projektů (projekt přímo v kořeni složky, layout project). Každá složka má vlastní manifest,
 * základ pro slučování, značku synchronizace i sledování; zpracovávají se za sebou.
 *
 * Zápis (aplikace → soubory): po každém uložení (data:persisted), po změně z lokálního API
 * (data:replaced), při startu, při návratu do okna a po změně souborů ve složce (sledování v Rustu)
 * se s krátkým zpožděním zapíší změněné soubory dat a soubory pro Claude Code. Soubor, který mezitím
 * změnil někdo jiný, se nepřepíše ani nesmaže – je to „změna v souborech“.
 *
 * Automatické načtení (soubory → aplikace, vždy): po zápisu se změny v souborech
 * trojcestně sloučí se základem (.uxlog/base.json) a načtou bez ptaní – nové, upravené i smazané záznamy.
 * Pole změněná v aplikaci i v souboru jsou konflikty (rozhodne uživatel). Nezvykle velkou dávku
 * (pojistka vaultAutoImport v data/app.yaml) a smazání projektu jen nabídne k ručnímu náhledu.
 * Během psaní v aplikaci (fokus v poli) se načtení odloží.
 *
 * Složka je zdroj pravdy, databáze aplikace jen mezipaměť: před každým zápisem se porovná značka
 * synchronizace v manifestu se značkou, kterou si pro tu složku pamatuje databáze (lib/vault/rebuild.js).
 * Když se liší, projekty té složky se v databázi sestaví znovu ze složky a teprve potom se zapisuje.
 *
 * Změna vlastní složky projektu projekt přesune: soubory, které aplikace zapsala do původní složky,
 * se smažou (upravené mimo aplikaci zůstanou) a projekt se zapíše do nové složky.
 *
 * Změny do stavu zapisují funkce předané jádrem (setVaultChangeApplier, setVaultStateReplacer
 * ← stores/vaultImport.js), plugin sám do storů nesahá. Všechny operace se souborovým systémem
 * běží za sebou ve frontě.
 */

import { reactive, ref } from 'vue'
import cs from '../../../i18n/cs.js'
import { APP_VERSION } from '../../version.js'
import { APP_CONFIG, ENTITY_CONFIG } from '../../dataConfig.js'
import {
  isTauri, mirrorToTauri, vaultDefaultRoot, vaultScan, vaultReadFile, vaultReadFiles, vaultApply,
  vaultWatch, vaultUnwatch, listenToVaultChanges,
} from '../../tauriBridge.js'
import { buildVaultFiles, parseVaultFiles } from '../../vault/workspace.js'
import { createHeadingResolver, markdownToProject } from '../../vault/format.js'
import { buildClaudeFiles } from '../../vault/claudeFiles.js'
import { CLAUDE_TEMPLATES } from '../../vault/claudeTemplates.js'
import { buildVaultImport, findNewFiles, NEW_FILE } from '../../vault/importChanges.js'
import { isMassChange } from '../../vault/merge.js'
import {
  MANIFEST_FILE, BASE_FILE, hashText, parseManifest, serializeManifest, planVaultWrite, reconcileManifest,
  acceptPaths, parseBase, serializeBase, buildBaseSnapshot, parseManifestSyncId,
} from '../../vault/sync.js'
import {
  SYNC_ACTION, VAULT_SYNC_KEY, parseVaultSync, cacheSyncIdFor, serializeVaultSync, decideVaultSync,
  vaultHasProjects, forgetProjectPaths, buildRebuiltState, countRecordChanges,
} from '../../vault/rebuild.js'
import { resolveVaultTargets, scopeState, findOrphans } from '../../vault/targets.js'
import {
  PROJECTS_DIR, META_DIR, PROJECT_FILE, PROJECT_LAYOUT_PREFIX, VAULT_LAYOUT, rootKey, toPhysicalPath,
} from '../../vault/paths.js'
import {
  VAULT_SETTINGS_KEY, normalizeVaultSettings, parseVaultSettings, withProjectVaultSetting,
} from '../../vault/settings.js'
import { generateId } from '../../id.js'
import cliSource from './cliSource.js'

/** Zpoždění zápisu po poslední změně (ms) – sloučí rychlé po sobě jdoucí úpravy. */
const EXPORT_DEBOUNCE_MS = 1500
/** Zpoždění kontroly po návratu do okna (ms). */
const FOCUS_CHECK_MS = 300
/** Odklad automatického načtení, když uživatel právě píše (ms). */
const EDITING_RETRY_MS = 3000
/** Zpoždění první kontroly po startu (ms). */
const STARTUP_CHECK_MS = 300

/** Problém vlastní složky projektu zjištěný při zápisu: složka obsahuje jiný projekt. */
export const FOREIGN_PROJECT = 'foreignProject'

const headingFor = createHeadingResolver(cs)
const indexLabels = { columns: cs.vault.indexColumns, note: cs.vault.indexNote }

/** Reaktivní nastavení (enabled, root, projects). */
export const vaultSettings = reactive(loadSettings())

/**
 * Reaktivní stav pro UI. Položky seznamů nesou složku (`root`, `layout`) a cestu na disku
 * (`displayPath`); `path` je logická cesta (projects/…).
 */
export const vaultStatus = reactive({
  available: isTauri,
  running: false,
  lastExportAt: null,
  /** Soubory změněné mimo aplikaci: [{ root, layout, path, displayPath, reason }]. */
  conflicts: [],
  /** Chyby zápisu souborů: [{ root, path, message }]. */
  errors: [],
  warnings: [],
  lastError: '',
  /** Změny s konfliktními poli čekající na rozhodnutí uživatele (z automatického načtení). */
  pendingConflicts: [],
  /** Soubory s chybou, které se nedají načíst: [{ root, layout, path, displayPath, issues }]. */
  invalidFiles: [],
  /** Některá složka má nezvykle velkou dávku změn – čeká na ruční náhled. */
  massChange: false,
  /** Problémy vlastních složek projektů: [{ projectId, root, code }] (TARGET_ISSUE nebo FOREIGN_PROJECT). */
  folderIssues: [],
  /** Poslední automatické načtení: { at, count, labels } (pro upozornění). */
  lastImport: null,
  /** Poslední obnova databáze ze složky: { at, count, kept, root } (pro upozornění). */
  lastRebuild: null,
})

/** Čas posledního úspěšného zápisu pro StatusBar. */
const lastExportTs = ref(null)
/** Počet konfliktů pro StatusBar. */
const conflictLabel = ref('')

let getState = null
let changeApplier = null
let stateReplacer = null
let timer = null
let queue = Promise.resolve()
let exportQueued = false
let focusListener = null
let unlistenWatch = null
let watchedKey = ''
/** Stav jednotlivých složek (klíč = rootKey). */
const perTarget = new Map()
/** Problémy nastavení vlastních složek (z resolveVaultTargets). */
let configIssues = []
/** Původní vlastní složky projektů, ze kterých se mají smazat soubory aplikace (přesun projektu). */
const pendingReleases = new Map()

function loadSettings() {
  try {
    return parseVaultSettings(localStorage.getItem(VAULT_SETTINGS_KEY))
  } catch {
    return parseVaultSettings(null)
  }
}

function saveSettings() {
  const json = JSON.stringify(normalizeVaultSettings(vaultSettings))
  try { localStorage.setItem(VAULT_SETTINGS_KEY, json) } catch { /* plné úložiště – nastavení zůstane v paměti */ }
  mirrorToTauri(VAULT_SETTINGS_KEY, json)
}

/**
 * Funkce, která zapíše potvrzené změny do stavu aplikace (předává ji jádro, viz plugins/install.js).
 * @param {(changes: Array<Object>) => { applied: Array<Object>, skipped: Array<Object> }} fn
 */
export function setVaultChangeApplier(fn) {
  changeApplier = typeof fn === 'function' ? fn : null
}

/**
 * Funkce, která nahradí data stavem sestaveným ze složky (předává ji jádro, viz plugins/install.js).
 * @param {(data: Object) => void} fn
 */
export function setVaultStateReplacer(fn) {
  stateReplacer = typeof fn === 'function' ? fn : null
}

/** Značky synchronizace, které si pamatuje databáze (klíč složky → syncId). */
function loadCacheMarks() {
  try {
    return parseVaultSync(localStorage.getItem(VAULT_SYNC_KEY))
  } catch {
    return {}
  }
}

function saveCacheSync(root, syncId) {
  const json = serializeVaultSync(loadCacheMarks(), root, syncId)
  try { localStorage.setItem(VAULT_SYNC_KEY, json) } catch { /* plné úložiště – příště se databáze obnoví ze složky */ }
  mirrorToTauri(VAULT_SYNC_KEY, json)
}

/** Zařadí operaci do fronty (operace se souborovým systémem neběží souběžně). */
function enqueue(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

/** Souborové operace jedné složky (s jejím rozložením). */
function fsFor(target) {
  const { root, layout } = target
  return {
    scan: () => vaultScan(root, layout),
    read: (path) => vaultReadFile(root, path, layout),
    readAll: () => vaultReadFiles(root, layout),
    apply: (writes, deletes) => vaultApply(root, writes, deletes, layout),
  }
}

function resetStatus() {
  perTarget.clear()
  configIssues = []
  Object.assign(vaultStatus, {
    conflicts: [], errors: [], lastError: '', pendingConflicts: [], invalidFiles: [], massChange: false, folderIssues: [],
  })
  updateConflictLabel()
}

/**
 * Změní nastavení a uloží ho. Zapnutí nebo změna složky spustí zápis a sledování složky.
 * @param {{ enabled?: boolean, root?: string }} patch
 */
export function updateVaultSettings(patch) {
  const next = normalizeVaultSettings({ ...vaultSettings, ...patch })
  const changed = next.enabled !== vaultSettings.enabled || next.root !== vaultSettings.root
  Object.assign(vaultSettings, next)
  saveSettings()
  if (changed) {
    resetStatus()
    updateWatch()
  }
  if (changed && next.enabled && next.root) scheduleExport(0)
}

/**
 * Nastaví složku projektu: null = výchozí složka, { root } = vlastní složka, { off: true } = nezapisovat.
 * Původní vlastní složka se uklidí (soubory zapsané aplikací se smažou).
 * @param {string} projectId
 * @param {{ root: string }|{ off: true }|null} value
 */
export function setProjectVaultFolder(projectId, value) {
  if (!projectId) return
  const before = vaultSettings.projects?.[projectId] ?? null
  const next = withProjectVaultSetting(vaultSettings, projectId, value)
  const after = next.projects[projectId] ?? null
  if (JSON.stringify(before) === JSON.stringify(after)) return
  if (before?.root && rootKey(before.root) !== rootKey(after?.root)) pendingReleases.set(rootKey(before.root), before.root)
  Object.assign(vaultSettings, next)
  saveSettings()
  perTarget.delete(rootKey(before?.root))
  scheduleExport(0)
}

/**
 * Výchozí složka, pokud uživatel žádnou nezvolil.
 * @returns {Promise<string>}
 */
export async function getDefaultVaultRoot() {
  try {
    return await vaultDefaultRoot()
  } catch (err) {
    console.error('[Vault] vaultDefaultRoot failed:', err)
    return ''
  }
}

const isActive = () => isTauri && getState && vaultSettings.enabled && Boolean(vaultSettings.root)

/** Aktuální složky k zápisu. */
function currentTargets() {
  if (!isActive()) return { targets: [], issues: [] }
  return resolveVaultTargets(vaultSettings, getState())
}

/** Nastaví sledování složek podle cílů (beze změny nic nevolá). */
async function updateWatch(targets = currentTargets().targets) {
  const list = targets.map(({ root, layout }) => ({ root, layout }))
  const key = JSON.stringify(list)
  if (key === watchedKey) return
  watchedKey = key
  try {
    if (list.length) {
      const errors = await vaultWatch(list)
      if (errors?.length) console.warn('[Vault] některé složky nejde sledovat:', errors)
    } else {
      await vaultUnwatch()
    }
  } catch (err) {
    console.warn('[Vault] sledování složky není k dispozici:', err)
  }
}

/**
 * Naplánuje zápis (debounce). Bez zapnutého nastavení nedělá nic.
 * @param {number} [delay]
 */
function scheduleExport(delay = EXPORT_DEBOUNCE_MS) {
  if (!isActive() && !pendingReleases.size) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    exportVaultNow().catch(() => { /* stav chyby je ve vaultStatus */ })
  }, delay)
}

/**
 * Okamžitě zapíše data do všech složek (a po zápisu automaticky načte změny ze souborů).
 * Je-li zápis už ve frontě, nepřidává další.
 * @param {{ force?: Array<{ root: string, path: string }> }} [options] - force: soubory změněné mimo aplikaci, které se mají přepsat
 * @returns {Promise<void>}
 */
export function exportVaultNow({ force = [] } = {}) {
  if (!isTauri || !getState) return Promise.resolve()
  clearTimeout(timer)
  if (exportQueued && !force.length) return queue
  exportQueued = true
  return enqueue(async () => {
    exportQueued = false
    vaultStatus.running = true
    try {
      for (const [key, root] of [...pendingReleases]) {
        pendingReleases.delete(key)
        await runRelease(root)
      }
      const { targets, issues } = currentTargets()
      configIssues = issues
      const keys = new Set(targets.map((t) => rootKey(t.root)))
      for (const key of [...perTarget.keys()]) if (!keys.has(key)) perTarget.delete(key)
      for (const target of targets) {
        const forced = force.filter((f) => rootKey(f.root) === rootKey(target.root)).map((f) => f.path)
        await runTarget(target, forced)
      }
      vaultStatus.lastError = ''
      updateWatch(targets)
    } catch (err) {
      vaultStatus.lastError = String(err?.message ?? err)
      console.error('[Vault] zápis selhal:', err)
      throw err
    } finally {
      vaultStatus.running = false
      publishStatus()
    }
  })
}

/** Stav jedné složky (vytvoří prázdný). */
function statusOf(target) {
  const key = rootKey(target.root)
  if (!perTarget.has(key)) {
    perTarget.set(key, { root: target.root, layout: target.layout, conflicts: [], pendingConflicts: [], invalidFiles: [], massChange: false, errors: [], issue: null })
  }
  const st = perTarget.get(key)
  st.layout = target.layout
  st.projectIds = target.projectIds
  return st
}

/** Sloučí stav složek do vaultStatus (položky označené složkou). */
function publishStatus() {
  const tag = (st, item) => ({ ...item, root: st.root, layout: st.layout, displayPath: toPhysicalPath(item.path, st.layout) ?? item.path })
  const all = [...perTarget.values()]
  vaultStatus.conflicts = all.flatMap((st) => st.conflicts.map((c) => tag(st, c)))
  vaultStatus.invalidFiles = all.flatMap((st) => st.invalidFiles.map((f) => tag(st, f)))
  vaultStatus.pendingConflicts = all.flatMap((st) => st.pendingConflicts)
  vaultStatus.errors = all.flatMap((st) => st.errors.map((e) => ({ ...e, root: st.root })))
  vaultStatus.massChange = all.some((st) => st.massChange)
  vaultStatus.folderIssues = [
    ...configIssues,
    ...all.filter((st) => st.issue).map((st) => ({ projectId: st.projectIds?.[0], root: st.root, code: st.issue })),
  ]
  vaultStatus.warnings = getState ? findOrphans(getState()) : []
  updateConflictLabel()
}

/** Jedno kolo pro složku: kontrola, případná obnova ze složky, zápis a načtení změn. */
async function runTarget(target, force) {
  const st = statusOf(target)
  st.issue = await checkProjectFolder(target)
  if (st.issue) {
    Object.assign(st, { conflicts: [], pendingConflicts: [], invalidFiles: [], massChange: false })
    return
  }
  if ((await syncWithVault(target)) === POSTPONED) return
  await runExport(target, force)
  if (!force.length) await runAutoImport(target)
}

/**
 * Vlastní složka projektu smí obsahovat jen svůj projekt: project.md s jiným (nebo žádným) id
 * znamená, že uživatel vybral složku jiného projektu – nic se nezapisuje ani nenačítá.
 * @returns {Promise<string|null>}
 */
async function checkProjectFolder(target) {
  if (target.layout !== VAULT_LAYOUT.PROJECT) return null
  const text = await fsFor(target).read(`${PROJECT_LAYOUT_PREFIX}${PROJECT_FILE}`)
  if (text === null || text === undefined) return null
  const result = markdownToProject(text, { headingFor })
  return result.ok && result.project?.id === target.projectIds[0] ? null : FOREIGN_PROJECT
}

/** Výsledek syncWithVault: obnova se odložila (uživatel píše), v tomto kole se nic nezapisuje. */
const POSTPONED = 'postponed'

/** Soubory, které aplikace po obnově ze složky přijme jako své (jejich obsah je teď v databázi). */
const isRebuildPath = (path) => path.startsWith(`${PROJECTS_DIR}/`)
  || (path.startsWith(`${META_DIR}/`) && path !== MANIFEST_FILE && path !== BASE_FILE)

/**
 * Porovná databázi se složkou (uvnitř fronty, před zápisem) a podle potřeby projekty složky
 * v databázi obnoví ze složky.
 * @param {{ root: string, layout: string, projectIds: string[] }} target
 * @returns {Promise<string>} SYNC_ACTION nebo POSTPONED
 */
async function syncWithVault(target) {
  const fs = fsFor(target)
  const [disk, manifestText] = await Promise.all([fs.scan(), fs.read(MANIFEST_FILE)])
  const manifest = parseManifest(manifestText)
  const manifestSyncId = parseManifestSyncId(manifestText)
  const action = decideVaultSync({
    cacheSyncId: cacheSyncIdFor(loadCacheMarks(), target.root),
    manifestSyncId,
    manifestHasFiles: Object.keys(manifest).length > 0,
    hasProjects: vaultHasProjects(disk),
    hasData: target.projectIds.length > 0,
  })

  if (action === SYNC_ACTION.SEED) {
    // Složka bez projektů: staré záznamy manifestu by vypadaly jako soubory smazané mimo aplikaci
    const cleaned = forgetProjectPaths(manifest)
    if (Object.keys(cleaned).length !== Object.keys(manifest).length) {
      await fs.apply([{ path: MANIFEST_FILE, content: serializeManifest(cleaned, manifestSyncId) }], [])
    }
    return action
  }
  if (action !== SYNC_ACTION.REBUILD) return action
  // Bez obnovy se nesmí zapisovat – zastaralá databáze by přepsala složku
  if (!stateReplacer) return POSTPONED
  if (isUserEditing()) {
    scheduleExport(EDITING_RETRY_MS)
    return POSTPONED
  }

  const parsed = parseVaultFiles(await fs.readAll(), { headingFor, entityConfig: ENTITY_CONFIG })
  const current = getState()
  const { data, keptPaths } = buildRebuiltState({
    current,
    parsed,
    currentIndex: buildVaultFiles(scopeState(current, target.projectIds), { headingFor, indexLabels, layout: target.layout }).index,
    scopeProjectIds: target.projectIds,
    generateId,
    entityConfig: ENTITY_CONFIG,
  })
  const count = countRecordChanges(current, data)
  if (count) stateReplacer(data)
  // Nové projekty ze složky patří do ní (u vlastní složky je to vždy její projekt)
  const known = new Set((current.projects ?? []).map((p) => p?.id))
  for (const p of data.projects) if (!known.has(p.id)) target.projectIds.push(p.id)

  // Načtené soubory přijmout (i soubory z manifestu, které už na disku nejsou); soubory s chybou ne
  const errorPaths = new Set(parsed.errors.map((e) => e.path))
  const accepted = [...new Set([...disk.map((f) => f.path), ...Object.keys(manifest)])]
    .filter((path) => isRebuildPath(path) && !errorPaths.has(path))
  const nextManifest = acceptPaths(manifest, disk, accepted)
  await fs.apply([{ path: MANIFEST_FILE, content: serializeManifest(nextManifest, manifestSyncId) }], [])

  vaultStatus.lastRebuild = { at: Date.now(), count, kept: keptPaths.length, root: target.root }
  console.log(`[Vault] databáze obnovena ze složky ${target.root}, změněných záznamů: ${count}`)
  return action
}

/** Soubory, které má aplikace ve složce mít, s hashi, a stav disku, manifestu a základu. */
async function computePlan(target, force = []) {
  const fs = fsFor(target)
  const { files, index } = buildVaultFiles(scopeState(getState(), target.projectIds), {
    headingFor, appVersion: APP_VERSION, indexLabels, layout: target.layout,
  })
  const claudeFiles = buildClaudeFiles({ ...CLAUDE_TEMPLATES, cliSource, cliHelp: cs.vaultCli.help, layout: target.layout })
  const desired = await Promise.all([...files, ...claudeFiles].map(async (f) => ({ ...f, hash: await hashText(f.content) })))
  const [disk, manifestText, baseText] = await Promise.all([fs.scan(), fs.read(MANIFEST_FILE), fs.read(BASE_FILE)])
  const previous = parseManifest(manifestText)
  const plan = planVaultWrite({ desired, disk, manifest: previous, force })
  const newFiles = findNewFiles(disk, previous, desired.map((f) => f.path))
  return { desired, disk, manifestText, baseText, previous, plan, index, newFiles }
}

async function runExport(target, force) {
  const fs = fsFor(target)
  const st = statusOf(target)
  const { desired, manifestText, baseText, previous, plan, index, newFiles } = await computePlan(target, force)
  let result = { written: [], deleted: [], errors: [] }
  if (plan.writes.length || plan.deletes.length) {
    result = await fs.apply(plan.writes.map(({ path, content }) => ({ path, content })), plan.deletes)
  }
  const manifest = reconcileManifest(plan.manifest, previous, result, plan.deletes)
  // Značka synchronizace: nová, když se manifest změnil nebo databáze nese jinou značku
  const previousSyncId = parseManifestSyncId(manifestText)
  const cacheMatches = cacheSyncIdFor(loadCacheMarks(), target.root) === previousSyncId && Boolean(previousSyncId)
  const unchangedManifest = serializeManifest(manifest, previousSyncId) === manifestText
  const syncId = unchangedManifest && cacheMatches ? previousSyncId : generateId()
  const manifestContent = serializeManifest(manifest, syncId)
  const baseContent = serializeBase(buildBaseSnapshot({ previous: parseBase(baseText), index, desired, manifest, state: getState() }))
  const meta = []
  if (manifestContent !== manifestText) meta.push({ path: MANIFEST_FILE, content: manifestContent })
  if (baseContent !== baseText) meta.push({ path: BASE_FILE, content: baseContent })
  if (meta.length) {
    const metaResult = await fs.apply(meta, [])
    result.errors.push(...(metaResult.errors ?? []))
  }
  // Databáze si značku zapamatuje, jen když se manifest opravdu zapsal
  const manifestFailed = result.errors.some((e) => e?.path === MANIFEST_FILE)
  if (syncId !== previousSyncId && !manifestFailed) saveCacheSync(target.root, syncId)

  st.conflicts = [...plan.conflicts, ...newFiles.map((path) => ({ path, reason: NEW_FILE }))]
    .sort((a, b) => a.path.localeCompare(b.path))
  st.errors = result.errors ?? []
  vaultStatus.lastExportAt = Date.now()
  lastExportTs.value = vaultStatus.lastExportAt
}

/**
 * Uklidí původní vlastní složku projektu (přesun projektu jinam): smaže soubory, které aplikace
 * zapsala a nikdo je nezměnil, i metadata; upravené soubory a CLAUDE.md zůstanou.
 */
async function runRelease(root) {
  const fs = fsFor({ root, layout: VAULT_LAYOUT.PROJECT })
  try {
    const [disk, manifestText] = await Promise.all([fs.scan(), fs.read(MANIFEST_FILE)])
    const plan = planVaultWrite({ desired: [], disk, manifest: parseManifest(manifestText) })
    await fs.apply([], [...plan.deletes, MANIFEST_FILE, BASE_FILE].filter((p) => disk.some((f) => f.path === p)))
  } catch (err) {
    console.warn('[Vault] původní složku projektu nejde uklidit:', root, err)
  }
}

/** Píše uživatel právě do pole v aplikaci? (Načtení by mu změnilo data pod rukama.) */
function isUserEditing() {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  if (!el || el === document.body) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Označí změny a soubory složkou (jedinečné id napříč složkami, cesta na disku pro UI). */
function tagChanges(target, result) {
  const key = rootKey(target.root)
  const tag = (item) => ({
    ...item,
    id: `${key}|${item.path}`,
    root: target.root,
    layout: target.layout,
    displayPath: toPhysicalPath(item.path, target.layout) ?? item.path,
  })
  return {
    changes: result.changes.map(tag),
    invalid: result.invalid.map((f) => ({ ...f, root: target.root, layout: target.layout, displayPath: toPhysicalPath(f.path, target.layout) ?? f.path })),
    unchanged: result.unchanged.map((path) => ({ root: target.root, path })),
  }
}

/** Připraví změny ze složky (uvnitř fronty). */
async function prepareChanges(target) {
  const { plan, index, newFiles, baseText } = await computePlan(target)
  const changed = [...plan.conflicts, ...newFiles.map((path) => ({ path, reason: NEW_FILE }))]
  if (!changed.some((c) => c.path.startsWith(`${PROJECTS_DIR}/`))) return { changes: [], invalid: [], unchanged: [] }
  const files = await fsFor(target).readAll()
  return tagChanges(target, buildVaultImport({
    files, changed, desiredIndex: index, state: getState(), base: parseBase(baseText), headingFor,
    generateId, now: new Date().toISOString(),
  }))
}

/** Přijme soubory jedné složky (uvnitř fronty): do manifestu jejich současný hash z disku. */
async function acceptInQueue(target, paths) {
  if (!paths.length) return
  const fs = fsFor(target)
  const [disk, manifestText] = await Promise.all([fs.scan(), fs.read(MANIFEST_FILE)])
  const manifest = acceptPaths(parseManifest(manifestText), disk, paths)
  await fs.apply([{ path: MANIFEST_FILE, content: serializeManifest(manifest, parseManifestSyncId(manifestText)) }], [])
}

/** Automatické načtení změn ze souborů jedné složky (uvnitř fronty, po zápisu). */
async function runAutoImport(target) {
  if (!changeApplier) return
  const st = statusOf(target)
  if (!st.conflicts.some((c) => c.path.startsWith(`${PROJECTS_DIR}/`))) {
    Object.assign(st, { pendingConflicts: [], invalidFiles: [], massChange: false })
    return
  }
  if (isUserEditing()) {
    scheduleExport(EDITING_RETRY_MS)
    return
  }
  const { changes, invalid, unchanged } = await prepareChanges(target)
  st.invalidFiles = invalid.map(({ path, issues }) => ({ path, issues }))
  const loadable = changes.filter((c) => c.kind !== 'unsupported')
  if (isMassChange(loadable, getState(), APP_CONFIG.vaultAutoImport)) {
    Object.assign(st, { massChange: true, pendingConflicts: [] })
    return
  }
  st.massChange = false

  // Bez konfliktu celé; s konfliktem jen pole, která se dají sloučit (soubor zůstane nepřijatý)
  const toApply = loadable
    .map((c) => (c.conflicts?.length ? { ...c, conflicts: [] } : c))
    .filter((c) => c.kind !== 'update' || Object.keys(c.patch ?? {}).length)
  const { applied } = toApply.length ? changeApplier(toApply) : { applied: [] }
  const appliedIds = new Set(applied.map((c) => c.id))
  const fullyDone = loadable.filter((c) => !c.conflicts?.length && (appliedIds.has(c.id) || (c.kind === 'update' && !Object.keys(c.patch ?? {}).length)))

  st.pendingConflicts = changes.filter((c) => c.conflicts?.length)
  if (applied.length) {
    vaultStatus.lastImport = { at: Date.now(), count: applied.length, labels: applied.map((c) => c.label).filter(Boolean) }
  }

  const accepted = [...unchanged.map((u) => u.path), ...fullyDone.map((c) => c.path)]
  if (accepted.length) {
    await acceptInQueue(target, accepted)
    // Přijaté soubory srovnat do kanonické podoby (přejmenování, kódy, smazání)
    await runExport(target, [])
  }
}

function updateConflictLabel() {
  const n = vaultStatus.pendingConflicts.length
  conflictLabel.value = n ? cs.vault.conflictStatus(n) : ''
}

/**
 * Připraví změny ze všech složek k ručnímu potvrzení (nic nezapisuje).
 * @returns {Promise<{ changes: Array<Object>, invalid: Array<Object>, unchanged: Array<{ root: string, path: string }> }>}
 */
export function collectVaultChanges() {
  if (!isTauri || !getState) return Promise.resolve({ changes: [], invalid: [], unchanged: [] })
  return enqueue(async () => {
    const out = { changes: [], invalid: [], unchanged: [] }
    const { targets } = currentTargets()
    for (const target of targets) {
      if (await checkProjectFolder(target)) continue
      const result = await prepareChanges(target)
      out.changes.push(...result.changes)
      out.invalid.push(...result.invalid)
      out.unchanged.push(...result.unchanged)
    }
    return out
  })
}

/**
 * Označí soubory jako přijaté (jejich změny jsou v aplikaci) a zapíše data – soubory se sjednotí
 * do kanonické podoby, přejmenují nebo smažou podle stavu aplikace.
 * @param {Array<{ root: string, path: string }>} items
 * @returns {Promise<void>}
 */
export async function acceptVaultPaths(items) {
  if (!isTauri || !getState || !items?.length) return
  clearTimeout(timer)
  const { targets } = currentTargets()
  await enqueue(async () => {
    for (const target of targets) {
      const paths = items.filter((i) => rootKey(i.root) === rootKey(target.root)).map((i) => i.path)
      await acceptInQueue(target, paths)
    }
  })
  const done = new Set(items.map((i) => `${rootKey(i.root)}|${i.path}`))
  for (const st of perTarget.values()) st.pendingConflicts = st.pendingConflicts.filter((c) => !done.has(c.id))
  publishStatus()
  await exportVaultNow()
}

/** Plugin definition */
export default {
  id: 'vault',
  name: 'Složka dat',
  core: true,

  install(ctx) {
    if (!isTauri) return
    getState = ctx.getState
    ctx.on('data:persisted', () => scheduleExport())
    ctx.on('data:replaced', () => scheduleExport())
    ctx.registerStatusItem({
      id: 'vault-export',
      label: 'statusBar.vault',
      value: lastExportTs,
      visible: () => vaultSettings.enabled && Boolean(vaultSettings.root),
    })
    ctx.registerStatusItem({
      id: 'vault-conflicts',
      label: 'statusBar.vaultConflicts',
      value: conflictLabel,
      kind: 'text',
      visible: () => vaultSettings.enabled && Boolean(conflictLabel.value),
    })
    // Návrat do okna (např. z Claude Code) → zkontrolovat složky
    if (typeof window !== 'undefined' && !focusListener) {
      focusListener = () => scheduleExport(FOCUS_CHECK_MS)
      window.addEventListener('focus', focusListener)
    }
    // Změna souborů ve složce (sledování v Rustu) → zkontrolovat po chvíli klidu
    listenToVaultChanges(() => scheduleExport())
      .then((unlisten) => { unlistenWatch = unlisten })
      .catch((err) => console.warn('[Vault] nelze poslouchat změny složky:', err))
    updateWatch()
    // Po startu srovná databázi se složkami (mohly se změnit, zatímco aplikace neběžela)
    scheduleExport(STARTUP_CHECK_MS)
  },

  uninstall() {
    clearTimeout(timer)
    if (focusListener && typeof window !== 'undefined') window.removeEventListener('focus', focusListener)
    focusListener = null
    if (unlistenWatch) unlistenWatch()
    unlistenWatch = null
    vaultUnwatch().catch(() => {})
    watchedKey = ''
    getState = null
  },
}
