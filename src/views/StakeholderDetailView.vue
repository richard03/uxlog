<template>
  <div class="container" v-if="project && item">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <div class="header-title">
          <button class="editable-name" @click="openEdit('name')" :aria-label="`${t.common.edit} – ${t.stakeholder.name}`">
            <h1>{{ item.name || t.stakeholder.name }}</h1>
            <svg class="pencil" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <p class="entity-type">
            {{ t.stakeholder.label }}
            <span v-if="strategy" class="strategy-badge">{{ t.stakeholderStrategy[strategy] }}</span>
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportEntityData('stakeholders', item?.id)" :filename="item?.name || t.stakeholder.label" />
          <KebabMenu
            :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.stakeholder.delete, action: 'delete', variant: 'danger' }]"
            @action="(a) => { if (a === 'move') showMove = true; else if (a === 'delete') confirmDelete() }"
          />
        </div>
      </div>
    </header>

    <section class="detail-section">
      <dl class="detail-list">
        <div v-for="field in fields" :key="field.key" class="detail-item" @click="openEdit(field.key)">
          <dt>{{ field.label }}</dt>
          <dd :class="{ 'value-empty': !item[field.key] }">{{ field.type === 'level' ? (t.stakeholderLevel[item[field.key]] || '—') : (item[field.key] || '—') }}</dd>
          <svg class="pencil edit-btn" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
      </dl>
    </section>

    <Modal v-if="editingField" :title="editingLabel" @close="closeEdit">
      <form @submit.prevent="saveField">
        <div class="form-group">
          <label for="edit-field">{{ editingLabel }}</label>
          <input v-if="editingType === 'text'" id="edit-field" v-model="editValue" class="form-control" />
          <textarea v-else-if="editingType === 'textarea'" id="edit-field" v-model="editValue" class="form-control" rows="4" />
          <select v-else-if="editingType === 'level'" id="edit-field" v-model="editValue" class="form-control">
            <option v-for="(label, val) in t.stakeholderLevel" :key="val" :value="val">{{ label }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeEdit">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.stakeholder.delete" :message="t.stakeholder.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <MoveToProjectModal v-if="showMove" state-key="stakeholders" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="router.push({ name: 'stakeholders', params: { id: projectId } })" />
  </div>
  <div v-else-if="project && !item" class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { getStakeholderStrategy } from '../lib/models.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const item = computed(() => store.getStakeholder(route.params.stakeholderId))
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.stakeholders, to: { name: 'stakeholders', params: { id: projectId.value } } },
  { label: item.value?.name || t.stakeholder.label },
])

const strategy = computed(() => getStakeholderStrategy(item.value?.influenceLevel, item.value?.interestLevel))

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)
const editingField = ref(null)
const editValue = ref('')


const allFields = [
  { key: 'name', label: t.stakeholder.name, type: 'text' },
  { key: 'description', label: t.stakeholder.description, type: 'textarea' },
  { key: 'influenceLevel', label: t.stakeholder.influenceLevel, type: 'level' },
  { key: 'interestLevel', label: t.stakeholder.interestLevel, type: 'level' },
]

const fields = allFields.slice(1)

const editingFieldDef = computed(() => allFields.find((f) => f.key === editingField.value))
const editingLabel = computed(() => editingFieldDef.value?.label ?? '')
const editingType = computed(() => editingFieldDef.value?.type ?? 'text')

function openEdit(key) {
  editingField.value = key
  editValue.value = item.value?.[key] ?? ''
}

function closeEdit() {
  editingField.value = null
  editValue.value = ''
}

function saveField() {
  if (item.value && editingField.value) {
    store.updateStakeholder(item.value.id, { [editingField.value]: editValue.value })
    closeEdit()
  }
}

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteStakeholder(item.value.id)
    router.push({ name: 'stakeholders', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.page-header { margin-bottom: var(--space-lg); }
.header-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-md); }
.header-actions { display: flex; gap: var(--space-xs); }
.header-title { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; }
.entity-type { margin: 0; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.strategy-badge { font-size: 0.75rem; font-weight: 500; padding: 0.15em 0.55em; border-radius: 999px; background: var(--surface-raised, var(--border)); color: var(--text-muted); border: 1px solid var(--border); }
.editable-name { display: inline-flex; align-items: baseline; gap: 0.3em; background: none; border: none; padding: 0; cursor: pointer; color: inherit; font-family: inherit; }
.editable-name h1 { margin: 0; font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.editable-name .pencil { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; align-self: center; }
.editable-name:hover .pencil, .editable-name:focus-visible .pencil { opacity: 1; }
.detail-section { margin-top: var(--space-lg); }
.detail-list { margin: 0; padding: 0; }
.detail-item { display: grid; grid-template-columns: 10rem 1fr auto; align-items: baseline; gap: 0 var(--space-sm); border-bottom: 1px solid var(--border); padding: var(--space-xs) 0; cursor: pointer; }
.detail-item:last-child { border-bottom: none; }
.detail-item dt { font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin: 0; }
.detail-item dd { margin: 0; font-size: 0.95rem; white-space: pre-wrap; }
.value-empty { color: var(--text-muted); font-style: italic; }
.edit-btn { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); }
.detail-item:hover .edit-btn, .detail-item:focus-within .edit-btn { opacity: 1; }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
@media (max-width: 600px) {
  .detail-item { grid-template-columns: 1fr auto; }
  .detail-item dt { grid-column: 1 / -1; margin-bottom: 2px; }
  .detail-item dd { grid-column: 1; }
}
</style>
