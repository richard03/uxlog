<template>
  <nav class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="['tab', { active: modelValue === tab.key }]"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<script setup>
defineProps({
  tabs:       { type: Array, required: true },
  modelValue: { type: String, required: true },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.tab-bar {
  display: flex; gap: 0; overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}
.tab {
  padding: 0.75rem 1.25rem;
  border: none; background: none; cursor: pointer;
  font-size: 0.875rem; color: #6b7280; white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: #374151; }
.tab.active { color: #4f46e5; border-bottom-color: #4f46e5; font-weight: 600; }
</style>
