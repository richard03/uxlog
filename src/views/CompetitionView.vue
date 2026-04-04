<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.competition }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'competitions')" :filename="t.sections.competition" />
          <AppButton variant="primary" @click="openForm()">{{ t.competition.add }}</AppButton>
          <KebabMenu :items="sectionKebabItems" @action="onSectionKebab" />
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="c in items"
        :key="c.id"
        :to="{ name: 'competitionDetail', params: { id: projectId, competitionId: c.id } }"
        :entity-id="c.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.competition.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(c.id); else if (a === 'move') confirmMoveItem(c.id); else if (a === 'copy') copyTarget = c.id }"
      >
        <div class="card-badges">
          <AppBadge
            :variant="getEntityCompleteness(c, 'competition').filled === getEntityCompleteness(c, 'competition').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(c, 'competition').filled, getEntityCompleteness(c, 'competition').total)"
          >{{ getEntityCompleteness(c, 'competition').filled }}/{{ getEntityCompleteness(c, 'competition').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ c.name || t.competition.name }}</h3>
        <p v-if="c.description" class="card-desc">{{ c.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.competition.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.name" :label="t.competition.name" control-id="c-name" required />
        <FormTextarea v-model="form.description" :label="t.competition.description" control-id="c-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
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
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="competitions" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />

    <CompetitionAnalysisModal
      v-if="showAnalysis"
      :project-data="projectData"
      @close="showAnalysis = false"
      @confirm-action="confirmAnalysisAction"
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
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import CompetitionAnalysisModal from '../components/CompetitionAnalysisModal.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'
import { hasCapability, callCapability } from '../lib/plugins/registry.js'
import { exportCompetitionPdf } from '../lib/exportPdf.js'
import { isTauri } from '../lib/tauriBridge.js'
import { showToast } from '../composables/useToast.js'

const route = useRoute()
const store = useStore()
const { t } = useI18n()
const { getEntityCompleteness } = useEntityHelpers()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getCompetitions(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('competitions', projectId.value, orderedIds))

const aiAvailable = computed(() => hasCapability('ai:available') && callCapability('ai:available'))

const sectionKebabItems = computed(() => {
  const list = [{ label: t.competition.exportPdf, action: 'exportPdf' }]
  if (aiAvailable.value) {
    list.push({ label: t.competition.analyzeCompetition, action: 'analyze' })
  }
  return list
})

const showAnalysis = ref(false)

async function onSectionKebab(action) {
  if (action === 'exportPdf') {
    try {
      await exportCompetitionPdf({
        competitions: items.value,
        projectName: project.value?.name || 'Projekt',
        labels: {
          title: t.competition.pdfTitle,
          description: t.competition.pdfDescription,
          strengths: t.competition.pdfStrengths,
          weaknesses: t.competition.pdfWeaknesses,
          inspiration: t.competition.pdfInspiration,
          noData: t.competition.pdfNoData,
        },
      })
      showToast(isTauri ? t.competition.pdfExported : t.competition.pdfExportedWeb)
    } catch (err) {
      console.error('[PDF export]', err)
      showToast(t.competition.pdfExportError)
    }
  } else if (action === 'analyze') {
    showAnalysis.value = true
  }
}

const projectData = computed(() => ({
  goals: store.getGoals(projectId.value),
  stakeholders: store.getStakeholders(projectId.value),
  competitions: store.getCompetitions(projectId.value),
  hypotheses: store.getHypotheses(projectId.value),
  personas: store.getPersonas(projectId.value),
  scenarios: store.getScenarios(projectId.value),
  requirements: store.getRequirements(projectId.value),
  teamMembers: store.getTeamMembers(projectId.value),
}))

function confirmAnalysisAction(action) {
  store.addCompetition(projectId.value, action.fields)
}

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
const copyTarget = ref(null)
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
