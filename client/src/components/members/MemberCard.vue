<template>
  <div class="member-card">
    <div class="info">
      <strong>{{ member.name }}</strong>
      <span v-if="member.role" class="role">{{ member.role }}</span>
      <span v-if="member.contact" class="contact">{{ member.contact }}</span>
    </div>
    <div class="actions">
      <button class="btn-icon" @click="$emit('edit', member)" title="Edit">✏️</button>
      <button class="btn-icon danger" @click="$emit('delete', member.id)" title="Delete">🗑</button>
    </div>
  </div>
</template>

<script setup>
defineProps({ member: { type: Object, required: true } })
defineEmits(['edit', 'delete'])
</script>

<style scoped>
.member-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fff;
}
.info { display: flex; flex-direction: column; gap: 0.2rem; }
strong { font-size: 0.95rem; color: #111827; }
.role    { font-size: 0.8rem; color: #6b7280; }
.contact { font-size: 0.8rem; color: #4f46e5; }
.actions { display: flex; gap: 0.25rem; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem; border-radius: 4px; }
.btn-icon:hover { background: #f3f4f6; }
.btn-icon.danger:hover { background: #fef2f2; }
</style>
