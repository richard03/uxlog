<template>
  <div class="competition-card">
    <div class="card-header">
      <h4>{{ competition.name }}</h4>
      <div class="actions">
        <button class="btn-icon" @click="$emit('edit', competition)" title="Edit">✏️</button>
        <button class="btn-icon danger" @click="$emit('delete', competition.id)" title="Delete">🗑</button>
      </div>
    </div>
    <p v-if="competition.description" class="desc">{{ competition.description }}</p>
  </div>
</template>

<script setup>
defineProps({ competition: { type: Object, required: true } })
defineEmits(['edit', 'delete'])
</script>

<style scoped>
.competition-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
}
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}
h4 { margin: 0; font-size: 0.95rem; flex: 1; }
.actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0.7;
}
.btn-icon:hover { opacity: 1; background: #f3f4f6; }
.btn-icon.danger:hover { background: #fef2f2; }
.desc { font-size: 0.875rem; color: #6b7280; margin: 0.5rem 0 0; }
</style>
