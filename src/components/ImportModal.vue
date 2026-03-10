<template>
  <Modal
    :title="step === 'file' ? t.import.title : t.import.previewTitle"
    @close="$emit('close')"
  >
    <!-- Step 1: výběr souboru nebo vložení textu -->
    <div v-if="step === 'file'" class="import-file-step">
      <div class="file-area">
        <label class="file-label" :for="fileInputId">
          <span class="file-label-text">{{ t.import.fileHint }}</span>
          <span class="btn btn-secondary btn-sm">{{ t.import.fileLabel }}</span>
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

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          {{ t.common.cancel }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!pastedYaml.trim()"
          @click="processPasted"
        >
          {{ t.common.next }}
        </button>
      </div>
    </div>

    <!-- Step 2: přehled importu -->
    <div v-else-if="step === 'preview' && !plan" class="import-preview-step">
      <p class="import-error" role="alert">{{ t.import.previewError }}</p>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="goBack">{{ t.import.back }}</button>
      </div>
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

      <!-- Metadata projektu (jen pro import do existujícího) -->
      <section v-if="plan.project && selectedTarget !== 'new'" class="im-section">
        <div class="im-section-header">
          <span class="im-section-title">{{ t.import.projectMeta }}</span>
        </div>
        <div class="im-card" :class="{ 'im-card-skipped': projectStatus === 'skipped' }">
          <div class="im-card-meta">
            <span class="im-action-badge im-action-update">{{ t.import.badgeOverwrite }}</span>
            <strong class="im-card-name">{{ plan.project.item.name }}</strong>
          </div>
          <div class="im-card-btns">
            <button v-if="projectStatus !== 'skipped'" type="button" class="btn btn-ghost btn-sm"
              @click="projectStatus = 'skipped'">{{ t.import.skip }}</button>
            <button v-else type="button" class="btn btn-ghost btn-sm"
              @click="projectStatus = 'included'">{{ t.import.include }}</button>
          </div>
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
          <div class="im-section-actions">
            <button type="button" class="btn btn-ghost btn-sm"
              @click="setAllInSection(section.key, 'included')">{{ t.import.includeAll }}</button>
            <button type="button" class="btn btn-ghost btn-sm"
              @click="setAllInSection(section.key, 'skipped')">{{ t.import.skipAll }}</button>
          </div>
        </div>

        <div class="im-card-list">
          <div
            v-for="(entry, i) in plan[section.key]"
            :key="entry.item.id || i"
            class="im-card"
            :class="{ 'im-card-skipped': statuses[section.key]?.[i] === 'skipped' }"
            role="listitem"
          >
            <div class="im-card-meta">
              <span class="im-action-badge" :class="`im-action-${entry.action}`">
                {{ entry.action === 'create' ? t.import.badgeNew : t.import.badgeOverwrite }}
              </span>
              <strong class="im-card-name">{{ entityLabel(entry.item) }}</strong>
              <span v-if="entry.action === 'update' && entry.matchReason !== 'id'" class="im-match-reason">
                ({{ t.import.matchBy }} {{ matchReasonLabel(entry.matchReason) }}: {{ entityLabel(entry.existing) }})
              </span>
            </div>

            <div v-if="getDiffFields(entry).length" class="im-diff">
              <div v-for="f in getDiffFields(entry)" :key="f.key" class="im-diff-row">
                <span class="im-diff-key">{{ f.key }}</span>
                <span v-if="f.oldVal !== undefined" class="im-diff-old">{{ truncate(f.oldVal) }}</span>
                <span v-if="f.oldVal !== undefined" class="im-diff-arrow">→</span>
                <span class="im-diff-new">{{ truncate(f.newVal) }}</span>
              </div>
            </div>

            <div class="im-card-btns">
              <button
                v-if="statuses[section.key]?.[i] !== 'skipped'"
                type="button"
                class="btn btn-ghost btn-sm"
                @click="statuses[section.key][i] = 'skipped'"
              >{{ t.import.skip }}</button>
              <button
                v-else
                type="button"
                class="btn btn-ghost btn-sm"
                @click="statuses[section.key][i] = 'included'"
              >{{ t.import.include }}</button>
            </div>
          </div>
        </div>
      </section>

      <p v-if="importError" class="import-error" role="alert">{{ importError }}</p>
      <p v-if="selectedCount === 0 && !importError" class="import-error" role="alert">
        {{ t.import.nothingSelected }}
      </p>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="goBack">
          {{ t.import.back }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="selectedCount === 0"
          @click="doImport"
        >
          {{ t.import.doImport }} ({{ selectedCount }})
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from './Modal.vue'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
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
const parsedData = ref(null)
const selectedTarget = ref(props.projectId || 'new')

const ENTITY_KEYS = [
  'goals', 'stakeholders', 'competitions', 'hypotheses',
  'personas', 'scenarios', 'requirements', 'activities', 'teamMembers',
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
])

// Plan se přepočítá při každé změně selectedTarget
const plan = computed(() => {
  if (!parsedData.value) return null
  const effectiveId = selectedTarget.value === 'new' ? '__new__' : selectedTarget.value
  if (!effectiveId) return null
  try {
    return analyzeImport(parsedData.value, store.state, effectiveId)
  } catch (err) {
    console.error('[Import] analyzeImport threw:', err)
    return null
  }
})

const visibleSections = computed(() =>
  sectionDefs.value.filter((s) => plan.value?.[s.key]?.length > 0)
)

// Stav jednotlivých položek: 'included' | 'skipped'
const projectStatus = ref('included')
const statuses = reactive({})
for (const key of ENTITY_KEYS) statuses[key] = []

function initStatuses(importPlan) {
  projectStatus.value = 'included'
  for (const key of ENTITY_KEYS) {
    statuses[key] = (importPlan[key] || []).map(() => 'included')
  }
}

watch(plan, (newPlan) => {
  if (newPlan) initStatuses(newPlan)
})

function setAllInSection(key, status) {
  statuses[key] = statuses[key].map(() => status)
}

const selectedCount = computed(() => {
  if (!plan.value) return 0
  let count = 0
  if (projectStatus.value === 'included' && plan.value.project && selectedTarget.value !== 'new') count++
  for (const key of ENTITY_KEYS) {
    count += (statuses[key] || []).filter(s => s !== 'skipped').length
  }
  return count
})

// Pole atributů, která přeskakujeme v diffu
const SKIP_FIELDS = new Set(['id', 'projectId', 'sortOrder'])

/**
 * Vrátí seznam změněných / nových polí pro zobrazení diffu.
 * Pro 'create' vrátí všechna neprázdná viditelná pole.
 * Pro 'update' vrátí pouze pole, která se liší od existující entity.
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

function truncate(val, n = 90) {
  const s = String(val ?? '')
  return s.length > n ? s.slice(0, n) + '…' : s
}

function entityLabel(item) {
  if (!item) return ''
  const parts = []
  if (item.code) parts.push(`[${item.code}]`)
  if (item.name) parts.push(item.name)
  return parts.join(' ') || item.id || ''
}

function matchReasonLabel(reason) {
  if (reason === 'code') return t.import.matchCode
  if (reason === 'name') return t.import.matchName
  return reason
}

/**
 * Určí výchozí target po parsování YAML.
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

  parsedData.value = parsed
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
  parsedData.value = null
  parseError.value = ''
  importError.value = ''
}

function doImport() {
  if (selectedCount.value === 0 || !plan.value) return
  importError.value = ''
  const createNew = selectedTarget.value === 'new'
  const targetId = createNew ? null : selectedTarget.value

  if (!createNew && targetId) {
    const projectExists = (store.state.projects || []).some((p) => p.id === targetId)
    if (!projectExists) {
      importError.value = t.import.targetNotFound
      return
    }
  }

  // Převést statuses zpět na boolean selections pro buildImportData
  const selections = { project: projectStatus.value !== 'skipped' }
  for (const key of ENTITY_KEYS) {
    selections[key] = (statuses[key] || []).map(s => s !== 'skipped')
  }

  try {
    const importData = buildImportData(plan.value, selections, targetId, store.state, createNew)
    store.importProjectData(importData)
    emit('imported', { projectId: importData.effectiveProjectId })
  } catch (err) {
    importError.value = t.import.importError + (err?.message ? ` ${err.message}` : '')
    console.error('[Import] doImport error:', err)
  }
}
</script>

<style scoped>
:deep(.modal) {
  max-width: 680px;
  width: 100%;
}

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

/* Sekce */
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

.im-section-actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-xs);
}

/* Karta položky */
.im-card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.im-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: opacity var(--transition);
}

.im-card-skipped {
  opacity: 0.35;
}

/* Meta řádek */
.im-card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.im-action-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.im-action-create {
  background: var(--accent-muted);
  color: var(--accent);
}

.im-action-update {
  background: var(--bg-muted);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.im-card-name {
  font-size: 0.95rem;
}

.im-match-reason {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* Diff */
.im-diff {
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-left: 2px solid var(--border);
  padding-left: var(--space-sm);
}

.im-diff-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.im-diff-key {
  color: var(--text-muted);
  min-width: 9rem;
  flex-shrink: 0;
  font-size: 0.78rem;
}

.im-diff-old {
  color: var(--text-muted);
  text-decoration: line-through;
}

.im-diff-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

.im-diff-new {
  color: var(--text);
}

/* Tlačítka */
.im-card-btns {
  display: flex;
  gap: var(--space-xs);
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-sm);
}

.btn-sm {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}
</style>
