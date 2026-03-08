<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.goals }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'goals')" :filename="t.sections.goals" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.goal.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="goals.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li
        v-for="g in goals"
        :key="g.id"
        class="card card-clickable"
        :class="{ 'drag-over': dnd.isDragOver(g.id), dragging: dnd.isDragging(g.id) }"
        draggable="true"
        @dragstart="dnd.onDragStart($event, g.id)"
        @dragover="dnd.onDragOver($event, g.id)"
        @drop="dnd.onDrop($event, g.id)"
        @dragend="dnd.onDragEnd()"
      >
        <router-link :to="{ name: 'goalDetail', params: { id: projectId, goalId: g.id } }" class="card-body" draggable="false">
          <span v-if="g.code" class="badge badge-accent">{{ g.code }}</span>
          <span
            class="badge completeness-badge"
            :class="{ 'completeness-done': getEntityCompleteness(g, 'goal').filled === getEntityCompleteness(g, 'goal').total }"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(g, 'goal').filled, getEntityCompleteness(g, 'goal').total)"
          >{{ getEntityCompleteness(g, 'goal').filled }}/{{ getEntityCompleteness(g, 'goal').total }}</span>
          <h3 class="card-title">{{ g.name || t.goal.name }}</h3>
          <p v-if="g.description" class="card-desc">{{ g.description }}</p>
        </router-link>
      </li>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.goal.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="goal-code">{{ t.goal.code }}</label>
          <input id="goal-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="goal-name">{{ t.goal.name }}</label>
          <input id="goal-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="goal-desc">{{ t.goal.description }}</label>
          <textarea id="goal-desc" v-model="form.description" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import { generateNextCode } from '../lib/code.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import { getEntityCompleteness } from '../lib/completeness.js'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const goals = computed(() => store.getGoals(projectId.value))
const dnd = useDraggableList(() => goals.value, (orderedIds) => store.reorderEntities('goals', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.goals },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', description: '', metrics: '' })


function openForm() {
  form.value = { code: generateNextCode('GOL', goals.value), name: '', description: '', metrics: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addGoal(projectId.value, form.value)
  closeForm()
}
</script>

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.header-actions { display: flex; gap: var(--space-xs); }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
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
