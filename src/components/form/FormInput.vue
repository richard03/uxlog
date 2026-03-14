<template>
  <div v-if="label || hint" class="form-group">
    <label v-if="label" :for="controlId || undefined" class="form-group-label">{{ label }}</label>
    <input
      ref="inputRef"
      :id="controlId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :min="min"
      :max="max"
      :minlength="minlength"
      :maxlength="maxlength"
      :disabled="disabled"
      :autocomplete="autocomplete"
      class="form-control"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target).value)"
    />
    <p v-if="hint" class="form-group-hint">{{ hint }}</p>
  </div>
  <input
    v-else
    ref="inputRef"
    :id="controlId"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :required="required"
    :min="min"
    :max="max"
    :minlength="minlength"
    :maxlength="maxlength"
    :disabled="disabled"
    :autocomplete="autocomplete"
    class="form-control"
    v-bind="$attrs"
    @input="$emit('update:modelValue', ($event.target).value)"
  />
</template>

<script setup>
import { ref } from 'vue'
/**
 * FormInput – textové vstupní pole se sjednoceným stylingem.
 * Volitelně zobrazí label a hint přímo v komponentě.
 * @prop {string} label - text popisku (pokud je, zobrazí se celá form-group)
 * @prop {string} hint - nápovědný text pod polem
 * @prop {string} modelValue - v-model hodnota
 * @prop {string} controlId - ID pro asociaci s label
 * @prop {string} type - typ inputu: text, email, tel, url, number, date, search...
 * @prop {string} placeholder - placeholder text
 * @prop {boolean} required - povinné pole
 * @prop {number|string} min - minimální hodnota (number, date)
 * @prop {number|string} max - maximální hodnota
 * @prop {number} minlength - minimální délka
 * @prop {number} maxlength - maximální délka
 * @prop {boolean} disabled - zakázané
 * @prop {string} autocomplete - hodnota autocomplete
 */
defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  controlId: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  min: { type: [Number, String], default: undefined },
  max: { type: [Number, String], default: undefined },
  minlength: { type: Number, default: undefined },
  maxlength: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: undefined },
})

defineEmits(['update:modelValue'])

const inputRef = ref(null)
defineExpose({
  /** Předá focus na vnitřní input element */
  focus: () => inputRef.value?.focus(),
})
</script>

<script>
export default {
  name: 'FormInput',
  inheritAttrs: false,
}
</script>
