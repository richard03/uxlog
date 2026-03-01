<template>
  <div class="scenario-card">
    <div class="card-header">
      <h4>{{ scenario.name }}</h4>
      <span class="moscow-badge" :style="badgeStyle">{{ moscowLabel[scenario.moscow_rating] }}</span>
    </div>
    <p v-if="scenario.description" class="desc">{{ scenario.description }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { moscowColors, moscowLabel } from '@/utils/moscowColors'

const props  = defineProps({ scenario: { type: Object, required: true } })
const badgeStyle = computed(() => {
  const c = moscowColors[props.scenario.moscow_rating] || moscowColors.Should
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
})
</script>

<style scoped>
.scenario-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem;
}
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
h4 { margin: 0; font-size: 0.95rem; }
.moscow-badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.desc { font-size: 0.875rem; color: #6b7280; margin: 0; }
</style>
