<template>
  <header class="header" role="banner" :style="projectColor ? { borderBottomColor: projectColor } : {}">
    <div class="header-inner">
      <div class="header-start">
        <router-link to="/" class="logo" :aria-label="t.app.title">
          {{ t.app.title }}
        </router-link>
        <!-- Přepínač pohledu projektu: Data (obrazovky s entitami a Zápisníkem) / Canvas – jen v projektu -->
        <div v-if="projectId && project" class="view-switch">
          <router-link :to="dataTarget" custom v-slot="{ navigate }">
            <AppButton
              variant="secondary"
              :class="{ 'nav-active': !onCanvas }"
              :aria-current="!onCanvas ? 'page' : undefined"
              @click="navigate"
            >{{ t.nav.data }}</AppButton>
          </router-link>
          <router-link :to="{ name: 'projectCanvas', params: { id: projectId } }" custom v-slot="{ navigate }">
            <AppButton
              variant="secondary"
              :class="{ 'nav-active': onCanvas }"
              :aria-current="onCanvas ? 'page' : undefined"
              @click="navigate"
            >{{ t.nav.canvas }}</AppButton>
          </router-link>
        </div>
      </div>
      <nav class="nav" :aria-label="t.nav.mainNav">
        <router-link to="/" custom v-slot="{ navigate, isActive }">
          <AppButton variant="secondary" :class="{ 'nav-active': isActive }" @click="navigate">{{ t.nav.projects }}</AppButton>
        </router-link>
        <router-link to="/config" custom v-slot="{ navigate, isActive }">
          <AppButton variant="secondary" :class="{ 'nav-active': isActive }" @click="navigate">{{ t.nav.config }}</AppButton>
        </router-link>
<AppButton variant="secondary" @click="showSearch = true">
          {{ t.common.search }}
        </AppButton>
      </nav>
    </div>
    <SearchModal v-if="showSearch" @close="showSearch = false" />
  </header>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import SearchModal from './SearchModal.vue'
import AppButton from './AppButton.vue'

useTheme()
const { t } = useI18n()
const route = useRoute()
const store = useStore()
const showSearch = ref(false)

const projectId = computed(() => (route.params.id ? String(route.params.id) : ''))
const project = computed(() => (projectId.value ? store.getProject(projectId.value) : null))
const projectColor = computed(() => project.value?.color || null)

// Plátno včetně detailu entity v panelu nad ním (potomci routy projectCanvas)
const onCanvas = computed(() => route.matched.some((r) => r.name === 'projectCanvas'))

/** Poslední obrazovka „Data“ (mimo Canvas) pro každý projekt – tlačítko Data se na ni vrací. */
const lastDataPath = ref({})
watch(
  () => route.fullPath,
  () => {
    if (projectId.value && route.name && !onCanvas.value) {
      lastDataPath.value = { ...lastDataPath.value, [projectId.value]: route.fullPath }
    }
  },
  { immediate: true },
)

const dataTarget = computed(() =>
  lastDataPath.value[projectId.value] || { name: 'project', params: { id: projectId.value } },
)
</script>

<style scoped>
.header {
  background: var(--bg-elevated);
  border-bottom: 3px solid var(--border);
  padding: var(--space-md);
  transition: border-bottom-color 0.2s;
}

.header-inner {
  max-width: var(--layout-max-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.header-start {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.view-switch {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--text);
  min-width: 0;
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
