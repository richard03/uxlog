<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link to="/" class="back-link">{{ t.common.back }}</router-link>
      <div class="header-title-row">
        <h1>{{ project.name }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="openForm">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete">{{ t.common.delete }}</button>
        </div>
      </div>
      <div class="header-meta">
        <span class="badge">{{ t.project.priority }}: {{ tPath(`priority.${project.priority}`) }}</span>
        <span class="badge">{{ t.project.scopeLabel }}: {{ tPath(`scope.${project.scope}`) }}</span>
        <span class="badge">{{ t.project.lastActivity }}: {{ formatDate(project.lastWorkedAt) }}</span>
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
        <span class="section-count">{{ s.count }}</span>
      </router-link>
    </nav>

    <p class="section-hint">
      {{ t.common.emptyHint }}
    </p>

    <Modal v-if="showForm" :title="t.project.edit" @close="closeForm">
      <form @submit.prevent="saveProject">
        <div class="form-group">
          <label for="project-name">{{ t.project.name }}</label>
          <input id="project-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="project-scope">{{ t.project.scope }}</label>
          <select id="project-scope" v-model="form.scope">
            <option value="small">{{ t.scope.small }}</option>
            <option value="medium">{{ t.scope.medium }}</option>
            <option value="large">{{ t.scope.large }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="project-priority">{{ t.project.priority }}</label>
          <select id="project-priority" v-model="form.priority">
            <option value="high">{{ t.priority.high }}</option>
            <option value="medium">{{ t.priority.medium }}</option>
            <option value="low">{{ t.priority.low }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">
            {{ t.common.cancel }}
          </button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="showConfirm"
      :title="t.project.delete"
      :message="t.project.deleteConfirm"
      @confirm="doDelete"
      @cancel="showConfirm = false"
    />
  </div>
  <div v-else class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { formatDate } from '../utils/formatDate.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t, tPath } = useI18n()

const showForm = ref(false)
const showConfirm = ref(false)

const form = ref({
  name: '',
  scope: 'medium',
  priority: 'medium',
})

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))

/**
 * Otevře formulář pro úpravu projektu s aktuálními hodnotami.
 */
function openForm() {
  if (project.value) {
    form.value = {
      name: project.value.name,
      scope: project.value.scope,
      priority: project.value.priority,
    }
    showForm.value = true
  }
}

/**
 * Zavře formulář pro úpravu projektu.
 */
function closeForm() {
  showForm.value = false
}

/**
 * Uloží úpravy projektu.
 */
function saveProject() {
  if (!project.value) return
  const formData = { name: form.value.name, scope: form.value.scope, priority: form.value.priority }
  store.updateProject(project.value.id, formData)
  closeForm()
}

/**
 * Zobrazí dialog pro potvrzení smazání projektu.
 */
function confirmDelete() {
  showConfirm.value = true
}

/**
 * Smaže projekt a přesměruje na seznam projektů.
 */
function doDelete() {
  if (project.value) {
    store.deleteProject(project.value.id)
    router.push({ name: 'projects' })
  }
  showConfirm.value = false
}

const sections = computed(() => {
  const pid = projectId.value
  return [
    { id: 'goals', route: 'goals', count: store.getGoals(pid).length },
    { id: 'stakeholders', route: 'stakeholders', count: store.getStakeholders(pid).length },
    { id: 'competition', route: 'competition', count: store.getCompetitions(pid).length },
    { id: 'hypothesis', route: 'hypothesis', count: store.getHypotheses(pid).length },
    { id: 'personas', route: 'personas', count: store.getPersonas(pid).length },
    { id: 'requirements', route: 'requirements', count: store.getRequirements(pid).length },
    { id: 'scenarios', route: 'scenarios', count: store.getScenarios(pid).length },
  ]
})
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-lg);
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.header-title-row h1 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-xs);
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
  display: flex;
  flex-direction: column;
  align-items: center;
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

.section-count {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.2;
  margin-top: var(--space-xs);
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

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}
</style>
