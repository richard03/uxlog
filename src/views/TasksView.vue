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

    <div class="filter-bar">
      <span class="filter-bar-label">{{ t.filter.status }}</span>
      <div class="filter-bar-group">
        <button class="filter-badge" :class="{ 'filter-badge--active': filterIncomplete }" type="button" @click="filterIncomplete = !filterIncomplete">{{ t.task.statusOptions.incomplete }} ({{ countIncomplete }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterDone }" type="button" @click="filterDone = !filterDone">{{ t.task.statusOptions.done }} ({{ countDone }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterCancelled }" type="button" @click="filterCancelled = !filterCancelled">{{ t.task.statusOptions.cancelled }} ({{ countCancelled }})</button>
      </div>
      <div class="filter-search">
        <input type="search" v-model="filterText" :placeholder="t.filter.search" class="filter-search-input" :aria-label="t.filter.search" />
        <button v-if="filterText" class="filter-search-clear" type="button" :aria-label="t.filter.clearSearch" @click="filterText = ''">&#x2715;</button>
      </div>
    </div>

    <div v-if="visibleTasks.length === 0" class="empty-state">
      <template v-if="tasks.length === 0">
        <p>{{ t.common.empty }}</p>
        <p>{{ t.common.emptyHint }}</p>
      </template>
      <template v-else>
        <p>{{ t.filter.emptyFiltered }}</p>
        <p>{{ t.filter.emptyFilteredHint }}</p>
      </template>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="task in visibleTasks"
        :key="task.id"
        :to="{ name: 'taskDetail', params: { id: projectId, taskId: task.id } }"
        :entity-id="task.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.task.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(task.id); else if (a === 'move') confirmMoveItem(task.id); else if (a === 'copy') copyTarget.value = task.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="task.code" variant="badge-accent">{{ task.code }}</AppBadge>
          <AppBadge :variant="`status-${task.status}`">{{ t.task.statusOptions[task.status] }}</AppBadge>
          <AppBadge v-if="task.dueDate">{{ task.dueDate }}</AppBadge>
          <AppBadge v-if="task.assignee">{{ task.assignee }}</AppBadge>
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
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="tasks" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
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
const filterIncomplete = ref(false)
const filterDone = ref(false)
const filterCancelled = ref(false)
const filterText = ref('')
const countIncomplete = computed(() => tasks.value.filter(t => (t.status || 'incomplete') === 'incomplete').length)
const countDone = computed(() => tasks.value.filter(t => t.status === 'done').length)
const countCancelled = computed(() => tasks.value.filter(t => t.status === 'cancelled').length)
const visibleTasks = computed(() => {
  const allowed = []
  if (filterIncomplete.value) allowed.push('incomplete')
  if (filterDone.value) allowed.push('done')
  if (filterCancelled.value) allowed.push('cancelled')
  let base = allowed.length === 0 ? tasks.value : tasks.value.filter(t => allowed.includes(t.status || 'incomplete'))
  const q = filterText.value.toLowerCase().trim()
  if (!q) return base
  return base.filter(t => [t.code, t.name, t.description, t.assignee, t.dueDate].filter(Boolean).join(' ').toLowerCase().includes(q))
})
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
const copyTarget = ref(null)
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

