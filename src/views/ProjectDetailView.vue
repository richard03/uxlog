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
          :items="[{ label: t.common.edit, action: 'edit' }, { label: t.common.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'edit') openForm(); else if (a === 'delete') confirmDelete() }"
        />
      </template>
    </ProjectPageHeader>

    <div class="project-columns">
      <!-- Activities column -->
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

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t, tPath } = useI18n()

const showForm = ref(false)
const showConfirm = ref(false)
const showImport = ref(false)
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
    { id: 'risks', route: 'risks', count: store.getRisks(pid).filter(r => (r.status || 'open') === 'open').length },
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
  /* Aktivity | Artefakty si rovným dílem dělí levou polovinu; Zápisník je vpravo v ProjectLayout */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-lg);
  align-items: start;
  margin-top: 0;
}

.project-column-title {
  display: flex;
  align-items: center;
  min-height: 2rem;
  margin: 0 0 var(--space-md);
  font-size: 1rem;
  font-weight: 600;
}

@media (max-width: 800px) {
  .project-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}


</style>
