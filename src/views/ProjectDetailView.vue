<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link to="/" class="back-link">{{ t.common.back }}</router-link>
      <h1>{{ project.name }}</h1>
      <div class="header-meta">
        <span class="badge">{{ tPath(`scope.${project.scope}`) }}</span>
        <span class="badge">{{ tPath(`priority.${project.priority}`) }}</span>
        <span class="date">{{ formatDate(project.lastWorkedAt) }}</span>
      </div>
    </header>

    <nav class="section-nav" aria-label="Sekce projektu">
      <router-link
        v-for="s in sections"
        :key="s.id"
        :to="{ name: s.route, params: { id: projectId } }"
        class="section-link"
      >
        {{ tPath(`sections.${s.id}`) }}
      </router-link>
    </nav>

    <p class="section-hint">
      {{ t.common.emptyHint }}
    </p>
  </div>
  <div v-else class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { formatDate } from '../utils/formatDate.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))

const sections = [
  { id: 'goals', route: 'goals' },
  { id: 'stakeholders', route: 'stakeholders' },
  { id: 'competition', route: 'competition' },
  { id: 'hypothesis', route: 'hypothesis' },
  { id: 'personas', route: 'personas' },
  { id: 'requirements', route: 'requirements' },
  { id: 'scenarios', route: 'scenarios' },
]
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-lg);
}

.back-link {
  display: inline-block;
  margin-bottom: var(--space-sm);
  font-size: 0.9rem;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.date {
  margin-left: auto;
  color: var(--text-muted);
}

.section-nav {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-sm);
}

.section-link {
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  text-align: center;
  transition: border-color var(--transition), background var(--transition);
}

.section-link:hover {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.section-link.router-link-active {
  border-color: var(--accent);
  background: var(--accent-muted);
  font-weight: 500;
}

.section-hint {
  margin-top: var(--space-lg);
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
