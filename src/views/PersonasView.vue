<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.personas }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'personas')" :filename="t.sections.personas" />
          <AppButton variant="primary" @click="openForm()">{{ t.persona.add }}</AppButton>
        </div>
      </div>
    </header>

    <div class="filter-bar">
      <span class="filter-bar-label">{{ t.filter.status }}</span>
      <div class="filter-bar-group">
        <FormCheckbox v-model="filterProtopersona" control-id="per-filter-proto" :label="`${t.personaStatus.protopersona} (${countProtopersona})`" />
        <FormCheckbox v-model="filterPersona" control-id="per-filter-persona" :label="`${t.personaStatus.persona} (${countPersona})`" />
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
        v-for="p in visibleItems"
        :key="p.id"
        :to="{ name: 'personaDetail', params: { id: projectId, personaId: p.id } }"
        :entity-id="p.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.persona.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(p.id); else if (a === 'move') confirmMoveItem(p.id); else if (a === 'copy') copyTarget.value = p.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="p.code" variant="badge-accent">{{ p.code }}</AppBadge>
          <AppBadge>{{ tPath(`personaStatus.${p.status}`) }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(p, 'persona').filled === getEntityCompleteness(p, 'persona').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(p, 'persona').filled, getEntityCompleteness(p, 'persona').total)"
          >{{ getEntityCompleteness(p, 'persona').filled }}/{{ getEntityCompleteness(p, 'persona').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ p.name || t.persona.name }}</h3>
        <p v-if="p.description" class="card-desc">{{ p.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.persona.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.persona.code" control-id="p-code" />
        <FormInput v-model="form.name" :label="t.persona.name" control-id="p-name" required />
        <FormSelect
          v-model="form.status"
          :label="t.persona.status"
          control-id="p-status"
          :options="[
            { value: 'protopersona', label: t.personaStatus.protopersona },
            { value: 'persona', label: t.personaStatus.persona },
          ]"
        />
        <FormTextarea v-model="form.description" :label="t.persona.description" control-id="p-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.persona.delete"
      :message="t.persona.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="personas" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="personas" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
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
import { FormInput, FormTextarea, FormSelect, FormActions, FormCheckbox } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getPersonas(projectId.value))
const filterProtopersona = ref(true)
const filterPersona = ref(true)
const countProtopersona = computed(() => items.value.filter(p => (p.status || 'protopersona') === 'protopersona').length)
const countPersona = computed(() => items.value.filter(p => p.status === 'persona').length)
const visibleItems = computed(() => {
  const allowed = []
  if (filterProtopersona.value) allowed.push('protopersona')
  if (filterPersona.value) allowed.push('persona')
  return items.value.filter(p => allowed.includes(p.status || 'protopersona'))
})
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('personas', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.personas },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', status: 'protopersona', description: '', motivation: '', needs: '', problems: '', targetGroupSize: '', targetGroupValue: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deletePersona(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
const copyTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { code: generateNextCode('PER', items.value), name: '', status: 'protopersona', description: '', motivation: '', needs: '', problems: '', targetGroupSize: '', targetGroupValue: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addPersona(projectId.value, form.value)
  closeForm()
}
</script>
