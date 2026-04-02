<template>
  <footer class="status-bar" :aria-label="t.statusBar.ariaLabel" role="contentinfo">
    <span class="status-item status-version">
      {{ t.statusBar.version }}{{ version }}
    </span>
    <template v-for="item in visibleItems" :key="item.id">
      <span class="status-divider" aria-hidden="true">·</span>
      <span
        v-if="item.kind === 'text'"
        class="status-item"
        :title="plainStatusValue(item)"
        :aria-label="`${tPath(item.label)}: ${plainStatusValue(item)}`"
      >
        {{ tPath(item.label) }}: <span class="status-plain">{{ plainStatusValue(item) }}</span>
      </span>
      <span v-else class="status-item" :title="toIso(item.value?.value)">
        {{ tPath(item.label) }}: <time :datetime="toIso(item.value?.value)">{{ formatStatusBarDateTime(item.value?.value) ?? t.statusBar.never }}</time>
      </span>
    </template>
  </footer>
</template>

<script setup>
import { computed, unref } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { APP_VERSION } from '../lib/version.js'
import { getStatusItems } from '../lib/plugins/registry.js'
import { formatStatusBarDateTime } from '../utils/formatDate.js'

const { t, tPath } = useI18n()
const version = APP_VERSION

const statusItems = getStatusItems()

const visibleItems = computed(() =>
  statusItems.filter((item) => {
    if (typeof item.visible === 'function') return item.visible()
    return item.visible !== false
  })
)

function toIso(ts) {
  return ts ? new Date(ts).toISOString() : ''
}

/**
 * Vrátí zobrazený text pro status položku typu plain (ref na řetězec).
 * @param {{ value: import('vue').Ref<string>|string }} item
 * @returns {string}
 */
function plainStatusValue(item) {
  const v = unref(item.value)
  return v == null || v === '' ? '—' : String(v)
}
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

.status-plain {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
</style>
