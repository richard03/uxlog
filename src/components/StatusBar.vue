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
    <label class="status-theme">
      {{ t.statusBar.theme }}:
      <select :value="theme" class="status-theme-select" @change="setTheme($event.target.value)">
        <option v-for="id in themes" :key="id" :value="id">{{ t.statusBar.themes[id] }}</option>
      </select>
    </label>
  </footer>
</template>

<script setup>
import { computed, unref } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { APP_VERSION } from '../lib/version.js'
import { getStatusItems } from '../lib/plugins/registry.js'
import { formatStatusBarDateTime } from '../utils/formatDate.js'
import { useTheme } from '../composables/useTheme.js'

const { t, tPath } = useI18n()
const version = APP_VERSION
const { theme, themes, setTheme } = useTheme()

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
.status-theme {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 0;
  font: inherit;
  font-weight: inherit;
  color: inherit;
}

/* Kompaktní výběr – přepisuje globální styl select (šířka 100 %, odsazení) */
.status-theme-select {
  width: auto;
  height: 18px;
  padding: 0 4px;
  font: inherit;
  font-size: inherit;
  line-height: 1;
  color: inherit;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
}

.status-theme-select:hover {
  border-color: var(--border);
}

.status-theme-select:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
}

.status-theme-select option {
  color: var(--text);
  background: var(--bg-elevated);
}

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
