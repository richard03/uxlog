<template>
  <header class="header" role="banner">
    <div class="header-inner">
      <router-link to="/" class="logo" :aria-label="t.app.title">
        {{ t.app.title }}
      </router-link>
      <nav class="nav" aria-label="Hlavní navigace">
        <router-link to="/" class="nav-link">{{ t.nav.projects }}</router-link>
        <button
          type="button"
          class="btn btn-ghost icon-btn"
          :aria-label="isDark ? t.nav.lightMode : t.nav.darkMode"
          @click="theme.toggle"
        >
          {{ isDark ? '☀' : '☽' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="showSearch = true"
        >
          {{ t.common.search }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="handleExport"
        >
          {{ t.nav.export }}
        </button>
      </nav>
    </div>
    <SearchModal v-if="showSearch" @close="showSearch = false" />
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTheme } from '../composables/useTheme.js'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import SearchModal from './SearchModal.vue'

const theme = useTheme()
const { t } = useI18n()
const store = useStore()
const showSearch = ref(false)

const isDark = computed(() => theme.isDark.value)

/**
 * Exportuje data do schránky.
 */
function handleExport() {
  const json = store.exportData()
  navigator.clipboard.writeText(json).then(() => {
    alert(t.common.exportSuccess)
  }).catch(() => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'uxlog-export.json'
    a.click()
    URL.revokeObjectURL(url)
  })
}
</script>

<style scoped>
.header {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  padding: var(--space-md);
}

.header-inner {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--text);
}

.logo:hover {
  color: var(--accent);
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.nav-link {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
}

.nav-link.router-link-active {
  background: var(--bg-muted);
  font-weight: 500;
}

.icon-btn {
  padding: var(--space-sm);
  font-size: 1.1rem;
}
</style>
