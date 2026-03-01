<template>
  <div class="req-card">
    <div class="card-header">
      <div class="title-row">
        <h4>{{ requirement.name }}</h4>
        <span class="severity" :title="`Severity: ${requirement.severity}/5`">
          {{ '●'.repeat(requirement.severity) }}<span class="grey">{{ '●'.repeat(5 - requirement.severity) }}</span>
        </span>
      </div>
      <span class="moscow-badge" :style="badgeStyle">{{ moscowLabel[requirement.moscow_rating] }}</span>
    </div>
    <p v-if="requirement.description" class="desc">{{ requirement.description }}</p>
    <details v-if="requirement.impact_if_not_met" class="impact">
      <summary>Impact if not met</summary>
      <p>{{ requirement.impact_if_not_met }}</p>
    </details>
    <details v-if="requirement.moscow_rating === 'Wont' && requirement.wont_have_reason" class="impact">
      <summary>Why "Won't Have"</summary>
      <p>{{ requirement.wont_have_reason }}</p>
    </details>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { moscowColors, moscowLabel } from '@/utils/moscowColors'

const props      = defineProps({ requirement: { type: Object, required: true } })
const badgeStyle = computed(() => {
  const c = moscowColors[props.requirement.moscow_rating] || moscowColors.Should
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
})
</script>

<style scoped>
.req-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem; }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.5rem; }
.title-row { display: flex; align-items: center; gap: 0.5rem; }
h4 { margin: 0; font-size: 0.95rem; }
.severity { font-size: 0.8rem; color: #f59e0b; letter-spacing: -0.05em; }
.grey { color: #e5e7eb; }
.moscow-badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.desc { font-size: 0.875rem; color: #6b7280; margin: 0 0 0.5rem; }
.impact { border-top: 1px solid #f3f4f6; padding-top: 0.4rem; margin-top: 0.5rem; }
summary { cursor: pointer; font-size: 0.8rem; color: #6b7280; list-style: none; }
summary::marker, summary::-webkit-details-marker { display: none; }
p { font-size: 0.85rem; color: #374151; margin: 0.4rem 0 0; }
</style>
