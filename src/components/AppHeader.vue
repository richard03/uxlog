<template>
  <header class="header" role="banner" :style="projectColor ? { borderBottomColor: projectColor } : {}">
    <div class="header-inner">
      <router-link to="/" class="logo" :aria-label="t.app.title">
        {{ t.app.title }}
      </router-link>
      <nav class="nav" :aria-label="t.nav.mainNav">
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
          class="btn btn-secondary icon-btn"
          :aria-label="t.nav.settings"
          :title="t.nav.settings"
          @click="showSettings = true"
        >
          ⚙
        </button>
      </nav>
    </div>
    <SearchModal v-if="showSearch" @close="showSearch = false" />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import SearchModal from './SearchModal.vue'
import SettingsModal from './SettingsModal.vue'

const theme = useTheme()
const { t } = useI18n()
const route = useRoute()
const store = useStore()
const showSearch = ref(false)
const showSettings = ref(false)

const isDark = computed(() => theme.isDark.value)

const projectColor = computed(() => {
  const id = route.params.id
  if (!id) return null
  return store.getProject(id)?.color || null
})
</script>

<style scoped>
.header {
  background: var(--bg-elevated);
  border-bottom: 3px solid var(--border);
  padding: var(--space-md);
  transition: border-bottom-color 0.2s;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo:hover {
  color: var(--accent);
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
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
