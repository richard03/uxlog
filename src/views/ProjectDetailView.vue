<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <h1><ProjectColorTag :color="project.color" />{{ project.name }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportProjectData(projectId)" :filename="project?.name || 'projekt'" />
          <KebabMenu
            :items="[{ label: t.common.edit, action: 'edit' }, { label: t.common.delete, action: 'delete', variant: 'danger' }]"
            @action="(a) => { if (a === 'edit') openForm(); else if (a === 'delete') confirmDelete() }"
          />
        </div>
      </div>
      <div class="header-meta">
        <span class="badge">{{ t.project.priority }}: {{ tPath(`priority.${project.priority}`) }}</span>
        <span class="badge">{{ t.project.scopeLabel }}: {{ tPath(`scope.${project.scope}`) }}</span>
        <span class="badge">{{ t.project.lastActivity }}: {{ formatDate(project.lastWorkedAt) }}</span>
      </div>
    </header>

    <AppCardGrid aria-label="Sekce projektu">
      <CounterCard
        v-for="s in sections"
        :key="s.id"
        :to="{ name: s.route, params: { id: projectId } }"
        :label="tPath(`sections.${s.id}`)"
        :count="s.count"
        variant="section"
      />
    </AppCardGrid>

    <!-- Notebook card -->
    <NotebookCard
      :title="t.notebook.open"
      :label="t.notebook.title"
      :preview="notebookPreview"
      :placeholder="t.notebook.placeholder"
      @click="showNotebook = true"
    />

    <!-- Activities panel -->
    <ActivitiesPanel
      :project-id="projectId"
      @dismiss="(id) => store.updateActivity(id, { dismissed: true })"
      @move="(id) => { moveActivityTarget = id }"
    />

    <!-- Notebook modal -->
    <NotebookModal
      v-if="showNotebook"
      :initial-text="notebookText"
      :project-data="notebookProjectData"
      @close="closeNotebook"
      @confirm-action="confirmNotebookAction"
    />

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
        <div class="form-group">
          <label for="edit-project-created">{{ t.project.createdAt }}</label>
          <input id="edit-project-created" type="date" v-model="form.createdAt" />
        </div>
        <div class="form-group">
          <label for="edit-project-deadline">{{ t.project.deadlineLabel }}</label>
          <input id="edit-project-deadline" type="date" v-model="form.deadline" />
        </div>
        <div class="form-group">
          <label>{{ t.project.color }}</label>
          <ColorSwatchPicker v-model="form.color" :label="t.project.color" />
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
    <MoveToProjectModal v-if="moveActivityTarget" state-key="activities" :entity-id="moveActivityTarget" :current-project-id="projectId" @close="moveActivityTarget = null" @moved="moveActivityTarget = null" />
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
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import ColorSwatchPicker from '../components/ColorSwatchPicker.vue'
import NotebookModal from '../components/NotebookModal.vue'
import NotebookCard from '../components/NotebookCard.vue'
import ActivitiesPanel from '../components/ActivitiesPanel.vue'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import CounterCard from '../components/CounterCard.vue'
import AppCardGrid from '../components/AppCardGrid.vue'
import { generateNextCode } from '../lib/code.js'

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
  color: '',
  deadline: '',
  createdAt: '',
})

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…' },
])

function openForm() {
  if (project.value) {
    form.value = {
      name: project.value.name,
      scope: project.value.scope,
      priority: project.value.priority,
      color: project.value.color || '',
      deadline: project.value.deadline || '',
      createdAt: project.value.createdAt ? project.value.createdAt.split('T')[0] : '',
    }
    showForm.value = true
  }
}

function closeForm() {
  showForm.value = false
}

function saveProject() {
  if (!project.value) return
  const formData = {
    name: form.value.name,
    scope: form.value.scope,
    priority: form.value.priority,
    color: form.value.color,
    deadline: form.value.deadline,
    createdAt: form.value.createdAt ? new Date(form.value.createdAt + 'T12:00:00').toISOString() : undefined,
  }
  store.updateProject(project.value.id, formData)
  closeForm()
}

function confirmDelete() {
  showConfirm.value = true
}

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
    { id: 'personas', route: 'personas', count: store.getPersonas(pid).length },
    { id: 'scenarios', route: 'scenarios', count: store.getScenarios(pid).length },
    { id: 'requirements', route: 'requirements', count: store.getRequirements(pid).length },
    { id: 'hypothesis', route: 'hypothesis', count: store.getHypotheses(pid).length },
    { id: 'bugs', route: 'bugs', count: store.getBugs(pid).filter(b => b.status === 'zadano').length },
    { id: 'goals', route: 'goals', count: store.getGoals(pid).length },
    { id: 'stakeholders', route: 'stakeholders', count: store.getStakeholders(pid).length },
    { id: 'competition', route: 'competition', count: store.getCompetitions(pid).length },
    { id: 'team', route: 'team', count: store.getTeamMembers(pid).length },
    { id: 'tasks', route: 'tasks', count: store.getTasks(pid).length },
  ]
})

// --- Move activity ---
const moveActivityTarget = ref(null)

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

const notebookProjectData = computed(() => ({
  goals: store.getGoals(projectId.value),
  stakeholders: store.getStakeholders(projectId.value),
  competitions: store.getCompetitions(projectId.value),
  hypotheses: store.getHypotheses(projectId.value),
  personas: store.getPersonas(projectId.value),
  scenarios: store.getScenarios(projectId.value),
  requirements: store.getRequirements(projectId.value),
  teamMembers: store.getTeamMembers(projectId.value),
}))

function closeNotebook(text) {
  if (project.value) {
    store.updateProject(project.value.id, { notebook: text })
    notebookText.value = text
  }
  showNotebook.value = false
}

/** Mapování entity → { prefix kódu, getter pro existující položky } */
const CODE_ENTITIES = {
  goal:        { prefix: 'GOL', getter: (pid) => store.getGoals(pid) },
  hypothesis:  { prefix: 'HYP', getter: (pid) => store.getHypotheses(pid) },
  persona:     { prefix: 'PER', getter: (pid) => store.getPersonas(pid) },
  scenario:    { prefix: 'SCN', getter: (pid) => store.getScenarios(pid) },
  requirement: { prefix: 'REQ', getter: (pid) => store.getRequirements(pid) },
}

function confirmNotebookAction(action) {
  const pid = projectId.value
  const creators = {
    persona: (f) => store.addPersona(pid, f),
    requirement: (f) => store.addRequirement(pid, f),
    goal: (f) => store.addGoal(pid, f),
    stakeholder: (f) => store.addStakeholder(pid, f),
    competition: (f) => store.addCompetition(pid, f),
    hypothesis: (f) => store.addHypothesis(pid, f),
    scenario: (f) => store.addScenario(pid, f),
    teamMember: (f) => store.addTeamMember(pid, f),
  }
  const updaters = {
    persona: (id, f) => store.updatePersona(id, f),
    requirement: (id, f) => store.updateRequirement(id, f),
    goal: (id, f) => store.updateGoal(id, f),
    stakeholder: (id, f) => store.updateStakeholder(id, f),
    competition: (id, f) => store.updateCompetition(id, f),
    hypothesis: (id, f) => store.updateHypothesis(id, f),
    scenario: (id, f) => store.updateScenario(id, f),
    teamMember: (id, f) => store.updateTeamMember(id, f),
  }
  let fields = { ...action.fields }
  if (action.type === 'create') {
    const codeInfo = CODE_ENTITIES[action.entity]
    if (codeInfo && !fields.code) {
      fields.code = generateNextCode(codeInfo.prefix, codeInfo.getter(pid))
    }
    creators[action.entity]?.(fields)
  } else if (action.type === 'update' && action.entityId) {
    updaters[action.entity]?.(action.entityId, fields)
  }
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
.header-title-row h1 {
  margin: 0;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

</style>
