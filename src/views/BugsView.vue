<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.bugs }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'bugs')" :filename="t.sections.bugs" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.bug.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="bugs.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="bug in bugs"
        :key="bug.id"
        :to="{ name: 'bugDetail', params: { id: projectId, bugId: bug.id } }"
        :entity-id="bug.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.bug.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(bug.id); else if (a === 'move') confirmMoveItem(bug.id) }"
      >
        <div class="card-badges">
          <AppBadge v-if="bug.code" variant="badge-accent">{{ bug.code }}</AppBadge>
          <AppBadge v-if="bug.severity" :variant="`severity-${bug.severity}`">{{ t.bug.severityOptions[bug.severity] }}</AppBadge>
          <AppBadge v-if="bugPriority(bug)" :variant="`priority-${bugPriority(bug)}`">{{ t.bug.priorityOptions[bugPriority(bug)] }}</AppBadge>
          <AppBadge :variant="`status-${bug.status}`">{{ t.bug.statusOptions[bug.status] }}</AppBadge>
        </div>
        <h3 class="card-title">{{ bug.name || t.bug.name }}</h3>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.bug.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="bug-code">{{ t.bug.code }}</label>
          <input id="bug-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="bug-name">{{ t.bug.name }}</label>
          <input id="bug-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="bug-expected">{{ t.bug.expectedBehavior }}</label>
          <textarea id="bug-expected" v-model="form.expectedBehavior" rows="3" />
        </div>
        <div class="form-group">
          <label for="bug-actual">{{ t.bug.actualBehavior }}</label>
          <textarea id="bug-actual" v-model="form.actualBehavior" rows="3" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.bug.delete"
      :message="t.bug.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="bugs" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
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
import { getBugPriority } from '../lib/models.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const bugs = computed(() => store.getBugs(projectId.value))
const dnd = useDraggableList(() => bugs.value, (orderedIds) => store.reorderEntities('bugs', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.bugs },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', expectedBehavior: '', actualBehavior: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteBug(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }

function bugPriority(bug) {
  return getBugPriority(bug.severity, bug.impact)
}

function openForm() {
  form.value = { code: generateNextCode('BUG', bugs.value), name: '', expectedBehavior: '', actualBehavior: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addBug(projectId.value, form.value)
  closeForm()
}
</script>

