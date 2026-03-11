<template>
  <div class="container" v-if="project && item">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <div class="header-title">
          <button class="editable-name" @click="openEdit('name')" :aria-label="`${t.common.edit} – ${t.activity.name}`">
            <h1>{{ item.name || t.activity.name }}</h1>
            <svg class="pencil" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <p class="entity-type">{{ t.activity.label }}</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportEntityData('activities', item?.id)" :filename="item?.name || t.activity.label" />
          <KebabMenu
            :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.activity.delete, action: 'delete', variant: 'danger' }]"
            @action="(a) => { if (a === 'move') showMove = true; else if (a === 'delete') confirmDelete() }"
          />
        </div>
      </div>
      <div class="status-badge-row">
        <span class="status-dot" :class="`status-${item.status}`" aria-hidden="true"></span>
        <span class="status-label">{{ t.activity.statusOptions[item.status] }}</span>
      </div>
    </header>

    <section class="detail-section">
      <dl class="detail-list">
        <div class="detail-item" @click="openEdit('description')">
          <dt>{{ t.activity.description }}</dt>
          <dd :class="{ 'value-empty': !item.description }">{{ item.description || '—' }}</dd>
          <svg class="pencil edit-btn" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
        <div class="detail-item" @click="openEdit('status')">
          <dt>{{ t.activity.status }}</dt>
          <dd>{{ t.activity.statusOptions[item.status] }}</dd>
          <svg class="pencil edit-btn" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
      </dl>
    </section>

    <section v-if="activityType || activityItem?.customChecklistItems?.length" class="checklist-section" aria-labelledby="checklist-heading">
      <div class="checklist-header">
        <h2 id="checklist-heading" class="checklist-title">{{ t.activity.checklist }}</h2>
        <span class="checklist-progress" :class="{ 'checklist-done': checklistDone }" aria-live="polite">
          {{ checklistDone ? t.activity.checklistDone : t.activity.checklistProgress(checkedCount, effectiveChecklist.length) }}
        </span>
      </div>
      <ul class="checklist-list" role="list">
        <li v-for="ci in effectiveChecklist" :key="ci.id" class="checklist-item">
          <div v-if="editingLabelId !== ci.id" class="checklist-row">
            <label class="checklist-label">
              <input
                type="checkbox"
                class="checklist-checkbox"
                :checked="isChecked(ci.id)"
                @change="store.toggleChecklistItem(activityItem.id, ci.id)"
                :aria-label="getItemLabel(ci)"
              />
              <span :class="{ 'checklist-text-done': isChecked(ci.id) }">{{ getItemLabel(ci) }}</span>
            </label>
            <KebabMenu
              :items="[
                { label: t.activity.editChecklistLabel, action: 'edit' },
                { label: t.activity.removeChecklistItem, action: 'remove', variant: 'danger' },
              ]"
              @action="(a) => { if (a === 'edit') startEditLabel(ci); else if (a === 'remove') store.removeChecklistItem(activityItem.id, ci.id) }"
            />
          </div>
          <div v-else class="checklist-item-editing">
            <input
              type="text"
              class="form-control checklist-edit-input"
              v-model="editingLabelValue"
              @keydown.enter.prevent="saveLabel(ci)"
              @keydown.escape="cancelEditLabel"
            />
            <div class="checklist-edit-actions">
              <button
                v-if="activityItem.checklistLabels?.[ci.id]"
                type="button"
                class="btn btn-ghost btn-sm"
                @click="resetLabel(ci)"
                :title="t.activity.resetChecklistLabel"
              >{{ t.activity.resetChecklistLabel }}</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="cancelEditLabel">{{ t.common.cancel }}</button>
              <button type="button" class="btn btn-primary btn-sm" @click="saveLabel(ci)">{{ t.common.save }}</button>
            </div>
          </div>
        </li>
      </ul>
      <div class="checklist-add-row" v-if="!addingItem">
        <button class="btn btn-ghost btn-sm checklist-add-btn" @click="addingItem = true">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ t.activity.addChecklistItem }}
        </button>
      </div>
      <div class="checklist-add-form" v-else>
        <input
          type="text"
          class="form-control checklist-edit-input"
          v-model="newItemLabel"
          :placeholder="t.activity.addChecklistItemPlaceholder"
          @keydown.enter.prevent="submitNewItem"
          @keydown.escape="cancelNewItem"
          ref="newItemInput"
        />
        <div class="checklist-edit-actions">
          <button type="button" class="btn btn-secondary btn-sm" @click="cancelNewItem">{{ t.common.cancel }}</button>
          <button type="button" class="btn btn-primary btn-sm" :disabled="!newItemLabel.trim()" @click="submitNewItem">{{ t.common.save }}</button>
        </div>
      </div>
    </section>

    <section v-if="activityType" class="type-info-section" aria-label="t.activity.typeInfo">
      <h2 class="type-info-title">{{ t.activity.typeInfo }}</h2>
      <p class="type-info-desc">{{ activityType.defaultDescription }}</p>
    </section>

    <Modal v-if="editingField" :title="editingLabel" @close="closeEdit">
      <form @submit.prevent="saveField">
        <div class="form-group">
          <label for="edit-field">{{ editingLabel }}</label>
          <textarea v-if="editingField === 'description'" id="edit-field" v-model="editValue" class="form-control" rows="4" />
          <select v-else-if="editingField === 'status'" id="edit-field" v-model="editValue" class="form-control">
            <option value="pending">{{ t.activity.statusOptions.pending }}</option>
            <option value="in_progress">{{ t.activity.statusOptions.in_progress }}</option>
            <option value="done">{{ t.activity.statusOptions.done }}</option>
          </select>
          <input v-else id="edit-field" v-model="editValue" class="form-control" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeEdit">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.activity.delete" :message="t.activity.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <MoveToProjectModal v-if="showMove" state-key="activities" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="router.push({ name: 'project', params: { id: projectId } })" />
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
import { getActivityType } from '../lib/activityTypes.js'
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
const activityItem = computed(() => store.getActivity(route.params.activityId))
const item = activityItem
const project = computed(() => store.getProject(projectId.value))
const activityType = computed(() => activityItem.value?.typeKey ? getActivityType(activityItem.value.typeKey) : null)

const effectiveChecklist = computed(() => {
  if (!activityItem.value) return []
  const removed = new Set(activityItem.value.removedChecklistItems || [])
  const defaults = (activityType.value?.checklist || []).filter((ci) => !removed.has(ci.id))
  return [...defaults, ...(activityItem.value.customChecklistItems || [])]
})

const checkedCount = computed(() => (activityItem.value?.checkedItems || []).length)
const checklistDone = computed(() =>
  effectiveChecklist.value.length > 0 &&
  checkedCount.value === effectiveChecklist.value.length
)

function isChecked(itemId) {
  return (activityItem.value?.checkedItems || []).includes(itemId)
}

function getItemLabel(ci) {
  return activityItem.value?.checklistLabels?.[ci.id] || ci.label
}

const editingLabelId = ref(null)
const editingLabelValue = ref('')

function startEditLabel(ci) {
  editingLabelId.value = ci.id
  editingLabelValue.value = getItemLabel(ci)
}

function saveLabel(ci) {
  store.updateChecklistLabel(activityItem.value.id, ci.id, editingLabelValue.value)
  editingLabelId.value = null
  editingLabelValue.value = ''
}

function resetLabel(ci) {
  store.updateChecklistLabel(activityItem.value.id, ci.id, '')
  editingLabelId.value = null
  editingLabelValue.value = ''
}

function cancelEditLabel() {
  editingLabelId.value = null
  editingLabelValue.value = ''
}

const addingItem = ref(false)
const newItemLabel = ref('')
const newItemInput = ref(null)

function submitNewItem() {
  if (!newItemLabel.value.trim()) return
  store.addCustomChecklistItem(activityItem.value.id, newItemLabel.value)
  newItemLabel.value = ''
  addingItem.value = false
}

function cancelNewItem() {
  newItemLabel.value = ''
  addingItem.value = false
}

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: item.value?.name || t.activity.label },
])

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)
const editingField = ref(null)


const editValue = ref('')

const fieldLabels = {
  name: () => t.activity.name,
  description: () => t.activity.description,
  status: () => t.activity.status,
}

const editingLabel = computed(() => fieldLabels[editingField.value]?.() ?? '')

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
    store.updateActivity(item.value.id, { [editingField.value]: editValue.value })
    closeEdit()
  }
}

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteActivity(item.value.id)
    router.push({ name: 'project', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.page-header { margin-bottom: var(--space-lg); }
.header-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-md); }
.header-actions { display: flex; gap: var(--space-xs); }
.header-title { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; }
.entity-type { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
.editable-name { display: inline-flex; align-items: baseline; gap: 0.3em; background: none; border: none; padding: 0; cursor: pointer; color: inherit; font-family: inherit; }
.editable-name h1 { margin: 0; font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.editable-name .pencil { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; align-self: center; }
.editable-name:hover .pencil, .editable-name:focus-visible .pencil { opacity: 1; }
.status-badge-row { display: flex; align-items: center; gap: var(--space-xs); margin-top: var(--space-sm); }
.status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.status-dot.status-pending { background: var(--color-muted, #9ca3af); }
.status-dot.status-in_progress { background: var(--color-amber, #f59e0b); }
.status-dot.status-done { background: #4caf50; }
.status-label { font-size: 0.85rem; color: var(--text-muted); }
.detail-section { margin-top: var(--space-lg); }
.detail-list { margin: 0; padding: 0; }
.detail-item { display: grid; grid-template-columns: 10rem 1fr auto; align-items: baseline; gap: 0 var(--space-sm); border-bottom: 1px solid var(--border); padding: var(--space-xs) 0; cursor: pointer; }
.detail-item:last-child { border-bottom: none; }
.detail-item dt { font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin: 0; }
.detail-item dd { margin: 0; font-size: 0.95rem; white-space: pre-wrap; }
.value-empty { color: var(--text-muted); font-style: italic; }
.edit-btn { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); }
.detail-item:hover .edit-btn, .detail-item:focus-within .edit-btn { opacity: 1; }
.type-info-section { margin-top: var(--space-lg); padding: var(--space-md); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); }
.type-info-title { margin: 0 0 var(--space-xs); font-size: 0.85rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.type-info-desc { margin: 0; font-size: 0.9rem; color: var(--text); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
.checklist-section { margin-top: var(--space-lg); }
.checklist-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); }
.checklist-title { margin: 0; font-size: 1rem; font-weight: 600; }
.checklist-progress { font-size: 0.85rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.checklist-done { color: #4caf50; font-weight: 600; }
.checklist-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.checklist-item { border-bottom: 1px solid var(--border); }
.checklist-item:last-child { border-bottom: none; }
.checklist-row { display: flex; align-items: flex-start; gap: var(--space-xs); }
.checklist-label { display: flex; align-items: flex-start; gap: var(--space-sm); padding: var(--space-xs) 0; cursor: pointer; font-size: 0.95rem; flex: 1; min-width: 0; }
.checklist-checkbox { margin-top: 2px; flex-shrink: 0; accent-color: var(--color-primary, #3b82f6); width: 1rem; height: 1rem; cursor: pointer; }
.checklist-text-done { text-decoration: line-through; color: var(--text-muted); }
.checklist-add-row { padding: var(--space-xs) 0; }
.checklist-add-btn { display: flex; align-items: center; gap: 0.4em; color: var(--text-muted); }
.checklist-add-btn:hover { color: var(--color-primary, #3b82f6); }
.checklist-add-form { padding: var(--space-xs) 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.checklist-item-editing { padding: var(--space-xs) 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.checklist-edit-input { font-size: 0.95rem; padding: 0.3rem 0.5rem; }
.checklist-edit-actions { display: flex; gap: var(--space-xs); justify-content: flex-end; }
.btn-sm { font-size: 0.8rem; padding: 0.2rem 0.6rem; }
@media (max-width: 600px) {
  .detail-item { grid-template-columns: 1fr auto; }
  .detail-item dt { grid-column: 1 / -1; margin-bottom: 2px; }
  .detail-item dd { grid-column: 1; }
}
</style>
