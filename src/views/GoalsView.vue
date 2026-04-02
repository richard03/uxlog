<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.goals }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'goals')" :filename="t.sections.goals" />
          <AppButton variant="primary" @click="openForm()">{{ t.goal.add }}</AppButton>
        </div>
      </div>
    </header>

    <div v-if="goals.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="g in goals"
        :key="g.id"
        :to="{ name: 'goalDetail', params: { id: projectId, goalId: g.id } }"
        :entity-id="g.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.goal.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(g.id); else if (a === 'move') confirmMoveItem(g.id); else if (a === 'copy') copyTarget = g.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="g.code" variant="badge-accent">{{ g.code }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(g, 'goal').filled === getEntityCompleteness(g, 'goal').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(g, 'goal').filled, getEntityCompleteness(g, 'goal').total)"
          >{{ getEntityCompleteness(g, 'goal').filled }}/{{ getEntityCompleteness(g, 'goal').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ g.name || t.goal.name }}</h3>
        <p v-if="g.description" class="card-desc">{{ g.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.goal.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.goal.code" control-id="goal-code" />
        <FormInput v-model="form.name" :label="t.goal.name" control-id="goal-name" required />
        <FormTextarea v-model="form.description" :label="t.goal.description" control-id="goal-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.goal.delete"
      :message="t.goal.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="goals" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="goals" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
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
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()
const { generateNextCode, getEntityCompleteness } = useEntityHelpers()

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

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteGoal(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
const copyTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


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
