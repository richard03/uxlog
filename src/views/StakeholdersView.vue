<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.stakeholders }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'stakeholders')" :filename="t.sections.stakeholders" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.stakeholder.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="s in items"
        :key="s.id"
        :to="{ name: 'stakeholderDetail', params: { id: projectId, stakeholderId: s.id } }"
        :entity-id="s.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.stakeholder.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(s.id); else if (a === 'move') confirmMoveItem(s.id) }"
      >
        <div class="card-badges">
          <AppBadge
            :variant="getEntityCompleteness(s, 'stakeholder').filled === getEntityCompleteness(s, 'stakeholder').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(s, 'stakeholder').filled, getEntityCompleteness(s, 'stakeholder').total)"
          >{{ getEntityCompleteness(s, 'stakeholder').filled }}/{{ getEntityCompleteness(s, 'stakeholder').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ s.name || t.stakeholder.name }}</h3>
        <p v-if="s.description" class="card-desc">{{ s.description }}</p>
        <div v-if="s.influenceLevel || s.interestLevel" class="card-meta">
          <AppBadge v-if="s.influenceLevel">{{ t.stakeholder.influenceLevel }}: {{ t.stakeholderLevel[s.influenceLevel] }}</AppBadge>
          <AppBadge v-if="s.interestLevel">{{ t.stakeholder.interestLevel }}: {{ t.stakeholderLevel[s.interestLevel] }}</AppBadge>
        </div>
      </EntityCard>
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
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import { getEntityCompleteness } from '../lib/completeness.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'

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
.card-meta { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); flex-wrap: wrap; }
</style>
