<template>
  <div>
    <SyncStatusBanner :projectId="projectId" @sync="figma.sync(projectId)" />
    <FigmaEmptyState v-if="!figma.stakeholders.length && !figma.connection" />
    <template v-else>
      <StakeholderMatrix :stakeholders="figma.stakeholders" />
      <div class="grid">
        <StakeholderCard v-for="s in figma.stakeholders" :key="s.id" :stakeholder="s" />
      </div>
      <EmptyState v-if="!figma.stakeholders.length" icon="🧩" title="No stakeholders synced yet" />
    </template>
  </div>
</template>

<script setup>
import { useFigmaStore }      from '@/stores/figma'
import StakeholderCard        from './StakeholderCard.vue'
import StakeholderMatrix      from './StakeholderMatrix.vue'
import SyncStatusBanner       from '@/components/figma/SyncStatusBanner.vue'
import FigmaEmptyState        from '@/components/figma/FigmaEmptyState.vue'
import EmptyState             from '@/components/ui/EmptyState.vue'

defineProps({ projectId: { type: [Number, String], required: true } })
const figma = useFigmaStore()
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
