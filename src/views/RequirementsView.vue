<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.requirements }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'requirements')" :filename="t.sections.requirements" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.requirement.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li
        v-for="r in items"
        :key="r.id"
        class="card card-clickable"
        :class="{ 'drag-over': dnd.isDragOver(r.id), dragging: dnd.isDragging(r.id) }"
        draggable="true"
        @dragstart="dnd.onDragStart($event, r.id)"
        @dragover="dnd.onDragOver($event, r.id)"
        @drop="dnd.onDrop($event, r.id)"
        @dragend="dnd.onDragEnd()"
      >
        <router-link :to="{ name: 'requirementDetail', params: { id: projectId, requirementId: r.id } }" class="card-body" draggable="false">
          <span v-if="r.code" class="badge badge-accent">{{ r.code }}</span>
          <span class="badge">{{ tPath(`moscow.${r.priority}`) }}</span>
          <span
            class="badge completeness-badge"
            :class="{ 'completeness-done': getEntityCompleteness(r, 'requirement').filled === getEntityCompleteness(r, 'requirement').total }"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(r, 'requirement').filled, getEntityCompleteness(r, 'requirement').total)"
          >{{ getEntityCompleteness(r, 'requirement').filled }}/{{ getEntityCompleteness(r, 'requirement').total }}</span>
          <h3 class="card-title">{{ r.name || t.requirement.name }}</h3>
          <p v-if="r.description" class="card-desc">{{ r.description }}</p>
        </router-link>
        <KebabMenu
          :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.requirement.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'delete') confirmDeleteItem(r.id); else if (a === 'move') confirmMoveItem(r.id) }"
        />
      </li>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.requirement.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="r-code">{{ t.requirement.code }}</label>
          <input id="r-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="r-name">{{ t.requirement.name }}</label>
          <input id="r-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="r-moscow">{{ t.requirement.priority }}</label>
          <select id="r-moscow" v-model="form.priority">
            <option value="must">{{ t.moscow.must }}</option>
            <option value="should">{{ t.moscow.should }}</option>
            <option value="could">{{ t.moscow.could }}</option>
            <option value="wont">{{ t.moscow.wont }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="r-desc">{{ t.requirement.description }}</label>
          <textarea id="r-desc" v-model="form.description" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.requirement.delete"
      :message="t.requirement.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="requirements" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
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
import { generateNextCode } from '../lib/code.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import { getEntityCompleteness } from '../lib/completeness.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getRequirements(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('requirements', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.requirements },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', description: '', motivation: '', priority: 'could', wontHaveExplanation: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteRequirement(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { code: generateNextCode('REQ', items.value), name: '', description: '', motivation: '', priority: 'could', wontHaveExplanation: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addRequirement(projectId.value, form.value)
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
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-clickable:hover { border-color: var(--accent); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
.entity-list [draggable="true"] { cursor: grab; }
.entity-list [draggable="true"]:active { cursor: grabbing; }
.drag-over { border-color: var(--accent) !important; background: var(--bg-elevated); }
.dragging { opacity: 0.4; }
</style>
