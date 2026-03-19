<template>
  <footer class="status-bar" :aria-label="t.statusBar.ariaLabel" role="contentinfo">
    <span class="status-item status-version">
      {{ t.statusBar.version }}{{ version }}
    </span>
    <span class="status-divider" aria-hidden="true">·</span>
    <span class="status-item" :title="localSaveFull">
      {{ t.statusBar.localSave }}: <time :datetime="localSaveIso">{{ localSaveShort }}</time>
    </span>
    <template v-if="isFlexiEnabled()">
      <span class="status-divider" aria-hidden="true">·</span>
      <span class="status-item" :title="apiSyncFull">
        {{ t.statusBar.apiSync }}: <time :datetime="apiSyncIso">{{ apiSyncShort }}</time>
      </span>
    </template>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { APP_VERSION } from '../lib/version.js'
import { lastLocalSave, lastApiSync } from '../lib/dataStatus.js'
import { isFlexiEnabled } from '../lib/flexiApi.js'

const { t } = useI18n()
const version = APP_VERSION

/** Formátuje timestamp jako HH:MM:SS pokud dnes, jinak D.M.YYYY HH:MM:SS */
function formatTs(ts) {
  if (!ts) return null
  const d = new Date(ts)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return time
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${time}`
}

function toIso(ts) {
  return ts ? new Date(ts).toISOString() : ''
}

const localSaveShort = computed(() => formatTs(lastLocalSave.value) ?? t.statusBar.never)
const localSaveFull = computed(() => toIso(lastLocalSave.value))
const localSaveIso = computed(() => toIso(lastLocalSave.value))

const apiSyncShort = computed(() => formatTs(lastApiSync.value) ?? t.statusBar.never)
const apiSyncFull = computed(() => toIso(lastApiSync.value))
const apiSyncIso = computed(() => toIso(lastApiSync.value))
</script>

<style scoped>
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0 var(--space-md);
  background: var(--bg-elevated);
  border-top: 1px solid var(--border);
  font-size: 0.72rem;
  color: var(--text-muted);
  z-index: 900;
  white-space: nowrap;
  overflow: hidden;
}

.status-version {
  font-weight: 600;
  opacity: 0.7;
}

.status-divider {
  opacity: 0.4;
}

time {
  font-variant-numeric: tabular-nums;
}
</style>
