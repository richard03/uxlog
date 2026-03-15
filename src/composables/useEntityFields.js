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
    if (field.isCustom) return entityRef.value?.customFields?.[field.id] ?? ''
    if (field.type === 'number-unit') return entityRef.value?.[field.valueKey] ?? ''
    return entityRef.value?.[field.key] ?? ''
  }

  /**
   * Vrátí hodnotu pole formátovanou pro zobrazení.
   * U selectů vrací popisek, u number-unit přidává jednotku.
   * @param {Object} field
   * @returns {string}
   */
  function displayFieldValue(field) {
    const val = getFieldValue(field)
    if (!val && val !== 0) return '—'
    if (field.type === 'select') {
      return field.options?.find((o) => o.value === val)?.label ?? val
    }
    if (field.type === 'date') {
      // val je ve formátu YYYY-MM-DD; parsujeme ručně, aby nedošlo k UTC posunu
      const parts = String(val).split('-').map(Number)
      if (parts.length === 3 && parts.every(Boolean)) {
        const d = new Date(parts[0], parts[1] - 1, parts[2])
        return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
      }
      return val
    }
    if (field.type === 'number-unit') {
      if (!val) return '—'
      const unitVal = entityRef.value?.[field.unitKey] ?? ''
      const unitLabel = field.units?.find((u) => u.value === unitVal)?.label ?? unitVal
      return `${val} ${unitLabel}`
    }
    return val
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
      editValue.value = entityRef.value?.customFields?.[field.id] ?? ''
    } else if (field?.type === 'number-unit') {
      editValue.value = entityRef.value?.[field.valueKey] ?? ''
      editUnit.value = entityRef.value?.[field.unitKey] ?? 'daily'
    } else {
      editValue.value = entityRef.value?.[key] ?? ''
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
