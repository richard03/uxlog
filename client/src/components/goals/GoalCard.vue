<template>
  <div class="goal-card">
    <h4>{{ goal.name }}</h4>
    <p v-if="goal.description" class="desc">{{ goal.description }}</p>
    <ul v-if="goal.metrics?.length" class="metrics">
      <li v-for="(m, i) in goal.metrics" :key="i">{{ m }}</li>
    </ul>
  </div>
</template>

<script setup>
defineProps({ goal: { type: Object, required: true } })
</script>

<style scoped>
.goal-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem;
}
h4 { margin: 0 0 0.5rem; font-size: 0.95rem; }
.desc { font-size: 0.875rem; color: #6b7280; margin: 0 0 0.75rem; }
.metrics { margin: 0; padding-left: 1.25rem; }
.metrics li { font-size: 0.825rem; color: #374151; margin-bottom: 0.2rem; }
</style>
