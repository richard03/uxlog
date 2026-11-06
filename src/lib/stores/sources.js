/**
 * Zdroje projektu – dokumenty, přepisy rozhovorů, e-maily a vložené texty, ze kterých AI vytěží
 * záznamy (persony, požadavky…). Vytěžené záznamy se propojí se zdrojem souvislostí.
 */

import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createSource, createConnection } from '../models.js'
import { splitNotebookForSources, notebookEntryToSource } from '../notebookChat.js'
import { nameFromText } from '../sourceFiles.js'
import { generateNextCode } from '../code.js'
import { ENTITY_CONFIG } from '../dataConfig.js'

export function getSources(projectId) {
  return (getData().sources || [])
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getSource(id) {
  return getData().sources?.find((s) => s.id === id) ?? null
}

export function addSource(projectId, overrides = {}) {
  const s = createSource(projectId, overrides)
  state.sources = state.sources || []
  state.sources.push(s)
  updateProject(projectId, {})
  persist()
  return s
}

/**
 * Přidá zdroj rovnou propojený se záznamem (např. zápis z meetingu u aktivity) – jedno uložení,
 * v historii jedna změna.
 * @param {string} projectId
 * @param {string} entityType kolekce záznamu (např. 'activities')
 * @param {string} entityId
 * @param {Object} overrides pole zdroje
 * @returns {Object|null} nový zdroj (null, když záznam v projektu neexistuje)
 */
export function addSourceForEntity(projectId, entityType, entityId, overrides = {}) {
  const target = (state[entityType] || []).find((r) => r?.id === entityId && r.projectId === projectId)
  if (!target) return null
  const s = createSource(projectId, overrides)
  state.sources = state.sources || []
  state.sources.push(s)
  state.connections = state.connections || []
  state.connections.push(createConnection(projectId, entityType, entityId, 'sources', s.id))
  updateProject(projectId, {})
  persist()
  return s
}

export function updateSource(id, updates) {
  const idx = state.sources?.findIndex((s) => s.id === id)
  if (idx === undefined || idx === -1) return null
  state.sources[idx] = { ...state.sources[idx], ...updates }
  if (state.sources[idx].projectId) updateProject(state.sources[idx].projectId, {})
  persist()
  return state.sources[idx]
}

export function deleteSource(id) {
  state.sources = (state.sources || []).filter((s) => s.id !== id)
  persist()
}

/**
 * Převede starší zprávy Zápisníku „Vložit informace“ na zdroje (jednorázově, při startu aplikace).
 * Dotazy zůstanou v historii chatu. Neprobíhá žádné volání AI; změna se nezapisuje do historie změn.
 * @returns {number} počet vytvořených zdrojů
 */
export function migrateNotebookToSources() {
  const prefix = ENTITY_CONFIG?.source?.codePrefix || 'ZDR'
  let created = 0
  for (const project of state.projects || []) {
    if (!project?.id) continue
    const { chat, toSources } = splitNotebookForSources(project)
    if (!toSources.length) continue
    state.sources = state.sources || []
    for (const entry of toSources) {
      const data = notebookEntryToSource(entry, { name: nameFromText, fallbackDate: project.createdAt || '' })
      const code = generateNextCode(prefix, state.sources.filter((s) => s.projectId === project.id))
      state.sources.push(createSource(project.id, { ...data, code, createdAt: data.createdAt || new Date().toISOString() }))
      created++
    }
    project.notebookHistory = chat
    project.notebook = ''
  }
  if (created) persist({ history: false })
  return created
}
