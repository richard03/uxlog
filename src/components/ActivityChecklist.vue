<template>
  <section class="checklist-section" aria-labelledby="checklist-heading">
    <div class="checklist-header">
      <h2 id="checklist-heading" class="checklist-title">{{ title }}</h2>
      <span class="checklist-progress" :class="{ 'checklist-done': done }" aria-live="polite">
        {{ displayProgressText }}
      </span>
    </div>
    <ul class="checklist-list" role="list">
      <li v-for="ci in items" :key="ci.id" class="checklist-item">
        <div v-if="editingId !== ci.id" class="checklist-row">
          <label class="checklist-label">
            <input
              type="checkbox"
              class="checklist-checkbox form-control"
              :checked="isChecked(ci.id)"
              :aria-label="getItemLabel(ci)"
              @change="emit('toggle', ci.id)"
            />
            <span :class="{ 'checklist-text-done': isChecked(ci.id) }">{{ getItemLabel(ci) }}</span>
          </label>
          <KebabMenu
            :items="kebabItemsFor(ci)"
            @action="(a) => handleKebabAction(a, ci)"
          />
        </div>
        <div v-else class="checklist-item-editing">
          <FormInput
            v-model="editingValue"
            class="checklist-edit-input"
            @keydown.enter.prevent="saveLabel(ci)"
            @keydown.escape="cancelEdit"
          />
          <div class="checklist-edit-actions">
            <AppButton
              v-if="hasCustomLabel(ci)"
              variant="tertiary"
              size="sm"
              @click="resetLabel(ci)"
            >
              {{ resetLabelText }}
            </AppButton>
            <AppButton variant="secondary" size="sm" @click="cancelEdit">{{ cancelText }}</AppButton>
            <AppButton variant="primary" size="sm" @click="saveLabel(ci)">{{ saveText }}</AppButton>
          </div>
        </div>
      </li>
    </ul>
    <div class="checklist-add-row" v-if="!showAddForm">
      <AppButton variant="tertiary" size="sm" class="checklist-add-btn" @click="emit('update:showAddForm', true)">
        <IconPlus />
        {{ addItemText }}
      </AppButton>
    </div>
    <div class="checklist-add-form" v-else>
      <FormInput
        ref="newItemInputRef"
        v-model="newItemValue"
        :placeholder="addItemPlaceholder"
        @keydown.enter.prevent="submitNewItem"
        @keydown.escape="cancelNewItem"
      />
      <div class="checklist-edit-actions">
        <AppButton variant="secondary" size="sm" @click="cancelNewItem">{{ cancelText }}</AppButton>
        <AppButton variant="primary" size="sm" :disabled="!newItemValue.trim()" @click="submitNewItem">{{ saveText }}</AppButton>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import KebabMenu from './KebabMenu.vue'
import AppButton from './AppButton.vue'
import FormInput from './form/FormInput.vue'
import IconPlus from './IconPlus.vue'

/**
 * ActivityChecklist – interaktivní checklist aktivit.
 * Zobrazuje položky s checkboxy, umožňuje editovat popisky, odebírat položky a přidávat vlastní.
 * @prop {string} title - nadpis sekce
 * @prop {Array<{id: string, label: string}>} items - položky checklistu
 * @prop {string[]} checkedIds - ID zaškrtnutých položek
 * @prop {Object.<string, string>} customLabels - mapa id → vlastní popisek
 * @prop {string} progressText - text průběhu (např. "3/5")
 * @prop {string} doneText - text při dokončení
 * @prop {string} addItemText - text tlačítka přidat
 * @prop {string} addItemPlaceholder - placeholder pro novou položku
 * @prop {string} editLabelText - položka v menu: upravit popisek
 * @prop {string} removeItemText - položka v menu: odebrat
 * @prop {string} resetLabelText - tlačítko resetovat popisek
 * @prop {string} cancelText - zrušit
 * @prop {string} saveText - uložit
 * @prop {boolean} showAddForm - zda zobrazit formulář pro přidání (v-model)
 * @prop {boolean} done - zda je checklist dokončen
 * @prop {Object.<string, string>} linkedTaskIds - id položky checklistu → id propojeného úkolu
 * @prop {string} createTaskFromItemText - položka menu: vytvořit úkol
 * @prop {string} openLinkedTaskText - položka menu: otevřít úkol
 */
const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  checkedIds: { type: Array, default: () => [] },
  customLabels: { type: Object, default: () => ({}) },
  progressText: { type: String, default: '' },
  doneText: { type: String, default: '' },
  addItemText: { type: String, default: '' },
  addItemPlaceholder: { type: String, default: '' },
  editLabelText: { type: String, default: '' },
  removeItemText: { type: String, default: '' },
  resetLabelText: { type: String, default: '' },
  cancelText: { type: String, default: '' },
  saveText: { type: String, default: '' },
  showAddForm: { type: Boolean, default: false },
  done: { type: Boolean, default: false },
  linkedTaskIds: { type: Object, default: () => ({}) },
  createTaskFromItemText: { type: String, default: '' },
  openLinkedTaskText: { type: String, default: '' },
})

const emit = defineEmits([
  'toggle',
  'edit-label',
  'remove',
  'add',
  'update:showAddForm',
  'create-task-from-item',
  'open-linked-task',
])

const editingId = ref(null)
const editingValue = ref('')
const newItemValue = ref('')
const newItemInputRef = ref(null)

/**
 * Položky kebab menu pro jednu řádku checklistu (úkol z položky je volitelný).
 * @param {{ id: string }} ci
 * @returns {Array<{ label: string, action: string, variant?: string }>}
 */
function kebabItemsFor(ci) {
  const items = [{ label: props.editLabelText, action: 'edit' }]
  const tid = props.linkedTaskIds?.[ci.id]
  if (tid) {
    items.push({ label: props.openLinkedTaskText, action: 'openTask' })
  } else {
    items.push({ label: props.createTaskFromItemText, action: 'createTask' })
  }
  items.push({ label: props.removeItemText, action: 'remove', variant: 'danger' })
  return items
}

const displayProgressText = computed(() =>
  props.done ? props.doneText : props.progressText
)

function isChecked(id) {
  return props.checkedIds.includes(id)
}

function getItemLabel(ci) {
  return props.customLabels[ci.id] ?? ci.label
}

function hasCustomLabel(ci) {
  return !!props.customLabels?.[ci.id]
}

/**
 * Zpracuje akci z kebab menu u položky checklistu.
 * @param {string} action
 * @param {{ id: string }} ci
 */
function handleKebabAction(action, ci) {
  if (action === 'edit') {
    editingId.value = ci.id
    editingValue.value = getItemLabel(ci)
  } else if (action === 'createTask') {
    emit('create-task-from-item', ci.id)
  } else if (action === 'openTask') {
    const tid = props.linkedTaskIds?.[ci.id]
    if (tid) emit('open-linked-task', tid)
  } else if (action === 'remove') {
    emit('remove', ci.id)
  }
}

function saveLabel(ci) {
  emit('edit-label', { itemId: ci.id, value: editingValue.value })
  editingId.value = null
  editingValue.value = ''
}

function resetLabel(ci) {
  emit('edit-label', { itemId: ci.id, value: '' })
  editingId.value = null
  editingValue.value = ''
}

function cancelEdit() {
  editingId.value = null
  editingValue.value = ''
}

function submitNewItem() {
  const label = newItemValue.value.trim()
  if (!label) return
  emit('add', label)
  newItemValue.value = ''
  emit('update:showAddForm', false)
}

function cancelNewItem() {
  newItemValue.value = ''
  emit('update:showAddForm', false)
}

watch(() => props.showAddForm, (visible) => {
  if (visible) {
    // focus nové input při zobrazení – v nextTick
    setTimeout(() => newItemInputRef.value?.focus(), 0)
  }
})
</script>

<script>
export default {
  name: 'ActivityChecklist',
}
</script>

<style scoped>
.checklist-section {
  margin-top: var(--space-lg);
}

.checklist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.checklist-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.checklist-progress {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.checklist-done {
  color: var(--success);
  font-weight: 600;
}

.checklist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checklist-item {
  border-bottom: 1px solid var(--border);
}

.checklist-item:last-child {
  border-bottom: none;
}

.checklist-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
}

.checklist-label {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  cursor: pointer;
  font-size: 0.95rem;
  flex: 1;
  min-width: 0;
}

.checklist-checkbox {
  margin-top: 2px;
  flex-shrink: 0;
  accent-color: var(--accent);
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.checklist-text-done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.checklist-add-row {
  padding: var(--space-xs) 0;
}

.checklist-add-btn {
  display: flex;
  align-items: center;
  gap: 0.4em;
  color: var(--text-muted);
}

.checklist-add-btn:hover {
  color: var(--accent);
}

.checklist-add-form,
.checklist-item-editing {
  padding: var(--space-xs) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.checklist-edit-input {
  font-size: 0.95rem;
  padding: 0.3rem 0.5rem;
}

.checklist-edit-actions {
  display: flex;
  gap: var(--space-xs);
  justify-content: flex-end;
}
</style>
