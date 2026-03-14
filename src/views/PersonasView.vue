<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.personas }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'personas')" :filename="t.sections.personas" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.persona.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="p in items"
        :key="p.id"
        :to="{ name: 'personaDetail', params: { id: projectId, personaId: p.id } }"
        :entity-id="p.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.persona.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(p.id); else if (a === 'move') confirmMoveItem(p.id) }"
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
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
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

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getPersonas(projectId.value))
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
