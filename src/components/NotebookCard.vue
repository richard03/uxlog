<template>
  <button type="button" class="notebook-card" @click="$emit('click')" :aria-label="label">
    <span class="notebook-card-title">{{ title }}</span>
    <span class="notebook-card-preview">{{ preview || placeholder }}</span>
  </button>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  label: { type: String, default: '' },
  preview: { type: String, default: '' },
  placeholder: { type: String, default: '' },
})
defineEmits(['click'])
</script>

<style scoped>
.notebook-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  width: 100%;
  margin-top: var(--space-xl);
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
}

.notebook-card:hover {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.notebook-card-title {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.notebook-card-preview {
  font-size: 0.9rem;
  color: var(--text-muted);
  white-space: pre-wrap;
}
</style>
