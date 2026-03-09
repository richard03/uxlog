<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.personas }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'personas')" :filename="t.sections.personas" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.persona.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li
        v-for="p in items"
        :key="p.id"
        class="card card-clickable"
        :class="{ 'drag-over': dnd.isDragOver(p.id), dragging: dnd.isDragging(p.id) }"
        draggable="true"
        @dragstart="dnd.onDragStart($event, p.id)"
        @dragover="dnd.onDragOver($event, p.id)"
        @drop="dnd.onDrop($event, p.id)"
        @dragend="dnd.onDragEnd()"
      >
        <router-link :to="{ name: 'personaDetail', params: { id: projectId, personaId: p.id } }" class="card-body" draggable="false">
          <span v-if="p.code" class="badge badge-accent">{{ p.code }}</span>
          <span class="badge">{{ tPath(`personaStatus.${p.status}`) }}</span>
          <span
            class="badge completeness-badge"
            :class="{ 'completeness-done': getEntityCompleteness(p, 'persona').filled === getEntityCompleteness(p, 'persona').total }"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(p, 'persona').filled, getEntityCompleteness(p, 'persona').total)"
          >{{ getEntityCompleteness(p, 'persona').filled }}/{{ getEntityCompleteness(p, 'persona').total }}</span>
          <h3 class="card-title">{{ p.name || t.persona.name }}</h3>
          <p v-if="p.description" class="card-desc">{{ p.description }}</p>
        </router-link>
        <KebabMenu
          :items="[{ label: t.persona.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'delete') confirmDeleteItem(p.id) }"
        />
      </li>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.persona.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="p-code">{{ t.persona.code }}</label>
          <input id="p-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="p-name">{{ t.persona.name }}</label>
          <input id="p-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="p-status">{{ t.persona.status }}</label>
          <select id="p-status" v-model="form.status">
            <option value="protopersona">{{ t.personaStatus.protopersona }}</option>
            <option value="persona">{{ t.personaStatus.persona }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="p-desc">{{ t.persona.description }}</label>
          <textarea id="p-desc" v-model="form.description" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.persona.delete"
      :message="t.persona.deleteConfirm"
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
import { getEntityCompleteness } from '../lib/completeness.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getPersonas(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('personas', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.personas },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', status: 'protopersona', description: '', motivation: '', needs: '', problems: '', targetGroupSize: '', targetGroupValue: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deletePersona(deleteTarget.value)
    deleteTarget.value = null
  }
}


function openForm() {
  form.value = { code: generateNextCode('PER', items.value), name: '', status: 'protopersona', description: '', motivation: '', needs: '', problems: '', targetGroupSize: '', targetGroupValue: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addPersona(projectId.value, form.value)
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
