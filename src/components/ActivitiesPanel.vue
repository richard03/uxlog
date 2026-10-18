<template>
  <section class="activities-panel" aria-labelledby="activities-heading">
    <div class="activities-header">
      <h2 id="activities-heading" class="activities-title">{{ t.activity.panelTitle }}</h2>
      <AppButton variant="secondary" size="sm" @click="openAddActivity">{{ t.activity.add }}</AppButton>
    </div>

    <ul v-if="activities.length" class="entity-list activity-list" role="list">
      <EntityCard
        class="activity-card"
        v-for="activity in activities"
        :key="activity.id"
        :to="{ name: 'activityDetail', params: { id: projectId, activityId: activity.id } }"
        :entity-id="activity.id"
        :dnd="dnd"
        :kebab-items="kebabItemsForActivity(activity)"
        @action="(a) => onActivityCardAction(a, activity.id)"
      >
        <h3 class="card-title">{{ activity.name || t.activity.label }}</h3>
        <div class="card-badges">
          <ActivityStatusBadge :status="activity.status" :label="t.activity.statusOptions[activity.status]" />
          <AppBadge
            v-if="getChecklist(activity).total > 0"
            :variant="getChecklist(activity).done === getChecklist(activity).total ? 'completeness-done' : 'completeness'"
            :aria-label="t.activity.checklistProgress(getChecklist(activity).done, getChecklist(activity).total)"
          >{{ getChecklist(activity).done }}/{{ getChecklist(activity).total }}</AppBadge>
        </div>
      </EntityCard>
    </ul>
    <p v-else class="activities-empty">
      {{ t.activity.emptyState }}<br />
      <span class="text-muted">{{ t.activity.emptyStateHint }}</span>
    </p>

    <section v-if="recommendations.length" class="activity-recs" aria-labelledby="activity-recs-heading">
      <h3 id="activity-recs-heading" class="activity-recs-title">{{ t.activity.recommendations.title }}</h3>
      <ul class="activity-recs-list" role="list">
        <li v-for="rec in recommendations" :key="rec.typeKey" class="activity-rec">
          <div class="activity-rec-text">
            <span class="activity-rec-name">{{ rec.name }}</span>
            <span class="activity-rec-reason">{{ t.activity.recommendations.reasons[rec.reasonKey]?.(rec.count) }}</span>
          </div>
          <AppButton
            variant="secondary"
            size="sm"
            :aria-label="t.activity.recommendations.addLabel(rec.name)"
            @click="addRecommended(rec.typeKey)"
          >{{ t.activity.recommendations.add }}</AppButton>
        </li>
      </ul>
    </section>

    <!-- Add activity modal -->
    <Modal v-if="showAdd" :title="t.activity.add" @close="closeAdd">
      <form @submit.prevent="saveActivity">
        <FormSelect v-model="typeKey" :label="t.activity.label" control-id="activity-type">
          <optgroup v-for="group in activityGroups" :key="group.key" :label="group.label">
            <option v-for="type in group.types" :key="type.key" :value="type.key">{{ type.name }}</option>
          </optgroup>
          <optgroup :label="t.activity.addCustom">
            <option value="custom">{{ t.activity.customName }}</option>
          </optgroup>
        </FormSelect>
        <FormInput v-if="typeKey === 'custom'" v-model="customName" :label="t.activity.name" control-id="activity-custom-name" required />
        <FormActions>
          <AppButton variant="secondary" @click="closeAdd">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.add }}</AppButton>
        </FormActions>
      </form>
    </Modal>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import { useConfig } from '../composables/useConfig.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import { getEffectiveActivityChecklist } from '../lib/activityChecklistLinks.js'
import Modal from './Modal.vue'
import KebabMenu from './KebabMenu.vue'
import EntityCard from './EntityCard.vue'
import AppBadge from './AppBadge.vue'
import ActivityStatusBadge from './ActivityStatusBadge.vue'
import { FormInput, FormSelect, FormActions } from './form'
import AppButton from './AppButton.vue'

const props = defineProps({
  projectId: { type: String, required: true },
})

const emit = defineEmits(['dismiss', 'move', 'assign-task'])

const { t } = useI18n()
const store = useStore()
const { getTemplate, getEffectiveTemplates } = useConfig()

const activities = computed(() => store.getActivities(props.projectId))
/** Nejvýš tři doporučené aktivity podle stavu artefaktů projektu. */
const recommendations = computed(() => store.getRecommendedActivities(props.projectId).slice(0, 3))
const dnd = useDraggableList(() => activities.value, (orderedIds) => store.reorderEntities('activities', props.projectId, orderedIds))

/**
 * Šablona checklistu pro aktivitu (config nebo vestavěný typ).
 * @param {Object} activity
 * @returns {Array}
 */
function templateChecklistFor(activity) {
  if (!activity?.typeKey) return []
  return getTemplate(activity.typeKey)?.checklist || []
}

/**
 * Efektivní položky checklistu pro aktivitu.
 * @param {Object} activity
 * @returns {Array<{id: string}>}
 */
function effectiveChecklistFor(activity) {
  return getEffectiveActivityChecklist(activity, templateChecklistFor(activity))
}

/**
 * Průběh checklistu pro badge (počet splněných vůči aktuálním položkám).
 * @param {Object} activity
 * @returns {{ done: number, total: number }}
 */
function getChecklist(activity) {
  const items = effectiveChecklistFor(activity)
  const total = items.length
  const checked = new Set(activity.checkedItems || [])
  const done = items.filter((ci) => checked.has(ci.id)).length
  return { done, total }
}

/**
 * Položky kebab menu u karty aktivity.
 * @param {Object} activity
 * @returns {Array}
 */
function kebabItemsForActivity(activity) {
  return [
    { label: t.common.moveToProject, action: 'move' },
    { label: t.activity.assignTask, action: 'assign-task' },
    { label: t.activity.notInterested, action: 'delete', variant: 'danger' },
  ]
}

/**
 * @param {string} action
 * @param {string} activityId
 */
function onActivityCardAction(action, activityId) {
  if (action === 'delete') emit('dismiss', activityId)
  else if (action === 'move') emit('move', activityId)
  else if (action === 'assign-task') emit('assign-task', activityId)
}

/** Šablony z konfigurace (vestavěné bez smazaných + vlastní), seskupené podle skupiny. */
const activityGroups = computed(() => {
  const templates = getEffectiveTemplates()
  return [
    { key: 'project', label: t.activity.groupProject },
    { key: 'research', label: t.activity.groupResearch },
    { key: 'design', label: t.activity.groupDesign },
  ]
    .map((g) => ({ ...g, types: templates.filter((type) => type.group === g.key) }))
    .filter((g) => g.types.length)
})

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

/**
 * Přidá doporučenou aktivitu ze šablony.
 * @param {string} key
 */
function addRecommended(key) {
  const type = getTemplate(key)
  if (type) store.addActivity(props.projectId, { typeKey: type.key, name: type.name, sortOrder: type.sortOrder })
}

function saveActivity() {
  if (typeKey.value === 'custom') {
    const name = customName.value.trim()
    if (!name) return
    store.addActivity(props.projectId, { name, sortOrder: 9999 })
  } else {
    const type = getTemplate(typeKey.value)
    if (!type) return
    store.addActivity(props.projectId, { typeKey: type.key, name: type.name, sortOrder: type.sortOrder })
  }
  closeAdd()
}
</script>

<style scoped>
/* Vzhled sjednocený s řádky ve sloupci Artefakty (CounterCard variant="row") */
.activity-list {
  gap: var(--space-sm);
}

.activity-list .activity-card {
  align-items: center;
  padding: var(--space-sm) var(--space-md);
}

.activity-list .activity-card :deep(.ec-link) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  min-width: 0;
}

.activity-list .activity-card :deep(.card-title) {
  margin: 0;
  min-width: 0;
  font-size: 0.9375rem;
  font-weight: 400;
  line-height: 1.5;
}

.activity-list .activity-card :deep(.card-title) {
  overflow-wrap: anywhere;
}

/* Stav a počítadlo kroků pod názvem aktivity */
.activity-list .activity-card :deep(.card-badges) {
  margin: 0;
}

.activity-list .activity-card :deep(.kebab-menu) {
  align-self: flex-start;
  margin: -2px -8px 0 0;
}

.activities-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2rem;
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

.activity-recs {
  margin-top: var(--space-lg);
}

.activity-recs-title {
  margin: 0 0 var(--space-sm);
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.activity-recs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-rec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
}

.activity-rec-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.activity-rec-name {
  font-size: 0.9375rem;
}

.activity-rec-reason {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
