/**
 * Vault – načtení změn ze složky do aplikace (soubory → data), čistá logika.
 *
 * Vstupem jsou cesty, které se změnily mimo aplikaci (konflikty z planVaultWrite + nové soubory),
 * obsah všech datových souborů a současný stav aplikace. Výstupem je seznam změn k potvrzení:
 *   create     nový záznam/projekt (bez id → id a kód se přidělí)
 *   update     změněná pole existujícího záznamu/projektu (patch; undefined = pole odebrat), trojcestně
 *              sloučená se základem; pole změněná v aplikaci i v souboru jsou v `conflicts`
 *   delete     soubor smazán → smazat záznam
 *   connections  změna souvislostí projektu (nový seznam `after`)
 *   unsupported  změna, kterou ze souborů nelze načíst (smazání projektu)
 * Soubory s chybou jsou v `invalid`, soubory bez věcné změny v `unchanged` (stačí je přijmout).
 * Čisté funkce – id a čas se předávají parametrem.
 */

import { ENTITY_CONFIG } from '../dataConfig.js'
import { generateNextCode } from '../code.js'
import { parseVaultFiles } from './workspace.js'
import { applyDefaults, VAULT_PROJECT_EXCLUDED_FIELDS } from './format.js'
import { collectionInfo, normalizeVaultPath, PROJECTS_DIR, INDEX_FILE } from './paths.js'
import { CONFLICT, baseKey } from './sync.js'
import { mergeRecord } from './merge.js'

/** Pole, která se při porovnání ignorují (nastavuje je aplikace). */
const IGNORED_FIELDS = new Set(['updatedAt', 'createdAt', 'lastWorkedAt'])

/** Důvod „nový soubor“ – soubor, který aplikace nezapsala a na jeho cestu nic nepíše. */
export const NEW_FILE = 'newFile'

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

/** Stabilní serializace pro porovnání (pořadí klíčů nehraje roli). */
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (isObject(value)) return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`
  return JSON.stringify(value ?? null)
}

/**
 * Rozdíl dvou verzí záznamu: jen pole obsažená v nové verzi (+ extraSections), bez polí z IGNORED_FIELDS.
 * Pole, která v současném záznamu chybějí, se porovnávají s výchozí hodnotou.
 * @param {Object} current
 * @param {Object} next
 * @param {Object} defaults
 * @param {string[]} [excluded]
 * @returns {Array<{ field: string, before: unknown, after: unknown }>}
 */
export function diffRecord(current, next, defaults = {}, excluded = []) {
  const base = applyDefaults(clone(current ?? {}), defaults)
  const keys = new Set([...Object.keys(next ?? {}), 'extraSections'])
  const fields = []
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key) || excluded.includes(key) || key === 'id') continue
    const before = base[key]
    const after = next?.[key]
    if (key === 'extraSections' && before === undefined && after === undefined) continue
    if (stable(before) !== stable(after)) fields.push({ field: key, before: clone(before), after: clone(after) })
  }
  return fields
}

/**
 * Najde nové datové soubory: v projects/, aplikace je nezapsala (nejsou v manifestu) a nepíše na jejich cestu.
 * @param {Array<{ path: string }>} disk
 * @param {Object.<string, string>} manifest
 * @param {Iterable<string>} desiredPaths
 * @returns {string[]}
 */
export function findNewFiles(disk, manifest, desiredPaths) {
  const desired = new Set([...desiredPaths].map(normalizeVaultPath))
  return (Array.isArray(disk) ? disk : [])
    .map((f) => normalizeVaultPath(f?.path))
    .filter((p) => p.startsWith(`${PROJECTS_DIR}/`) && /\.(md|ya?ml)$/i.test(p) && !p.endsWith(`/${INDEX_FILE}`))
    .filter((p) => !manifest?.[p] && !desired.has(p))
    .sort()
}

/** Popisek záznamu pro náhled: „PER-001 Anna“. */
function recordLabel(record) {
  return [record?.code, record?.name].filter((x) => typeof x === 'string' && x.trim()).join(' ') || record?.id || ''
}

/**
 * Sestaví změny k načtení ze složky.
 * @param {{
 *   files: Array<{ path: string, content: string }>,            všechny datové soubory vaultu
 *   changed: Array<{ path: string, reason: string }>,           změněné cesty (konflikty + nové soubory)
 *   desiredIndex: Object.<string, { collection: string, id: string|null, projectId: string }>,  z buildVaultFiles
 *   base?: Object.<string, unknown>,                             základ pro slučování (klíče baseKey)
 *   state: Object,                                               současná data aplikace
 *   headingFor?: Function, entityConfig?: Object,
 *   generateId: () => string, now: string,
 * }} input
 * @returns {{ changes: Array<Object>, invalid: Array<{ path: string, issues: Array<Object> }>, unchanged: string[] }}
 */
export function buildVaultImport(input) {
  const { files, changed, desiredIndex = {}, state = {}, base = {}, headingFor, entityConfig = ENTITY_CONFIG, generateId, now } = input
  const baseFor = (collection, id) => base?.[baseKey({ collection, id })] ?? null
  const parsed = parseVaultFiles(files, { headingFor, entityConfig })
  const changes = []
  const invalid = []
  const unchanged = []

  const errorsByPath = new Map()
  for (const e of parsed.errors) {
    if (!errorsByPath.has(e.path)) errorsByPath.set(e.path, [])
    errorsByPath.get(e.path).push(e)
  }
  const warningsByPath = new Map()
  for (const w of parsed.warnings) {
    if (!warningsByPath.has(w.path)) warningsByPath.set(w.path, [])
    warningsByPath.get(w.path).push(w)
  }
  const indexByPath = new Map(parsed.index.map((e) => [e.path, e]))
  const changedPaths = (Array.isArray(changed) ? changed : [])
    .map((c) => ({ path: normalizeVaultPath(c?.path), reason: c?.reason }))
    .filter((c) => c.path.startsWith(`${PROJECTS_DIR}/`))

  // id projektů podle složky; nový project.md bez id dostane id hned (potřebují ho i jeho záznamy)
  const projectIdByFolder = new Map()
  const parsedProjectIdByFolder = new Map()
  const newProjectIds = new Map()
  for (const entry of parsed.index) {
    if (entry.collection !== 'projects') continue
    parsedProjectIdByFolder.set(entry.projectFolder, entry.id ?? undefined)
    let id = entry.id
    if (!id && changedPaths.some((c) => c.path === entry.path)) {
      id = generateId()
      newProjectIds.set(entry.path, id)
    }
    if (id) projectIdByFolder.set(entry.projectFolder, id)
  }

  const stateList = (collection) => (Array.isArray(state?.[collection]) ? state[collection] : [])
  const findCurrent = (collection, id) => (id ? stateList(collection).find((r) => r?.id === id) ?? null : null)
  const createdCodes = []

  function nextCode(entityType, collection, projectId) {
    const prefix = entityConfig?.[entityType]?.codePrefix
    if (!prefix) return undefined
    const existing = [
      ...stateList(collection).filter((r) => r?.projectId === projectId),
      ...createdCodes.filter((c) => c.collection === collection && c.projectId === projectId),
    ]
    const code = generateNextCode(prefix, existing)
    createdCodes.push({ collection, projectId, code })
    return code
  }

  for (const { path, reason } of changedPaths) {
    if (reason === CONFLICT.DELETED) {
      const info = desiredIndex[path]
      if (!info) {
        unchanged.push(path)
      } else if (info.collection === 'projects') {
        changes.push({ id: path, path, kind: 'unsupported', reason: 'projectDelete', collection: 'projects', entityId: info.id, label: recordLabel(findCurrent('projects', info.id)) })
      } else if (info.collection === 'connections') {
        const before = stateList('connections').filter((c) => c?.projectId === info.projectId)
        if (before.length) changes.push({ id: path, path, kind: 'connections', projectId: info.projectId, added: [], removed: before, updated: [], after: [] })
        else unchanged.push(path)
      } else {
        const current = findCurrent(info.collection, info.id)
        if (current) {
          changes.push({ id: path, path, kind: 'delete', collection: info.collection, entityId: info.id, projectId: current.projectId, label: recordLabel(current), before: clone(current) })
        } else {
          unchanged.push(path)
        }
      }
      continue
    }

    if (errorsByPath.has(path)) {
      invalid.push({ path, issues: errorsByPath.get(path) })
      continue
    }
    const entry = indexByPath.get(path)
    const record = parsed.records[path]
    if (!entry || (!record && entry.collection !== 'connections')) {
      const issues = [...(warningsByPath.get(path) ?? []), ...parsed.errors.filter((e) => path.startsWith(e.path.replace(/project\.md$/, '')))]
      invalid.push({ path, issues: issues.length ? issues : [{ path, code: 'unknownFile' }] })
      continue
    }

    if (entry.collection === 'projects') {
      const defaults = entityConfig?.project?.defaults ?? {}
      const id = record.id || newProjectIds.get(path)
      const current = findCurrent('projects', id)
      if (!current) {
        changes.push({ id: path, path, kind: 'create', collection: 'projects', entityId: id, projectId: id, label: recordLabel(record), record: { ...clone(record), id, createdAt: record.createdAt || now } })
      } else {
        const merged = mergeRecord({ base: baseFor('projects', id), app: current, file: record, defaults, excluded: VAULT_PROJECT_EXCLUDED_FIELDS })
        if (merged.fields.length || merged.conflicts.length) {
          changes.push({ id: path, path, kind: 'update', collection: 'projects', entityId: id, projectId: id, label: recordLabel(record), ...merged })
        } else {
          unchanged.push(path)
        }
      }
      continue
    }

    if (entry.collection === 'connections') {
      const projectId = projectIdByFolder.get(entry.projectFolder)
      const parsedProjectId = parsedProjectIdByFolder.get(entry.projectFolder)
      const next = parsed.data.connections
        .filter((c) => c.projectId === parsedProjectId)
        .map((c) => ({ ...clone(c), projectId, id: c.id || generateId(), createdAt: c.createdAt || now }))
      const before = stateList('connections').filter((c) => c?.projectId === projectId)
      const beforeById = new Map(before.map((c) => [c.id, c]))
      const nextIds = new Set(next.map((c) => c.id))
      const added = next.filter((c) => !beforeById.has(c.id))
      const removed = before.filter((c) => !nextIds.has(c.id))
      const updated = next
        .filter((c) => beforeById.has(c.id) && diffRecord(beforeById.get(c.id), c).length)
        .map((c) => ({ before: clone(beforeById.get(c.id)), after: c }))
      if (added.length || removed.length || updated.length) changes.push({ id: path, path, kind: 'connections', projectId, added, removed, updated, after: next })
      else unchanged.push(path)
      continue
    }

    const info = collectionInfo(entry.collection)
    const defaults = entityConfig?.[info.entityType]?.defaults ?? {}
    const projectId = projectIdByFolder.get(entry.projectFolder)
    const next = { ...clone(record), projectId }
    const current = findCurrent(entry.collection, record.id)
    if (!current) {
      const id = record.id || generateId()
      const code = next.code || nextCode(info.entityType, entry.collection, projectId)
      const created = { ...next, id, createdAt: next.createdAt || now }
      if (code !== undefined) created.code = code
      changes.push({ id: path, path, kind: 'create', collection: entry.collection, entityId: id, projectId, label: recordLabel(created), record: created })
      continue
    }
    const merged = mergeRecord({ base: baseFor(entry.collection, current.id), app: current, file: next, defaults })
    if (merged.fields.length || merged.conflicts.length) {
      changes.push({ id: path, path, kind: 'update', collection: entry.collection, entityId: current.id, projectId, label: recordLabel(next), ...merged })
    } else {
      unchanged.push(path)
    }
  }

  // Soubor přesunutý/přejmenovaný mimo aplikaci: stará cesta vypadá jako smazaná, ale záznam
  // se objevil v jiném souboru – nesmí se smazat (stará cesta se jen přijme).
  const keptIds = new Set(changes.filter((c) => c.kind === 'create' || c.kind === 'update').map((c) => `${c.collection}:${c.entityId}`))
  for (const entry of parsed.index) if (entry.id) keptIds.add(`${entry.collection}:${entry.id}`)
  const result = []
  for (const change of changes) {
    if (change.kind === 'delete' && keptIds.has(`${change.collection}:${change.entityId}`)) unchanged.push(change.path)
    else result.push(change)
  }
  return { changes: result, invalid, unchanged }
}
