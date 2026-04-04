/**
 * Sdílený composable pro správu atributů entity v detail views.
 * Poskytuje konfigurací řízený seznam polí, přístup k hodnotám,
 * zobrazení hodnot a logiku editace (včetně select a number-unit typů).
 *
 * @param {string} entityType - Typ entity (goal, stakeholder, …)
 * @param {import('vue').Ref} entityRef - Ref na objekt entity
 * @param {Function} updateFn - Funkce pro uložení změn: (updates) => void
 * @param {Array} headerFields - Pole definic hlavičkových atributů [{key, label, type}]
 */

import { ref, computed } from 'vue'
import { useConfig } from './useConfig.js'
import { useI18n } from './useI18n.js'
import { formatCalendarDate } from '../utils/formatDate.js'

/**
 * Hodnotu z úložiště převede na řetězec pro zobrazení a inline editaci.
 * Ošetří pole/objekty z chybného importu nebo AI (bez JSON závorek v UI).
 * @param {unknown} raw
 * @returns {string}
 */
function storageValueToEditableString(raw) {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  if (Array.isArray(raw)) {
    return raw
      .map((x) => {
        if (x == null) return ''
        if (typeof x === 'object') return JSON.stringify(x)
        return String(x)
      })
      .filter((s) => s !== '')
      .join('\n')
  }
  if (typeof raw === 'object') return JSON.stringify(raw, null, 2)
  return String(raw)
}

export function useEntityFields(entityType, entityRef, updateFn, headerFields = []) {
  const { getEffectiveEntityFields } = useConfig()
  const { t, tPath } = useI18n()

  /** Konfigurací řízené atributy (bez hlavičkových). */
  const bodyFields = computed(() => getEffectiveEntityFields(entityType, tPath))

  /** Viditelné atributy po vyhodnocení visibleWhen podmínek. */
  const visibleFields = computed(() =>
    bodyFields.value.filter((f) => {
      if (f.visibleWhen) {
        return entityRef.value?.[f.visibleWhen.field] === f.visibleWhen.value
      }
      return true
    })
  )

  /** Všechny atributy (hlavičkové + body) pro lookup při editaci. */
  const allFields = computed(() => [...headerFields, ...bodyFields.value])

  const editingField = ref(null)
  const editValue = ref('')
  const editUnit = ref('')

  /** Definice aktuálně editovaného pole. */
  const editingFieldDef = computed(() => {
    if (!editingField.value) return null
    return allFields.value.find((f) => f.key === editingField.value) || null
  })

  const editingLabel = computed(() => editingFieldDef.value?.label ?? '')
  const editingType = computed(() => editingFieldDef.value?.type ?? 'text')
  const editingOptions = computed(() => editingFieldDef.value?.options ?? [])
  const editingUnits = computed(() => editingFieldDef.value?.units ?? [])

  /**
   * Vrátí surovou hodnotu pole z entity.
   * @param {Object} field
   * @returns {*}
   */
  function getFieldValue(field) {
    if (field.isCustom) {
      return storageValueToEditableString(entityRef.value?.customFields?.[field.id])
    }
    if (field.type === 'number-unit') return entityRef.value?.[field.valueKey] ?? ''
    if (field.type === 'select') return entityRef.value?.[field.key] ?? ''
    return storageValueToEditableString(entityRef.value?.[field.key])
  }

  /**
   * Vrátí hodnotu pole formátovanou pro zobrazení.
   * U selectů vrací popisek, u number-unit přidává jednotku.
   * @param {Object} field
   * @returns {string}
   */
  function displayFieldValue(field) {
    if (field.type === 'select') {
      const val = entityRef.value?.[field.key]
      if (!val && val !== 0) return '—'
      return field.options?.find((o) => o.value === val)?.label ?? String(val)
    }
    if (field.type === 'date') {
      const val = entityRef.value?.[field.key]
      if (!val && val !== 0) return '—'
      return formatCalendarDate(String(val), { month: 'long' }) || String(val)
    }
    if (field.type === 'number-unit') {
      const val = entityRef.value?.[field.valueKey]
      if (!val && val !== 0) return '—'
      const unitVal = entityRef.value?.[field.unitKey] ?? ''
      const unitLabel = field.units?.find((u) => u.value === unitVal)?.label ?? unitVal
      return `${val} ${unitLabel}`
    }
    const text = getFieldValue(field)
    if (!text && text !== '0') return '—'
    return text
  }

  /**
   * Vrátí true pokud je pole prázdné.
   * @param {Object} field
   * @returns {boolean}
   */
  function isFieldEmpty(field) {
    if (field.isCustom) return !entityRef.value?.customFields?.[field.id]
    if (field.type === 'number-unit') return !entityRef.value?.[field.valueKey]
    return !entityRef.value?.[field.key]
  }

  /**
   * Zkontroluje, zda řetězec je platná URL.
   * @param {string} val
   * @returns {boolean}
   */
  function isUrl(val) {
    if (!val) return false
    try { return Boolean(new URL(val)) } catch { return false }
  }

  /**
   * Otevře editační modál pro dané pole.
   * @param {string} key
   */
  function openEdit(key) {
    editingField.value = key
    const field = allFields.value.find((f) => f.key === key)
    if (field?.isCustom) {
      editValue.value = storageValueToEditableString(entityRef.value?.customFields?.[field.id])
    } else if (field?.type === 'number-unit') {
      editValue.value = entityRef.value?.[field.valueKey] ?? ''
      editUnit.value = entityRef.value?.[field.unitKey] ?? 'daily'
    } else if (field?.type === 'select') {
      editValue.value = entityRef.value?.[key] ?? ''
    } else {
      editValue.value = storageValueToEditableString(entityRef.value?.[key])
    }
  }

  /**
   * Zavře editační modál bez uložení.
   */
  function closeEdit() {
    editingField.value = null
    editValue.value = ''
    editUnit.value = ''
  }

  /**
   * Uloží změnu editovaného pole.
   */
  function saveField() {
    if (!entityRef.value || !editingField.value) return
    const field = editingFieldDef.value
    if (field?.isCustom) {
      const merged = {
        ...(entityRef.value.customFields || {}),
        [field.id]: editValue.value,
      }
      updateFn({ customFields: merged })
    } else if (field?.type === 'number-unit') {
      updateFn({
        [field.valueKey]: editValue.value,
        [field.unitKey]: editUnit.value,
      })
    } else {
      updateFn({ [editingField.value]: editValue.value })
    }
    closeEdit()
  }

  /**
   * Uloží hodnotu pole bez otevření modálu (pro inline editaci).
   * Podporuje pouze pole s jedním vstupem (text, textarea, url, select …).
   * U number-unit se nemá volat – to vyžaduje modál.
   * @param {string} key - klíč pole (pro custom pole ve tvaru _cf_<id>)
   * @param {string} value - nová hodnota
   */
  function saveFieldInline(key, value) {
    if (!entityRef.value) return
    const field = allFields.value.find((f) => f.key === key)
    if (!field) return
    if (field.isCustom) {
      const merged = {
        ...(entityRef.value.customFields || {}),
        [field.id]: value,
      }
      updateFn({ customFields: merged })
    } else if (field.type === 'number-unit') {
      return
    } else {
      updateFn({ [key]: value })
    }
  }

  /**
   * Vrátí true, pokud pole lze editovat inline (jedno datové políčko).
   * @param {Object} field - definice pole
   * @returns {boolean}
   */
  function isInlineEditable(field) {
    return field && field.type !== 'number-unit'
  }

  return {
    t,
    bodyFields,
    visibleFields,
    allFields,
    editingField,
    editValue,
    editUnit,
    editingFieldDef,
    editingLabel,
    editingType,
    editingOptions,
    editingUnits,
    getFieldValue,
    displayFieldValue,
    isFieldEmpty,
    isUrl,
    isInlineEditable,
    openEdit,
    closeEdit,
    saveField,
    saveFieldInline,
  }
}
