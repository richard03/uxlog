/**
 * Vault – cíle zápisu: do které složky se zapisuje který projekt.
 *
 *   výchozí složka (layout shared)   projekty bez vlastního nastavení, projects/<Název>/…
 *   vlastní složka (layout project)  jeden projekt přímo v kořeni složky
 *   vyřazený projekt                 nezapisuje se nikam
 *
 * Vlastní složka nesmí být výchozí složkou, ležet v ní ani ji obsahovat a dva projekty nesmí
 * sdílet (ani vnořit) složku – takový projekt se nezapisuje a vrátí se jako problém.
 * Čisté funkce.
 */

import { VAULT_LAYOUT, VAULT_COLLECTIONS, PROJECTS_DIR, isSameOrInside, rootKey, assignProjectFolders } from './paths.js'
import { normalizeVaultSettings } from './settings.js'

/** Problémy s vlastní složkou projektu. */
export const TARGET_ISSUE = Object.freeze({
  SAME_AS_DEFAULT: 'sameAsDefault',
  INSIDE_DEFAULT: 'insideDefault',
  CONTAINS_DEFAULT: 'containsDefault',
  DUPLICATE: 'duplicateFolder',
  NESTED: 'nestedFolder',
})

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** Kolekce stavu patřící projektům (entity a souvislosti). */
const PROJECT_KEYS = [...VAULT_COLLECTIONS.map((c) => c.collection), 'connections']

/**
 * Ověří vlastní složku projektu proti výchozí složce a složkám jiných projektů.
 * @param {string} root
 * @param {string} defaultRoot
 * @param {string[]} [otherRoots]
 * @returns {string|null} kód problému (TARGET_ISSUE) nebo null
 */
export function checkProjectRoot(root, defaultRoot, otherRoots = []) {
  if (defaultRoot) {
    if (rootKey(root) === rootKey(defaultRoot)) return TARGET_ISSUE.SAME_AS_DEFAULT
    if (isSameOrInside(root, defaultRoot)) return TARGET_ISSUE.INSIDE_DEFAULT
    if (isSameOrInside(defaultRoot, root)) return TARGET_ISSUE.CONTAINS_DEFAULT
  }
  for (const other of otherRoots) {
    if (rootKey(root) === rootKey(other)) return TARGET_ISSUE.DUPLICATE
    if (isSameOrInside(root, other) || isSameOrInside(other, root)) return TARGET_ISSUE.NESTED
  }
  return null
}

/**
 * Rozdělí projekty do složek podle nastavení.
 * @param {Object} settings - nastavení vaultu (settings.js)
 * @param {Object} state - stav aplikace
 * @returns {{
 *   targets: Array<{ root: string, layout: string, projectIds: string[] }>,  výchozí složka vždy první
 *   issues: Array<{ projectId: string, root: string, code: string }>,
 * }}
 */
export function resolveVaultTargets(settings, state) {
  const s = normalizeVaultSettings(settings)
  if (!s.enabled || !s.root) return { targets: [], issues: [] }
  const shared = { root: s.root, layout: VAULT_LAYOUT.SHARED, projectIds: [] }
  const custom = []
  const issues = []
  const projects = (Array.isArray(state?.projects) ? state.projects : []).filter((p) => isObject(p) && p.id)
  for (const project of projects) {
    const setting = s.projects[project.id]
    if (setting?.off) continue
    if (!setting?.root) {
      shared.projectIds.push(project.id)
      continue
    }
    const code = checkProjectRoot(setting.root, s.root, custom.map((t) => t.root))
    if (code) {
      issues.push({ projectId: project.id, root: setting.root, code })
      continue
    }
    custom.push({ root: setting.root, layout: VAULT_LAYOUT.PROJECT, projectIds: [project.id] })
  }
  return { targets: [shared, ...custom], issues }
}

/**
 * Stav zúžený na vybrané projekty (projekty, jejich entity a souvislosti).
 * @param {Object} state
 * @param {string[]} projectIds
 * @returns {Object}
 */
export function scopeState(state, projectIds) {
  const ids = new Set(projectIds ?? [])
  const out = { projects: (Array.isArray(state?.projects) ? state.projects : []).filter((p) => isObject(p) && ids.has(p.id)) }
  for (const key of PROJECT_KEYS) {
    out[key] = (Array.isArray(state?.[key]) ? state[key] : []).filter((r) => isObject(r) && ids.has(r.projectId))
  }
  return out
}

/**
 * Záznamy, které nepatří žádnému existujícímu projektu (nezapíší se do žádné složky).
 * @param {Object} state
 * @returns {Array<{ code: 'orphanEntities', collection: string, count: number }>}
 */
export function findOrphans(state) {
  const ids = new Set((Array.isArray(state?.projects) ? state.projects : []).filter(isObject).map((p) => p.id))
  const out = []
  for (const key of PROJECT_KEYS) {
    const count = (Array.isArray(state?.[key]) ? state[key] : []).filter((r) => isObject(r) && !ids.has(r.projectId)).length
    if (count) out.push({ code: 'orphanEntities', collection: key, count })
  }
  return out
}

/**
 * Plná cesta ke složce projektu ve výchozí složce dat (projects/<Název projektu>), jak ji zapíše
 * aplikace – včetně přípony při shodě názvů s jiným projektem výchozí složky.
 * @param {Object} settings - nastavení vaultu
 * @param {Object} state - stav aplikace
 * @param {string} projectId
 * @returns {string} '' když výchozí složka není nastavená nebo projekt neexistuje
 */
export function defaultProjectFolderPath(settings, state, projectId) {
  const s = normalizeVaultSettings(settings)
  const projects = (Array.isArray(state?.projects) ? state.projects : []).filter((p) => isObject(p) && p.id)
  if (!s.root || !projects.some((p) => p.id === projectId)) return ''
  // Složky přiděluje aplikace jen projektům výchozí složky (a tomuto projektu, kdyby se do ní vrátil)
  const shared = projects.filter((p) => p.id === projectId || !s.projects[p.id])
  const folder = assignProjectFolders(shared).get(projectId)
  const sep = s.root.includes('\\') ? '\\' : '/'
  return [s.root.replace(/[\\/]+$/, ''), PROJECTS_DIR, folder].join(sep)
}
