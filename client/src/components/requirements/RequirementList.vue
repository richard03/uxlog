<template>
  <div>
    <SyncStatusBanner :projectId="projectId" @sync="figma.sync(projectId)" />
    <FigmaEmptyState v-if="!figma.requirements.length && !figma.connection" />
    <template v-else>
      <!-- Filters -->
      <div class="filters">
        <select v-model="filterMoscow">
          <option value="">All MoSCoW</option>
          <option v-for="r in ['Must','Should','Could','Wont']" :key="r" :value="r">{{ moscowLabel[r] }}</option>
        </select>
        <select v-model="filterSeverity">
          <option value="">All severities</option>
          <option v-for="s in [1,2,3,4,5]" :key="s" :value="s">Severity {{ s }}</option>
        </select>
      </div>

      <div class="list">
        <RequirementCard v-for="r in filtered" :key="r.id" :requirement="r" />
      </div>
      <EmptyState v-if="!filtered.length" icon="📑" title="No requirements match the filter" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed }    from 'vue'
import { useFigmaStore }    from '@/stores/figma'
import { moscowLabel }      from '@/utils/moscowColors'
import RequirementCard      from './RequirementCard.vue'
import SyncStatusBanner     from '@/components/figma/SyncStatusBanner.vue'
import FigmaEmptyState      from '@/components/figma/FigmaEmptyState.vue'
import EmptyState           from '@/components/ui/EmptyState.vue'

defineProps({ projectId: { type: [Number, String], required: true } })
const figma         = useFigmaStore()
const filterMoscow   = ref('')
const filterSeverity = ref('')

const filtered = computed(() =>
  figma.requirements.filter(r => {
    if (filterMoscow.value   && r.moscow_rating !== filterMoscow.value)          return false
    if (filterSeverity.value && r.severity       !== Number(filterSeverity.value)) return false
    return true
  })
)
</script>

<style scoped>
.filters { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
select { padding: 0.4rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; }
.list { display: flex; flex-direction: column; gap: 0.5rem; }
</style>
