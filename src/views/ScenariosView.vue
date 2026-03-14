<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.scenarios }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'scenarios')" :filename="t.sections.scenarios" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.scenario.add }}</button>
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
        :to="{ name: 'scenarioDetail', params: { id: projectId, scenarioId: s.id } }"
        :entity-id="s.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.scenario.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(s.id); else if (a === 'move') confirmMoveItem(s.id) }"
      >
        <div class="card-badges">
          <AppBadge v-if="s.code" variant="badge-accent">{{ s.code }}</AppBadge>
          <AppBadge>{{ tPath(`scenario.scenarioType.${s.type || 'main'}`) }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(s, 'scenario').filled === getEntityCompleteness(s, 'scenario').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(s, 'scenario').filled, getEntityCompleteness(s, 'scenario').total)"
          >{{ getEntityCompleteness(s, 'scenario').filled }}/{{ getEntityCompleteness(s, 'scenario').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ s.name || t.scenario.name }}</h3>
        <p v-if="s.description" class="card-desc">{{ s.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.scenario.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="s-code">{{ t.scenario.code }}</label>
          <input id="s-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="s-name">{{ t.scenario.name }}</label>
          <input id="s-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="s-type">{{ t.scenario.type }}</label>
          <select id="s-type" v-model="form.type">
            <option value="main">{{ t.scenario.scenarioType.main }}</option>
            <option value="secondary">{{ t.scenario.scenarioType.secondary }}</option>
            <option value="error">{{ t.scenario.scenarioType.error }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="s-desc">{{ t.scenario.description }}</label>
          <textarea id="s-desc" v-model="form.description" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.scenario.delete"
      :message="t.scenario.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="scenarios" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
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
import { getEntityCompleteness } from '../lib/completeness.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getScenarios(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('scenarios', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.scenarios },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', type: 'main', description: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteScenario(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


/**
 * Otevře formulář pro přidání nového scénáře.
 */
function openForm() {
  form.value = {
    code: generateNextCode('SCN', items.value),
    name: '',
    type: 'main',
    description: '',
  }
  showForm.value = true
}

/**
 * Zavře formulář pro přidání scénáře.
 */
function closeForm() {
  showForm.value = false
}

/**
 * Uloží nový scénář a zavře formulář.
 */
function save() {
  store.addScenario(projectId.value, form.value)
  closeForm()
}
</script>

