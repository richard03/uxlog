/**
 * Store modul historie změn projektu.
 *
 * persist() (state.js) předá sem rozdíl stavu; změny z jedné akce (více persist()
 * v jednom synchronním běhu) se sloučí do jednoho záznamu na projekt.
 * Vrácení záznamu aplikuje inverzní změny (lib/history.js) a uloží je běžným persist(),
 * takže se zapíše jako nový záznam historie typu 'revert'.
 */

import { reactive } from 'vue'
import { state, persist } from './state.js'
import { generateId } from '../id.js'
import { loadHistoryData, saveHistoryData } from '../storage.js'
import {
  normalizeHistory, mergeChanges, groupChangesByProject, appendHistoryEntry,
  buildRevertPatch, diffStates, getDeletedProjects as findDeletedProjects, pruneHistory,
} from '../history.js'

const history = reactive({ projects: normalizeHistory(loadHistoryData()) })

/**
 * Znovu načte historii z úložiště. Volá initStore() – v Tauri se localStorage
 * obnovuje z nativního storage až po importu modulů.
 */
export function initHistory() {
  history.projects = normalizeHistory(loadHistoryData())
}

let buffer = []
let flushScheduled = false
/** Metadata pro záznam vznikající právě probíhající akcí (např. vrácení). */
let pendingMeta = null

/**
 * Zaznamená změny z persist(). Zápis proběhne po dokončení aktuální synchronní akce.
 * @param {Array} changes - výstup diffStates
 */
export function recordChanges(changes) {
  if (!changes?.length) return
  buffer = mergeChanges(buffer, changes)
  if (flushScheduled) return
  flushScheduled = true
  queueMicrotask(flushHistory)
}

/** Zapíše nasbírané změny jako záznamy historie (jeden na projekt). */
export function flushHistory() {
  flushScheduled = false
  const changes = buffer
  const meta = pendingMeta
  buffer = []
  pendingMeta = null
  if (!changes.length) return
  const at = new Date().toISOString()
  let next = history.projects
  for (const [projectId, projectChanges] of groupChangesByProject(changes)) {
    next = appendHistoryEntry(next, {
      id: generateId(),
      projectId,
      at,
      kind: meta?.kind === 'revert' ? 'revert' : 'edit',
      ...(meta?.revertOf ? { revertOf: meta.revertOf } : {}),
      changes: projectChanges,
    })
    if (meta?.revertOf) {
      next = markReverted(next, projectId, meta.revertOf, true)
      // Vrácení vrácení: původní záznam opět platí
      const reverted = (next[projectId] || []).find((e) => e.id === meta.revertOf)
      if (reverted?.revertOf) next = markReverted(next, projectId, reverted.revertOf, false)
    }
  }
  history.projects = pruneHistory(next, (state.projects || []).map((p) => p.id))
  saveHistoryData(history.projects)
}

function markReverted(projects, projectId, entryId, value) {
  const list = projects[projectId]
  if (!list) return projects
  return { ...projects, [projectId]: list.map((e) => (e.id === entryId ? { ...e, reverted: value } : e)) }
}

/**
 * Historie projektu od nejnovějšího záznamu.
 * @param {string} projectId
 * @returns {Array<Object>}
 */
export function getProjectHistory(projectId) {
  return [...(history.projects[projectId] || [])].reverse()
}

/**
 * Vrátí změny záznamu historie. Vrácení se zapíše jako nový záznam (lze ho opět vrátit).
 * @param {string} projectId
 * @param {string} entryId
 * @returns {boolean} true pokud se něco změnilo
 */
export function revertHistoryEntry(projectId, entryId) {
  const entry = (history.projects[projectId] || []).find((e) => e.id === entryId)
  if (!entry) return false
  const patch = buildRevertPatch(state, entry)
  if (!diffStates(state, patch, Object.keys(patch)).length) {
    // Stav už odpovídá původnímu – záznam jen označíme jako vrácený
    history.projects = markReverted(history.projects, projectId, entryId, true)
    saveHistoryData(history.projects)
    return false
  }
  Object.assign(state, patch)
  pendingMeta = { kind: 'revert', revertOf: entryId }
  persist()
  return true
}

/**
 * Smazané projekty, které lze obnovit z historie (od nejnověji smazaného).
 * @returns {Array<{projectId: string, name: string, at: string, entryId: string}>}
 */
export function getDeletedProjects() {
  return findDeletedProjects(history.projects, (state.projects || []).map((p) => p.id))
}

/**
 * Obnoví smazaný projekt včetně všech jeho záznamů.
 * @param {string} projectId
 * @returns {boolean}
 */
export function restoreDeletedProject(projectId) {
  const item = getDeletedProjects().find((d) => d.projectId === projectId)
  if (!item) return false
  return revertHistoryEntry(projectId, item.entryId)
}
