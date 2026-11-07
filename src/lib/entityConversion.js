/**
 * Změna typu entity (např. požadavek → scénář) – čisté funkce.
 *
 * Návrh nového záznamu (`buildConversionDraft`) přenese pole se stejným klíčem a slučitelným typem
 * (u custom polí se shoduje popisek). Hodnoty, které v novém typu nemají kam jít, připojí jako
 * „Popisek: hodnota“ do hlavního textového pole nového typu – při změně typu se nic neztratí.
 * Uživatel návrh před uložením upraví (dialog Změnit typ).
 *
 * Typy, které jde převádět, mají v data/entities.yaml `convertible: true`.
 */

import { ENTITY_CONFIG } from './dataConfig.js'

/** Kolekce ve state → typ entity v data/entities.yaml. */
export const ENTITY_TYPE_BY_COLLECTION = {
  goals: 'goal',
  stakeholders: 'stakeholder',
  competitions: 'competition',
  hypotheses: 'hypothesis',
  personas: 'persona',
  scenarios: 'scenario',
  requirements: 'requirement',
  risks: 'risk',
  sources: 'source',
  teamMembers: 'teamMember',
  activities: 'activity',
  tasks: 'task',
  bugs: 'bug',
}

/** Typy polí s volným textem – hodnoty mezi nimi lze přenášet. */
const TEXT_TYPES = new Set(['text', 'textarea', 'url', 'email', 'tel'])

/** Oddělovač bloků připojených do hlavního textového pole. */
const BLOCK_SEPARATOR = '\n\n'

/**
 * Jde záznamy kolekce převádět na jiný typ?
 * @param {string} collection
 * @param {Object} [entityConfig] - normalizovaná konfigurace entit (výchozí z data/entities.yaml)
 * @returns {boolean}
 */
export function isConvertibleCollection(collection, entityConfig = ENTITY_CONFIG) {
  const type = ENTITY_TYPE_BY_COLLECTION[collection]
  return Boolean(type && entityConfig?.[type]?.convertible)
}

/**
 * Kolekce, na které lze záznam z dané kolekce převést (bez ní samotné).
 * @param {string} collection
 * @param {Object} [entityConfig]
 * @returns {string[]}
 */
export function conversionTargets(collection, entityConfig = ENTITY_CONFIG) {
  if (!isConvertibleCollection(collection, entityConfig)) return []
  return Object.keys(ENTITY_TYPE_BY_COLLECTION)
    .filter((c) => c !== collection && isConvertibleCollection(c, entityConfig))
}

/** Hodnota jako text (pole a objekty z poškozených dat po řádcích, prázdno = ''). */
function asText(raw) {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  if (Array.isArray(raw)) return raw.map(asText).filter(Boolean).join('\n')
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

function normalizeLabel(label) {
  return String(label ?? '').trim().toLocaleLowerCase('cs')
}

/**
 * Surová hodnota pole v entitě.
 * @param {Object} field - definice pole (getEffectiveEntityFields)
 * @param {Object} entity
 * @returns {unknown}
 */
function rawValue(field, entity) {
  if (field.isCustom) return entity?.customFields?.[field.id]
  if (field.type === 'number-unit') return entity?.[field.valueKey]
  return entity?.[field.key]
}

/**
 * Hodnota pole jako čitelný text (select → popisek volby, number-unit → číslo + jednotka).
 * @param {Object} field - definice pole
 * @param {Object} entity
 * @returns {string} '' = prázdné pole
 */
export function fieldValueText(field, entity) {
  if (!field || !entity) return ''
  const raw = rawValue(field, entity)
  if (field.type === 'select') {
    const value = asText(raw)
    if (!value) return ''
    return field.options?.find((o) => o.value === value)?.label || value
  }
  if (field.type === 'number-unit') {
    const value = asText(raw).trim()
    if (!value) return ''
    const unit = asText(entity[field.unitKey])
    const unitLabel = field.units?.find((u) => u.value === unit)?.label || unit
    return unitLabel ? `${value} ${unitLabel}` : value
  }
  return asText(raw).trim() ? asText(raw) : ''
}

/**
 * Hlavní textové pole typu – sem se připojí hodnoty bez protějšku.
 * Přednost má `description`, pak první víceřádkové pole, pak první textové.
 * @param {Array<Object>} fields
 * @returns {Object|null}
 */
export function mainTextField(fields) {
  const list = (fields || []).filter((f) => f && !f.isCustom)
  return list.find((f) => f.key === 'description' && f.type === 'textarea')
    || list.find((f) => f.type === 'textarea')
    || list.find((f) => f.type === 'text')
    || null
}

/** Klíč, pod kterým návrh drží hodnotu pole (custom pole mají vlastní objekt). */
function draftKey(field) {
  return field.type === 'number-unit' ? field.valueKey : field.key
}

/**
 * Najde protějšek cílového pole mezi poli zdroje a vrátí přenesené hodnoty, nebo null.
 * @returns {{ source: Object, values: Object, custom: Object }|null}
 */
function transferField(target, sourceFields, sourceEntity, used) {
  const candidates = sourceFields.filter((s) => !used.has(s.key))
  const source = target.isCustom
    ? candidates.find((s) => normalizeLabel(s.label) === normalizeLabel(target.label))
    : candidates.find((s) => !s.isCustom && s.key === target.key)
  if (!source) return null
  const raw = rawValue(source, sourceEntity)

  if (target.isCustom) {
    // Custom pole jsou textová (u voleb se přenese jen platná hodnota)
    const text = source.type === 'select' ? asText(raw) : fieldValueText(source, sourceEntity)
    if (!text) return null
    if (target.type === 'select' && target.options?.length && !target.options.some((o) => o.value === text)) return null
    return { source, values: {}, custom: { [target.id]: text } }
  }

  if (TEXT_TYPES.has(target.type) && TEXT_TYPES.has(source.type)) {
    const text = asText(raw)
    return text.trim() ? { source, values: { [target.key]: text }, custom: {} } : null
  }
  if (target.type === 'select' && source.type === 'select') {
    const value = asText(raw)
    if (!value) return null
    // Volby bez definice (např. řešitel úkolu – plní se za běhu) přijmou jakoukoli hodnotu
    if (target.options?.length && !target.options.some((o) => o.value === value)) return null
    return { source, values: { [target.key]: value }, custom: {} }
  }
  if (target.type === 'date' && source.type === 'date') {
    const value = asText(raw)
    return value ? { source, values: { [target.key]: value }, custom: {} } : null
  }
  if (target.type === 'number-unit' && source.type === 'number-unit') {
    const value = asText(raw).trim()
    if (!value) return null
    const values = { [target.valueKey]: value }
    const unit = asText(sourceEntity?.[source.unitKey])
    if (unit && (!target.units?.length || target.units.some((u) => u.value === unit))) values[target.unitKey] = unit
    return { source, values, custom: {} }
  }
  return null
}

/**
 * Návrh nového záznamu jiného typu z původního záznamu.
 *
 * @param {Object} sourceEntity - původní záznam
 * @param {Array<Object>} sourceFields - pole původního typu (getEffectiveEntityFields)
 * @param {Array<Object>} targetFields - pole nového typu
 * @param {Object} [targetDefaults] - výchozí hodnoty nového typu (data/entities.yaml); pole formuláře,
 *   kam se nic nepřeneslo, začínají jimi (volby a jednotky tak odpovídají tomu, co se uloží)
 * @returns {{
 *   values: Object,
 *   customFields: Object,
 *   transfers: Object<string, string>,
 *   mainFieldKey: string|null,
 * }}
 *   values – hodnoty vestavěných polí nového záznamu (včetně `name`);
 *   customFields – hodnoty custom polí nového typu podle id;
 *   transfers – klíč pole zdroje → klíč pole cíle, kam jeho hodnota přešla
 *   (hodnoty připojené do hlavního pole mají klíč hlavního pole);
 *   mainFieldKey – hlavní textové pole nového typu (null = typ žádné textové pole nemá)
 */
export function buildConversionDraft(sourceEntity, sourceFields, targetFields, targetDefaults = {}) {
  const entity = sourceEntity && typeof sourceEntity === 'object' ? sourceEntity : {}
  const sources = (Array.isArray(sourceFields) ? sourceFields : []).filter((f) => f?.key)
  const targets = (Array.isArray(targetFields) ? targetFields : []).filter((f) => f?.key)

  const values = { name: asText(entity.name) }
  const defaults = targetDefaults && typeof targetDefaults === 'object' ? targetDefaults : {}
  for (const target of targets) {
    if (target.isCustom) continue
    const keys = target.type === 'number-unit' ? [target.valueKey, target.unitKey] : [target.key]
    for (const key of keys) {
      if (key && typeof defaults[key] === 'string') values[key] = defaults[key]
    }
  }
  const customFields = {}
  const transfers = {}
  const used = new Set()

  for (const target of targets) {
    const result = transferField(target, sources, entity, used)
    if (!result) continue
    used.add(result.source.key)
    transfers[result.source.key] = target.key
    Object.assign(values, result.values)
    Object.assign(customFields, result.custom)
  }

  // Hodnoty bez protějšku → hlavní textové pole nového typu
  const main = mainTextField(targets)
  if (main) {
    const blocks = []
    for (const source of sources) {
      if (used.has(source.key)) continue
      const text = fieldValueText(source, entity).trim()
      if (!text) continue
      const label = String(source.label || source.key).trim()
      blocks.push(text.includes('\n') ? `${label}:\n${text}` : `${label}: ${text}`)
      transfers[source.key] = main.key
    }
    if (blocks.length) {
      const current = asText(values[draftKey(main)]).trim()
      values[draftKey(main)] = [current, ...blocks].filter(Boolean).join(BLOCK_SEPARATOR)
    }
  }

  return { values, customFields, transfers, mainFieldKey: main?.key ?? null }
}

/**
 * Souvislosti po změně typu: odkazy na původní záznam vedou na nový.
 * Souvislosti, které by po přesměrování vedly samy na sebe nebo se zdvojily, vypadnou.
 *
 * @param {Array<Object>} connections - state.connections
 * @param {{ type: string, id: string }} from - původní záznam (kolekce + id)
 * @param {{ type: string, id: string }} to - nový záznam
 * @returns {Array<Object>} nové pole (nezměněné souvislosti jsou tytéž objekty)
 */
export function retargetConnections(connections, from, to) {
  const list = Array.isArray(connections) ? connections : []
  if (!from?.type || !from?.id || !to?.type || !to?.id) return list
  const isFrom = (type, id) => type === from.type && id === from.id
  const pairKey = (c) => {
    const a = `${c.entityType1}:${c.entityId1}`
    const b = `${c.entityType2}:${c.entityId2}`
    return `${c.projectId}|${a < b ? `${a}|${b}` : `${b}|${a}`}`
  }

  const seen = new Set()
  const out = []
  // Nejdřív nedotčené souvislosti – při zdvojení vyhrává ta, která už existovala
  const untouched = list.filter((c) => c && !isFrom(c.entityType1, c.entityId1) && !isFrom(c.entityType2, c.entityId2))
  for (const c of untouched) seen.add(pairKey(c))

  for (const c of list) {
    if (!c) continue
    const first = isFrom(c.entityType1, c.entityId1)
    const second = isFrom(c.entityType2, c.entityId2)
    if (!first && !second) {
      out.push(c)
      continue
    }
    const next = {
      ...c,
      ...(first ? { entityType1: to.type, entityId1: to.id } : {}),
      ...(second ? { entityType2: to.type, entityId2: to.id } : {}),
    }
    if (next.entityType1 === next.entityType2 && next.entityId1 === next.entityId2) continue
    const key = pairKey(next)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(next)
  }
  return out
}

/**
 * Řádky porovnání v dialogu Změnit typ: stejné pole obou typů na jednom řádku.
 * Pořadí určuje nový typ; pole původního typu bez protějšku jsou na konci (vpravo prázdno).
 * Protějšek = stejný klíč vestavěného pole, u custom polí stejný popisek.
 *
 * @param {Array<Object>} sourceFields - pole původního typu
 * @param {Array<Object>} targetFields - (viditelná) pole nového typu
 * @returns {Array<{ source: Object|null, target: Object|null }>}
 */
export function pairConversionFields(sourceFields, targetFields) {
  const sources = (Array.isArray(sourceFields) ? sourceFields : []).filter((f) => f?.key)
  const targets = (Array.isArray(targetFields) ? targetFields : []).filter((f) => f?.key)
  const used = new Set()
  const rows = targets.map((target) => {
    const source = sources.find((s) => !used.has(s.key) && (target.isCustom
      ? normalizeLabel(s.label) === normalizeLabel(target.label)
      : !s.isCustom && s.key === target.key))
    if (source) used.add(source.key)
    return { source: source || null, target }
  })
  for (const source of sources) {
    if (!used.has(source.key)) rows.push({ source, target: null })
  }
  return rows
}
