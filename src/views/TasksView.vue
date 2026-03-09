<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.tasks }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'tasks')" :filename="t.sections.tasks" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.task.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="tasks.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="card card-clickable"
        :class="{ 'drag-over': dnd.isDragOver(task.id), dragging: dnd.isDragging(task.id) }"
        draggable="true"
        @dragstart="dnd.onDragStart($event, task.id)"
        @dragover="dnd.onDragOver($event, task.id)"
        @drop="dnd.onDrop($event, task.id)"
        @dragend="dnd.onDragEnd()"
      >
        <router-link :to="{ name: 'taskDetail', params: { id: projectId, taskId: task.id } }" class="card-body" draggable="false">
          <div class="card-badges">
            <span v-if="task.code" class="badge badge-accent">{{ task.code }}</span>
            <span class="badge" :class="`status-badge-${task.status}`">{{ t.task.statusOptions[task.status] }}</span>
            <span v-if="task.dueDate" class="badge">{{ task.dueDate }}</span>
          </div>
          <h3 class="card-title">{{ task.name || t.task.name }}</h3>
          <p v-if="task.description" class="card-desc">{{ task.description }}</p>
        </router-link>
        <KebabMenu
          :items="[{ label: t.task.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'delete') confirmDeleteItem(task.id) }"
        />
      </li>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.task.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="task-code">{{ t.task.code }}</label>
          <input id="task-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="task-name">{{ t.task.name }}</label>
          <input id="task-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="task-desc">{{ t.task.description }}</label>
          <textarea id="task-desc" v-model="form.description" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.task.delete"
      :message="t.task.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
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
import { generateNextCode } from '../lib/code.js'
import { useDraggableList } from '../composables/useDraggableList.js'

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

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.header-actions { display: flex; gap: var(--space-xs); }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card { display: flex; align-items: center; gap: var(--space-sm); }
.card-body { flex: 1; text-decoration: none; color: inherit; display: block; }
.card-badges { display: flex; gap: var(--space-xs); flex-wrap: wrap; margin-bottom: var(--space-xs); }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-clickable:hover { border-color: var(--accent); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
.entity-list [draggable="true"] { cursor: grab; }
.entity-list [draggable="true"]:active { cursor: grabbing; }
.drag-over { border-color: var(--accent) !important; background: var(--bg-elevated); }
.dragging { opacity: 0.4; }
.status-badge-done { background: #d1fae5; color: #065f46; }
.status-badge-in_progress { background: #fef3c7; color: #92400e; }
.status-badge-cancelled { background: var(--bg-elevated); color: var(--text-muted); text-decoration: line-through; }
</style>
