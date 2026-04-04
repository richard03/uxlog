<!--
  Jednoduchý editor hodnoty jednoho atributu při importu YAML (text, číslo, boolean, JSON).
-->
<template>
  <label v-if="rawType === 'boolean'" class="im-bool-edit">
    <input type="checkbox" :checked="!!item[fieldKey]" @change="onBoolInput" />
  </label>
  <input
    v-else-if="rawType === 'number'"
    type="number"
    class="im-field-input"
    :value="item[fieldKey]"
    @input="onNumberInput"
  />
  <textarea
    v-else-if="rawType === 'json'"
    class="im-field-input im-field-json"
    :value="jsonText"
    rows="3"
    @input="onJsonInput"
  />
  <textarea
    v-else
    class="im-field-input"
    :value="stringVal"
    rows="2"
    @input="onStringInput"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Objekt entity z YAML (mutujeme hodnoty atributů). */
  item: { type: Object, required: true },
  /** Klíč atributu. */
  fieldKey: { type: String, required: true },
})

const rawType = computed(() => {
  const v = props.item[props.fieldKey]
  if (v === null || v === undefined) return 'string'
  if (typeof v === 'boolean') return 'boolean'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'object') return 'json'
  return 'string'
})

const jsonText = computed(() => {
  try {
    return JSON.stringify(props.item[props.fieldKey], null, 2)
  } catch {
    return ''
  }
})

const stringVal = computed(() => {
  const v = props.item[props.fieldKey]
  if (v == null) return ''
  return String(v)
})

/**
 * @param {Event} e
 */
function onBoolInput(e) {
  props.item[props.fieldKey] = e.target.checked
}

/**
 * @param {Event} e
 */
function onNumberInput(e) {
  const n = parseFloat(e.target.value)
  props.item[props.fieldKey] = Number.isFinite(n) ? n : e.target.value
}

/**
 * @param {Event} e
 */
function onJsonInput(e) {
  const t = e.target.value.trim()
  if (!t) {
    props.item[props.fieldKey] = null
    return
  }
  try {
    props.item[props.fieldKey] = JSON.parse(t)
  } catch {
    /* neplatný JSON — ponecháme předchozí hodnotu */
  }
}

/**
 * @param {Event} e
 */
function onStringInput(e) {
  props.item[props.fieldKey] = e.target.value
}
</script>

<style scoped>
.im-bool-edit {
  display: inline-flex;
  align-items: center;
}

.im-field-input {
  flex: 1;
  min-width: 8rem;
  padding: 4px 6px;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  resize: vertical;
  line-height: 1.4;
}

.im-field-json {
  font-family: monospace;
  font-size: 0.8rem;
}
</style>
