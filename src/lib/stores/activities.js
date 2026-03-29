import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createActivity } from '../models.js'
import { ACTIVITY_TYPES } from '../activityTypes.js'
import { getTemplate, getTemplateDurationDays } from './config.js'
import { getActivityDeadlineDefault } from '../deadline.js'
import { generateId } from '../id.js'

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
  const baseChecklist = activity.baseChecklist || (ACTIVITY_TYPES.find((t) => t.key === activity.typeKey)?.checklist) || []
  const removed = new Set(activity.removedChecklistItems || [])
  const defaults = baseChecklist.filter((ci) => !removed.has(ci.id))
  return [...defaults, ...(activity.customChecklistItems || [])]
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
  const baseChecklist = a.baseChecklist || (ACTIVITY_TYPES.find((t) => t.key === a.typeKey)?.checklist) || []
  const isDefault = baseChecklist.some((ci) => ci.id === itemId)
  const customChecklistItems = (a.customChecklistItems || []).filter((ci) => ci.id !== itemId)
  const removedChecklistItems = isDefault
    ? [...new Set([...(a.removedChecklistItems || []), itemId])]
    : (a.removedChecklistItems || [])
  const checkedItems = (a.checkedItems || []).filter((id) => id !== itemId)
  const checklistLabels = { ...(a.checklistLabels || {}) }
  delete checklistLabels[itemId]
  const updated = { ...a, customChecklistItems, removedChecklistItems, checkedItems, checklistLabels }
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
