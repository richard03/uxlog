<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.tasks }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'tasks')" :filename="t.sections.tasks" />
          <AppButton variant="primary" @click="openForm()">{{ t.task.add }}</AppButton>
        </div>
      </div>
    </header>

    <div v-if="tasks.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="task in tasks"
        :key="task.id"
        :to="{ name: 'taskDetail', params: { id: projectId, taskId: task.id } }"
        :entity-id="task.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.task.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(task.id); else if (a === 'move') confirmMoveItem(task.id) }"
      >
        <div class="card-badges">
          <AppBadge v-if="task.code" variant="badge-accent">{{ task.code }}</AppBadge>
          <AppBadge :variant="`status-${task.status}`">{{ t.task.statusOptions[task.status] }}</AppBadge>
          <AppBadge v-if="task.dueDate">{{ task.dueDate }}</AppBadge>
        </div>
        <h3 class="card-title">{{ task.name || t.task.name }}</h3>
        <p v-if="task.description" class="card-desc">{{ task.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.task.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.task.code" control-id="task-code" />
        <FormInput v-model="form.name" :label="t.task.name" control-id="task-name" required />
        <FormTextarea v-model="form.description" :label="t.task.description" control-id="task-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.task.delete"
      :message="t.task.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="tasks" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import { generateNextCode } from '../lib/code.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const tasks = computed(() => store.getTasks(projectId.value))
const dnd = useDraggableList(() => tasks.value, (orderedIds) => store.reorderEntities('tasks', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.tasks },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', description: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteTask(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }

function openForm() {
  form.value = { code: generateNextCode('TSK', tasks.value), name: '', description: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addTask(projectId.value, form.value)
  closeForm()
}
</script>

