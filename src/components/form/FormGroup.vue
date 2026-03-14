<template>
  <div :class="groupClasses">
    <label v-if="label && layout !== 'checkbox'" :for="controlId || undefined" class="form-group-label">{{ label }}</label>
    <slot />
    <p v-if="hint" class="form-group-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * FormGroup – obal pro formulářové pole s popiskem a volitelným nápovědným textem.
 * Stará se o asociaci labelu s ovládacím prvkem (for/id) a layout.
 * @prop {string} label - Text popisku
 * @prop {string} controlId - ID ovládacího prvku pro asociaci s label (aria)
 * @prop {string} hint - Volitelný nápovědný text pod polem
 * @prop {string} layout - 'stack' | 'row' | 'checkbox' - způsob rozvržení
 */
const props = defineProps({
  label: { type: String, default: '' },
  controlId: { type: String, default: '' },
  hint: { type: String, default: '' },
  layout: { type: String, default: 'stack', validator: (v) => ['stack', 'row', 'checkbox'].includes(v) },
})

const groupClasses = computed(() => [
  'form-group',
  props.layout === 'row' && 'form-group-row',
  props.layout === 'checkbox' && 'form-group-checkbox',
].filter(Boolean))
</script>

<script>
export default {
  name: 'FormGroup',
}
</script>
