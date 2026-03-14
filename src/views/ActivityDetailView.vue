<template>
  <div class="container" v-if="project && item">
    <PageHeader>
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <div class="header-title">
          <button class="editable-name" @click="openEdit('name')" :aria-label="`${t.common.edit} – ${t.activity.name}`">
            <h1><ProjectColorTag :color="project?.color" />{{ item.name || t.activity.name }}</h1>
            <svg class="pencil" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <p class="entity-type">{{ t.activity.label }}</p>
        </div>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportEntityData('activities', item?.id)" :filename="item?.name || t.activity.label" />
          <KebabMenu
            :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.activity.delete, action: 'delete', variant: 'danger' }]"
            @action="(a) => { if (a === 'move') showMove = true; else if (a === 'delete') confirmDelete() }"
          />
        </div>
      </div>
      <div class="status-badge-row">
        <ActivityStatusBadge :status="item.status" :label="t.activity.statusOptions[item.status]" />
      </div>
    </PageHeader>

    <section class="detail-section">
      <dl class="detail-list">
        <DetailField :label="t.activity.description" :empty="!item.description" @edit="openEdit('description')">
          {{ item.description || '—' }}
        </DetailField>
        <DetailField :label="t.activity.status" @edit="openEdit('status')">
          {{ t.activity.statusOptions[item.status] }}
        </DetailField>
        <DetailField :label="t.activity.deadline" :empty="!item.deadline" @edit="openEdit('deadline')">
          <span :class="{ 'deadline-overdue': deadlineOverdue }">{{ item.deadline ? formatDeadlineDate(item.deadline) : '—' }}</span>
        </DetailField>
      </dl>
    </section>

    <ActivityChecklist
      v-if="activityType || activityItem?.customChecklistItems?.length"
      :title="t.activity.checklist"
      :items="effectiveChecklist"
      :checked-ids="activityItem?.checkedItems || []"
      :custom-labels="activityItem?.checklistLabels || {}"
      :progress-text="t.activity.checklistProgress(checkedCount, effectiveChecklist.length)"
      :done-text="t.activity.checklistDone"
      :add-item-text="t.activity.addChecklistItem"
      :add-item-placeholder="t.activity.addChecklistItemPlaceholder"
      :edit-label-text="t.activity.editChecklistLabel"
      :remove-item-text="t.activity.removeChecklistItem"
      :reset-label-text="t.activity.resetChecklistLabel"
      :cancel-text="t.common.cancel"
      :save-text="t.common.save"
      :done="checklistDone"
      v-model:show-add-form="addingItem"
      @toggle="store.toggleChecklistItem(activityItem.id, $event)"
      @edit-label="(p) => store.updateChecklistLabel(activityItem.id, p.itemId, p.value)"
      @remove="store.removeChecklistItem(activityItem.id, $event)"
      @add="onAddChecklistItem"
    />

    <SectionCard v-if="activityType" :title="t.activity.typeInfo" :aria-label="t.activity.typeInfo">
      <p class="section-card-desc">{{ activityType.description }}</p>
    </SectionCard>

    <Modal v-if="editingField" :title="editingLabel" @close="closeEdit">
      <form @submit.prevent="saveField">
        <FormGroup :label="editingLabel" control-id="edit-field">
          <FormTextarea
            v-if="editingField === 'description'"
            v-model="editValue"
            control-id="edit-field"
            :rows="4"
          />
          <FormSelect
            v-else-if="editingField === 'status'"
            v-model="editValue"
            control-id="edit-field"
            :options="statusOptions"
          />
          <FormInput
            v-else-if="editingField === 'deadline'"
            v-model="editValue"
            type="date"
            control-id="edit-field"
          />
          <FormInput
            v-else
            v-model="editValue"
            control-id="edit-field"
          />
        </FormGroup>
        <FormActions>
          <AppButton variant="secondary" @click="closeEdit">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
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
import { getTemplate } from '../lib/configStore.js'
import { daysRemaining } from '../lib/deadline.js'
import Modal from '../components/Modal.vue'
import PageHeader from '../components/PageHeader.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import DetailField from '../components/DetailField.vue'
import ActivityStatusBadge from '../components/ActivityStatusBadge.vue'
import ActivityChecklist from '../components/ActivityChecklist.vue'
import SectionCard from '../components/SectionCard.vue'
import AppButton from '../components/AppButton.vue'
import { FormGroup, FormInput, FormTextarea, FormSelect, FormActions } from '../components/form'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const activityItem = computed(() => store.getActivity(route.params.activityId))
const item = activityItem
const project = computed(() => store.getProject(projectId.value))
const activityType = computed(() => activityItem.value?.typeKey ? getTemplate(activityItem.value.typeKey) : null)

const effectiveChecklist = computed(() => {
  if (!activityItem.value) return []
  const removed = new Set(activityItem.value.removedChecklistItems || [])
  const baseChecklist = activityItem.value.baseChecklist || activityType.value?.checklist || []
  const defaults = baseChecklist.filter((ci) => !removed.has(ci.id))
  return [...defaults, ...(activityItem.value.customChecklistItems || [])]
})

const checkedCount = computed(() => (activityItem.value?.checkedItems || []).length)
const checklistDone = computed(() =>
  effectiveChecklist.value.length > 0 &&
  checkedCount.value === effectiveChecklist.value.length
)

const statusOptions = computed(() =>
  Object.entries(t.activity.statusOptions || {}).map(([value, label]) => ({ value, label }))
)

function onAddChecklistItem(label) {
  store.addCustomChecklistItem(activityItem.value.id, label)
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
const addingItem = ref(false)
const editingField = ref(null)
const editValue = ref('')

const fieldLabels = {
  name: () => t.activity.name,
  description: () => t.activity.description,
  status: () => t.activity.status,
  deadline: () => t.activity.deadline,
}

function formatDeadlineDate(ymd) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const deadlineOverdue = computed(() => {
  const dr = daysRemaining(item.value?.deadline)
  return dr !== null && dr < 0
})

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
.deadline-overdue {
  color: var(--error);
  font-weight: 600;
}
</style>
