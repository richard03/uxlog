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
      <p class="import-error" role="alert">
        [Debug] step=preview ale plan je null. parsedData={{ !!parsedData }}, selectedTarget={{ selectedTarget }}
      </p>
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
      <section v-if="plan.project && selectedTarget !== 'new'" class="import-section">
        <div class="import-section-header">
          <span class="import-section-title">{{ t.import.projectMeta }}</span>
        </div>
        <div class="import-entity-item">
          <label class="import-checkbox-label">
            <input type="checkbox" v-model="selections.project" />
            <span class="import-entity-name">{{ plan.project.item.name }}</span>
            <span class="badge badge-overwrite">{{ t.import.badgeOverwrite }}</span>
          </label>
        </div>
      </section>

      <!-- Entity sekce -->
      <section
        v-for="section in visibleSections"
        :key="section.key"
        class="import-section"
      >
        <div class="import-section-header">
          <span class="import-section-title">{{ section.label }}</span>
          <span class="import-section-count">{{ plan[section.key].length }}</span>
          <div class="import-section-actions">
            <button type="button" class="btn-link" @click="selectAll(section.key, true)">
              {{ t.import.selectAll }}
            </button>
            <button type="button" class="btn-link" @click="selectAll(section.key, false)">
              {{ t.import.deselectAll }}
            </button>
          </div>
        </div>
        <ul class="import-entity-list" role="list">
          <li
            v-for="(entry, i) in plan[section.key]"
            :key="entry.item.id || i"
            class="import-entity-item"
          >
            <label class="import-checkbox-label">
              <input type="checkbox" v-model="selections[section.key][i]" />
              <span class="import-entity-name">{{ entityLabel(entry.item) }}</span>
              <span v-if="entry.action === 'create'" class="badge badge-new">
                {{ t.import.badgeNew }}
              </span>
              <span v-else class="badge badge-overwrite">
                {{ t.import.badgeOverwrite }}
                <span v-if="entry.matchReason !== 'id'" class="match-reason">
                  ({{ t.import.matchBy }} {{ matchReasonLabel(entry.matchReason) }})
                </span>:
                {{ entityLabel(entry.existing) }}
              </span>
            </label>
          </li>
        </ul>
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
    const result = analyzeImport(parsedData.value, store.state, effectiveId)
    console.log('[Import] plan computed, result:', result ? Object.keys(result) : null)
    console.log('[Import] plan.personas:', result?.personas?.length, 'items')
    return result
  } catch (err) {
    console.error('[Import] analyzeImport threw:', err)
    return null
  }
})

const visibleSections = computed(() =>
  sectionDefs.value.filter((s) => plan.value?.[s.key]?.length > 0)
)

// Selections – reaktivní objekt s arrays pro každý typ entity
const selections = reactive({ project: true })
for (const key of ENTITY_KEYS) selections[key] = []

function initSelections(importPlan) {
  selections.project = !!importPlan.project
  for (const key of ENTITY_KEYS) {
    selections[key] = (importPlan[key] || []).map(() => true)
  }
}

// Při změně plánu (= změně targetProject) resetovat selections
watch(plan, (newPlan) => {
  if (newPlan) initSelections(newPlan)
})

const selectedCount = computed(() => {
  if (!plan.value) return 0
  let count = 0
  if (selections.project && plan.value.project && selectedTarget.value !== 'new') count++
  for (const key of ENTITY_KEYS) {
    count += (selections[key] || []).filter(Boolean).length
  }
  return count
})

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

function selectAll(key, value) {
  if (Array.isArray(selections[key])) {
    selections[key] = selections[key].map(() => value)
  }
}

/**
 * Určí výchozí target po parsování YAML:
 * - Pokud YAML má project.id který existuje v state → importovat do toho projektu
 * - Pokud YAML má project.id ale ten neexistuje → vytvořit nový
 * - Pokud entity v YAML mají projectId existujícího projektu → importovat do něj
 * - Jinak → použít props.projectId, nebo první existující projekt, nebo 'new'
 */
function detectDefaultTarget(parsed) {
  const yamlProjectId = parsed?.project?.id
  if (yamlProjectId) {
    const found = (store.state.projects || []).find((p) => p.id === yamlProjectId)
    return found ? found.id : 'new'
  }
  // Zkusit zjistit projekt z projectId entit (např. při importu z plného exportu)
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
  console.log('[Import] processYaml called, text length:', text.length)
  let parsed
  try {
    parsed = parseYaml(text)
  } catch (err) {
    console.error('[Import] parseYaml threw:', err)
    parseError.value = t.import.parseError
    return
  }

  console.log('[Import] parsed result:', JSON.stringify(parsed, null, 2))
  console.log('[Import] parsed keys:', parsed ? Object.keys(parsed) : 'null')

  if (!parsed || typeof parsed !== 'object') {
    console.warn('[Import] parsed is falsy or not object')
    parseError.value = t.import.parseError
    return
  }

  const hasData =
    parsed.project ||
    ENTITY_KEYS.some((k) => Array.isArray(parsed[k]) && parsed[k].length > 0)

  console.log('[Import] hasData:', hasData)
  ENTITY_KEYS.forEach((k) => {
    if (Array.isArray(parsed[k])) console.log(`[Import]   ${k}: ${parsed[k].length} items`)
  })

  if (!hasData) {
    console.warn('[Import] no importable data found')
    parseError.value = t.import.emptyError
    return
  }

  parsedData.value = parsed
  selectedTarget.value = detectDefaultTarget(parsed)
  console.log('[Import] selectedTarget:', selectedTarget.value)
  console.log('[Import] setting step to preview')
  step.value = 'preview'
}

function processPasted() {
  console.log('[Import] processPasted called, pastedYaml length:', pastedYaml.value.length)
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
  console.log('[Import] doImport called, selectedCount:', selectedCount.value, 'plan:', !!plan.value)
  if (selectedCount.value === 0 || !plan.value) return
  importError.value = ''
  const createNew = selectedTarget.value === 'new'
  const targetId = createNew ? null : selectedTarget.value
  console.log('[Import] createNew:', createNew, 'targetId:', targetId)

  if (!createNew && targetId) {
    const projectExists = (store.state.projects || []).some((p) => p.id === targetId)
    if (!projectExists) {
      console.warn('[Import] target project not found:', targetId)
      importError.value = t.import.targetNotFound
      return
    }
  }

  try {
    const importData = buildImportData(plan.value, selections, targetId, store.state, createNew)
    console.log('[Import] importData built, effectiveProjectId:', importData.effectiveProjectId)
    for (const key of Object.keys(importData.upserts || {})) {
      if (importData.upserts[key].length > 0) {
        console.log(`[Import]   upserts.${key}:`, importData.upserts[key].length, 'items')
        importData.upserts[key].forEach((u) => console.log(`[Import]     - ${u.prepared.code || u.prepared.name || u.finalId}`))
      }
    }
    store.importProjectData(importData)
    console.log('[Import] importProjectData done, emitting imported event')
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
  color: var(--color-error, #ef4444);
  font-size: 0.9rem;
  margin: 0;
}

.import-section {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.import-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.import-section-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.import-section-count {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.import-section-actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-sm);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  text-decoration: underline;
}

.import-entity-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.import-entity-item {
  padding: var(--space-xs) var(--space-md);
  border-bottom: 1px solid var(--border);
}

.import-entity-item:last-child {
  border-bottom: none;
}

.import-checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  flex-wrap: wrap;
}

.import-entity-name {
  font-size: 0.9rem;
}

.badge-new {
  background: #dcfce7;
  color: #166534;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

:root.dark .badge-new {
  background: #14532d;
  color: #86efac;
}

.badge-overwrite {
  background: #fef3c7;
  color: #92400e;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.75rem;
  font-weight: 500;
}

:root.dark .badge-overwrite {
  background: #451a03;
  color: #fcd34d;
}

.match-reason {
  font-weight: normal;
  opacity: 0.8;
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
