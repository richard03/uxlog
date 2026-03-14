<template>
  <header class="header" role="banner" :style="projectColor ? { borderBottomColor: projectColor } : {}">
    <div class="header-inner">
      <router-link to="/" class="logo" :aria-label="t.app.title">
        {{ t.app.title }}
      </router-link>
      <nav class="nav" :aria-label="t.nav.mainNav">
        <router-link to="/" custom v-slot="{ navigate, isActive }">
          <AppButton variant="secondary" :class="{ 'nav-active': isActive }" @click="navigate">{{ t.nav.projects }}</AppButton>
        </router-link>
        <router-link to="/config" custom v-slot="{ navigate, isActive }">
          <AppButton variant="secondary" :class="{ 'nav-active': isActive }" @click="navigate">{{ t.nav.config }}</AppButton>
        </router-link>
        <AppButton variant="tertiary" icon-only :aria-label="isDark ? t.nav.lightMode : t.nav.darkMode" @click="theme.toggle">
          {{ isDark ? '☀' : '☽' }}
        </AppButton>
        <AppButton variant="secondary" @click="showSearch = true">
          {{ t.common.search }}
        </AppButton>
      </nav>
    </div>
    <SearchModal v-if="showSearch" @close="showSearch = false" />
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import SearchModal from './SearchModal.vue'
import AppButton from './AppButton.vue'

const theme = useTheme()
const { t } = useI18n()
const route = useRoute()
const store = useStore()
const showSearch = ref(false)

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

.nav-active {
  background: var(--border) !important;
  font-weight: 500;
}

.icon-btn {
  padding: var(--space-sm);
  font-size: 1.1rem;
}
</style>
