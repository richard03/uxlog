<template>
  <div class="persona-card">
    <div class="card-top">
      <img v-if="persona.portrait_url" :src="persona.portrait_url" class="portrait" alt="Portrait" />
      <div v-else class="portrait-placeholder">👤</div>
      <div class="name-block">
        <strong>{{ persona.name }}</strong>
        <span class="type-badge" :class="persona.type">{{ persona.type }}</span>
        <span v-if="persona.figma_node_id" class="figma-badge" title="Importováno z Figma">Figma</span>
      </div>
      <div class="actions">
        <button class="btn-icon" @click="$emit('edit', persona)" title="Upravit">✏️</button>
        <button class="btn-icon danger" @click="$emit('delete', persona.id)" title="Smazat">🗑</button>
      </div>
    </div>
    <p v-if="persona.description" class="section">{{ persona.description }}</p>

    <details v-if="persona.motivation" class="collapsible">
      <summary>Motivation</summary>
      <p>{{ persona.motivation }}</p>
    </details>
    <details v-if="persona.needs" class="collapsible">
      <summary>Needs</summary>
      <p>{{ persona.needs }}</p>
    </details>
    <details v-if="persona.problems" class="collapsible">
      <summary>Problems</summary>
      <p>{{ persona.problems }}</p>
    </details>
  </div>
</template>

<script setup>
defineProps({ persona: { type: Object, required: true } })
defineEmits(['edit', 'delete'])
</script>

<style scoped>
.persona-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem;
}
.card-top { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; }
.name-block { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem; border-radius: 4px; opacity: 0.7; }
.btn-icon:hover { opacity: 1; background: #f3f4f6; }
.btn-icon.danger:hover { background: #fef2f2; }
.figma-badge { font-size: 0.65rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: #e0e7ff; color: #4338ca; margin-left: 0.35rem; }
.portrait { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb; }
.portrait-placeholder { width: 64px; height: 64px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
strong { font-size: 1rem; }
.type-badge { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 4px; width: fit-content; }
.type-badge.prototype { background: #fef9c3; color: #854d0e; }
.type-badge.persona   { background: #dcfce7; color: #15803d; }
.section { font-size: 0.875rem; color: #374151; margin: 0 0 0.75rem; }
.collapsible { border-top: 1px solid #f3f4f6; padding: 0.5rem 0; }
summary { cursor: pointer; font-size: 0.875rem; font-weight: 600; color: #374151; list-style: none; }
summary::marker, summary::-webkit-details-marker { display: none; }
summary::before { content: '▶ '; font-size: 0.65rem; color: #9ca3af; }
details[open] summary::before { content: '▼ '; }
p { font-size: 0.875rem; color: #6b7280; margin: 0.5rem 0 0; }
</style>
