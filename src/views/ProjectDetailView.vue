<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <h1><ProjectColorTag :color="project.color" />{{ project.name }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportProjectData(projectId)" :filename="project?.name || 'projekt'" />
          <KebabMenu
            :items="[{ label: t.common.edit, action: 'edit' }, { label: t.common.delete, action: 'delete', variant: 'danger' }]"
            @action="(a) => { if (a === 'edit') openForm(); else if (a === 'delete') confirmDelete() }"
          />
        </div>
      </div>
      <div class="header-meta">
        <AppBadge>{{ t.project.priority }}: {{ tPath(`priority.${project.priority}`) }}</AppBadge>
        <AppBadge>{{ t.project.scopeLabel }}: {{ tPath(`scope.${project.scope}`) }}</AppBadge>
        <AppBadge>{{ t.project.lastActivity }}: {{ formatDate(project.lastWorkedAt) }}</AppBadge>
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
        <FormInput v-model="form.name" :label="t.project.name" control-id="project-name" required />
        <FormSelect
          v-model="form.scope"
          :label="t.project.scope"
          control-id="project-scope"
          :options="[
            { value: 'small', label: t.scope.small },
            { value: 'medium', label: t.scope.medium },
            { value: 'large', label: t.scope.large },
          ]"
        />
        <FormSelect
          v-model="form.priority"
          :label="t.project.priority"
          control-id="project-priority"
          :options="[
            { value: 'high', label: t.priority.high },
            { value: 'medium', label: t.priority.medium },
            { value: 'low', label: t.priority.low },
          ]"
        />
        <FormInput v-model="form.createdAt" :label="t.project.createdAt" type="date" control-id="edit-project-created" />
        <FormInput v-model="form.deadline" :label="t.project.deadlineLabel" type="date" control-id="edit-project-deadline" />
        <FormGroup :label="t.project.color">
          <ColorSwatchPicker v-model="form.color" :label="t.project.color" />
        </FormGroup>
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
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
import { FormGroup, FormInput, FormSelect, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'
import AppBadge from '../components/AppBadge.vue'
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
