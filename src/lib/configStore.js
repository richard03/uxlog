/**
 * Správa konfigurace aplikace (šablony aktivit, vlastní atributy entit, přepisy vestavěných atributů).
 * Konfigurace je uložena v localStorage pod klíčem 'uxlog_config'.
 */

import { reactive, toRaw } from 'vue'
import { ACTIVITY_TYPES } from './activityTypes.js'
import { ENTITY_FIELD_DEFAULTS } from './entityFieldDefaults.js'
import { generateId } from './id.js'

const STORAGE_KEY = 'uxlog_config'

/**
 * Načte konfiguraci z localStorage.
 * @returns {Object}
 */
function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : getEmptyConfig()
  } catch {
    return getEmptyConfig()
  }
}

/**
 * Vrátí prázdnou konfiguraci.
 * @returns {Object}
 */
function getEmptyConfig() {
  return {
    activityTemplateOverrides: {},
    customActivityTemplates: [],
    entityCustomFields: {},
    entityFieldOverrides: {},
    projectDurationDays: { small: 30, medium: 60, large: 120 },
  }
}

export const configState = reactive(Object.assign(getEmptyConfig(), loadConfig()))

/**
 * Uloží aktuální stav konfigurace do localStorage.
 */
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(configState)))
}

// ─────────────────────────────────────────────────────────────
// Šablony aktivit
// ─────────────────────────────────────────────────────────────

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
        defaultDurationDays: o.defaultDurationDays !== undefined ? o.defaultDurationDays : t.defaultDurationDays,
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
 * Přidá vlastní šablonu aktivity.
 * @param {Object} fields
 * @returns {string} klíč nové šablony
 */
export function addCustomTemplate(fields = {}) {
  if (!configState.customActivityTemplates) configState.customActivityTemplates = []
  const key = generateId()
  configState.customActivityTemplates.push({
    key,
    group: 'project',
    name: '',
    description: '',
    sortOrder: 9999,
    createOnNewProject: false,
    checklist: [],
    ...fields,
  })
  persist()
  return key
}

/**
 * Aktualizuje šablonu aktivity (zabudovanou i vlastní).
 * @param {string} key
 * @param {Object} updates
 */
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

/**
 * Smaže šablonu aktivity (zabudovanou soft-delete, vlastní hard-delete).
 * @param {string} key
 */
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

/**
 * Obnoví smazanou zabudovanou šablonu.
 * @param {string} key
 */
export function restoreTemplate(key) {
  if (configState.activityTemplateOverrides?.[key]) {
    const o = { ...configState.activityTemplateOverrides[key] }
    delete o.deleted
    configState.activityTemplateOverrides[key] = o
    persist()
  }
}

// ─────────────────────────────────────────────────────────────
// Termíny projektů a aktivit
// ─────────────────────────────────────────────────────────────

/**
 * Vrátí konfiguraci výchozích délek projektů (dny per rozsah).
 * @returns {{ small: number, medium: number, large: number }}
 */
export function getProjectDurationDays() {
  return {
    ...{ small: 30, medium: 60, large: 120 },
    ...(configState.projectDurationDays || {}),
  }
}

/**
 * Aktualizuje výchozí délku projektu pro daný rozsah.
 * @param {'small'|'medium'|'large'} scope
 * @param {number} days
 */
export function updateProjectDurationDays(scope, days) {
  if (!configState.projectDurationDays) configState.projectDurationDays = {}
  configState.projectDurationDays[scope] = days
  persist()
}

/**
 * Vrátí výchozí počet dní pro šablonu aktivity dle klíče.
 * @param {string} templateKey
 * @returns {number|null}
 */
export function getTemplateDurationDays(templateKey) {
  const tpl = getTemplate(templateKey)
  return tpl?.defaultDurationDays ?? null
}

// ─────────────────────────────────────────────────────────────
// Vlastní atributy entit
// ─────────────────────────────────────────────────────────────

/**
 * Vrátí vlastní (uživatelské) atributy entity daného typu.
 * @param {string} entityType
 * @returns {Array}
 */
export function getEntityCustomFields(entityType) {
  return [...(configState.entityCustomFields?.[entityType] || [])].sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
  )
}

/**
 * Přidá vlastní atribut k entitě.
 * @param {string} entityType
 * @param {Object} field - { label, type, sortOrder, options? }
 */
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

/**
 * Aktualizuje vlastní atribut entity.
 * @param {string} entityType
 * @param {string} fieldId
 * @param {Object} updates
 */
export function updateEntityField(entityType, fieldId, updates) {
  const fields = configState.entityCustomFields?.[entityType]
  if (!fields) return
  const idx = fields.findIndex((f) => f.id === fieldId)
  if (idx !== -1) {
    fields[idx] = { ...fields[idx], ...updates }
    persist()
  }
}

/**
 * Smaže vlastní atribut entity.
 * @param {string} entityType
 * @param {string} fieldId
 */
export function deleteEntityField(entityType, fieldId) {
  if (configState.entityCustomFields?.[entityType]) {
    configState.entityCustomFields[entityType] = configState.entityCustomFields[entityType].filter(
      (f) => f.id !== fieldId
    )
    persist()
  }
}

// ─────────────────────────────────────────────────────────────
// Přepisy vestavěných atributů
// ─────────────────────────────────────────────────────────────

/**
 * Vrátí přepis vestavěného atributu (nebo prázdný objekt).
 * @param {string} entityType
 * @param {string} fieldKey
 * @returns {Object}
 */
export function getFieldOverride(entityType, fieldKey) {
  return configState.entityFieldOverrides?.[entityType]?.[fieldKey] || {}
}

/**
 * Aktualizuje přepis vestavěného atributu.
 * @param {string} entityType
 * @param {string} fieldKey
 * @param {Object} updates - { label?, sortOrder?, hidden?, options? }
 */
export function updateFieldOverride(entityType, fieldKey, updates) {
  if (!configState.entityFieldOverrides) configState.entityFieldOverrides = {}
  if (!configState.entityFieldOverrides[entityType]) configState.entityFieldOverrides[entityType] = {}
  configState.entityFieldOverrides[entityType][fieldKey] = {
    ...(configState.entityFieldOverrides[entityType][fieldKey] || {}),
    ...updates,
  }
  persist()
}

/**
 * Obnoví výchozí nastavení vestavěného atributu (odstraní přepis).
 * @param {string} entityType
 * @param {string} fieldKey
 */
export function resetFieldOverride(entityType, fieldKey) {
  if (configState.entityFieldOverrides?.[entityType]?.[fieldKey]) {
    delete configState.entityFieldOverrides[entityType][fieldKey]
    if (Object.keys(configState.entityFieldOverrides[entityType]).length === 0) {
      delete configState.entityFieldOverrides[entityType]
    }
    persist()
  }
}

/**
 * Zjistí, zda má vestavěný atribut přepis.
 * @param {string} entityType
 * @param {string} fieldKey
 * @returns {boolean}
 */
export function isFieldOverridden(entityType, fieldKey) {
  const o = configState.entityFieldOverrides?.[entityType]?.[fieldKey]
  return o != null && Object.keys(o).length > 0
}

// ─────────────────────────────────────────────────────────────
// Efektivní seznam atributů entity (sloučení defaults + overrides + custom)
// ─────────────────────────────────────────────────────────────

/**
 * Přeloží labelKey na text pomocí tPath, nebo vrátí fallback.
 * @param {string|undefined} labelKey
 * @param {Function} tPath
 * @returns {string}
 */
function resolveLabel(labelKey, tPath) {
  if (!labelKey) return ''
  return tPath(labelKey) || labelKey
}

/**
 * Vrátí efektivní (sloučený) seznam atributů pro daný typ entity.
 * Kombinuje: výchozí atributy + přepisy z konfigurace + vlastní atributy.
 *
 * @param {string} entityType
 * @param {Function} tPath - Funkce pro překlad labelKey → text
 * @returns {Array} Pole definic atributů seřazených podle sortOrder
 */
export function getEffectiveEntityFields(entityType, tPath) {
  const defaults = ENTITY_FIELD_DEFAULTS[entityType] || []
  const overrides = configState.entityFieldOverrides?.[entityType] || {}
  const customFields = getEntityCustomFields(entityType)

  const builtIn = defaults
    .filter((f) => !overrides[f.key]?.hidden)
    .map((f) => {
      const o = overrides[f.key] || {}
      const field = {
        key: f.key,
        label: o.label || resolveLabel(f.labelKey, tPath),
        type: f.type,
        sortOrder: o.sortOrder ?? f.sortOrder,
        builtIn: true,
        isCustom: false,
        labelKey: f.labelKey,
      }

      if (f.visibleWhen) field.visibleWhen = f.visibleWhen

      if (field.type === 'select') {
        if (o.options && o.options.length > 0) {
          field.options = o.options
        } else if (f.options) {
          field.options = f.options.map((opt) => ({
            value: opt.value,
            label: resolveLabel(opt.labelKey, tPath),
          }))
        }
      }

      if (field.type === 'number-unit') {
        field.valueKey = f.valueKey
        field.unitKey = f.unitKey
        if (o.units && o.units.length > 0) {
          field.units = o.units
        } else if (f.units) {
          field.units = f.units.map((u) => ({
            value: u.value,
            label: resolveLabel(u.labelKey, tPath),
          }))
        }
      }

      return field
    })

  const custom = customFields.map((f) => ({
    key: `_cf_${f.id}`,
    id: f.id,
    label: f.label,
    type: f.type || 'text',
    sortOrder: f.sortOrder ?? 9999,
    options: f.options,
    builtIn: false,
    isCustom: true,
  }))

  return [...builtIn, ...custom].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

/**
 * Vrátí skryté vestavěné atributy pro daný typ entity.
 * @param {string} entityType
 * @param {Function} tPath
 * @returns {Array}
 */
export function getHiddenBuiltInFields(entityType, tPath) {
  const defaults = ENTITY_FIELD_DEFAULTS[entityType] || []
  const overrides = configState.entityFieldOverrides?.[entityType] || {}

  return defaults
    .filter((f) => overrides[f.key]?.hidden)
    .map((f) => {
      const o = overrides[f.key] || {}
      return {
        key: f.key,
        label: o.label || resolveLabel(f.labelKey, tPath),
        type: f.type,
        builtIn: true,
      }
    })
}
