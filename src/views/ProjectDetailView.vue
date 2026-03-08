<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <h1>{{ project.name }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="openForm">{{ t.common.edit }}</button>
          <ExportButton :get-yaml="() => store.exportProjectData(projectId)" :filename="project?.name || 'projekt'" />
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
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

    <!-- Notebook card -->
    <button type="button" class="notebook-card" @click="showNotebook = true" :aria-label="t.notebook.title">
      <span class="notebook-card-title">{{ t.notebook.open }}</span>
      <span class="notebook-card-preview">{{ notebookPreview }}</span>
    </button>

    <!-- Activities panel -->
    <section class="activities-panel" aria-labelledby="activities-heading">
      <div class="activities-header">
        <h2 id="activities-heading" class="activities-title">{{ t.activity.panelTitle }}</h2>
        <button type="button" class="btn btn-secondary btn-sm" @click="openAddActivity">{{ t.activity.add }}</button>
      </div>

      <ul v-if="activities.length" class="entity-list" role="list">
        <li v-for="activity in activities" :key="activity.id" class="card card-clickable">
          <router-link
            class="card-body"
            :to="{ name: 'activityDetail', params: { id: projectId, activityId: activity.id } }"
          >
            <div class="card-badges">
              <span class="status-dot" :class="`status-${activity.status}`" aria-hidden="true"></span>
              <span class="badge">{{ t.activity.statusOptions[activity.status] }}</span>
            </div>
            <h3 class="card-title">{{ activity.name || t.activity.label }}</h3>
          </router-link>
          <button
            type="button"
            class="btn btn-ghost btn-xs activity-dismiss"
            :aria-label="t.activity.notInterested"
            @click="dismissActivity(activity.id)"
          >{{ t.activity.notInterested }}</button>
        </li>
      </ul>
      <p v-else class="activities-empty">
        {{ t.activity.emptyState }}<br />
        <span class="text-muted">{{ t.activity.emptyStateHint }}</span>
      </p>
    </section>

    <!-- Notebook modal -->
    <Modal v-if="showNotebook" :title="t.notebook.title" size="large" @close="closeNotebook">
      <textarea
        id="notebook"
        v-model="notebookText"
        class="notebook-textarea"
        :placeholder="t.notebook.placeholder"
        :aria-label="t.notebook.title"
        autofocus
      ></textarea>
    </Modal>

    <!-- Add activity modal -->
    <Modal v-if="showAddActivity" :title="t.activity.add" @close="closeAddActivity">
      <form @submit.prevent="saveActivity">
        <div class="form-group">
          <label for="activity-type">{{ t.activity.label }}</label>
          <select id="activity-type" v-model="activityTypeKey" class="form-control">
            <optgroup v-for="group in activityGroups" :key="group.key" :label="group.label">
              <option v-for="type in group.types" :key="type.key" :value="type.key">{{ type.defaultName }}</option>
            </optgroup>
            <optgroup :label="t.activity.addCustom">
              <option value="custom">{{ t.activity.customName }}</option>
            </optgroup>
          </select>
        </div>

        <div v-if="activityTypeKey === 'custom'" class="form-group">
          <label for="activity-custom-name">{{ t.activity.name }}</label>
          <input id="activity-custom-name" v-model="activityCustomName" class="form-control" autofocus required />
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeAddActivity">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.add }}</button>
        </div>
      </form>
    </Modal>

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

    <ImportModal
      v-if="showImport"
      :project-id="projectId"
      @close="showImport = false"
      @imported="handleImported"
    />

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
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { formatDate } from '../utils/formatDate.js'
import { ACTIVITY_TYPES, getActivityType } from '../lib/activityTypes.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ExportButton from '../components/ExportButton.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t, tPath } = useI18n()

const showForm = ref(false)
const showConfirm = ref(false)
const showImport = ref(false)

const form = ref({
  name: '',
  scope: 'medium',
  priority: 'medium',
})

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…' },
])

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
    { id: 'team', route: 'team', count: store.getTeamMembers(pid).length },
    { id: 'stakeholders', route: 'stakeholders', count: store.getStakeholders(pid).length },
    { id: 'competition', route: 'competition', count: store.getCompetitions(pid).length },
    { id: 'hypothesis', route: 'hypothesis', count: store.getHypotheses(pid).length },
    { id: 'personas', route: 'personas', count: store.getPersonas(pid).length },
    { id: 'requirements', route: 'requirements', count: store.getRequirements(pid).length },
    { id: 'scenarios', route: 'scenarios', count: store.getScenarios(pid).length },
  ]
})

// --- Activities ---

const activities = computed(() => store.getActivities(projectId.value))

const showAddActivity = ref(false)
const activityTypeKey = ref('')
const activityCustomName = ref('')

const activityGroups = computed(() => [
  { key: 'project', label: t.activity.groupProject, types: ACTIVITY_TYPES.filter((type) => type.group === 'project') },
  { key: 'research', label: t.activity.groupResearch, types: ACTIVITY_TYPES.filter((type) => type.group === 'research') },
  { key: 'design', label: t.activity.groupDesign, types: ACTIVITY_TYPES.filter((type) => type.group === 'design') },
])

function openAddActivity() {
  activityTypeKey.value = ''
  activityCustomName.value = ''
  showAddActivity.value = true
}

function closeAddActivity() {
  showAddActivity.value = false
}

function saveActivity() {
  if (activityTypeKey.value === 'custom') {
    const name = activityCustomName.value.trim()
    if (!name) return
    store.addActivity(projectId.value, { name, sortOrder: 9999 })
  } else {
    const type = getActivityType(activityTypeKey.value)
    if (!type) return
    store.addActivity(projectId.value, {
      typeKey: type.key,
      name: type.defaultName,
      sortOrder: type.sortOrder,
    })
  }
  closeAddActivity()
}

function dismissActivity(id) {
  store.updateActivity(id, { dismissed: true })
}

// --- Notebook ---

const showNotebook = ref(false)
const notebookText = ref('')

watch(project, (p) => {
  notebookText.value = p?.notebook || ''
}, { immediate: true })

const notebookPreview = computed(() => {
  const text = notebookText.value?.trim()
  if (!text) return t.notebook.placeholder
  return text.length > 120 ? text.slice(0, 120) + '…' : text
})

function closeNotebook() {
  if (project.value) {
    store.updateProject(project.value.id, { notebook: notebookText.value })
  }
  showNotebook.value = false
}

function handleImported({ projectId: importedProjectId }) {
  showImport.value = false
  alert(t.import.success)
  if (importedProjectId && importedProjectId !== projectId.value) {
    router.push({ name: 'project', params: { id: importedProjectId } })
  }
}
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

/* Activities panel */
.activities-panel {
  margin-top: var(--space-xl);
}

.activities-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}


.activities-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
.card-body { flex: 1; text-decoration: none; color: inherit; display: block; }
.card-title { margin: var(--space-xs) 0 0; font-size: 1rem; }
.card-clickable:hover { border-color: var(--accent); }

.card-badges {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.status-pending { background: var(--color-muted, #9ca3af); }
.status-dot.status-in_progress { background: #f59e0b; }
.status-dot.status-done { background: #4caf50; }

.activity-dismiss {
  font-size: 0.75rem;
  flex-shrink: 0;
  padding: 0.15rem 0.5rem;
  opacity: 0.5;
  align-self: center;
}

.activity-dismiss:hover {
  opacity: 1;
}

.activities-empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  padding: var(--space-md) 0;
}

.btn-sm {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

.text-muted {
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* Notebook card */
.notebook-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  width: 100%;
  margin-top: var(--space-xl);
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
}

.notebook-card:hover {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.notebook-card-title {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.notebook-card-preview {
  font-size: 0.9rem;
  color: var(--text-muted);
  white-space: pre-wrap;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Notebook modal textarea */
.notebook-textarea {
  width: 100%;
  flex: 1;
  min-height: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.notebook-textarea:focus {
  outline: none;
  border-color: var(--accent);
}
</style>
