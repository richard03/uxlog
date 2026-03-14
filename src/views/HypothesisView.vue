<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.hypothesis }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'hypotheses')" :filename="t.sections.hypothesis" />
          <AppButton variant="primary" @click="openForm()">{{ t.hypothesis.add }}</AppButton>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="h in items"
        :key="h.id"
        :to="{ name: 'hypothesisDetail', params: { id: projectId, hypothesisId: h.id } }"
        :entity-id="h.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.hypothesis.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(h.id); else if (a === 'move') confirmMoveItem(h.id) }"
      >
        <div class="card-badges">
          <AppBadge v-if="h.code" variant="badge-accent">{{ h.code }}</AppBadge>
          <AppBadge>{{ tPath(`hypothesisStatus.${h.status}`) }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(h, 'hypothesis').filled === getEntityCompleteness(h, 'hypothesis').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(h, 'hypothesis').filled, getEntityCompleteness(h, 'hypothesis').total)"
          >{{ getEntityCompleteness(h, 'hypothesis').filled }}/{{ getEntityCompleteness(h, 'hypothesis').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ h.name || t.hypothesis.name }}</h3>
        <p v-if="h.description" class="card-desc">{{ h.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.hypothesis.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.hypothesis.code" control-id="h-code" />
        <FormInput v-model="form.name" :label="t.hypothesis.name" control-id="h-name" required />
        <FormTextarea v-model="form.description" :label="t.hypothesis.description" control-id="h-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.hypothesis.delete"
      :message="t.hypothesis.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="hypotheses" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
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
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getHypotheses(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('hypotheses', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.hypothesis },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', description: '', status: 'untested', explanation: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteHypothesis(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { code: generateNextCode('HYP', items.value), name: '', description: '', status: 'untested', explanation: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addHypothesis(projectId.value, form.value)
  closeForm()
}
</script>
