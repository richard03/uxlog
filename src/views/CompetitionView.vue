<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.competition }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'competitions')" :filename="t.sections.competition" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.competition.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li
        v-for="c in items"
        :key="c.id"
        class="card card-clickable"
        :class="{ 'drag-over': dnd.isDragOver(c.id), dragging: dnd.isDragging(c.id) }"
        draggable="true"
        @dragstart="dnd.onDragStart($event, c.id)"
        @dragover="dnd.onDragOver($event, c.id)"
        @drop="dnd.onDrop($event, c.id)"
        @dragend="dnd.onDragEnd()"
      >
        <router-link :to="{ name: 'competitionDetail', params: { id: projectId, competitionId: c.id } }" class="card-body" draggable="false">
          <span
            class="badge completeness-badge"
            :class="{ 'completeness-done': getEntityCompleteness(c, 'competition').filled === getEntityCompleteness(c, 'competition').total }"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(c, 'competition').filled, getEntityCompleteness(c, 'competition').total)"
          >{{ getEntityCompleteness(c, 'competition').filled }}/{{ getEntityCompleteness(c, 'competition').total }}</span>
          <h3 class="card-title">{{ c.name || t.competition.name }}</h3>
          <p v-if="c.description" class="card-desc">{{ c.description }}</p>
        </router-link>
        <KebabMenu
          :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.competition.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'delete') confirmDeleteItem(c.id); else if (a === 'move') confirmMoveItem(c.id) }"
        />
      </li>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.competition.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="c-name">{{ t.competition.name }}</label>
          <input id="c-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="c-desc">{{ t.competition.description }}</label>
          <textarea id="c-desc" v-model="form.description" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.competition.delete"
      :message="t.competition.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="competitions" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
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
import ProjectColorTag from '../components/ProjectColorTag.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getCompetitions(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('competitions', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.competition },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ name: '', description: '', strengths: '', weaknesses: '', inspiration: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteCompetition(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { name: '', description: '', strengths: '', weaknesses: '', inspiration: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addCompetition(projectId.value, form.value)
  closeForm()
}
</script>
