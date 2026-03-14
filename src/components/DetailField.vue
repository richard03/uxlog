<template>
  <div class="detail-item" @click="$emit('edit')">
    <dt>{{ label }}</dt>
    <dd :class="{ 'value-empty': empty }">
      <slot>{{ value ?? '—' }}</slot>
    </dd>
    <svg class="pencil edit-btn" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, default: undefined },
  empty: { type: Boolean, default: false },
})
defineEmits(['edit'])
</script>

<style scoped>
.detail-item {
  display: grid;
  grid-template-columns: 10rem 1fr auto;
  align-items: baseline;
  gap: 0 var(--space-sm);
  border-bottom: 1px solid var(--border);
  padding: var(--space-xs) 0;
  cursor: pointer;
}

.detail-item:last-child { border-bottom: none; }

dt { font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin: 0; }
dd { margin: 0; font-size: 0.95rem; white-space: pre-wrap; }

.value-empty { color: var(--text-muted); font-style: italic; }

.edit-btn { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); }
.detail-item:hover .edit-btn,
.detail-item:focus-within .edit-btn { opacity: 1; }

@media (max-width: 600px) {
  .detail-item { grid-template-columns: 1fr auto; }
  dt { grid-column: 1 / -1; margin-bottom: 2px; }
  dd { grid-column: 1; }
}
</style>
