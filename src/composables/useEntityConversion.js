/**
 * Dialog Změnit typ: výběr nového typu, porovnání původního záznamu s návrhem nového
 * (návrh `buildConversionDraft` jde upravit) a uložení přes store `convertEntity`.
 * Pole obou typů se berou z konfigurace projektu, kam záznam patří.
 */

import { ref, computed, watch, toValue } from 'vue'
import { useStore } from './useStore.js'
import { useI18n } from './useI18n.js'
import { useConfig } from './useConfig.js'
import { useEntityHelpers } from './useEntityHelpers.js'
import {
  ENTITY_TYPE_BY_COLLECTION, conversionTargets, buildConversionDraft, fieldValueText, pairConversionFields,
} from '../lib/entityConversion.js'
import { getEntityDefaults } from '../lib/dataConfig.js'

/** Getter záznamů kolekce v projektu (getScenarios, getRequirements…). */
function getterName(collection) {
  return `get${collection.charAt(0).toUpperCase()}${collection.slice(1)}`
}

/**
 * @param {string} collection - kolekce převáděného záznamu (např. 'requirements')
 * @param {import('vue').MaybeRefOrGetter<Object|null>} entitySource - převáděný záznam
 */
export function useEntityConversion(collection, entitySource) {
  const store = useStore()
  const { t, tPath } = useI18n()
  const { generateNextCode, getCodePrefix } = useEntityHelpers()
  const entity = computed(() => toValue(entitySource) || null)
  const config = useConfig(() => entity.value?.projectId)

  const typeOf = (c) => ENTITY_TYPE_BY_COLLECTION[c]
  const typeLabel = (c) => tPath(`${typeOf(c)}.label`) || c

  const targets = computed(() => conversionTargets(collection).map((c) => ({ value: c, label: typeLabel(c) })))
  const targetCollection = ref(targets.value[0]?.value || '')

  const sourceFields = computed(() => config.getEffectiveEntityFields(typeOf(collection), tPath))
  const targetFields = computed(() => (targetCollection.value
    ? config.getEffectiveEntityFields(typeOf(targetCollection.value), tPath)
    : []))

  /** Prefix kódu nového typu ('' = typ kód nemá). */
  const targetCodePrefix = computed(() => (targetCollection.value ? getCodePrefix(typeOf(targetCollection.value)) : ''))

  /** Upravitelný návrh nového záznamu: { values, customFields, transfers, mainFieldKey }. */
  const draft = ref({ values: {}, customFields: {}, transfers: {}, mainFieldKey: null })

  function rebuildDraft() {
    const target = targetCollection.value
    if (!target || !entity.value) return
    const built = buildConversionDraft(entity.value, sourceFields.value, targetFields.value, getEntityDefaults(typeOf(target)))
    const prefix = targetCodePrefix.value
    if (prefix) {
      const items = store[getterName(target)]?.(entity.value.projectId) || []
      built.values.code = generateNextCode(prefix, items)
    }
    draft.value = built
  }

  // Nový typ = nový návrh (rozpracované úpravy předchozího typu se zahodí)
  watch(targetCollection, rebuildDraft, { immediate: true })

  const fieldLabel = (fields, key) => fields.find((f) => f.key === key)?.label || ''

  /** Pole nového záznamu po vyhodnocení visibleWhen nad návrhem. */
  const visibleTargetFields = computed(() => targetFields.value.filter((f) => (
    !f.visibleWhen || draft.value.values?.[f.visibleWhen.field] === f.visibleWhen.value
  )))

  /**
   * Hodnota původního záznamu pro levý sloupec: text a kam v novém záznamu přešla
   * (`movedTo` jen když přešla jinam než do pole na stejném řádku).
   */
  function sourceCell(field, pairedTargetKey) {
    const text = fieldValueText(field, entity.value)
    const target = draft.value.transfers?.[field.key]
    return {
      label: field.label,
      text,
      movedTo: text && target && target !== pairedTargetKey ? fieldLabel(targetFields.value, target) : '',
      notTransferred: Boolean(text && !target),
    }
  }

  /**
   * Řádky porovnání: vlevo pole původního záznamu, vpravo stejné pole nového (nebo prázdno).
   * Každý řádek: { key, source: { label, text, movedTo, notTransferred }|null, target: pole|'name'|'code'|null }.
   * Prázdná pole původního záznamu bez protějšku se nezobrazují.
   */
  const rows = computed(() => {
    const e = entity.value
    if (!e) return []
    const out = [{
      key: 'name',
      source: { label: t.entityConversion.name, text: e.name || '', movedTo: '', notTransferred: false },
      target: 'name',
    }]
    if (e.code || targetCodePrefix.value) {
      out.push({
        key: 'code',
        source: e.code ? { label: t.entityConversion.code, text: e.code, movedTo: '', notTransferred: false } : null,
        target: targetCodePrefix.value ? 'code' : null,
      })
    }
    for (const pair of pairConversionFields(sourceFields.value, visibleTargetFields.value)) {
      const source = pair.source ? sourceCell(pair.source, pair.target?.key) : null
      if (!pair.target && !source?.text) continue
      out.push({ key: `${pair.source?.key ?? ''}|${pair.target?.key ?? ''}`, source, target: pair.target })
    }
    return out
  })

  /** Popisek pole, do kterého se připojily hodnoty bez protějšku (nic se nepřipojilo = ''). */
  const carriedInto = computed(() => {
    const main = draft.value.mainFieldKey
    if (!main) return ''
    const carried = Object.entries(draft.value.transfers || {})
      .some(([sourceKey, targetKey]) => targetKey === main && sourceKey !== main)
    return carried ? fieldLabel(targetFields.value, main) : ''
  })

  const sourceTypeLabel = computed(() => typeLabel(collection))
  const targetTypeLabel = computed(() => (targetCollection.value ? typeLabel(targetCollection.value) : ''))

  /**
   * Uloží nový záznam a smaže původní.
   * @returns {{ collection: string, id: string }|null} nový záznam
   */
  function convert() {
    const e = entity.value
    const target = targetCollection.value
    if (!e || !target) return null
    const values = { ...draft.value.values }
    const customFields = { ...(draft.value.customFields || {}) }
    if (Object.keys(customFields).length) values.customFields = customFields
    const created = store.convertEntity(collection, e.id, target, values)
    return created ? { collection: target, id: created.id } : null
  }

  return {
    targets,
    targetCollection,
    targetCodePrefix,
    draft,
    rows,
    carriedInto,
    sourceTypeLabel,
    targetTypeLabel,
    convert,
  }
}
