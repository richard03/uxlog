<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.scenarios }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'scenarios')" :filename="t.sections.scenarios" />
          <AppButton variant="primary" @click="openForm()">{{ t.scenario.add }}</AppButton>
        </div>
      </div>
    </header>

    <div class="filter-bar">
      <span class="filter-bar-label">{{ t.filter.type }}</span>
      <div class="filter-bar-group">
        <button class="filter-badge" :class="{ 'filter-badge--active': filterMain }" type="button" @click="filterMain = !filterMain">{{ t.scenario.scenarioType.main }} ({{ countMain }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterSecondary }" type="button" @click="filterSecondary = !filterSecondary">{{ t.scenario.scenarioType.secondary }} ({{ countSecondary }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterError }" type="button" @click="filterError = !filterError">{{ t.scenario.scenarioType.error }} ({{ countError }})</button>
      </div>
      <div class="filter-search">
        <input type="search" v-model="filterText" :placeholder="t.filter.search" class="filter-search-input" :aria-label="t.filter.search" />
        <button v-if="filterText" class="filter-search-clear" type="button" :aria-label="t.filter.clearSearch" @click="filterText = ''">&#x2715;</button>
      </div>
    </div>

    <div v-if="visibleItems.length === 0" class="empty-state">
      <template v-if="items.length === 0">
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
        v-for="s in visibleItems"
        :key="s.id"
        :to="{ name: 'scenarioDetail', params: { id: projectId, scenarioId: s.id } }"
        :entity-id="s.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.scenario.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(s.id); else if (a === 'move') confirmMoveItem(s.id); else if (a === 'copy') copyTarget.value = s.id }"
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
        <FormInput v-model="form.code" :label="t.scenario.code" control-id="s-code" />
        <FormInput v-model="form.name" :label="t.scenario.name" control-id="s-name" required />
        <FormSelect
          v-model="form.type"
          :label="t.scenario.type"
          control-id="s-type"
          :options="[
            { value: 'main', label: t.scenario.scenarioType.main },
            { value: 'secondary', label: t.scenario.scenarioType.secondary },
            { value: 'error', label: t.scenario.scenarioType.error },
          ]"
        />
        <FormTextarea v-model="form.description" :label="t.scenario.description" control-id="s-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
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
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="scenarios" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
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
import { FormInput, FormTextarea, FormSelect, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getScenarios(projectId.value))
const filterMain = ref(false)
const filterSecondary = ref(false)
const filterError = ref(false)
const filterText = ref('')
const countMain = computed(() => items.value.filter(s => (s.type || 'main') === 'main').length)
const countSecondary = computed(() => items.value.filter(s => s.type === 'secondary').length)
const countError = computed(() => items.value.filter(s => s.type === 'error').length)
const visibleItems = computed(() => {
  const allowed = []
  if (filterMain.value) allowed.push('main')
  if (filterSecondary.value) allowed.push('secondary')
  if (filterError.value) allowed.push('error')
  let base = allowed.length === 0 ? items.value : items.value.filter(s => allowed.includes(s.type || 'main'))
  const q = filterText.value.toLowerCase().trim()
  if (!q) return base
  return base.filter(s => [s.code, s.name, s.description].filter(Boolean).join(' ').toLowerCase().includes(q))
})
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
const copyTarget = ref(null)
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

