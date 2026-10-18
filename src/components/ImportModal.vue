<template>
  <Modal
    :title="step === 'file' ? t.import.title : t.import.previewTitle"
    :size="step === 'preview' ? 'large' : 'normal'"
    @close="$emit('close')"
  >
    <!-- Step 1: výběr souboru nebo vložení textu -->
    <div v-if="step === 'file'" class="import-file-step">
      <div class="file-area">
        <label class="file-label" :for="fileInputId">
          <span class="file-label-text">{{ t.import.fileHint }}</span>
          <AppButton tag="span" variant="secondary" size="sm">{{ t.import.fileLabel }}</AppButton>
          <input
            :id="fileInputId"
            type="file"
            accept=".yaml,.yml"
            class="file-input-hidden"
            @change="handleFile"
          />
        </label>
      </div>

      <p class="or-separator">{{ t.import.pasteLabel }}</p>

      <div class="form-group">
        <textarea
          v-model="pastedYaml"
          :placeholder="t.import.pastePlaceholder"
          class="form-control yaml-textarea"
          rows="8"
          aria-label="YAML text"
        ></textarea>
      </div>

      <p v-if="parseError" class="import-error" role="alert">{{ parseError }}</p>

      <FormActions>
        <AppButton variant="secondary" @click="$emit('close')">{{ t.common.cancel }}</AppButton>
        <AppButton variant="primary" :disabled="!pastedYaml.trim()" @click="processPasted">{{ t.common.next }}</AppButton>
      </FormActions>
    </div>

    <!-- Step 2: přehled importu -->
    <div v-else-if="step === 'preview' && !plan" class="import-preview-step">
      <p class="import-error" role="alert">{{ t.import.previewError }}</p>
      <FormActions>
        <AppButton variant="secondary" @click="goBack">{{ t.import.back }}</AppButton>
      </FormActions>
    </div>

    <div v-else-if="step === 'preview' && plan" class="import-preview-step">

      <!-- Výběr cílového projektu -->
      <div class="form-group">
        <label for="import-target">{{ t.import.targetProject }}</label>
        <select id="import-target" v-model="selectedTarget" class="form-control">
          <option value="new">{{ t.import.createNew }}</option>
          <optgroup v-if="existingProjects.length" :label="t.import.existingProjects">
            <option v-for="p in existingProjects" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- Horní akce: hromadný import / odmítnutí -->
      <div v-if="remainingCount > 0" class="pr-batch-bar">
        <AppButton variant="primary" :disabled="remainingCount === 0" @click="importAllPending">
          {{ t.import.importAll }} ({{ remainingCount }})
        </AppButton>
        <AppButton variant="secondary" @click="rejectAllPending">{{ t.import.rejectAll }}</AppButton>
      </div>

      <!-- Metadata projektu (jen pro import do existujícího) -->
      <section v-if="plan.project && selectedTarget !== 'new'" class="im-section">
        <div class="im-section-header">
          <span class="im-section-title">{{ t.import.projectMeta }}</span>
          <span class="badge">1</span>
        </div>

        <div class="pr-stack">
          <PendingReviewRow
            :expanded="expandedProject"
            :confirm-label="t.import.importThis"
            :skip-label="t.import.skipThis"
            @toggle="expandedProject = !expandedProject"
            @confirm="importProjectMetaOnly"
            @skip="skipProjectMeta"
          >
            <template #summary>
              <span class="pr-type-pill pr-type-pill--update">{{ t.import.badgeOverwrite }}</span>
              <span class="pr-meta-id">{{ t.import.rowId }}: {{ plan.project.item.id || '—' }}</span>
              <strong class="pr-title">{{ plan.project.item.name || '—' }}</strong>
            </template>
            <template #body>
              <p v-if="getDiffFields({ item: plan.project.item, action: 'update', existing: projectExisting }).length === 0" class="im-muted">
                {{ t.import.noFieldChanges }}
              </p>
              <div v-else class="im-diff">
                <ImportDiffFieldRow
                  v-for="f in getDiffFields({ item: plan.project.item, action: 'update', existing: projectExisting })"
                  :key="f.key"
                  :item="plan.project.item"
                  :field-key="f.key"
                  :has-existing-side="'oldVal' in f"
                  :existing-value="'oldVal' in f ? f.oldVal : undefined"
                />
              </div>
            </template>
          </PendingReviewRow>
        </div>
      </section>

      <!-- Entity sekce -->
      <section
        v-for="section in visibleSections"
        :key="section.key"
        class="im-section"
      >
        <div class="im-section-header">
          <span class="im-section-title">{{ section.label }}</span>
          <span class="badge">{{ plan[section.key].length }}</span>
        </div>

        <div class="pr-stack">
          <PendingReviewRow
            v-for="(entry, i) in plan[section.key]"
            :key="entry.item.id + '-' + i"
            :expanded="!!expandedEntity[section.key][i]"
            :confirm-label="t.import.importThis"
            :skip-label="t.import.skipThis"
            @toggle="toggleEntityExpanded(section.key, i)"
            @confirm="importOneEntity(section.key, i)"
            @skip="skipOneEntity(section.key, i)"
          >
            <template #summary>
              <span
                class="pr-type-pill"
                :class="entry.action === 'create' ? 'pr-type-pill--create' : 'pr-type-pill--update'"
              >
                {{ entry.action === 'create' ? t.import.badgeNew : t.import.badgeOverwrite }}
              </span>
              <span class="pr-meta-id">{{ t.import.rowId }}: {{ entry.item.id || '—' }}</span>
              <strong class="pr-title">{{ entityTitle(entry.item) }}</strong>
              <span v-if="entry.action === 'update' && entry.matchReason !== 'id'" class="pr-meta-hint">
                ({{ t.import.matchBy }} {{ matchReasonLabel(entry.matchReason) }}: {{ entityLabel(entry.existing) }})
              </span>
            </template>
            <template #body>
              <div v-if="getDiffFields(entry).length === 0" class="im-muted">{{ t.import.noFieldChanges }}</div>
              <div v-else class="im-diff">
                <ImportDiffFieldRow
                  v-for="f in getDiffFields(entry)"
                  :key="f.key"
                  :item="entry.item"
                  :field-key="f.key"
                  :has-existing-side="'oldVal' in f"
                  :existing-value="'oldVal' in f ? f.oldVal : undefined"
                />
              </div>
            </template>
          </PendingReviewRow>
        </div>
      </section>

      <p v-if="importError" class="import-error" role="alert">{{ importError }}</p>

      <FormActions>
        <AppButton variant="secondary" @click="goBack">{{ t.import.back }}</AppButton>
      </FormActions>
    </div>
  </Modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import ImportDiffFieldRow from './ImportDiffFieldRow.vue'
import PendingReviewRow from './PendingReviewRow.vue'
import { FormActions } from './form'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import { showToast } from '../composables/useToast.js'
import { parseYaml } from '../lib/yaml.js'
import { analyzeImport, buildImportData } from '../lib/importLogic.js'

const props = defineProps({
  projectId: { type: String, default: null },
})
const emit = defineEmits(['close', 'imported'])

const { t } = useI18n()
const store = useStore()

const fileInputId = 'import-file-' + Math.random().toString(36).slice(2)

const step = ref('file')
const pastedYaml = ref('')
const parseError = ref('')
const importError = ref('')
const pendingParsed = ref(null)
const selectedTarget = ref(props.projectId || 'new')
const expandedProject = ref(false)
const didImport = ref(false)
const lastEffectiveProjectId = ref(null)

const ENTITY_KEYS = [
  'goals', 'stakeholders', 'competitions', 'hypotheses',
  'personas', 'scenarios', 'requirements', 'activities', 'teamMembers',
  'tasks', 'bugs', 'risks',
]

const existingProjects = computed(() => store.state.projects || [])

const sectionDefs = computed(() => [
  { key: 'goals', label: t.sections.goals },
  { key: 'teamMembers', label: t.sections.team },
  { key: 'stakeholders', label: t.sections.stakeholders },
  { key: 'competitions', label: t.sections.competition },
  { key: 'hypotheses', label: t.sections.hypothesis },
  { key: 'personas', label: t.sections.personas },
  { key: 'requirements', label: t.sections.requirements },
  { key: 'scenarios', label: t.sections.scenarios },
  { key: 'activities', label: t.activity.panelTitle },
  { key: 'tasks', label: t.sections.tasks },
  { key: 'bugs', label: t.sections.bugs },
  { key: 'risks', label: t.sections.risks },
])

/** Rozbalení řádků entit (index ↔ stav). */
const expandedEntity = reactive(Object.fromEntries(ENTITY_KEYS.map((k) => [k, []])))

const plan = computed(() => {
  if (!pendingParsed.value) return null
  const effectiveId = selectedTarget.value === 'new' ? '__new__' : selectedTarget.value
  if (!effectiveId) return null
  try {
    return analyzeImport(pendingParsed.value, store.state, effectiveId)
  } catch (err) {
    console.error('[Import] analyzeImport threw:', err)
    return null
  }
})

/** Existující projekt v úložišti (pro diff metadat). */
const projectExisting = computed(() => {
  if (!plan.value?.project || selectedTarget.value === 'new') return null
  return (store.state.projects || []).find((p) => p.id === selectedTarget.value) || null
})

const visibleSections = computed(() =>
  sectionDefs.value.filter((s) => plan.value?.[s.key]?.length > 0)
)

/**
 * Synchronizuje délku pole rozbalení s plánem importu.
 * @param {Object|null} p
 */
function syncExpandedRows(p) {
  if (!p) return
  for (const key of ENTITY_KEYS) {
    const len = (p[key] || []).length
    const arr = expandedEntity[key]
    while (arr.length < len) arr.push(false)
    if (arr.length > len) arr.length = len
  }
}

watch(plan, (p) => {
  if (p) syncExpandedRows(p)
}, { immediate: true })

const remainingCount = computed(() => {
  if (!plan.value) return 0
  let n = 0
  if (plan.value.project && selectedTarget.value !== 'new') n++
  for (const key of ENTITY_KEYS) {
    n += (plan.value[key] || []).length
  }
  return n
})

const isPlanVisuallyEmpty = computed(() => {
  if (!plan.value) return false
  const hasProjectRow = plan.value.project && selectedTarget.value !== 'new'
  const hasEntities = ENTITY_KEYS.some((k) => (plan.value[k] || []).length > 0)
  return !hasProjectRow && !hasEntities
})

watch(isPlanVisuallyEmpty, (empty) => {
  if (empty && step.value === 'preview') {
    finishPreviewSession()
  }
})

/**
 * Ukončí krok náhledu: zavře okno a případně oznámí import.
 */
function finishPreviewSession() {
  if (didImport.value) {
    emit('imported', { projectId: lastEffectiveProjectId.value })
  } else {
    emit('close')
  }
}

// Pole atributů, která přeskakujeme v diffu
const SKIP_FIELDS = new Set(['id', 'projectId', 'sortOrder'])

/**
 * Vrátí seznam změněných / nových polí pro zobrazení diffu.
 * @param {{ item: object, action: string, existing?: object|null }} entry
 */
function getDiffFields(entry) {
  const { item, action, existing } = entry
  const result = []
  for (const [key, newVal] of Object.entries(item)) {
    if (SKIP_FIELDS.has(key) || key.endsWith('Ids')) continue
    if (action === 'update' && existing) {
      const oldVal = existing[key]
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        result.push({ key, oldVal, newVal })
      }
    } else {
      const isEmpty = newVal === null || newVal === undefined || newVal === '' ||
        (Array.isArray(newVal) && newVal.length === 0)
      if (!isEmpty) result.push({ key, newVal })
    }
  }
  return result
}

function entityLabel(item) {
  if (!item) return ''
  const parts = []
  if (item.code) parts.push(`[${item.code}]`)
  if (item.name) parts.push(item.name)
  return parts.join(' ') || item.id || ''
}

/** Nadpis řádku (bez ID — ID je zvlášť). */
function entityTitle(item) {
  if (!item) return '—'
  if (item.code && item.name) return `${item.code} · ${item.name}`
  return item.name || item.code || '—'
}

function matchReasonLabel(reason) {
  if (reason === 'code') return t.import.matchCode
  if (reason === 'name') return t.import.matchName
  if (reason === 'id') return t.import.matchId
  return reason
}

/**
 * Přepne rozbalení entity.
 * @param {string} sectionKey
 * @param {number} index
 */
function toggleEntityExpanded(sectionKey, index) {
  expandedEntity[sectionKey][index] = !expandedEntity[sectionKey][index]
}

/**
 * Určí výchozí target po parsování YAML.
 * @param {object} parsed
 */
function detectDefaultTarget(parsed) {
  const yamlProjectId = parsed?.project?.id
  if (yamlProjectId) {
    const found = (store.state.projects || []).find((p) => p.id === yamlProjectId)
    return found ? found.id : 'new'
  }
  for (const key of ENTITY_KEYS) {
    const items = parsed[key]
    if (Array.isArray(items) && items.length > 0) {
      const pid = items[0]?.projectId
      if (pid) {
        const found = (store.state.projects || []).find((p) => p.id === pid)
        if (found) return found.id
      }
    }
  }
  if (props.projectId) return props.projectId
  const first = (store.state.projects || [])[0]
  return first ? first.id : 'new'
}

function processYaml(text) {
  parseError.value = ''
  let parsed
  try {
    parsed = parseYaml(text)
  } catch (err) {
    console.error('[Import] parseYaml threw:', err)
    parseError.value = t.import.parseError
    return
  }

  if (!parsed || typeof parsed !== 'object') {
    parseError.value = t.import.parseError
    return
  }

  const hasData =
    parsed.project ||
    ENTITY_KEYS.some((k) => Array.isArray(parsed[k]) && parsed[k].length > 0)

  if (!hasData) {
    parseError.value = t.import.emptyError
    return
  }

  try {
    pendingParsed.value = structuredClone(parsed)
  } catch {
    pendingParsed.value = JSON.parse(JSON.stringify(parsed))
  }
  didImport.value = false
  lastEffectiveProjectId.value = null
  expandedProject.value = false
  selectedTarget.value = detectDefaultTarget(parsed)
  step.value = 'preview'
}

function processPasted() {
  processYaml(pastedYaml.value)
}

function handleFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    pastedYaml.value = e.target.result
    processYaml(e.target.result)
  }
  reader.onerror = () => {
    parseError.value = t.import.parseError
  }
  reader.readAsText(file, 'utf-8')
}

function goBack() {
  step.value = 'file'
  pendingParsed.value = null
  parseError.value = ''
  importError.value = ''
  didImport.value = false
}

/**
 * Sestaví výběr jen pro jednu entitu (ostatní false).
 * @param {string} entityKey
 * @param {number} index
 * @param {boolean} includeProject
 */
function buildSingleEntitySelection(entityKey, index, includeProject) {
  const p = plan.value
  if (!p) return null
  const selections = {
    project: !!(includeProject && p.project && selectedTarget.value !== 'new'),
  }
  for (const k of ENTITY_KEYS) {
    const len = (p[k] || []).length
    selections[k] = Array.from({ length: len }, (_, i) => k === entityKey && i === index)
  }
  return selections
}

/**
 * Výběr pouze pro metadata projektu.
 */
function buildProjectOnlySelection() {
  const p = plan.value
  if (!p) return null
  const selections = { project: true }
  for (const k of ENTITY_KEYS) {
    selections[k] = (p[k] || []).map(() => false)
  }
  return selections
}

/**
 * Výběr pro import všech zbývajících položek.
 */
function buildAllRemainingSelection() {
  const p = plan.value
  if (!p) return null
  const selections = {
    project: !!(p.project && selectedTarget.value !== 'new'),
  }
  for (const k of ENTITY_KEYS) {
    selections[k] = (p[k] || []).map(() => true)
  }
  return selections
}

/**
 * Spustí import dle výběru a aktualizuje stav.
 * @param {object} selections
 * @returns {boolean}
 */
function runImport(selections) {
  if (!plan.value) return false
  importError.value = ''
  const createNew = selectedTarget.value === 'new'
  const targetId = createNew ? null : selectedTarget.value

  if (!createNew && targetId) {
    const projectExists = (store.state.projects || []).some((p) => p.id === targetId)
    if (!projectExists) {
      importError.value = t.import.targetNotFound
      return false
    }
  }

  try {
    const importData = buildImportData(plan.value, selections, targetId, store.state, createNew)
    store.importProjectData(importData)
    lastEffectiveProjectId.value = importData.effectiveProjectId
    didImport.value = true
    return true
  } catch (err) {
    importError.value = t.import.importError + (err?.message ? ` ${err.message}` : '')
    console.error('[Import] runImport error:', err)
    return false
  }
}

function importAllPending() {
  const selections = buildAllRemainingSelection()
  if (!selections) return
  if (!runImport(selections)) return
  clearAllPendingData()
}

function rejectAllPending() {
  emit('close')
}

function importProjectMetaOnly() {
  const selections = buildProjectOnlySelection()
  if (!selections || !runImport(selections)) return
  showToast(t.import.itemImported)
  if (pendingParsed.value?.project) {
    pendingParsed.value = { ...pendingParsed.value, project: null }
  }
}

function skipProjectMeta() {
  if (pendingParsed.value?.project) {
    pendingParsed.value = { ...pendingParsed.value, project: null }
  }
  showToast(t.import.itemSkipped)
}

function importOneEntity(sectionKey, index) {
  const selections = buildSingleEntitySelection(sectionKey, index, false)
  if (!selections || !runImport(selections)) return
  showToast(t.import.itemImported)
  removePendingEntityAt(sectionKey, index)
}

function skipOneEntity(sectionKey, index) {
  removePendingEntityAt(sectionKey, index)
  showToast(t.import.itemSkipped)
}

/**
 * Odebere entitu z rozpracovaných dat YAML podle indexu.
 * @param {string} sectionKey
 * @param {number} index
 */
function removePendingEntityAt(sectionKey, index) {
  const src = pendingParsed.value
  if (!src || !Array.isArray(src[sectionKey])) return
  const next = [...src[sectionKey]]
  next.splice(index, 1)
  pendingParsed.value = { ...src, [sectionKey]: next }
}

/**
 * Po hromadném importu vyprázdní lokální data (spustí prázdný plán → zavření).
 */
function clearAllPendingData() {
  const empty = { project: null }
  for (const k of ENTITY_KEYS) empty[k] = []
  pendingParsed.value = empty
}
</script>

<style scoped>
.import-file-step,
.import-preview-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.file-area {
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  text-align: center;
}

.file-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.file-label-text {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.or-separator {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.yaml-textarea {
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;
}

.import-error {
  color: var(--error);
  font-size: 0.9rem;
  margin: 0;
}

.im-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.im-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.im-section-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.im-muted {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

.im-diff {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-left: 2px solid var(--border);
  padding-left: var(--space-sm);
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-sm);
}
</style>
