<template>
  <div class="container" v-if="project && item">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <div class="header-title">
          <div class="header-title-main">
            <button class="editable-code" @click="openEdit('code')" :aria-label="`${t.common.edit} – ${t.bug.code}`">
              <span>{{ item.code || '–' }}</span>
              <svg class="pencil" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="editable-name" @click="openEdit('name')" :aria-label="`${t.common.edit} – ${t.bug.name}`">
              <h1>{{ item.name || t.bug.name }}</h1>
              <svg class="pencil" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <p class="entity-type">{{ t.bug.label }}</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportEntityData('bugs', item?.id)" :filename="item?.name || t.bug.label" />
          <button type="button" class="btn btn-ghost" @click="confirmDelete">{{ t.common.delete }}</button>
        </div>
      </div>
    </header>

    <section class="detail-section">
      <!-- Computed priority banner -->
      <div v-if="computedPriority" class="priority-banner" :class="`priority-banner-${computedPriority}`" role="status">
        {{ t.bug.priority }}: <strong>{{ t.bug.priorityOptions[computedPriority] }}</strong>
      </div>

      <dl class="detail-list">
        <div v-for="field in fields" :key="field.key" class="detail-item" @click="openEdit(field.key)">
          <dt>{{ field.label }}</dt>
          <dd :class="{ 'value-empty': !item[field.key] }">{{ displayValue(field.key) }}</dd>
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
          <select v-else-if="editingType === 'select'" id="edit-field" v-model="editValue" class="form-control">
            <option v-for="opt in editingOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeEdit">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.bug.delete" :message="t.bug.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
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
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import { getBugPriority } from '../lib/models.js'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const item = computed(() => store.getBug(route.params.bugId))
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.bugs, to: { name: 'bugs', params: { id: projectId.value } } },
  { label: item.value?.name || t.bug.label },
])

const computedPriority = computed(() => getBugPriority(item.value?.severity, item.value?.impact))

const showConfirm = ref(false)
const showImport = ref(false)
const editingField = ref(null)
const editValue = ref('')

const allFields = [
  { key: 'code', label: t.bug.code, type: 'text' },
  { key: 'name', label: t.bug.name, type: 'text' },
  { key: 'description', label: t.bug.description, type: 'textarea' },
  { key: 'stepsToReproduce', label: t.bug.stepsToReproduce, type: 'textarea' },
  { key: 'expectedBehavior', label: t.bug.expectedBehavior, type: 'textarea' },
  { key: 'actualBehavior', label: t.bug.actualBehavior, type: 'textarea' },
  { key: 'affectedArea', label: t.bug.affectedArea, type: 'text' },
  {
    key: 'severity', label: t.bug.severity, type: 'select',
    options: [
      { value: '', label: t.bug.severityOptions[''] },
      { value: 'critical', label: t.bug.severityOptions.critical },
      { value: 'high', label: t.bug.severityOptions.high },
      { value: 'medium', label: t.bug.severityOptions.medium },
      { value: 'low', label: t.bug.severityOptions.low },
    ],
  },
  {
    key: 'impact', label: t.bug.impact, type: 'select',
    options: [
      { value: '', label: t.bug.impactOptions[''] },
      { value: 'high', label: t.bug.impactOptions.high },
      { value: 'medium', label: t.bug.impactOptions.medium },
      { value: 'low', label: t.bug.impactOptions.low },
    ],
  },
  {
    key: 'status', label: t.bug.status, type: 'select',
    options: [
      { value: 'new', label: t.bug.statusOptions.new },
      { value: 'in_progress', label: t.bug.statusOptions.in_progress },
      { value: 'fixed', label: t.bug.statusOptions.fixed },
      { value: 'wontfix', label: t.bug.statusOptions.wontfix },
      { value: 'closed', label: t.bug.statusOptions.closed },
    ],
  },
]

const fields = allFields.slice(2)

const editingFieldDef = computed(() => allFields.find((f) => f.key === editingField.value))
const editingLabel = computed(() => editingFieldDef.value?.label ?? '')
const editingType = computed(() => editingFieldDef.value?.type ?? 'text')
const editingOptions = computed(() => editingFieldDef.value?.options ?? [])

function displayValue(key) {
  const val = item.value?.[key]
  if (!val) return '—'
  const field = allFields.find((f) => f.key === key)
  if (field?.type === 'select') return field.options.find((o) => o.value === val)?.label ?? val
  return val
}

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
    store.updateBug(item.value.id, { [editingField.value]: editValue.value })
    closeEdit()
  }
}

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteBug(item.value.id)
    router.push({ name: 'bugs', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.page-header { margin-bottom: var(--space-lg); }
.header-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-md); }
.header-actions { display: flex; gap: var(--space-xs); }
.header-title { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; }
.header-title-main { display: flex; align-items: baseline; gap: var(--space-sm); flex-wrap: wrap; }
.entity-type { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
.editable-code, .editable-name { display: inline-flex; align-items: baseline; gap: 0.3em; background: none; border: none; padding: 0; cursor: pointer; color: inherit; font-family: inherit; }
.editable-code { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
.editable-name h1 { margin: 0; font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.editable-code .pencil, .editable-name .pencil { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; align-self: center; }
.editable-code:hover .pencil, .editable-code:focus-visible .pencil, .editable-name:hover .pencil, .editable-name:focus-visible .pencil { opacity: 1; }
.priority-banner { padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-md); font-size: 0.9rem; }
.priority-banner-critical { background: #fee2e2; color: #991b1b; }
.priority-banner-high { background: #ffedd5; color: #9a3412; }
.priority-banner-medium { background: #fef3c7; color: #92400e; }
.priority-banner-low { background: #ecfdf5; color: #065f46; }
.detail-section { margin-top: var(--space-lg); }
.detail-list { margin: 0; padding: 0; }
.detail-item { display: grid; grid-template-columns: 12rem 1fr auto; align-items: baseline; gap: 0 var(--space-sm); border-bottom: 1px solid var(--border); padding: var(--space-xs) 0; cursor: pointer; }
.detail-item:last-child { border-bottom: none; }
.detail-item dt { font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin: 0; }
.detail-item dd { margin: 0; font-size: 0.95rem; white-space: pre-wrap; }
.value-empty { color: var(--text-muted); font-style: italic; }
.edit-btn { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); }
.detail-item:hover .edit-btn, .detail-item:focus-within .edit-btn { opacity: 1; }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
