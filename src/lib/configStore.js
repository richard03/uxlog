/**
 * Správa konfigurace aplikace (šablony aktivit, vlastní atributy entit).
 * Konfigurace je uložena v localStorage pod klíčem 'uxlog_config'.
 */

import { reactive, toRaw } from 'vue'
import { ACTIVITY_TYPES } from './activityTypes.js'
import { generateId } from './id.js'

const STORAGE_KEY = 'uxlog_config'

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : getEmptyConfig()
  } catch {
    return getEmptyConfig()
  }
}

function getEmptyConfig() {
  return {
    activityTemplateOverrides: {},
    customActivityTemplates: [],
    entityCustomFields: {},
  }
}

export const configState = reactive(Object.assign(getEmptyConfig(), loadConfig()))

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(configState)))
}

/**
 * Vrátí efektivní seznam šablon aktivit (zabudované + přizpůsobení + vlastní).
 * @returns {Array}
 */
export function getEffectiveTemplates() {
  const overrides = configState.activityTemplateOverrides || {}

  const builtIn = ACTIVITY_TYPES
    .filter((t) => !overrides[t.key]?.deleted)
    .map((t) => {
      const o = overrides[t.key] || {}
      return {
        key: t.key,
        group: o.group !== undefined ? o.group : t.group,
        name: o.name !== undefined ? o.name : t.defaultName,
        description: o.description !== undefined ? o.description : t.defaultDescription,
        sortOrder: o.sortOrder !== undefined ? o.sortOrder : t.sortOrder,
        createOnNewProject: o.createOnNewProject !== undefined ? o.createOnNewProject : true,
        checklist: o.checklist !== undefined ? o.checklist : t.checklist,
        isBuiltIn: true,
        isCustom: false,
      }
    })

  const custom = (configState.customActivityTemplates || []).map((t) => ({
    ...t,
    isBuiltIn: false,
    isCustom: true,
  }))

  return [...builtIn, ...custom].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

/**
 * Vrátí šablonu aktivity podle klíče.
 * @param {string} key
 * @returns {Object|undefined}
 */
export function getTemplate(key) {
  return getEffectiveTemplates().find((t) => t.key === key)
}

/**
 * Vrátí smazané zabudované šablony.
 * @returns {Array}
 */
export function getDeletedBuiltInTemplates() {
  const overrides = configState.activityTemplateOverrides || {}
  return ACTIVITY_TYPES
    .filter((t) => overrides[t.key]?.deleted)
    .map((t) => {
      const o = overrides[t.key] || {}
      return {
        key: t.key,
        name: o.name !== undefined ? o.name : t.defaultName,
        group: t.group,
        isBuiltIn: true,
        isCustom: false,
      }
    })
}

/**
 * Vrátí vlastní atributy entity daného typu.
 * @param {string} entityType
 * @returns {Array}
 */
export function getEntityCustomFields(entityType) {
  return [...(configState.entityCustomFields?.[entityType] || [])].sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
  )
}

// --- Šablony aktivit ---

export function addCustomTemplate(fields = {}) {
  if (!configState.customActivityTemplates) configState.customActivityTemplates = []
  configState.customActivityTemplates.push({
    key: generateId(),
    group: 'project',
    name: '',
    description: '',
    sortOrder: 9999,
    createOnNewProject: false,
    checklist: [],
    ...fields,
  })
  persist()
}

export function updateTemplate(key, updates) {
  const isBuiltIn = ACTIVITY_TYPES.some((t) => t.key === key)
  if (isBuiltIn) {
    if (!configState.activityTemplateOverrides) configState.activityTemplateOverrides = {}
    configState.activityTemplateOverrides[key] = {
      ...(configState.activityTemplateOverrides[key] || {}),
      ...updates,
    }
  } else {
    const arr = configState.customActivityTemplates || []
    const idx = arr.findIndex((t) => t.key === key)
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...updates }
    }
  }
  persist()
}

export function deleteTemplate(key) {
  const isBuiltIn = ACTIVITY_TYPES.some((t) => t.key === key)
  if (isBuiltIn) {
    if (!configState.activityTemplateOverrides) configState.activityTemplateOverrides = {}
    configState.activityTemplateOverrides[key] = {
      ...(configState.activityTemplateOverrides[key] || {}),
      deleted: true,
    }
  } else {
    configState.customActivityTemplates = (configState.customActivityTemplates || []).filter(
      (t) => t.key !== key
    )
  }
  persist()
}

export function restoreTemplate(key) {
  if (configState.activityTemplateOverrides?.[key]) {
    const o = { ...configState.activityTemplateOverrides[key] }
    delete o.deleted
    configState.activityTemplateOverrides[key] = o
    persist()
  }
}

// --- Vlastní atributy entit ---

export function addEntityField(entityType, field = {}) {
  if (!configState.entityCustomFields) configState.entityCustomFields = {}
  if (!configState.entityCustomFields[entityType]) configState.entityCustomFields[entityType] = []
  configState.entityCustomFields[entityType].push({
    id: generateId(),
    label: '',
    type: 'text',
    sortOrder: (configState.entityCustomFields[entityType].length) * 10,
    ...field,
  })
  persist()
}

export function updateEntityField(entityType, fieldId, updates) {
  const fields = configState.entityCustomFields?.[entityType]
  if (!fields) return
  const idx = fields.findIndex((f) => f.id === fieldId)
  if (idx !== -1) {
    fields[idx] = { ...fields[idx], ...updates }
    persist()
  }
}

export function deleteEntityField(entityType, fieldId) {
  if (configState.entityCustomFields?.[entityType]) {
    configState.entityCustomFields[entityType] = configState.entityCustomFields[entityType].filter(
      (f) => f.id !== fieldId
    )
    persist()
  }
}
