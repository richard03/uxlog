/**
 * Konfigurační data aplikace ze složky /data (YAML).
 *
 * Soubory se přibalí při buildu (Vite import `?raw`) a naparsují při startu vlastním parserem
 * v konfiguračním režimu (komentáře, jednoduché uvozovky). Normalizace je tolerantní:
 * neplatné položky se zahodí s varováním v konzoli a chybějící pole se doplní výchozími hodnotami,
 * aby chyba v konfiguraci nezastavila aplikaci.
 */

import { parseYaml } from './yaml.js'
import { normalizeHexColor } from './color.js'
import activityTypesYaml from '../../data/activity-types.yaml?raw'
import entitiesYaml from '../../data/entities.yaml?raw'
import appYaml from '../../data/app.yaml?raw'

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const strList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [])

/**
 * @param {string} source - název souboru pro varování
 * @param {string} message
 */
function warn(source, message) {
  if (typeof console !== 'undefined') console.warn(`[UXLog] data/${source}: ${message}`)
}

/**
 * Bezpečně naparsuje YAML konfigurace.
 * @param {string} text
 * @param {string} source
 * @returns {Object}
 */
export function parseConfigYaml(text, source = 'config') {
  try {
    const parsed = parseYaml(String(text ?? ''), { config: true })
    if (isObject(parsed)) return parsed
    warn(source, 'soubor neobsahuje mapu – použije se prázdná konfigurace')
  } catch (e) {
    warn(source, `nelze naparsovat (${e?.message || e})`)
  }
  return {}
}

/**
 * Normalizuje katalog typů aktivit.
 * @param {Object} raw - { groups, types }
 * @returns {{ groups: string[], types: Array<Object> }}
 */
export function normalizeActivityConfig(raw) {
  const groups = strList(raw?.groups)
  if (!groups.length) groups.push('project', 'research', 'design')
  const seen = new Set()
  const types = []
  for (const t of Array.isArray(raw?.types) ? raw.types : []) {
    const key = str(t?.key).trim()
    if (!key || seen.has(key)) {
      warn('activity-types.yaml', `typ bez klíče nebo s duplicitním klíčem „${key}“ byl vynechán`)
      continue
    }
    seen.add(key)
    const g = isObject(t.guide) ? t.guide : {}
    const ids = new Set()
    const checklist = (Array.isArray(t.checklist) ? t.checklist : [])
      .filter((c) => isObject(c) && typeof c.id === 'string' && c.id && !ids.has(c.id) && ids.add(c.id))
      .map((c) => ({ id: c.id, label: str(c.label) }))
    types.push({
      key,
      group: groups.includes(t.group) ? t.group : groups[0],
      defaultName: str(t.defaultName, key),
      defaultDescription: str(t.defaultDescription),
      sortOrder: num(t.sortOrder, 9999),
      defaultDurationDays: num(t.defaultDurationDays, 1),
      createOnNewProject: t.createOnNewProject === true,
      checklist,
      guide: {
        why: str(g.why),
        when: str(g.when),
        duration: str(g.duration),
        who: str(g.who),
        steps: strList(g.steps),
        outputs: strList(g.outputs),
      },
    })
  }
  return { groups, types }
}

/**
 * Normalizuje položku skóre úplnosti: 'pole' nebo { field, when: { field, value } }.
 * @param {*} c
 * @returns {{ field: string, when: { field: string, value: * } | null } | null}
 */
function normalizeCompletenessItem(c) {
  if (typeof c === 'string' && c) return { field: c, when: null }
  if (isObject(c) && typeof c.field === 'string' && c.field) {
    const when = isObject(c.when) && typeof c.when.field === 'string' ? { field: c.when.field, value: c.when.value } : null
    return { field: c.field, when }
  }
  return null
}

/**
 * Normalizuje definice entit.
 * @param {Object} raw - { entities: { <typ>: { codePrefix, defaults, fields, completeness } } }
 * @returns {Object.<string, { codePrefix: string, defaults: Object, fields: Array<Object>|null, completeness: Array<Object>|null }>}
 */
export function normalizeEntityConfig(raw) {
  const out = {}
  const entities = isObject(raw?.entities) ? raw.entities : {}
  for (const [type, e] of Object.entries(entities)) {
    if (!isObject(e)) {
      warn('entities.yaml', `entita „${type}“ nemá platnou definici`)
      continue
    }
    out[type] = {
      codePrefix: str(e.codePrefix).trim(),
      defaults: isObject(e.defaults) ? e.defaults : {},
      fields: Array.isArray(e.fields)
        ? e.fields.filter((f) => isObject(f) && typeof f.key === 'string' && f.key && typeof f.type === 'string')
        : null,
      completeness: Array.isArray(e.completeness)
        ? e.completeness.map(normalizeCompletenessItem).filter(Boolean)
        : null,
    }
  }
  return out
}

/** Výchozí obecná konfigurace (použije se pro chybějící hodnoty v app.yaml). */
const APP_DEFAULTS = {
  projectColors: ['#4a90d9'],
  canvasCardColors: [{ color: '#fde68a', labelKey: 'yellow' }],
  projectDurationDays: { small: 30, medium: 60, large: 120 },
  recommendations: { minRequirementsForPrioritization: 5 },
}

/**
 * Normalizuje paletu barev kartiček Canvasu: položka { color, labelKey } nebo jen hex řetězec.
 * Neplatné barvy a duplicity vypadnou; labelKey chybí → null (popisek bude hex kód).
 * @param {unknown} raw
 * @returns {Array<{ color: string, labelKey: string|null }>}
 */
export function normalizeCanvasCardColors(raw) {
  const out = []
  const seen = new Set()
  for (const item of Array.isArray(raw) ? raw : []) {
    const color = normalizeHexColor(isObject(item) ? item.color : item)
    if (!color || seen.has(color)) continue
    seen.add(color)
    const labelKey = isObject(item) && typeof item.labelKey === 'string' && item.labelKey.trim() ? item.labelKey.trim() : null
    out.push({ color, labelKey })
  }
  return out
}

/**
 * Normalizuje obecnou konfiguraci aplikace.
 * @param {Object} raw
 * @returns {{ projectColors: string[], canvasCardColors: Array<{ color: string, labelKey: string|null }>, projectDurationDays: Object, recommendations: Object }}
 */
export function normalizeAppConfig(raw) {
  const colors = strList(raw?.projectColors).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c.trim())).map((c) => c.trim())
  const cardColors = normalizeCanvasCardColors(raw?.canvasCardColors)
  const d = isObject(raw?.projectDurationDays) ? raw.projectDurationDays : {}
  const r = isObject(raw?.recommendations) ? raw.recommendations : {}
  return {
    projectColors: colors.length ? colors : [...APP_DEFAULTS.projectColors],
    canvasCardColors: cardColors.length ? cardColors : APP_DEFAULTS.canvasCardColors.map((c) => ({ ...c })),
    projectDurationDays: {
      small: num(d.small, APP_DEFAULTS.projectDurationDays.small),
      medium: num(d.medium, APP_DEFAULTS.projectDurationDays.medium),
      large: num(d.large, APP_DEFAULTS.projectDurationDays.large),
    },
    recommendations: {
      minRequirementsForPrioritization: num(r.minRequirementsForPrioritization, APP_DEFAULTS.recommendations.minRequirementsForPrioritization),
    },
  }
}

/** Katalog typů aktivit z data/activity-types.yaml. */
export const ACTIVITY_CONFIG = normalizeActivityConfig(parseConfigYaml(activityTypesYaml, 'activity-types.yaml'))

/** Definice entit z data/entities.yaml. */
export const ENTITY_CONFIG = normalizeEntityConfig(parseConfigYaml(entitiesYaml, 'entities.yaml'))

/** Obecná konfigurace z data/app.yaml. */
export const APP_CONFIG = normalizeAppConfig(parseConfigYaml(appYaml, 'app.yaml'))

/**
 * Výchozí hodnoty nové entity (hluboká kopie – vrácený objekt lze měnit).
 * @param {string} entityType - např. 'persona'
 * @returns {Object}
 */
export function getEntityDefaults(entityType) {
  const d = ENTITY_CONFIG[entityType]?.defaults
  return d ? JSON.parse(JSON.stringify(d)) : {}
}

/**
 * Prefix automatického kódu entity (např. 'PER'), nebo '' u entit bez kódu.
 * @param {string} entityType
 * @returns {string}
 */
export function getCodePrefix(entityType) {
  return ENTITY_CONFIG[entityType]?.codePrefix || ''
}
