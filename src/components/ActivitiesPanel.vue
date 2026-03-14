<template>
  <section class="activities-panel" aria-labelledby="activities-heading">
    <div class="activities-header">
      <h2 id="activities-heading" class="activities-title">{{ t.activity.panelTitle }}</h2>
      <button type="button" class="btn btn-secondary btn-sm" @click="openAddActivity">{{ t.activity.add }}</button>
    </div>

    <ul v-if="activities.length" class="entity-list" role="list">
      <EntityCard
        v-for="activity in activities"
        :key="activity.id"
        :to="{ name: 'activityDetail', params: { id: projectId, activityId: activity.id } }"
        :entity-id="activity.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.activity.notInterested, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') $emit('dismiss', activity.id); else if (a === 'move') $emit('move', activity.id) }"
      >
        <div class="card-badges">
          <ActivityStatusBadge :status="activity.status" :label="t.activity.statusOptions[activity.status]" />
          <AppBadge
            v-if="getChecklist(activity).total > 0"
            :variant="getChecklist(activity).done === getChecklist(activity).total ? 'completeness-done' : 'completeness'"
            :aria-label="t.activity.checklistProgress(getChecklist(activity).done, getChecklist(activity).total)"
          >{{ getChecklist(activity).done }}/{{ getChecklist(activity).total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ activity.name || t.activity.label }}</h3>
      </EntityCard>
    </ul>
    <p v-else class="activities-empty">
      {{ t.activity.emptyState }}<br />
      <span class="text-muted">{{ t.activity.emptyStateHint }}</span>
    </p>

    <!-- Add activity modal -->
    <Modal v-if="showAdd" :title="t.activity.add" @close="closeAdd">
      <form @submit.prevent="saveActivity">
        <FormSelect v-model="typeKey" :label="t.activity.label" control-id="activity-type">
          <optgroup v-for="group in activityGroups" :key="group.key" :label="group.label">
            <option v-for="type in group.types" :key="type.key" :value="type.key">{{ type.defaultName }}</option>
          </optgroup>
          <optgroup :label="t.activity.addCustom">
            <option value="custom">{{ t.activity.customName }}</option>
          </optgroup>
        </FormSelect>
        <FormInput v-if="typeKey === 'custom'" v-model="customName" :label="t.activity.name" control-id="activity-custom-name" required />
        <FormActions>
          <button type="button" class="btn btn-secondary" @click="closeAdd">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.add }}</button>
        </FormActions>
      </form>
    </Modal>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import { ACTIVITY_TYPES, getActivityType } from '../lib/activityTypes.js'
import Modal from './Modal.vue'
import KebabMenu from './KebabMenu.vue'
import EntityCard from './EntityCard.vue'
import AppBadge from './AppBadge.vue'
import ActivityStatusBadge from './ActivityStatusBadge.vue'
import { FormInput, FormSelect, FormActions } from './form'

const props = defineProps({
  projectId: { type: String, required: true },
})

defineEmits(['dismiss', 'move'])

const { t } = useI18n()
const store = useStore()

const activities = computed(() => store.getActivities(props.projectId))
const dnd = useDraggableList(() => activities.value, (orderedIds) => store.reorderEntities('activities', props.projectId, orderedIds))

function getChecklist(activity) {
  const type = activity.typeKey ? getActivityType(activity.typeKey) : null
  const total = type?.checklist?.length ?? 0
  const done = total ? (activity.checkedItems || []).length : 0
  return { done, total }
}

const activityGroups = computed(() => [
  { key: 'project', label: t.activity.groupProject, types: ACTIVITY_TYPES.filter((type) => type.group === 'project') },
  { key: 'research', label: t.activity.groupResearch, types: ACTIVITY_TYPES.filter((type) => type.group === 'research') },
  { key: 'design', label: t.activity.groupDesign, types: ACTIVITY_TYPES.filter((type) => type.group === 'design') },
])

const showAdd = ref(false)
const typeKey = ref('')
const customName = ref('')

function openAddActivity() {
  typeKey.value = ''
  customName.value = ''
  showAdd.value = true
}

function closeAdd() {
  showAdd.value = false
}

function saveActivity() {
  if (typeKey.value === 'custom') {
    const name = customName.value.trim()
    if (!name) return
    store.addActivity(props.projectId, { name, sortOrder: 9999 })
  } else {
    const type = getActivityType(typeKey.value)
    if (!type) return
    store.addActivity(props.projectId, { typeKey: type.key, name: type.defaultName, sortOrder: type.sortOrder })
  }
  closeAdd()
}
</script>

<style scoped>
.activities-panel {
  margin-top: var(--space-xl);
}

.activities-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.activities-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.activities-empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  padding: var(--space-md) 0;
}
</style>
