<template>
  <div v-if="figma.connection" class="sync-banner" :class="figma.connection.sync_status">
    <div class="sync-info">
      <span class="status-dot"></span>
      <span>{{ statusText }}</span>
      <span v-if="figma.connection.last_synced_at" class="last-synced">
        · Last synced {{ formatRelative(figma.connection.last_synced_at) }}
      </span>
    </div>
    <button class="btn-sync" :disabled="figma.syncing" @click="$emit('sync')">
      {{ figma.syncing ? 'Syncing…' : '↺ Sync' }}
    </button>
  </div>
  <div v-if="figma.syncError" class="sync-error">{{ figma.syncError }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { useFigmaStore } from '@/stores/figma'
import { formatRelative } from '@/utils/formatDate'

defineEmits(['sync'])
const figma = useFigmaStore()

const statusText = computed(() => ({
  idle:    'Not synced yet',
  syncing: 'Syncing…',
  ok:      'Synced',
  error:   'Sync error',
}[figma.connection?.sync_status] || ''))
</script>

<style scoped>
.sync-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 1rem; border-radius: 8px;
  background: #f9fafb; border: 1px solid #e5e7eb;
  margin-bottom: 1rem;
}
.sync-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #374151; }
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #9ca3af;
}
.ok    .status-dot { background: #16a34a; }
.error .status-dot { background: #dc2626; }
.syncing .status-dot { background: #f59e0b; }
.last-synced { color: #9ca3af; }
.btn-sync {
  padding: 0.35rem 0.875rem; border: none; border-radius: 6px;
  background: #4f46e5; color: #fff; cursor: pointer; font-size: 0.875rem;
}
.btn-sync:disabled { opacity: 0.6; cursor: default; }
.sync-error { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
</style>
