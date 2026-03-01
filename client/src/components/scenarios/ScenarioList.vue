<template>
  <div>
    <SyncStatusBanner :projectId="projectId" @sync="figma.sync(projectId)" />
    <FigmaEmptyState v-if="!figma.scenarios.length && !figma.connection" />
    <template v-else>
      <div v-for="rating in moscowOrder" :key="rating">
        <div v-if="grouped[rating]?.length">
          <h4 class="group-heading" :style="{ color: moscowColors[rating].text }">
            {{ moscowLabel[rating] }}
          </h4>
          <div class="group-list">
            <ScenarioCard v-for="s in grouped[rating]" :key="s.id" :scenario="s" />
          </div>
        </div>
      </div>
      <EmptyState v-if="!figma.scenarios.length" icon="📋" title="No scenarios synced yet" />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFigmaStore }    from '@/stores/figma'
import { moscowColors, moscowLabel } from '@/utils/moscowColors'
import ScenarioCard         from './ScenarioCard.vue'
import SyncStatusBanner     from '@/components/figma/SyncStatusBanner.vue'
import FigmaEmptyState      from '@/components/figma/FigmaEmptyState.vue'
import EmptyState           from '@/components/ui/EmptyState.vue'

defineProps({ projectId: { type: [Number, String], required: true } })
const figma = useFigmaStore()

const moscowOrder = ['Must', 'Should', 'Could', 'Wont']

const grouped = computed(() => {
  const g = {}
  for (const r of moscowOrder) g[r] = []
  for (const s of figma.scenarios) {
    if (g[s.moscow_rating]) g[s.moscow_rating].push(s)
    else g['Should'].push(s)
  }
  return g
})
</script>

<style scoped>
.group-heading { margin: 1.5rem 0 0.5rem; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
.group-list { display: flex; flex-direction: column; gap: 0.5rem; }
</style>
