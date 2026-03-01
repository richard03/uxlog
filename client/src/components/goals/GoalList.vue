<template>
  <div>
    <SyncStatusBanner :projectId="projectId" @sync="figma.sync(projectId)" />
    <FigmaEmptyState v-if="!figma.goals.length && !figma.connection" />
    <div v-else class="list">
      <GoalCard v-for="g in figma.goals" :key="g.id" :goal="g" />
      <EmptyState v-if="!figma.goals.length" icon="🎯" title="No goals synced yet" />
    </div>
  </div>
</template>

<script setup>
import { useFigmaStore }  from '@/stores/figma'
import GoalCard           from './GoalCard.vue'
import SyncStatusBanner   from '@/components/figma/SyncStatusBanner.vue'
import FigmaEmptyState    from '@/components/figma/FigmaEmptyState.vue'
import EmptyState         from '@/components/ui/EmptyState.vue'

defineProps({ projectId: { type: [Number, String], required: true } })
const figma = useFigmaStore()
</script>

<style scoped>
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
</style>
