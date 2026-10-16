/**
 * Čistá business logika pro import dat z YAML.
 * Bez side effects – vhodné pro unit testy.
 */

import { generateId } from './id.js'
import {
  createProject,
  createGoal,
  createStakeholder,
  createCompetition,
  createHypothesis,
  createPersona,
  createScenario,
  createRequirement,
  createActivity,
  createTeamMember,
  createTask,
  createBug,
} from './models.js'

/** Továrny pro každý typ entity */
const ENTITY_FACTORIES = {
  goals: createGoal,
  stakeholders: createStakeholder,
  competitions: createCompetition,
  hypotheses: createHypothesis,
  personas: createPersona,
  scenarios: createScenario,
  requirements: createRequirement,
  activities: createActivity,
  teamMembers: createTeamMember,
  tasks: createTask,
  bugs: createBug,
}

/** Typy entit a klíče pro párování duplikátů */
const ENTITY_CONFIGS = [
  { key: 'goals', matchKeys: ['code', 'name'] },
  { key: 'stakeholders', matchKeys: ['name'] },
  { key: 'competitions', matchKeys: ['name'] },
  { key: 'hypotheses', matchKeys: ['code', 'name'] },
  { key: 'personas', matchKeys: ['code', 'name'] },
  { key: 'scenarios', matchKeys: ['code', 'name'] },
  { key: 'requirements', matchKeys: ['code', 'name'] },
  { key: 'activities', matchKeys: ['name'] },
  { key: 'teamMembers', matchKeys: ['name'] },
  { key: 'tasks', matchKeys: ['code', 'name'] },
  { key: 'bugs', matchKeys: ['code', 'name'] },
]

/** Pole s ID vztahů pro každý typ entity */
const RELATION_FIELDS = {
  stakeholders: ['requirementIds'],
  hypotheses: ['requirementIds'],
  personas: ['scenarioIds', 'requirementIds'],
  scenarios: ['personaIds', 'hypothesisIds', 'requirementIds'],
  requirements: ['conflictingRequirementIds', 'scenarioIds', 'stakeholderIds'],
}

/**
 * Analyzuje importovaná data a vrátí plán importu.
 * Pro každou entitu určí, zda jde o novou nebo přepisující položku.
 * Při targetProjectId '__new__' jsou všechny entity vždy "create".
 *
 * @param {Object} importedData - Parsovaná data z YAML
 * @param {Object} currentState - Aktuální stav aplikace
 * @param {string} targetProjectId - ID cílového projektu (nebo '__new__')
 * @returns {Object} Plán importu
 */
export function analyzeImport(importedData, currentState, targetProjectId) {
  const result = { project: null }
  for (const { key } of ENTITY_CONFIGS) result[key] = []

  if (importedData.project && typeof importedData.project === 'object') {
    result.project = { item: importedData.project, action: 'update' }
  }

  const isNew = targetProjectId === '__new__'

  for (const { key, matchKeys } of ENTITY_CONFIGS) {
    const items = importedData[key]
    if (!Array.isArray(items)) continue

    const existingInProject = isNew
      ? []
      : (currentState[key] || []).filter((e) => e.projectId === targetProjectId)

    for (const item of items) {
      if (!item || typeof item !== 'object') continue

      let existing = isNew ? null : existingInProject.find((e) => e.id === item.id)
      let matchReason = existing ? 'id' : null

      if (!existing && !isNew) {
        for (const mk of matchKeys) {
          if (item[mk] != null && String(item[mk]).trim()) {
            existing = existingInProject.find(
              (e) =>
                e[mk] != null &&
                String(e[mk]).trim().toLowerCase() === String(item[mk]).trim().toLowerCase()
            )
            if (existing) {
              matchReason = mk
              break
            }
          }
        }
      }

      result[key].push({
        item,
        action: existing ? 'update' : 'create',
        existing: existing || null,
        matchReason,
      })
    }
  }

  return result
}

/**
 * Sestaví finální data pro import na základě plánu a výběru uživatele.
 *
 * @param {Object} plan - Výsledek analyzeImport
 * @param {Object} selections - { project: bool, goals: bool[], ... }
 * @param {string|null} targetProjectId - ID existujícího projektu, nebo null pokud createNew
 * @param {Object} currentState
 * @param {boolean} createNew - Vytvořit nový projekt místo importu do existujícího
 * @returns {{ projectUpdates, newProjectData, upserts, effectiveProjectId }}
 */
export function buildImportData(plan, selections, targetProjectId, currentState, createNew = false) {
  // Určit efektivní project ID
  let effectiveProjectId = targetProjectId
  let newProjectData = null

  if (createNew) {
    const yamlProjectId = plan.project?.item?.id
    const collision = (currentState.projects || []).find((p) => p.id === yamlProjectId)
    effectiveProjectId = yamlProjectId && !collision ? yamlProjectId : generateId()

    const pi = plan.project?.item || {}
    const defaultName = pi.name || 'Importováno'
    newProjectData = createProject({
      id: effectiveProjectId,
      name: defaultName,
      scope: pi.scope || 'medium',
      priority: pi.priority || 'medium',
      phase: pi.phase || 'research',
      ...(pi.notebook != null ? { notebook: pi.notebook } : {}),
      ...(Array.isArray(pi.notebookHistory) ? { notebookHistory: pi.notebookHistory } : {}),
      ...(pi.deadline != null ? { deadline: pi.deadline } : {}),
      ...(pi.color != null ? { color: pi.color } : {}),
    })
  }

  const idMapping = new Map()

  // 1. sestavit mapování ID
  for (const { key } of ENTITY_CONFIGS) {
    const items = plan[key] || []
    const sel = selections[key] || []
    for (let i = 0; i < items.length; i++) {
      if (!sel[i]) continue
      const { item, action, existing } = items[i]
      if (action === 'update' && existing && existing.id !== item.id) {
        idMapping.set(item.id, existing.id)
      } else if (action === 'create') {
        const collision = (currentState[key] || []).find(
          (e) => e.id === item.id && e.projectId !== effectiveProjectId
        )
        if (collision) {
          idMapping.set(item.id, generateId())
        }
      }
    }
  }

  function remapIds(ids) {
    if (!Array.isArray(ids)) return ids
    return ids.map((id) => idMapping.get(id) || id)
  }

  // 2. sestavit finální entity
  const upserts = {}
  for (const { key } of ENTITY_CONFIGS) {
    upserts[key] = []
    const items = plan[key] || []
    const sel = selections[key] || []
    for (let i = 0; i < items.length; i++) {
      if (!sel[i]) continue
      const { item, action, existing } = items[i]
      const finalId =
        idMapping.get(item.id) || (action === 'update' && existing ? existing.id : item.id)

      // Základ entity: pro update zachováme existující data, pro create použijeme factory výchozí hodnoty
      let base
      if (action === 'update' && existing) {
        base = { ...existing }
      } else {
        const factory = ENTITY_FACTORIES[key]
        base = factory ? factory(effectiveProjectId) : {}
      }

      // Přepisujeme pouze atributy, které jsou skutečně přítomny v importovaných datech
      const prepared = { ...base, ...item, id: finalId, projectId: effectiveProjectId }
      for (const field of RELATION_FIELDS[key] || []) {
        if (Array.isArray(prepared[field])) {
          prepared[field] = remapIds(prepared[field])
        }
      }
      upserts[key].push({ finalId, prepared, existingId: existing?.id || null })
    }
  }

  // 3. metadata projektu (jen pro import do existujícího)
  let projectUpdates = null
  if (!createNew && plan.project && selections.project) {
    const { item } = plan.project
    projectUpdates = {}
    if (item.name != null) projectUpdates.name = item.name
    if (item.scope != null) projectUpdates.scope = item.scope
    if (item.priority != null) projectUpdates.priority = item.priority
    if (item.phase != null) projectUpdates.phase = item.phase
    if (item.notebook != null) projectUpdates.notebook = item.notebook
    if (Array.isArray(item.notebookHistory)) projectUpdates.notebookHistory = item.notebookHistory
    if (item.deadline != null) projectUpdates.deadline = item.deadline
    if (item.color != null) projectUpdates.color = item.color
  }

  return { projectUpdates, newProjectData, upserts, effectiveProjectId }
}
