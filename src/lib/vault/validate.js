/**
 * Vault – kontrola souborů (pro CLI Clauda, hook po úpravě souboru a náhled změn v aplikaci).
 *
 * validateVault(files) naparsuje celý vault a vrátí seznam problémů:
 *   { path, level: 'error'|'warning', code, line?, field?, value?, ... }
 * Chyby (error) znamenají, že soubor nejde načíst nebo by porušil data (neplatná hodnota výběru,
 * duplicitní id/kód). Odkaz na neexistující záznam je varování – aplikace takové odkazy toleruje
 * (starší data je běžně obsahují), nové ale CLI nepřidá. Ostatní varování jsou doporučení.
 * Texty hlášení skládá formatIssue z předaných textů (i18n), lib sám texty nemá.
 * Čisté funkce.
 */

import { ENTITY_CONFIG } from '../dataConfig.js'
import { parseVaultFiles } from './workspace.js'
import { VAULT_COLLECTIONS, collectionInfo } from './paths.js'

/** Pole vazeb → kolekce, na kterou odkazují (vazby jsou vždy v rámci projektu). */
export const REF_FIELDS = Object.freeze({
  personaIds: 'personas',
  scenarioIds: 'scenarios',
  requirementIds: 'requirements',
  hypothesisIds: 'hypotheses',
  stakeholderIds: 'stakeholders',
  conflictingRequirementIds: 'requirements',
})

/** Kolekce, mezi kterými smí vést obecná souvislost (connections.yaml). */
const CONNECTABLE = new Set(VAULT_COLLECTIONS.map((c) => c.collection))

const CODE_PATTERN = /^([A-Z]+)-(\d+)$/i

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Povolené hodnoty polí výběru podle entities.yaml (jen pole s pevným seznamem možností).
 * @param {string} entityType
 * @param {Object} [entityConfig]
 * @returns {Object.<string, string[]>} klíč pole → povolené hodnoty
 */
export function getSelectOptions(entityType, entityConfig = ENTITY_CONFIG) {
  const out = {}
  for (const field of entityConfig?.[entityType]?.fields ?? []) {
    if (field?.type !== 'select' || !Array.isArray(field.options) || !field.options.length) continue
    out[field.key] = field.options.map((o) => (isObject(o) ? o.value : o)).filter((v) => typeof v === 'string')
  }
  return out
}

/**
 * Zkontroluje naparsovaná data vaultu.
 * @param {ReturnType<typeof parseVaultFiles>} parsed
 * @param {{ entityConfig?: Object }} [options]
 * @returns {Array<Object>} problémy seřazené podle cesty
 */
export function validateParsedVault(parsed, options = {}) {
  const { entityConfig = ENTITY_CONFIG } = options
  const issues = []
  for (const e of parsed?.errors ?? []) issues.push({ level: 'error', ...e })
  for (const w of parsed?.warnings ?? []) issues.push({ level: 'warning', ...w })

  const data = parsed?.data ?? {}
  const pathOf = new Map()
  for (const entry of parsed?.index ?? []) {
    if (entry.id) pathOf.set(`${entry.collection}:${entry.id}`, entry.path)
  }

  // id podle kolekce a projektu – pro kontrolu vazeb
  const idsByProject = new Map()
  for (const { collection } of VAULT_COLLECTIONS) {
    for (const e of data[collection] ?? []) {
      if (!e?.id) continue
      const key = `${e.projectId}:${collection}`
      if (!idsByProject.has(key)) idsByProject.set(key, new Set())
      idsByProject.get(key).add(e.id)
    }
  }
  const exists = (projectId, collection, id) => idsByProject.get(`${projectId}:${collection}`)?.has(id) ?? false

  for (const { collection, entityType } of VAULT_COLLECTIONS) {
    const options = getSelectOptions(entityType, entityConfig)
    const prefix = entityConfig?.[entityType]?.codePrefix ?? ''
    const codes = new Map()
    for (const entity of data[collection] ?? []) {
      const path = pathOf.get(`${collection}:${entity.id}`) ?? null
      if (!path) continue // soubor bez id – hlášeno jako missingId
      const at = { path }

      if (typeof entity.name !== 'string' || !entity.name.trim()) {
        issues.push({ ...at, level: 'warning', code: 'missingName' })
      }

      for (const [field, allowed] of Object.entries(options)) {
        const value = entity[field]
        if (value === '' || value == null) continue
        if (!allowed.includes(value)) issues.push({ ...at, level: 'error', code: 'invalidOption', field, value, allowed })
      }

      for (const [field, target] of Object.entries(REF_FIELDS)) {
        const refs = entity[field]
        if (refs === undefined) continue
        if (!Array.isArray(refs)) {
          issues.push({ ...at, level: 'error', code: 'refNotList', field })
          continue
        }
        for (const id of refs) {
          if (!exists(entity.projectId, target, id)) issues.push({ ...at, level: 'warning', code: 'danglingRef', field, value: id, target })
        }
        if (new Set(refs).size !== refs.length) issues.push({ ...at, level: 'warning', code: 'duplicateRef', field })
      }

      if (isObject(entity.checklistItemTaskIds)) {
        for (const [item, taskId] of Object.entries(entity.checklistItemTaskIds)) {
          if (taskId && !exists(entity.projectId, 'tasks', taskId)) {
            issues.push({ ...at, level: 'warning', code: 'danglingRef', field: `checklistItemTaskIds.${item}`, value: taskId, target: 'tasks' })
          }
        }
      }

      if (prefix && typeof entity.code === 'string' && entity.code) {
        const m = entity.code.match(CODE_PATTERN)
        if (!m || m[1].toUpperCase() !== prefix) issues.push({ ...at, level: 'warning', code: 'codePrefix', value: entity.code, expected: prefix })
        const codeKey = `${entity.projectId}:${entity.code.toUpperCase()}`
        if (codes.has(codeKey)) issues.push({ ...at, level: 'error', code: 'duplicateCode', value: entity.code, firstPath: codes.get(codeKey) })
        else codes.set(codeKey, path)
      }
    }
  }

  const connectionPaths = new Map()
  for (const entry of parsed?.index ?? []) {
    if (entry.collection === 'connections') connectionPaths.set(entry.projectFolder, entry.path)
  }
  const folderOf = new Map((parsed?.index ?? []).filter((e) => e.collection === 'projects').map((e) => [e.id, e.projectFolder]))
  for (const c of data.connections ?? []) {
    const path = connectionPaths.get(folderOf.get(c.projectId)) ?? null
    for (const n of [1, 2]) {
      const type = c[`entityType${n}`]
      const id = c[`entityId${n}`]
      if (!CONNECTABLE.has(type)) issues.push({ path, level: 'error', code: 'invalidConnectionType', value: type, connectionId: c.id ?? null })
      else if (!exists(c.projectId, type, id)) issues.push({ path, level: 'warning', code: 'danglingRef', field: `entityId${n}`, value: id, target: type, connectionId: c.id ?? null })
    }
  }

  return issues.sort((a, b) => String(a.path ?? '').localeCompare(String(b.path ?? '')))
}

/**
 * Naparsuje a zkontroluje celý vault.
 * @param {Array<{ path: string, content: string }>} files
 * @param {{ headingFor?: Function, entityConfig?: Object }} [options]
 * @returns {{ parsed: ReturnType<typeof parseVaultFiles>, issues: Array<Object> }}
 */
export function validateVault(files, options = {}) {
  const parsed = parseVaultFiles(files, options)
  return { parsed, issues: validateParsedVault(parsed, options) }
}

/**
 * Složí text hlášení z textů i18n (`messages.vaultIssues[code]` – řetězec nebo funkce(issue)).
 * Neznámý kód → kód sám.
 * @param {Object} issue
 * @param {Object} [messages] - např. výchozí export src/i18n/cs.js
 * @returns {string}
 */
export function formatIssue(issue, messages) {
  const template = messages?.vaultIssues?.[issue?.code]
  const text = typeof template === 'function' ? template(issue) : typeof template === 'string' ? template : String(issue?.code ?? '')
  return issue?.message && !text.includes(issue.message) ? `${text} (${issue.message})` : text
}

/**
 * Vrátí kolekci podle typu entity v jednotném i množném čísle (persona / personas).
 * @param {string} type
 * @returns {{ collection: string, entityType: string, dir: string }|null}
 */
export function resolveEntityType(type) {
  const t = String(type ?? '').trim()
  return collectionInfo(t) ?? VAULT_COLLECTIONS.find((c) => c.entityType === t || c.dir === t) ?? null
}
