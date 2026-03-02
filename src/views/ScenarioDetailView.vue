<template>
  <div class="container" v-if="project && scenario">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <div class="header-title">
          <button
            class="editable-code"
            @click="openEdit('code')"
            :aria-label="`${t.common.edit} – ${t.scenario.code}`"
          >
            <span>{{ scenario.code || '–' }}</span>
            <svg class="pencil" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            class="editable-name"
            @click="openEdit('name')"
            :aria-label="`${t.common.edit} – ${t.scenario.name}`"
          >
            <h1>{{ scenario.name || t.scenario.name }}</h1>
            <svg class="pencil" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
        <button type="button" class="btn btn-ghost" @click="confirmDelete">{{ t.common.delete }}</button>
      </div>
    </header>

    <section class="detail-section">
      <h2 class="visually-hidden">{{ t.scenario.label }}</h2>
      <dl class="detail-list">
        <div v-for="field in fields" :key="field.key" class="detail-item" @click="openEdit(field.key)">
          <dt>{{ field.label }}</dt>
          <dd :class="{ 'value-empty': isFieldEmpty(field) }">{{ displayValue(field.key) }}</dd>
          <svg class="pencil edit-btn" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
      </dl>
    </section>

    <Modal v-if="editingField" :title="editingLabel" @close="closeEdit">
      <form @submit.prevent="saveField">
        <div class="form-group">
          <label for="edit-field">{{ editingLabel }}</label>
          <input
            v-if="editingType === 'text'"
            id="edit-field"
            v-model="editValue"
            class="form-control"
          />
          <textarea
            v-else-if="editingType === 'textarea'"
            id="edit-field"
            v-model="editValue"
            class="form-control"
            rows="4"
          />
          <select
            v-else-if="editingType === 'select'"
            id="edit-field"
            v-model="editValue"
            class="form-control"
          >
            <option v-for="opt in editingOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <div v-else-if="editingType === 'number-unit'" class="number-unit-row">
            <input
              id="edit-field"
              v-model="editValue"
              type="number"
              min="0"
              class="form-control"
            />
            <select v-model="editUnit" class="form-control unit-select">
              <option v-for="opt in editingUnits" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeEdit">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="showConfirm"
      :title="t.scenario.delete"
      :message="t.scenario.deleteConfirm"
      @confirm="doDelete"
      @cancel="showConfirm = false"
    />
  </div>
  <div v-else-if="project && !scenario" class="container">
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

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const scenarioId = computed(() => route.params.scenarioId)
const project = computed(() => store.getProject(projectId.value))
const scenario = computed(() => store.getScenario(scenarioId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.scenarios, to: { name: 'scenarios', params: { id: projectId.value } } },
  { label: scenario.value?.name || t.scenario.label },
])

const showConfirm = ref(false)
const editingField = ref(null)
const editValue = ref('')
const editUnit = ref('daily')

const units = [
  { value: 'daily', label: t.scenario.unit.daily },
  { value: 'monthly', label: t.scenario.unit.monthly },
  { value: 'yearly', label: t.scenario.unit.yearly },
]

const fields = [
  { key: 'description', label: t.scenario.description, type: 'textarea' },
  {
    key: 'type',
    label: t.scenario.type,
    type: 'select',
    options: [
      { value: 'main', label: t.scenario.scenarioType.main },
      { value: 'secondary', label: t.scenario.scenarioType.secondary },
      { value: 'error', label: t.scenario.scenarioType.error },
    ],
  },
  {
    key: 'moscowRating',
    label: t.scenario.moscowRating,
    type: 'select',
    options: [
      { value: 'must', label: tPath('moscow.must') },
      { value: 'should', label: tPath('moscow.should') },
      { value: 'could', label: tPath('moscow.could') },
      { value: 'wont', label: tPath('moscow.wont') },
    ],
  },
  { key: 'userCount', valueKey: 'userCount', unitKey: 'userCountUnit', label: t.scenario.userCount, type: 'number-unit', units },
  { key: 'frequency', valueKey: 'frequencyValue', unitKey: 'frequencyUnit', label: t.scenario.frequency, type: 'number-unit', units },
  { key: 'value', valueKey: 'valueAmount', unitKey: 'valueUnit', label: t.scenario.value, type: 'number-unit', units },
]

// Zahrnuje také code a name pro modál (editace z hlavičky)
const allFields = [
  { key: 'code', label: t.scenario.code, type: 'text' },
  { key: 'name', label: t.scenario.name, type: 'text' },
  ...fields,
]

const editingFieldDef = computed(() => allFields.find((f) => f.key === editingField.value))
const editingLabel = computed(() => editingFieldDef.value?.label ?? '')
const editingType = computed(() => editingFieldDef.value?.type ?? 'text')
const editingOptions = computed(() => editingFieldDef.value?.options ?? [])
const editingUnits = computed(() => editingFieldDef.value?.units ?? [])

/**
 * Vrátí true pokud je pole prázdné (pro účely CSS třídy value-empty).
 */
function isFieldEmpty(field) {
  if (field.type === 'number-unit') return !scenario.value?.[field.valueKey]
  return !scenario.value?.[field.key]
}

/**
 * Vrátí hodnotu pole pro zobrazení. U select polí vrátí popisek, u prázdných hodnot '—'.
 */
function displayValue(key) {
  const field = allFields.find((f) => f.key === key)
  if (!field) return '—'
  if (field.type === 'number-unit') {
    const num = scenario.value?.[field.valueKey]
    if (!num) return '—'
    const unitVal = scenario.value?.[field.unitKey] ?? 'daily'
    const unitLabel = field.units.find((u) => u.value === unitVal)?.label ?? unitVal
    return `${num} ${unitLabel}`
  }
  const val = scenario.value?.[field.key]
  if (!val) return '—'
  if (field.type === 'select') {
    return field.options.find((o) => o.value === val)?.label ?? val
  }
  return val
}

/**
 * Otevře modál pro editaci jednoho pole.
 */
function openEdit(key) {
  editingField.value = key
  const field = allFields.find((f) => f.key === key)
  if (field?.type === 'number-unit') {
    editValue.value = scenario.value?.[field.valueKey] ?? ''
    editUnit.value = scenario.value?.[field.unitKey] ?? 'daily'
  } else {
    editValue.value = scenario.value?.[key] ?? ''
  }
}

/**
 * Zavře modál bez uložení.
 */
function closeEdit() {
  editingField.value = null
  editValue.value = ''
  editUnit.value = 'daily'
}

/**
 * Uloží změnu jednoho pole.
 */
function saveField() {
  if (!scenario.value || !editingField.value) return
  const field = editingFieldDef.value
  if (field?.type === 'number-unit') {
    store.updateScenario(scenario.value.id, {
      [field.valueKey]: editValue.value,
      [field.unitKey]: editUnit.value,
    })
  } else {
    store.updateScenario(scenario.value.id, { [editingField.value]: editValue.value })
  }
  closeEdit()
}

/**
 * Zobrazí dialog pro potvrzení smazání.
 */
function confirmDelete() {
  showConfirm.value = true
}

/**
 * Smaže scénář a přesměruje na seznam scénářů.
 */
function doDelete() {
  if (scenario.value) {
    store.deleteScenario(scenario.value.id)
    router.push({ name: 'scenarios', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-lg);
}

.header-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.editable-code,
.editable-name {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3em;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
}

.editable-code {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
}

.editable-name h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.editable-code .pencil,
.editable-name .pencil {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
  align-self: center;
}

.editable-code:hover .pencil,
.editable-code:focus-visible .pencil,
.editable-name:hover .pencil,
.editable-name:focus-visible .pencil {
  opacity: 1;
}


.detail-section {
  margin-top: var(--space-lg);
}

.detail-list {
  margin: 0;
  padding: 0;
}

.detail-item {
  display: grid;
  grid-template-columns: 10rem 1fr auto;
  align-items: baseline;
  gap: 0 var(--space-sm);
  border-bottom: 1px solid var(--border);
  padding: var(--space-xs) 0;
  cursor: pointer;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item dt {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

.detail-item dd {
  margin: 0;
  font-size: 0.95rem;
  white-space: pre-wrap;
}

.value-empty {
  color: var(--text-muted);
  font-style: italic;
}

.edit-btn {
  opacity: 0;
  transition: opacity 0.15s;
  color: var(--text-muted);
}

.detail-item:hover .edit-btn,
.detail-item:focus-within .edit-btn {
  opacity: 1;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.number-unit-row {
  display: flex;
  gap: var(--space-sm);
}

.number-unit-row .form-control:first-child {
  flex: 1;
}

.unit-select {
  width: 8rem;
  flex-shrink: 0;
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}
</style>
