<template>
  <div class="color-swatches" role="radiogroup" :aria-label="label">
    <button
      v-for="c in colors"
      :key="c"
      type="button"
      class="color-swatch"
      :class="{ selected: modelValue === c }"
      :style="{ background: c }"
      :aria-checked="modelValue === c"
      role="radio"
      @click="$emit('update:modelValue', c)"
    />
  </div>
</template>

<script setup>
import { PROJECT_COLORS } from '../lib/projectColors.js'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  colors: { type: Array, default: () => PROJECT_COLORS },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  outline-offset: 2px;
  transition: transform 0.1s, border-color 0.1s;
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.selected {
  border-color: var(--text);
  transform: scale(1.15);
}
</style>
