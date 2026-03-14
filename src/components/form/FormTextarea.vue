<template>
  <div v-if="label || hint" class="form-group">
    <label v-if="label" :for="controlId || undefined" class="form-group-label">{{ label }}</label>
    <textarea
      :id="controlId"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :rows="rows"
      :disabled="disabled"
      class="form-control"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target).value)"
    />
    <p v-if="hint" class="form-group-hint">{{ hint }}</p>
  </div>
  <textarea
    v-else
    :id="controlId"
    :value="modelValue"
    :placeholder="placeholder"
    :required="required"
    :rows="rows"
    :disabled="disabled"
    class="form-control"
    v-bind="$attrs"
    @input="$emit('update:modelValue', ($event.target).value)"
  />
</template>

<script setup>
/**
 * FormTextarea – vícedřádkové textové pole se sjednoceným stylingem.
 * Volitelně zobrazí label a hint přímo v komponentě.
 * @prop {string} label - text popisku
 * @prop {string} hint - nápovědný text pod polem
 * @prop {string} modelValue - v-model hodnota
 * @prop {string} controlId - ID pro asociaci s label
 * @prop {string} placeholder - placeholder text
 * @prop {boolean} required - povinné pole
 * @prop {number} rows - počet řádků
 * @prop {boolean} disabled - zakázané
 */
defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  controlId: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  rows: { type: Number, default: 4 },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<script>
export default {
  name: 'FormTextarea',
  inheritAttrs: false,
}
</script>
