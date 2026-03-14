<template>
  <div v-if="label || hint" class="form-group">
    <label v-if="label" :for="controlId || undefined" class="form-group-label">{{ label }}</label>
    <select
      ref="selectRef"
      :id="controlId"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="form-control"
      v-bind="$attrs"
      @change="$emit('update:modelValue', ($event.target).value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
      <slot />
    </select>
    <p v-if="hint" class="form-group-hint">{{ hint }}</p>
  </div>
  <select
    v-else
    ref="selectRef"
    :id="controlId"
    :value="modelValue"
    :required="required"
    :disabled="disabled"
    class="form-control"
    v-bind="$attrs"
    @change="$emit('update:modelValue', ($event.target).value)"
  >
    <option v-if="placeholder" value="">{{ placeholder }}</option>
    <option
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
    >
      {{ opt.label }}
    </option>
    <slot />
  </select>
</template>

<script setup>
import { ref } from 'vue'

/**
 * FormSelect – výběrový seznam se sjednoceným stylingem.
 * Volitelně zobrazí label a hint přímo v komponentě. Může být použit s options prop nebo se slotem pro vlastní option prvky.
 * @prop {string} label - text popisku
 * @prop {string} hint - nápovědný text pod polem
 * @prop {string|number} modelValue - v-model hodnota
 * @prop {string} controlId - ID pro asociaci s label
 * @prop {Array<{value: string|number, label: string}>} options - položky seznamu
 * @prop {string} placeholder - placeholder (první prázdná option)
 * @prop {boolean} required - povinné pole
 * @prop {boolean} disabled - zakázané
 */
defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  controlId: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])

const selectRef = ref(null)
defineExpose({
  /** Předá focus na select element */
  focus: () => selectRef.value?.focus(),
})
</script>

<script>
export default {
  name: 'FormSelect',
  inheritAttrs: false,
}
</script>

<style scoped>
.form-control {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  padding-inline-end: calc(var(--space-md) + 1.25em);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color var(--transition);
}

.form-control:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-muted);
}
</style>
