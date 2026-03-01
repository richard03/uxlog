<template>
  <RouterLink :to="`/projects/${project.id}`" class="project-card">
    <div class="card-header">
      <h3>{{ project.name }}</h3>
      <StatusBadge :status="project.status" />
    </div>
    <div class="card-meta">
      <PriorityBadge :priority="project.priority" />
      <span class="scope">{{ scopeLabels[project.scope] }}</span>
    </div>
    <p class="last-worked">Last worked: {{ formatRelative(project.last_worked_at) }}</p>
  </RouterLink>
</template>

<script setup>
import StatusBadge   from './StatusBadge.vue'
import PriorityBadge from './PriorityBadge.vue'
import { scopeLabels } from '@/utils/scopeLabels'
import { formatRelative } from '@/utils/formatDate'

defineProps({ project: { type: Object, required: true } })
</script>

<style scoped>
.project-card {
  display: block;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, transform 0.1s;
}
.project-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}
.card-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;
  margin-bottom: 0.75rem;
}
h3 { margin: 0; font-size: 1rem; font-weight: 600; color: #111827; }
.card-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.scope { font-size: 0.8rem; color: #6b7280; }
.last-worked { font-size: 0.8rem; color: #9ca3af; margin: 0; }
</style>
