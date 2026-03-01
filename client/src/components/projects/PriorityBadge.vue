<template>
  <span class="badge" :class="priority">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { priorityLabels } from '@/utils/scopeLabels'

const props = defineProps({ priority: String })
const label = computed(() => priorityLabels[props.priority] || props.priority)
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.high   { background: #fef2f2; color: #991b1b; }
.medium { background: #fff7ed; color: #9a3412; }
.low    { background: #f0fdf4; color: #166534; }
</style>
