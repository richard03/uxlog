<template>
  <div class="stakeholder-card" :style="{ borderTopColor: stakeholder.color || '#e5e7eb' }">
    <div class="card-header">
      <span class="type-badge" :class="stakeholder.type">{{ stakeholder.type }}</span>
      <strong>{{ stakeholder.name }}</strong>
    </div>
    <div class="ratings">
      <span>Power: <strong>{{ stakeholder.power_rating }}/10</strong></span>
      <span>Interest: <strong>{{ stakeholder.interest_rating }}/10</strong></span>
    </div>
    <p v-if="stakeholder.description" class="desc">{{ stakeholder.description }}</p>
  </div>
</template>

<script setup>
defineProps({ stakeholder: { type: Object, required: true } })
</script>

<style scoped>
.stakeholder-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-top: 4px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
}
.card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
strong { font-size: 0.95rem; }
.type-badge {
  font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
  padding: 0.15rem 0.5rem; border-radius: 4px;
}
.type-badge.person { background: #dbeafe; color: #1d4ed8; }
.type-badge.group  { background: #ede9fe; color: #5b21b6; }
.ratings { display: flex; gap: 1rem; font-size: 0.8rem; color: #6b7280; margin-bottom: 0.5rem; }
.desc { font-size: 0.85rem; color: #374151; margin: 0; }
</style>
