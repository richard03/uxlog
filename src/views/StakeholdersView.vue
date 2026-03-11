<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.stakeholders }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'stakeholders')" :filename="t.sections.stakeholders" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.stakeholder.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li
        v-for="s in items"
        :key="s.id"
        class="card card-clickable"
        :class="{ 'drag-over': dnd.isDragOver(s.id), dragging: dnd.isDragging(s.id) }"
        draggable="true"
        @dragstart="dnd.onDragStart($event, s.id)"
        @dragover="dnd.onDragOver($event, s.id)"
        @drop="dnd.onDrop($event, s.id)"
        @dragend="dnd.onDragEnd()"
      >
        <router-link :to="{ name: 'stakeholderDetail', params: { id: projectId, stakeholderId: s.id } }" class="card-body" draggable="false">
          <span
            class="badge completeness-badge"
            :class="{ 'completeness-done': getEntityCompleteness(s, 'stakeholder').filled === getEntityCompleteness(s, 'stakeholder').total }"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(s, 'stakeholder').filled, getEntityCompleteness(s, 'stakeholder').total)"
          >{{ getEntityCompleteness(s, 'stakeholder').filled }}/{{ getEntityCompleteness(s, 'stakeholder').total }}</span>
          <h3 class="card-title">{{ s.name || t.stakeholder.name }}</h3>
          <p v-if="s.description" class="card-desc">{{ s.description }}</p>
          <div class="card-meta">
            <span v-if="s.influenceLevel" class="badge">{{ t.stakeholder.influenceLevel }}: {{ t.stakeholderLevel[s.influenceLevel] }}</span>
            <span v-if="s.interestLevel" class="badge">{{ t.stakeholder.interestLevel }}: {{ t.stakeholderLevel[s.interestLevel] }}</span>
          </div>
        </router-link>
        <KebabMenu
          :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.stakeholder.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'delete') confirmDeleteItem(s.id); else if (a === 'move') confirmMoveItem(s.id) }"
        />
      </li>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.stakeholder.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="sh-name">{{ t.stakeholder.name }}</label>
          <input id="sh-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="sh-desc">{{ t.stakeholder.description }}</label>
          <textarea id="sh-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="sh-influence">{{ t.stakeholder.influenceLevel }}</label>
          <select id="sh-influence" v-model="form.influenceLevel">
            <option v-for="(label, val) in t.stakeholderLevel" :key="val" :value="val">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="sh-interest">{{ t.stakeholder.interestLevel }}</label>
          <select id="sh-interest" v-model="form.interestLevel">
            <option v-for="(label, val) in t.stakeholderLevel" :key="val" :value="val">{{ label }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.stakeholder.delete"
      :message="t.stakeholder.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="stakeholders" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
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
import { useDraggableList } from '../composables/useDraggableList.js'
import { getEntityCompleteness } from '../lib/completeness.js'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getStakeholders(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('stakeholders', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.stakeholders },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ name: '', description: '', influenceLevel: '', interestLevel: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteStakeholder(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { name: '', description: '', influenceLevel: '', interestLevel: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addStakeholder(projectId.value, form.value)
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
.card-meta { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); }
.card-clickable:hover { border-color: var(--accent); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
.entity-list [draggable="true"] { cursor: grab; }
.entity-list [draggable="true"]:active { cursor: grabbing; }
.drag-over { border-color: var(--accent) !important; background: var(--bg-elevated); }
.dragging { opacity: 0.4; }
</style>
