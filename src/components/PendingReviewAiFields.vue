<template>
  <div class="pr-field-stack">
    <div v-for="key in keys" :key="key" class="pr-field">
      <label :for="`${idPrefix}-${key}`" class="pr-field-key">{{ labelForKey(key) }}</label>
      <textarea
        :id="`${idPrefix}-${key}`"
        class="pr-field-input"
        :value="displayValue(key)"
        rows="2"
        @input="onInput(key, $event)"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { aiFieldToPlainString } from '../lib/plugins/ai-shared/prompts.js'

const props = defineProps({
  /** Objekt polí (mutujeme hodnoty při @input). */
  model: { type: Object, required: true },
  /** Unikátní prefix pro id prvků (např. af-0). */
  idPrefix: { type: String, required: true },
  /** Popisek klíče (výchozí: samotný klíč). */
  labelForKey: { type: Function, default: (k) => k },
})

const keys = computed(() => Object.keys(props.model))

/**
 * @param {string} key
 */
function displayValue(key) {
  return aiFieldToPlainString(props.model[key])
}

/**
 * @param {string} key
 * @param {Event} e
 */
function onInput(key, e) {
  props.model[key] = e.target.value
}
</script>
