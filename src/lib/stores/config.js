/**
 * Správa konfigurace (šablony aktivit, vlastní atributy entit, přepisy vestavěných atributů).
 *
 * Výchozí konfigurace (Konfigurace na přehledu projektů) je uložena v úložišti aplikace (SQLite) pod klíčem
 * 'uxlog_config' a slouží jen jako vzor pro nové projekty. Každý projekt má vlastní kopii
 * v `project.config` (ukládá se s daty projektu); její úpravy ostatní projekty neovlivní.
 *
 * Exportované funkce pracují s výchozí konfigurací; konfiguraci projektu vrací configFor(projectId)
 * se stejnými funkcemi. V Tauri prostředí se výchozí konfigurace zrcadlí do souborů přes tauriBridge.
 */

import { reactive, toRaw } from 'vue'
import { ACTIVITY_TYPES, getActivityGuide } from '../activityTypes.js'
import { ENTITY_FIELD_DEFAULTS } from '../entityFieldDefaults.js'
import { generateId } from '../id.js'
import { readStoredValue, writeStoredValue } from '../tauriBridge.js'
import { getEmptyConfig as emptyConfig, normalizeConfig, fillMissingProjectConfigs } from '../projectConfig.js'
import { state, persist as persistData, setProjectConfigFactory } from './state.js'

const STORAGE_KEY = 'uxlog_config'

/**
 * Načte výchozí konfiguraci z úložiště aplikace.
 * @returns {Object}
 */
function loadConfig() {
  try {
    const raw = readStoredValue(STORAGE_KEY)
    return raw ? normalizeConfig(JSON.parse(raw)) : getEmptyConfig()
  } catch {
    return getEmptyConfig()
  }
}

/**
 * Vrátí prázdnou konfiguraci.
 * @returns {Object}
 */
function getEmptyConfig() {
  return emptyConfig()
}

/** Výchozí konfigurace (vzor pro nové projekty). */
export const configState = reactive(Object.assign(getEmptyConfig(), loadConfig()))

/** Nová kopie výchozí konfigurace pro projekt. */
function cloneDefaultConfig() {
  return normalizeConfig(toRaw(configState))
}

// Projekty bez vlastní konfigurace (nové, importované, ze složky dat) dostanou při uložení kopii výchozí
setProjectConfigFactory(cloneDefaultConfig)

/**
 * Uloží výchozí konfiguraci do úložiště aplikace (SQLite).
 */
function persistDefault() {
  writeStoredValue(STORAGE_KEY, JSON.stringify(toRaw(configState))).catch((e) => console.error('[UXLog] uložení konfigurace selhalo:', e))
}

/**
 * Doplní projektům bez vlastní konfigurace kopii výchozí (starší data) a uloží je.
 * Volá se při startu aplikace.
 * @returns {number} počet doplněných projektů
 */
export function ensureProjectConfigs() {
  const filled = fillMissingProjectConfigs(state, cloneDefaultConfig)
  if (filled) persistData({ history: false })
  return filled
}

/**
 * Sestaví API konfigurace nad zvoleným objektem konfigurace.
 * @param {() => Object} getCfg - vrací (reaktivní) objekt konfigurace
 * @param {() => void} persist - uloží změny
 */
function createConfigApi(getCfg, persist) {
// ─────────────────────────────────────────────────────────────
// Šablony aktivit
// ─────────────────────────────────────────────────────────────

/**
 * Vrátí efektivní seznam šablon aktivit (zabudované + přizpůsobení + vlastní).
 * @returns {Array}
 */
function getEffectiveTemplates() {
  const overrides = getCfg().activityTemplateOverrides || {}

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
        createOnNewProject: o.createOnNewProject !== undefined ? o.createOnNewProject : t.createOnNewProject !== false,
        checklist: o.checklist !== undefined ? o.checklist : t.checklist,
        defaultDurationDays: o.defaultDurationDays !== undefined ? o.defaultDurationDays : t.defaultDurationDays,
        guide: getActivityGuide(t.key),
        isBuiltIn: true,
        isCustom: false,
      }
    })

  const custom = (getCfg().customActivityTemplates || []).map((t) => ({
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
function getTemplate(key) {
  return getEffectiveTemplates().find((t) => t.key === key)
}

/**
 * Vrátí smazané zabudované šablony.
 * @returns {Array}
 */
function getDeletedBuiltInTemplates() {
  const overrides = getCfg().activityTemplateOverrides || {}
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
function addCustomTemplate(fields = {}) {
  if (!getCfg().customActivityTemplates) getCfg().customActivityTemplates = []
  const key = generateId()
  getCfg().customActivityTemplates.push({
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
function updateTemplate(key, updates) {
  const isBuiltIn = ACTIVITY_TYPES.some((t) => t.key === key)
  if (isBuiltIn) {
    if (!getCfg().activityTemplateOverrides) getCfg().activityTemplateOverrides = {}
    getCfg().activityTemplateOverrides[key] = {
      ...(getCfg().activityTemplateOverrides[key] || {}),
      ...updates,
    }
  } else {
    const arr = getCfg().customActivityTemplates || []
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
function deleteTemplate(key) {
  const isBuiltIn = ACTIVITY_TYPES.some((t) => t.key === key)
  if (isBuiltIn) {
    if (!getCfg().activityTemplateOverrides) getCfg().activityTemplateOverrides = {}
    getCfg().activityTemplateOverrides[key] = {
      ...(getCfg().activityTemplateOverrides[key] || {}),
      deleted: true,
    }
  } else {
    getCfg().customActivityTemplates = (getCfg().customActivityTemplates || []).filter(
      (t) => t.key !== key
    )
  }
  persist()
}

/**
 * Obnoví smazanou zabudovanou šablonu.
 * @param {string} key
 */
function restoreTemplate(key) {
  if (getCfg().activityTemplateOverrides?.[key]) {
    const o = { ...getCfg().activityTemplateOverrides[key] }
    delete o.deleted
    getCfg().activityTemplateOverrides[key] = o
    persist()
  }
}

// ─────────────────────────────────────────────────────────────
// Termíny projektů a aktivit
// ─────────────────────────────────────────────────────────────

/**
 * Vrátí výchozí počet dní pro šablonu aktivity dle klíče.
 * @param {string} templateKey
 * @returns {number|null}
 */
function getTemplateDurationDays(templateKey) {
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
function getEntityCustomFields(entityType) {
  return [...(getCfg().entityCustomFields?.[entityType] || [])].sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
  )
}

/**
 * Přidá vlastní atribut k entitě.
 * @param {string} entityType
 * @param {Object} field - { label, type, sortOrder, options? }
 */
function addEntityField(entityType, field = {}) {
  if (!getCfg().entityCustomFields) getCfg().entityCustomFields = {}
  if (!getCfg().entityCustomFields[entityType]) getCfg().entityCustomFields[entityType] = []
  getCfg().entityCustomFields[entityType].push({
    id: generateId(),
    label: '',
    type: 'text',
    sortOrder: (getCfg().entityCustomFields[entityType].length) * 10,
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
function updateEntityField(entityType, fieldId, updates) {
  const fields = getCfg().entityCustomFields?.[entityType]
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
function deleteEntityField(entityType, fieldId) {
  if (getCfg().entityCustomFields?.[entityType]) {
    getCfg().entityCustomFields[entityType] = getCfg().entityCustomFields[entityType].filter(
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
function getFieldOverride(entityType, fieldKey) {
  return getCfg().entityFieldOverrides?.[entityType]?.[fieldKey] || {}
}

/**
 * Aktualizuje přepis vestavěného atributu.
 * @param {string} entityType
 * @param {string} fieldKey
 * @param {Object} updates - { label?, sortOrder?, hidden?, options? }
 */
function updateFieldOverride(entityType, fieldKey, updates) {
  if (!getCfg().entityFieldOverrides) getCfg().entityFieldOverrides = {}
  if (!getCfg().entityFieldOverrides[entityType]) getCfg().entityFieldOverrides[entityType] = {}
  getCfg().entityFieldOverrides[entityType][fieldKey] = {
    ...(getCfg().entityFieldOverrides[entityType][fieldKey] || {}),
    ...updates,
  }
  persist()
}

/**
 * Obnoví výchozí nastavení vestavěného atributu (odstraní přepis).
 * @param {string} entityType
 * @param {string} fieldKey
 */
function resetFieldOverride(entityType, fieldKey) {
  if (getCfg().entityFieldOverrides?.[entityType]?.[fieldKey]) {
    delete getCfg().entityFieldOverrides[entityType][fieldKey]
    if (Object.keys(getCfg().entityFieldOverrides[entityType]).length === 0) {
      delete getCfg().entityFieldOverrides[entityType]
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
function isFieldOverridden(entityType, fieldKey) {
  const o = getCfg().entityFieldOverrides?.[entityType]?.[fieldKey]
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
function getEffectiveEntityFields(entityType, tPath) {
  const defaults = ENTITY_FIELD_DEFAULTS[entityType] || []
  const overrides = getCfg().entityFieldOverrides?.[entityType] || {}
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
function getHiddenBuiltInFields(entityType, tPath) {
  const defaults = ENTITY_FIELD_DEFAULTS[entityType] || []
  const overrides = getCfg().entityFieldOverrides?.[entityType] || {}

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

  return {
    get state() { return getCfg() },
    getEffectiveTemplates,
    getTemplate,
    getDeletedBuiltInTemplates,
    addCustomTemplate,
    updateTemplate,
    deleteTemplate,
    restoreTemplate,
    getTemplateDurationDays,
    getEntityCustomFields,
    addEntityField,
    updateEntityField,
    deleteEntityField,
    getFieldOverride,
    updateFieldOverride,
    resetFieldOverride,
    isFieldOverridden,
    getEffectiveEntityFields,
    getHiddenBuiltInFields,
  }
}

/** API výchozí konfigurace (vzor pro nové projekty). */
const defaultApi = createConfigApi(() => configState, persistDefault)

/** Uložení konfigurace projektu: s daty projektu, mimo historii změn. */
function persistProjectConfig() {
  persistData({ history: false })
}

const projectApis = new Map()

/**
 * Konfigurace projektu (stejné funkce jako výchozí konfigurace). Bez projectId, nebo když projekt
 * neexistuje, vrací výchozí konfiguraci.
 * @param {string|null|undefined} projectId
 * @returns {ReturnType<typeof createConfigApi>}
 */
export function configFor(projectId) {
  if (!projectId) return defaultApi
  if (!projectApis.has(projectId)) {
    projectApis.set(projectId, createConfigApi(() => {
      const project = (state.projects || []).find((p) => p?.id === projectId)
      if (!project) return configState
      // Projekt bez konfigurace (např. právě načtený zvenku) dostane kopii výchozí hned – úprava
      // konfigurace projektu nesmí nikdy zasáhnout výchozí konfiguraci
      if (!project.config || typeof project.config !== 'object' || Array.isArray(project.config)) {
        project.config = cloneDefaultConfig()
      }
      return project.config
    }, persistProjectConfig))
  }
  return projectApis.get(projectId)
}

export const {
  getEffectiveTemplates,
  getTemplate,
  getDeletedBuiltInTemplates,
  addCustomTemplate,
  updateTemplate,
  deleteTemplate,
  restoreTemplate,
  getTemplateDurationDays,
  getEntityCustomFields,
  addEntityField,
  updateEntityField,
  deleteEntityField,
  getFieldOverride,
  updateFieldOverride,
  resetFieldOverride,
  isFieldOverridden,
  getEffectiveEntityFields,
  getHiddenBuiltInFields,
} = defaultApi
