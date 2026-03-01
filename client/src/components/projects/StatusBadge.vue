<template>
  <span class="badge" :class="status">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { statusLabels } from '@/utils/scopeLabels'

const props = defineProps({ status: String })
const label = computed(() => statusLabels[props.status] || props.status)
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.research    { background: #ede9fe; color: #5b21b6; }
.design      { background: #dbeafe; color: #1d4ed8; }
.development { background: #dcfce7; color: #15803d; }
</style>
