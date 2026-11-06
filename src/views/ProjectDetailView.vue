<template>
  <div class="container" v-if="project">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project.color"
      :title="project.name">
      <template #actions>
        <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton :get-yaml="() => store.exportProjectData(projectId)" :filename="project?.name || 'projekt'" />
        <KebabMenu
          :items="menuItems"
          @action="(a) => { if (a === 'edit') openForm(); else if (a === 'vault') showVaultFolder = true; else if (a === 'delete') confirmDelete() }"
        />
      </template>
    </ProjectPageHeader>

    <div class="project-columns">
      <!-- Základní informace o projektu (časem přibudou další) -->
      <section class="project-column" aria-labelledby="basics-heading">
        <h2 id="basics-heading" class="project-column-title">{{ t.project.basicsTitle }}</h2>
        <AppCardGrid :aria-label="t.project.basicsTitle" :columns="1">
          <CounterCard
            v-for="s in basics"
            :key="s.id"
            :to="{ name: s.route, params: { id: projectId } }"
            :label="tPath(`sections.${s.id}`)"
            :count="s.count"
            variant="row"
          />
        </AppCardGrid>
      </section>

      <!-- Aktivity -->
      <ActivitiesPanel
        class="project-column"
        :project-id="projectId"
        @dismiss="(id) => store.updateActivity(id, { dismissed: true })"
        @move="(id) => { moveActivityTarget = id }"
        @assign-task="onActivityAssignTask"
      />

      <!-- Artifacts column -->
      <section class="project-column" aria-labelledby="artifacts-heading">
        <h2 id="artifacts-heading" class="project-column-title">{{ t.project.artifactsTitle }}</h2>
        <AppCardGrid :aria-label="t.project.artifactsTitle" :columns="1">
          <CounterCard
            v-for="s in sections"
            :key="s.id"
            :to="{ name: s.route, params: { id: projectId } }"
            :label="tPath(`sections.${s.id}`)"
            :count="s.count"
            variant="row"
          />
        </AppCardGrid>
      </section>
    </div>

    <TaskAddModal
      v-model="assignTaskModalOpen"
      :project-id="projectId"
      :preset="assignTaskModalPreset"
      @save="onAssignTaskModalSave"
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
    <ProjectVaultFolderModal v-if="showVaultFolder" :project-id="projectId" @close="showVaultFolder = false" />
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
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import ColorSwatchPicker from '../components/ColorSwatchPicker.vue'
import ActivitiesPanel from '../components/ActivitiesPanel.vue'
import TaskAddModal from '../components/TaskAddModal.vue'
import { FormGroup, FormInput, FormSelect, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'
import CounterCard from '../components/CounterCard.vue'
import AppCardGrid from '../components/AppCardGrid.vue'
import ProjectVaultFolderModal from '../components/ProjectVaultFolderModal.vue'
import { useProjectVaultFolder } from '../composables/useProjectVaultFolder.js'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t, tPath } = useI18n()

const showForm = ref(false)
const showConfirm = ref(false)
const showImport = ref(false)
const showVaultFolder = ref(false)
const assignTaskModalOpen = ref(false)
const assignTaskModalPreset = ref({})
const assignTaskActivityId = ref('')

watch(assignTaskModalOpen, (open) => {
  if (!open) {
    assignTaskActivityId.value = ''
    assignTaskModalPreset.value = {}
  }
})

/**
 * Otevře dialog „Přidat úkol“ s názvem aktivity pro kartu na přehledu projektu.
 * @param {string} activityId
 */
function onActivityAssignTask(activityId) {
  const a = store.getActivity(activityId)
  assignTaskActivityId.value = activityId
  assignTaskModalPreset.value = { name: a?.name || '' }
  assignTaskModalOpen.value = true
}

/**
 * @param {{ code: string, name: string, description: string }} payload
 */
function onAssignTaskModalSave(payload) {
  const aid = assignTaskActivityId.value
  if (!aid) return
  store.addTaskLinkedToActivity(aid, payload)
}

const form = ref({
  name: '',
  scope: 'medium',
  priority: 'medium',
  color: '',
  createdAt: '',
})

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))

/** Složka dat projektu – položka menu jen v desktopové aplikaci se zapnutou Složkou dat. */
const { available: vaultFolderAvailable } = useProjectVaultFolder(() => projectId.value)
const menuItems = computed(() => [
  { label: t.common.edit, action: 'edit' },
  ...(vaultFolderAvailable.value ? [{ label: t.vault.projectFolderMenu, action: 'vault' }] : []),
  { label: t.common.delete, action: 'delete', variant: 'danger' },
])

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

/** Základní informace o projektu (první sloupec). */
const basics = computed(() => {
  const pid = projectId.value
  return [
    { id: 'tasks', route: 'tasks', count: store.getTasks(pid).length },
    { id: 'sources', route: 'sources', count: store.getSources(pid).length },
    { id: 'team', route: 'team', count: store.getTeamMembers(pid).length },
    { id: 'stakeholders', route: 'stakeholders', count: store.getStakeholders(pid).length },
  ]
})

const sections = computed(() => {
  const pid = projectId.value
  return [
    { id: 'goals', route: 'goals', count: store.getGoals(pid).length },
    { id: 'risks', route: 'risks', count: store.getRisks(pid).filter(r => (r.status || 'open') === 'open').length },
    { id: 'hypothesis', route: 'hypothesis', count: store.getHypotheses(pid).length },
    { id: 'competition', route: 'competition', count: store.getCompetitions(pid).length },
    { id: 'requirements', route: 'requirements', count: store.getRequirements(pid).length },
    { id: 'personas', route: 'personas', count: store.getPersonas(pid).length },
    { id: 'scenarios', route: 'scenarios', count: store.getScenarios(pid).length },
    { id: 'bugs', route: 'bugs', count: store.getBugs(pid).filter(b => b.status === 'zadano').length },
  ]
})

// --- Move activity ---
const moveActivityTarget = ref(null)

function handleImported({ projectId: importedProjectId }) {
  showImport.value = false
  alert(t.import.success)
  if (importedProjectId && importedProjectId !== projectId.value) {
    router.push({ name: 'project', params: { id: importedProjectId } })
  }
}
</script>

<style scoped>
.project-columns {
  display: grid;
  /* Základní informace | Aktivity | Artefakty – tři stejné sloupce; Chat je vpravo v ProjectLayout */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-lg);
  align-items: start;
  margin-top: 0;
}

.project-column {
  min-width: 0;
}

.project-column-title {
  display: flex;
  align-items: center;
  min-height: 2rem;
  margin: 0 0 var(--space-md);
  font-size: 1rem;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .project-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .project-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}


</style>
