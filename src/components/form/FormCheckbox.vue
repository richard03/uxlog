<template>
  <div class="form-group form-group-checkbox">
    <label class="checkbox-label">
      <input
        :id="controlId"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        v-bind="$attrs"
        @change="$emit('update:modelValue', ($event.target).checked)"
      />
      <span v-if="$slots.default"><slot /></span>
      <span v-else>{{ label }}</span>
    </label>
  </div>
</template>

<script setup>
/**
 * FormCheckbox – zaškrtávací pole s popiskem.
 * Při použití ve FormGroup s layout="checkbox" je label FormGroup prázdný a text je zde.
 * @prop {boolean} modelValue - v-model hodnota
 * @prop {string} controlId - ID pro asociaci
 * @prop {string} label - text vedle checkboxu (alternativa k slotu)
 * @prop {boolean} disabled - zakázané
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  controlId: { type: String, default: '' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<script>
export default {
  name: 'FormCheckbox',
  inheritAttrs: false,
}
</script>
