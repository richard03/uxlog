import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createActivity } from '../models.js'
import { ACTIVITY_TYPES } from '../activityTypes.js'
import { getTemplate } from './config.js'
import { getActivityDeadlineDefault } from '../deadline.js'
import { generateId } from '../id.js'
import { addTask, getTask } from './tasks.js'
import { addConnection } from './connections.js'
import {
  getEffectiveActivityChecklist,
  omitChecklistItemTaskLink,
} from '../activityChecklistLinks.js'

/**
 * Checklist ze šablony v konfiguraci nebo z vestavěných ACTIVITY_TYPES.
 * @param {Object} activity
 * @returns {Array<{id: string, label?: string}>}
 */
function resolveTemplateChecklist(activity) {
  if (activity.typeKey) {
    const cfg = getTemplate(activity.typeKey)?.checklist
    if (cfg !== undefined && cfg !== null) return cfg
  }
  return ACTIVITY_TYPES.find((t) => t.key === activity.typeKey)?.checklist || []
}

export function getActivities(projectId) {
  return (getData().activities || [])
    .filter((a) => a.projectId === projectId && !a.dismissed)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getAllActivities(projectId) {
  return (getData().activities || []).filter((a) => a.projectId === projectId)
}

export function getActivity(id) {
  return getData().activities?.find((a) => a.id === id) ?? null
}

export function addActivity(projectId, overrides = {}) {
  let finalOverrides = { ...overrides }
  if (overrides.typeKey && !overrides.baseChecklist) {
    const template = getTemplate(overrides.typeKey)
    if (template?.checklist) {
      finalOverrides.baseChecklist = [...template.checklist]
    }
    if (!overrides.deadline && template?.defaultDurationDays) {
      finalOverrides.deadline = getActivityDeadlineDefault(template.defaultDurationDays) || ''
    }
  }
  const a = createActivity(projectId, finalOverrides)
  state.activities = state.activities || []
  state.activities.push(a)
  updateProject(projectId, {})
  persist()
  return a
}

export function updateActivity(id, updates) {
  const idx = state.activities?.findIndex((a) => a.id === id)
  if (idx === -1) return null
  state.activities[idx] = { ...state.activities[idx], ...updates }
  if (state.activities[idx].projectId) updateProject(state.activities[idx].projectId, {})
  persist()
  return state.activities[idx]
}

export function deleteActivity(id) {
  const activity = state.activities?.find((a) => a.id === id)
  state.activities = (state.activities || []).filter((a) => a.id !== id)
  if (activity?.projectId) updateProject(activity.projectId, {})
  persist()
}

function effectiveChecklist(activity) {
  return getEffectiveActivityChecklist(activity, resolveTemplateChecklist(activity))
}

function recalcStatus(activity, checkedItems) {
  const total = effectiveChecklist(activity).length
  if (total === 0) return activity.status
  if (checkedItems.length === total) return 'done'
  if (checkedItems.length === 0) return 'pending'
  return 'in_progress'
}

export function toggleChecklistItem(activityId, itemId) {
  const idx = state.activities?.findIndex((a) => a.id === activityId)
  if (idx === undefined || idx === -1) return
  const a = state.activities[idx]
  const checked = a.checkedItems || []
  const isCurrentlyChecked = checked.includes(itemId)
  const newChecked = isCurrentlyChecked
    ? checked.filter((id) => id !== itemId)
    : [...checked, itemId]
  state.activities[idx] = { ...a, checkedItems: newChecked, status: recalcStatus(a, newChecked) }
  persist()
}

export function addCustomChecklistItem(activityId, label) {
  const idx = state.activities?.findIndex((a) => a.id === activityId)
  if (idx === undefined || idx === -1) return
  const a = state.activities[idx]
  const newItem = { id: generateId(), label: label.trim() }
  const updated = { ...a, customChecklistItems: [...(a.customChecklistItems || []), newItem] }
  updated.status = recalcStatus(updated, updated.checkedItems || [])
  state.activities[idx] = updated
  persist()
}

export function removeChecklistItem(activityId, itemId) {
  const idx = state.activities?.findIndex((a) => a.id === activityId)
  if (idx === undefined || idx === -1) return
  const a = state.activities[idx]
  const baseChecklist = a.baseChecklist || resolveTemplateChecklist(a) || []
  const isDefault = baseChecklist.some((ci) => ci.id === itemId)
  const customChecklistItems = (a.customChecklistItems || []).filter((ci) => ci.id !== itemId)
  const removedChecklistItems = isDefault
    ? [...new Set([...(a.removedChecklistItems || []), itemId])]
    : (a.removedChecklistItems || [])
  const checkedItems = (a.checkedItems || []).filter((id) => id !== itemId)
  const checklistLabels = { ...(a.checklistLabels || {}) }
  delete checklistLabels[itemId]
  const checklistItemTaskIds = omitChecklistItemTaskLink(a.checklistItemTaskIds, itemId)
  const updated = { ...a, customChecklistItems, removedChecklistItems, checkedItems, checklistLabels, checklistItemTaskIds }
  updated.status = recalcStatus(updated, checkedItems)
  state.activities[idx] = updated
  persist()
}

export function updateChecklistLabel(activityId, itemId, label) {
  const idx = state.activities?.findIndex((a) => a.id === activityId)
  if (idx === undefined || idx === -1) return
  const a = state.activities[idx]
  const labels = { ...(a.checklistLabels || {}) }
  if (label && label.trim()) {
    labels[itemId] = label.trim()
  } else {
    delete labels[itemId]
  }
  state.activities[idx] = { ...a, checklistLabels: labels }
  persist()
}

/**
 * Z položky checklistu vytvoří úkol (stejná pole jako při ručním přidání úkolu), propojí aktivitu s úkolem.
 * Pokud už položka vede na existující úkol, nový nevytváří.
 * @param {string} activityId
 * @param {string} checklistItemId
 * @param {{ code?: string, name: string, description?: string }} taskPayload
 * @returns {{ task: Object, created: boolean }|null}
 */
export function createTaskFromChecklistItem(activityId, checklistItemId, taskPayload) {
  const idx = state.activities?.findIndex((a) => a.id === activityId)
  if (idx === undefined || idx === -1) return null
  const a = state.activities[idx]
  const items = effectiveChecklist(a)
  const item = items.find((ci) => ci.id === checklistItemId)
  if (!item) return null

  const name = (taskPayload?.name || '').trim()
  if (!name) return null

  const linkedId = a.checklistItemTaskIds?.[checklistItemId]
  if (linkedId) {
    const existing = getTask(linkedId)
    if (existing && existing.projectId === a.projectId) {
      return { task: existing, created: false }
    }
  }

  const task = addTask(a.projectId, {
    code: (taskPayload?.code || '').trim(),
    name,
    description: (taskPayload?.description || '').trim(),
  })
  addConnection(a.projectId, 'activities', a.id, 'tasks', task.id)
  const checklistItemTaskIds = { ...(a.checklistItemTaskIds || {}), [checklistItemId]: task.id }
  state.activities[idx] = { ...a, checklistItemTaskIds }
  persist()
  return { task, created: true }
}

/**
 * Vytvoří úkol a přidá souvislost aktivita ↔ úkol (bez vazby na položku checklistu).
 * @param {string} activityId
 * @param {{ code?: string, name: string, description?: string }} taskPayload
 * @returns {Object|null} Úkol nebo null při chybě validace
 */
export function addTaskLinkedToActivity(activityId, taskPayload) {
  const a = getActivity(activityId)
  if (!a) return null
  const name = (taskPayload?.name || '').trim()
  if (!name) return null
  const task = addTask(a.projectId, {
    code: (taskPayload?.code || '').trim(),
    name,
    description: (taskPayload?.description || '').trim(),
  })
  addConnection(a.projectId, 'activities', activityId, 'tasks', task.id)
  return task
}
