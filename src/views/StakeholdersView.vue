<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.stakeholders }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'stakeholders')" :filename="t.sections.stakeholders" />
          <AppButton variant="primary" @click="openForm()">{{ t.stakeholder.add }}</AppButton>
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
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.stakeholder.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(s.id); else if (a === 'move') confirmMoveItem(s.id); else if (a === 'copy') copyTarget.value = s.id }"
      >
        <div class="card-badges">
          <AppBadge
            :variant="getEntityCompleteness(s, 'stakeholder').filled === getEntityCompleteness(s, 'stakeholder').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(s, 'stakeholder').filled, getEntityCompleteness(s, 'stakeholder').total)"
          >{{ getEntityCompleteness(s, 'stakeholder').filled }}/{{ getEntityCompleteness(s, 'stakeholder').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ s.name || t.stakeholder.name }}</h3>
        <p v-if="s.description" class="card-desc">{{ s.description }}</p>
        <div v-if="getStrategy(s) || s.influenceLevel || s.interestLevel" class="card-meta">
          <AppBadge
            v-if="getStrategy(s)"
            :variant="`strategy-${getStrategy(s)}`"
          >{{ t.stakeholderStrategy[getStrategy(s)] }}</AppBadge>
          <AppBadge v-if="s.influenceLevel">{{ t.stakeholder.influenceLevel }}: {{ t.stakeholderLevel[s.influenceLevel] }}</AppBadge>
          <AppBadge v-if="s.interestLevel">{{ t.stakeholder.interestLevel }}: {{ t.stakeholderLevel[s.interestLevel] }}</AppBadge>
        </div>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.stakeholder.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.name" :label="t.stakeholder.name" control-id="sh-name" required />
        <FormTextarea v-model="form.description" :label="t.stakeholder.description" control-id="sh-desc" />
        <FormSelect
          v-model="form.influenceLevel"
          :label="t.stakeholder.influenceLevel"
          control-id="sh-influence"
          :options="Object.entries(t.stakeholderLevel || {}).map(([val, label]) => ({ value: val, label }))"
        />
        <FormSelect
          v-model="form.interestLevel"
          :label="t.stakeholder.interestLevel"
          control-id="sh-interest"
          :options="Object.entries(t.stakeholderLevel || {}).map(([val, label]) => ({ value: val, label }))"
        />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
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
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="stakeholders" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
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
import { getStakeholderStrategy } from '../lib/models.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import { FormInput, FormTextarea, FormSelect, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

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
const copyTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }

/** Vrátí strategii stakeholdera pro Mendelovu matici (klíčový hráč, informovat, …). */
function getStrategy(s) {
  return getStakeholderStrategy(s?.influenceLevel, s?.interestLevel)
}

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
