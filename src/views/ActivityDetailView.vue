<template>
  <div class="container" v-if="project && item">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="item.name || t.activity.name">
      <template #actions>
        <!-- V okně nad plátnem bez importu a exportu -->
        <AppButton v-if="!inCanvas" variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton v-if="!inCanvas" :get-yaml="() => store.exportEntityData('activities', item?.id)" :filename="item?.name || t.activity.label" />
        <KebabMenu
          :items="activityHeaderKebabItems"
          @action="onActivityHeaderKebab"
        />
      </template>
    </ProjectPageHeader>

    <ColumnHeading
      :title="item.name ? `${t.activity.label}: ${item.name}` : t.activity.label"
      :on-edit="() => openEdit('name')"
      :edit-label="`${t.common.edit} – ${t.activity.name}`" />

    <p v-if="activityType?.description" class="activity-type-desc">{{ activityType.description }}</p>
    <ActivityGuide v-if="activityType" :guide="activityType.guide" part="intro" />

    <section class="detail-section">
      <dl class="detail-list">
        <InlineEditableDetailField
          :label="t.activity.description"
          :empty="!item.description"
          :display-value="item.description || '—'"
          :raw-value="item.description ?? ''"
          :field="{ key: 'description', type: 'textarea' }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField('description', val)"
        />
        <InlineEditableDetailField
          :label="t.activity.status"
          :empty="!item.status"
          :display-value="t.activity.statusOptions[item.status] ?? '—'"
          :raw-value="item.status ?? ''"
          :field="{ key: 'status', type: 'select', options: statusOptions }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField('status', val)"
        />
        <InlineEditableDetailField
          :label="t.activity.deadline"
          :empty="!item.deadline"
          :display-value="item.deadline ? formatCalendarDate(item.deadline) : '—'"
          :raw-value="item.deadline ?? ''"
          :field="{ key: 'deadline', type: 'date' }"
          :value-class="deadlineOverdue ? 'deadline-overdue' : ''"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField('deadline', val)"
        />
      </dl>
    </section>

    <SectionCard v-if="activityType?.guide?.steps?.length || activityType?.guide?.outputs?.length" :aria-label="t.activity.typeInfo">
      <ActivityGuide :guide="activityType.guide" part="steps" />
    </SectionCard>

    <ActivityChecklist
      v-if="activityType || activityItem?.customChecklistItems?.length"
      :title="t.activity.checklist"
      :items="effectiveChecklist"
      :checked-ids="activityItem?.checkedItems || []"
      :custom-labels="activityItem?.checklistLabels || {}"
      :linked-task-ids="checklistLinkedTaskIds"
      :create-task-from-item-text="t.activity.createTaskFromChecklistItem"
      :open-linked-task-text="t.activity.openChecklistLinkedTask"
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
      @create-task-from-item="onCreateTaskFromChecklistItem"
      @open-linked-task="onOpenChecklistLinkedTask"
    />

    <Modal v-if="editingField" :title="editingLabel" @close="closeEdit">
      <form @submit.prevent="saveFieldModal">
        <FormGroup :label="editingLabel" control-id="edit-field">
          <FormInput v-model="editValue" control-id="edit-field" />
        </FormGroup>
        <FormActions>
          <AppButton variant="secondary" @click="closeEdit">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <EntityConnections :project-id="projectId" entity-type="activities" :entity-id="item.id" />

    <ConfirmDialog v-if="showConfirm" :title="t.activity.delete" :message="t.activity.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <MoveToProjectModal v-if="showMove" state-key="activities" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="leaveDetail({ name: 'project', params: { id: projectId } })" />
    <MoveToProjectModal v-if="showCopy" mode="copy" state-key="activities" :entity-id="item?.id" :current-project-id="projectId" @close="showCopy = false" @copied="showCopy = false" />

    <TaskAddModal
      v-model="taskAddModalOpen"
      :project-id="projectId"
      :preset="taskAddPreset"
      @save="onTaskAddModalSave"
    />
  </div>
  <div v-else-if="project && !item" class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useEntityNavigation } from '../composables/useEntityNavigation.js'
import { useI18n } from '../composables/useI18n.js'
import { useConfig } from '../composables/useConfig.js'
import { useDeadline } from '../composables/useDeadline.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import Modal from '../components/Modal.vue'
import InlineEditableDetailField from '../components/InlineEditableDetailField.vue'
import { FormGroup, FormInput, FormActions } from '../components/form'
import ActivityChecklist from '../components/ActivityChecklist.vue'
import SectionCard from '../components/SectionCard.vue'
import ActivityGuide from '../components/ActivityGuide.vue'
import AppButton from '../components/AppButton.vue'
import EntityConnections from '../components/EntityConnections.vue'
import TaskAddModal from '../components/TaskAddModal.vue'
import { getEffectiveActivityChecklist, resolveActivityChecklistItemLabel } from '../lib/activityChecklistLinks.js'
import { formatCalendarDate } from '../utils/formatDate.js'

const route = useRoute()
const { leaveDetail, openDetail, inCanvas } = useEntityNavigation()
const store = useStore()
const { t } = useI18n()
const { getTemplate } = useConfig()
const { daysRemaining } = useDeadline()

const projectId = computed(() => route.params.id)
const activityItem = computed(() => store.getActivity(route.params.activityId))
const item = activityItem
const project = computed(() => store.getProject(projectId.value))
const activityType = computed(() => activityItem.value?.typeKey ? getTemplate(activityItem.value.typeKey) : null)

const effectiveChecklist = computed(() =>
  getEffectiveActivityChecklist(activityItem.value, activityType.value?.checklist)
)

const checkedCount = computed(() => (activityItem.value?.checkedItems || []).length)
const checklistDone = computed(() =>
  effectiveChecklist.value.length > 0 &&
  checkedCount.value === effectiveChecklist.value.length
)

/** Vazby položka checklistu → úkol pouze pokud úkol v projektu stále existuje (pro menu). */
const checklistLinkedTaskIds = computed(() => {
  const raw = activityItem.value?.checklistItemTaskIds
  if (!raw) return {}
  const pid = projectId.value
  const out = {}
  for (const [itemId, taskId] of Object.entries(raw)) {
    const task = store.getTask(taskId)
    if (task && task.projectId === pid) out[itemId] = taskId
  }
  return out
})

const statusOptions = computed(() =>
  Object.entries(t.activity.statusOptions || {}).map(([value, label]) => ({ value, label }))
)

const activityHeaderKebabItems = computed(() => [
  { label: t.common.moveToProject, action: 'move' },
  { label: t.common.copyToProject, action: 'copy' },
  { label: t.activity.assignTask, action: 'assign-task' },
  { label: t.activity.delete, action: 'delete', variant: 'danger' },
])

/**
 * Akce v hlavičce aktivity.
 * @param {string} action
 */
function onActivityHeaderKebab(action) {
  if (action === 'move') showMove.value = true
  else if (action === 'copy') showCopy.value = true
  else if (action === 'assign-task') openAssignTaskFromActivity()
  else if (action === 'delete') confirmDelete()
}

const taskAddModalOpen = ref(false)
const taskAddPreset = ref({})
/** Kontext uložení: jen souvislost s aktivitou, nebo úkol z řádku checklistu. */
const taskAddContext = ref(null)

watch(taskAddModalOpen, (open) => {
  if (!open) {
    taskAddContext.value = null
    taskAddPreset.value = {}
  }
})

/**
 * Otevře stejný dialog „Přidat úkol“ jako v sekci Úkoly, název předvyplněn názvem aktivity.
 */
function openAssignTaskFromActivity() {
  taskAddContext.value = { type: 'activity' }
  taskAddPreset.value = { name: activityItem.value?.name || '' }
  taskAddModalOpen.value = true
}

function onAddChecklistItem(label) {
  store.addCustomChecklistItem(activityItem.value.id, label)
  addingItem.value = false
}

/**
 * Otevře dialog přidání úkolu s názvem z položky checklistu; po uložení vznikne vazba položka ↔ úkol.
 * @param {string} checklistItemId
 */
function onCreateTaskFromChecklistItem(checklistItemId) {
  if (!activityItem.value?.id) return
  const ci = effectiveChecklist.value.find((x) => x.id === checklistItemId)
  const name = ci ? resolveActivityChecklistItemLabel(activityItem.value.checklistLabels, ci) : ''
  taskAddContext.value = { type: 'checklistItem', itemId: checklistItemId }
  taskAddPreset.value = { name }
  taskAddModalOpen.value = true
}

/**
 * Uložení z dialogu přidání úkolu (z aktivity nebo z řádku checklistu).
 * @param {{ code: string, name: string, description: string }} payload
 */
function onTaskAddModalSave(payload) {
  const ctx = taskAddContext.value
  if (!activityItem.value?.id || !ctx) return
  if (ctx.type === 'activity') {
    store.addTaskLinkedToActivity(activityItem.value.id, payload)
  } else if (ctx.type === 'checklistItem') {
    store.createTaskFromChecklistItem(activityItem.value.id, ctx.itemId, payload)
  }
}

/**
 * Přejde na detail úkolu propojeného s položkou checklistu.
 * @param {string} taskId
 */
function onOpenChecklistLinkedTask(taskId) {
  openDetail('tasks', projectId.value, taskId)
}

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: item.value?.name || t.activity.label },
])

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)
const showCopy = ref(false)
const addingItem = ref(false)
const editingField = ref(null)
const editValue = ref('')

const fieldLabels = {
  name: () => t.activity.name,
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

function saveFieldModal() {
  if (item.value && editingField.value) {
    store.updateActivity(item.value.id, { [editingField.value]: editValue.value })
    closeEdit()
  }
}

const deadlineOverdue = computed(() => {
  const dr = daysRemaining(item.value?.deadline)
  return dr !== null && dr < 0
})

function saveField(key, value) {
  if (item.value) {
    store.updateActivity(item.value.id, { [key]: value })
  }
}

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteActivity(item.value.id)
    leaveDetail({ name: 'project', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.activity-type-desc {
  margin: 0 0 var(--space-sm);
  font-size: 0.9rem;
  line-height: 1.5;
}

.deadline-overdue {
  color: var(--error);
  font-weight: 600;
}
</style>
