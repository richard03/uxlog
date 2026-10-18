<template>
  <section class="entity-connections" aria-labelledby="connections-heading">
    <div class="connections-header">
      <h2 id="connections-heading" class="connections-title">{{ t.connection.title }}</h2>
      <div class="connections-header-actions">
        <AppButton v-if="aiAvailable" variant="secondary" size="sm" @click="openAiSuggest">{{ t.connection.findWithAi }}</AppButton>
        <AppButton variant="secondary" size="sm" @click="openAdd">{{ t.connection.add }}</AppButton>
      </div>
    </div>

    <div v-if="presentTypes.length >= 2" class="conn-filter-bar" role="group" :aria-label="t.filter.status">
      <button
        v-for="type in presentTypes"
        :key="type"
        class="conn-filter-badge"
        :class="{ 'conn-filter-badge--active': activeTypes.includes(type) }"
        type="button"
        @click="toggleType(type)"
      >{{ entityTypeLabel(type) }} ({{ countByType(type) }})</button>
    </div>

    <ul v-if="visibleConnections.length > 0" class="connections-list" role="list">
      <li
        v-for="conn in visibleConnections"
        :key="conn.id"
        class="entity-card connection-card"
      >
        <!-- Levá polovina: odkaz na entitu (řádky s neexistující entitou se vůbec nezobrazují) -->
        <router-link
          :to="otherRoute(conn)"
          class="connection-entity-link"
          :aria-label="entityAriaLabel(conn)"
        >
          <span class="conn-type-badge">{{ entityTypeLabel(otherType(conn)) }}</span>
          <span v-if="otherCode(conn)" class="conn-code">{{ otherCode(conn) }}</span>
          <span class="conn-name">{{ otherName(conn) }}</span>
        </router-link>

        <!-- Pravá polovina: poznámka – zobrazení nebo inline editor -->
        <div
          v-if="editingConnId !== conn.id"
          class="connection-note-btn"
          :class="{ 'connection-note-btn--empty': !conn.note }"
          role="button"
          tabindex="0"
          :aria-label="conn.note ? `${t.connection.edit}: ${conn.note}` : t.connection.edit"
          @click="openEdit(conn)"
          @keydown.enter.space.prevent="openEdit(conn)"
        >
          <span v-if="conn.note" class="conn-note-text">{{ conn.note }}</span>
          <span v-else class="conn-note-empty">{{ t.connection.addNote }}</span>
          <svg class="conn-note-pencil" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <div v-else class="connection-note-edit" @click.stop>
          <textarea
            ref="noteTextareaRef"
            v-model="editNote"
            class="form-control conn-note-textarea"
            rows="2"
            :placeholder="t.connection.notePlaceholder"
            @keydown.escape="cancelEdit"
          />
          <div class="conn-note-edit-actions">
            <AppButton variant="secondary" size="sm" @click="cancelEdit">{{ t.common.cancel }}</AppButton>
            <AppButton variant="primary" size="sm" @click="submitEdit">{{ t.common.save }}</AppButton>
          </div>
        </div>

        <!-- Kebab menu -->
        <KebabMenu
          :items="[
            { label: t.connection.edit, action: 'edit' },
            { label: t.connection.delete, action: 'delete', variant: 'danger' },
          ]"
          @action="(a) => handleAction(a, conn)"
        />
      </li>
    </ul>
    <p v-else-if="resolvedConnections.length === 0" class="connections-empty">{{ t.connection.noConnections }}</p>
    <p v-else class="connections-empty">{{ t.filter.emptyFiltered }}</p>

    <!-- Modal: přidat souvislost -->
    <Modal v-if="showAdd" :title="t.connection.add" @close="closeAdd">
      <form @submit.prevent="submitAdd">
        <div class="form-group">
          <label for="conn-entity-type">{{ t.connection.entityType }}</label>
          <select id="conn-entity-type" v-model="newType" class="form-control" required @change="newEntityId = ''">
            <option value="">{{ t.connection.selectEntityType }}</option>
            <option v-for="opt in entityTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-group" v-if="newType">
          <label for="conn-entity">{{ t.connection.entity }}</label>
          <select id="conn-entity" v-model="newEntityId" class="form-control" required>
            <option value="">{{ t.connection.selectEntity }}</option>
            <option
              v-for="ent in entitiesOfType(newType)"
              :key="ent.id"
              :value="ent.id"
            >{{ entityOptionLabel(ent) }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="conn-note">{{ t.connection.note }}</label>
          <textarea id="conn-note" v-model="newNote" class="form-control" rows="3" :placeholder="t.connection.notePlaceholder" />
        </div>
        <p v-if="addError" class="form-error" role="alert">{{ addError }}</p>
        <div class="form-actions">
          <AppButton variant="secondary" @click="closeAdd">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </div>
      </form>
    </Modal>

    <!-- Modal: AI – najít souvislost -->
    <Modal v-if="showAiSuggest" :title="aiSuggestTitle" size="large" @close="closeAiSuggest">
      <div v-if="aiLoading" class="ai-loading" role="status">
        <span class="ai-spinner" aria-hidden="true"></span>
        <span>{{ t.connection.aiLoading }}</span>
      </div>
      <div v-else-if="aiError" class="ai-error" role="alert">
        <p class="ai-error-msg">{{ aiError }}</p>
        <AppButton variant="secondary" size="sm" @click="runAiSuggest">{{ t.connection.aiRetry }}</AppButton>
      </div>
      <p v-else-if="aiSuggestions.length === 0" class="connections-empty">{{ t.connection.aiNoSuggestions }}</p>
      <ul v-else class="ai-suggestions-list" role="list">
        <li
          v-for="sugg in aiSuggestions"
          :key="sugg.entityId"
          class="ai-suggestion-card"
          :class="{
            'ai-suggestion-card--exists': sugg.alreadyExists,
            'ai-suggestion-card--confirmed': sugg._status === 'confirmed',
            'ai-suggestion-card--rejected': sugg._status === 'rejected',
          }"
          role="listitem"
        >
          <div class="ai-suggestion-body">
            <div class="ai-suggestion-entity">
              <span class="conn-type-badge">{{ entityTypeLabel(sugg.entityType) }}</span>
              <span v-if="sugg.entityCode" class="conn-code">{{ sugg.entityCode }}</span>
              <span class="conn-name">{{ sugg.entityName }}</span>
              <span v-if="sugg.alreadyExists" class="ai-already-badge">{{ t.connection.aiAlreadyExists }}</span>
            </div>
            <textarea
              v-if="!sugg.alreadyExists && sugg._status === 'pending'"
              v-model="sugg.note"
              class="form-control ai-suggestion-note"
              rows="2"
              :placeholder="t.connection.notePlaceholder"
            />
            <p v-else-if="sugg.note" class="ai-suggestion-note-existing">{{ sugg.note }}</p>
          </div>
          <div v-if="sugg.alreadyExists || sugg._status !== 'pending'" class="ai-action-status">
            {{ sugg.alreadyExists ? t.connection.aiAlreadyExists : sugg._status === 'confirmed' ? t.connection.aiConfirmed : t.connection.aiRejected }}
          </div>
          <div v-else class="ai-action-btns">
            <AppButton variant="primary" size="sm" @click="confirmSuggestion(sugg)">{{ t.connection.aiConfirm }}</AppButton>
            <AppButton variant="tertiary" size="sm" @click="sugg._status = 'rejected'">{{ t.connection.aiReject }}</AppButton>
          </div>
        </li>
      </ul>
    </Modal>

    <!-- Confirm smazání -->
    <ConfirmDialog
      v-if="removingConn"
      :title="t.connection.delete"
      :message="t.connection.deleteConfirm"
      @confirm="doRemove"
      @cancel="removingConn = null"
    />
  </section>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { hasCapability, callCapability } from '../lib/plugins/registry.js'
import AppButton from './AppButton.vue'
import Modal from './Modal.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import KebabMenu from './KebabMenu.vue'

const props = defineProps({
  projectId: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
})

const store = useStore()
const { t } = useI18n()

// Klíče store entit, které se mohou propojovat
const ALL_ENTITY_TYPES = [
  'goals', 'stakeholders', 'competitions', 'hypotheses',
  'personas', 'scenarios', 'requirements', 'tasks', 'bugs', 'risks',
  'teamMembers', 'activities',
]

const entityTypeOptions = computed(() =>
  ALL_ENTITY_TYPES
    .filter((et) => et !== props.entityType)
    .map((et) => ({ value: et, label: t.connection.entityTypes[et] ?? et }))
)

function entityTypeLabel(et) {
  return t.connection.entityTypes[et] ?? et
}

function entitiesOfType(et) {
  const data = store.getData()
  return (data[et] ?? []).filter((e) => e.projectId === props.projectId)
}

function resolveEntity(et, eid) {
  const data = store.getData()
  return (data[et] ?? []).find((e) => e.id === eid) ?? null
}

function entityOptionLabel(ent) {
  const parts = []
  if (ent.code) parts.push(ent.code)
  if (ent.name) parts.push(ent.name)
  return parts.join(' ') || ent.id
}

// Obousměrnost: vrátí "druhou" stranu
function otherType(conn) {
  return conn.entityType1 === props.entityType && conn.entityId1 === props.entityId
    ? conn.entityType2
    : conn.entityType1
}

function otherId(conn) {
  return conn.entityType1 === props.entityType && conn.entityId1 === props.entityId
    ? conn.entityId2
    : conn.entityId1
}

/**
 * Druhá strana souvislosti (entita v projektu), nebo null po smazání.
 * @param {Object} conn
 * @returns {Object|null}
 */
function otherEntity(conn) {
  return resolveEntity(otherType(conn), otherId(conn))
}

function otherName(conn) {
  return otherEntity(conn)?.name || '?'
}

function otherCode(conn) {
  return otherEntity(conn)?.code || ''
}

function entityAriaLabel(conn) {
  const ent = otherEntity(conn)
  const parts = [entityTypeLabel(otherType(conn))]
  if (ent?.code) parts.push(ent.code)
  if (ent?.name) parts.push(ent.name)
  return parts.join(' ')
}

// Routy pro detail entity
const ROUTE_MAP = {
  goals: 'goalDetail',
  stakeholders: 'stakeholderDetail',
  competitions: 'competitionDetail',
  hypotheses: 'hypothesisDetail',
  personas: 'personaDetail',
  scenarios: 'scenarioDetail',
  requirements: 'requirementDetail',
  tasks: 'taskDetail',
  bugs: 'bugDetail',
  risks: 'riskDetail',
  teamMembers: 'teamMemberDetail',
  activities: 'activityDetail',
}

const PARAM_MAP = {
  goals: 'goalId',
  stakeholders: 'stakeholderId',
  competitions: 'competitionId',
  hypotheses: 'hypothesisId',
  personas: 'personaId',
  scenarios: 'scenarioId',
  requirements: 'requirementId',
  tasks: 'taskId',
  bugs: 'bugId',
  risks: 'riskId',
  teamMembers: 'memberId',
  activities: 'activityId',
}

function otherRoute(conn) {
  const et = otherType(conn)
  const eid = otherId(conn)
  const ent = resolveEntity(et, eid)
  if (!ent) return null
  const routeName = ROUTE_MAP[et]
  const paramName = PARAM_MAP[et]
  if (!routeName || !paramName) return null
  return { name: routeName, params: { id: props.projectId, [paramName]: eid } }
}

const connections = computed(() => store.getConnectionsFor(props.entityType, props.entityId))

/**
 * Pouze souvislosti, u kterých druhá entita stále existuje (žádné „Smazáno“ v seznamu).
 */
const resolvedConnections = computed(() =>
  connections.value.filter((c) => otherEntity(c) != null)
)

// --- Filtr podle typu entity ---
const presentTypes = computed(() => {
  const seen = new Set()
  for (const c of resolvedConnections.value) seen.add(otherType(c))
  return [...seen]
})

const activeTypes = ref([])

function toggleType(type) {
  if (activeTypes.value.includes(type)) {
    activeTypes.value = activeTypes.value.filter(t => t !== type)
  } else {
    activeTypes.value = [...activeTypes.value, type]
  }
}

function countByType(type) {
  return resolvedConnections.value.filter((c) => otherType(c) === type).length
}

const visibleConnections = computed(() =>
  activeTypes.value.length === 0
    ? resolvedConnections.value
    : resolvedConnections.value.filter((c) => activeTypes.value.includes(otherType(c)))
)

const currentEntity = computed(() => resolveEntity(props.entityType, props.entityId))

const aiSuggestTitle = computed(() => {
  const ent = currentEntity.value
  const parts = [t.connection.findWithAi]
  if (ent?.code) parts.push(ent.code)
  if (ent?.name) parts.push(ent.name)
  return parts.join(' – ')
})

// --- AI: najít souvislost ---
const aiAvailable = computed(() => hasCapability('ai:available') && callCapability('ai:available'))
const showAiSuggest = ref(false)
const aiLoading = ref(false)
const aiError = ref('')
const aiSuggestions = ref([])


function openAiSuggest() {
  showAiSuggest.value = true
  runAiSuggest()
}

function closeAiSuggest() {
  showAiSuggest.value = false
  aiSuggestions.value = []
  aiError.value = ''
}

async function runAiSuggest() {
  aiLoading.value = true
  aiError.value = ''
  aiSuggestions.value = []

  try {
    const data = store.getData()
    const entity = (data[props.entityType] ?? []).find((e) => e.id === props.entityId)
    if (!entity) throw new Error('Entita nenalezena.')

    const projectData = {}
    for (const key of ALL_ENTITY_TYPES) {
      projectData[key] = (data[key] ?? []).filter((e) => e.projectId === props.projectId)
    }

    const raw = await callCapability('ai:suggestions', entity, props.entityType, projectData)

    aiSuggestions.value = raw
      .map((s) => {
        const ent = resolveEntity(s.entityType, s.entityId)
        if (!ent) return null
        const alreadyExists = connections.value.some(
          (c) =>
            (c.entityType1 === s.entityType && c.entityId1 === s.entityId) ||
            (c.entityType2 === s.entityType && c.entityId2 === s.entityId)
        )
        return {
          entityType: s.entityType,
          entityId: s.entityId,
          entityCode: ent.code || '',
          entityName: ent.name || s.entityId,
          note: s.note || '',
          _status: alreadyExists ? 'exists' : 'pending',
          alreadyExists,
        }
      })
      .filter(Boolean)
  } catch (err) {
    aiError.value = err.message || t.connection.aiError
  } finally {
    aiLoading.value = false
  }
}

function confirmSuggestion(sugg) {
  store.addConnection(
    props.projectId,
    props.entityType, props.entityId,
    sugg.entityType, sugg.entityId,
    sugg.note.trim()
  )
  sugg._status = 'confirmed'
}

// --- Kebab ---
function handleAction(action, conn) {
  if (action === 'edit') openEdit(conn)
  else if (action === 'delete') { cancelEdit(); confirmRemove(conn) }
}

// --- Přidat ---
const showAdd = ref(false)
const newType = ref('')
const newEntityId = ref('')
const newNote = ref('')
const addError = ref('')

function openAdd() {
  newType.value = ''
  newEntityId.value = ''
  newNote.value = ''
  addError.value = ''
  showAdd.value = true
}

function closeAdd() {
  showAdd.value = false
}

function submitAdd() {
  addError.value = ''
  if (!newType.value || !newEntityId.value) return
  const result = store.addConnection(
    props.projectId,
    props.entityType, props.entityId,
    newType.value, newEntityId.value,
    newNote.value.trim()
  )
  if (result === null) {
    addError.value = t.connection.alreadyExists
    return
  }
  closeAdd()
}

// --- Inline editace poznámky ---
const editingConnId = ref(null)
const editNote = ref('')
const noteTextareaRef = ref(null)

function openEdit(conn) {
  editingConnId.value = conn.id
  editNote.value = conn.note ?? ''
  nextTick(() => {
    const el = Array.isArray(noteTextareaRef.value) ? noteTextareaRef.value[0] : noteTextareaRef.value
    el?.focus()
  })
}

function cancelEdit() {
  editingConnId.value = null
  editNote.value = ''
}

function submitEdit() {
  if (!editingConnId.value) return
  store.updateConnection(editingConnId.value, editNote.value.trim())
  editingConnId.value = null
  editNote.value = ''
}

// --- Smazat ---
const removingConn = ref(null)

function confirmRemove(conn) {
  removingConn.value = conn
}

function doRemove() {
  if (!removingConn.value) return
  store.deleteConnection(removingConn.value.id)
  removingConn.value = null
}
</script>

<style scoped>
.entity-connections {
  margin-top: 2rem;
}

.connections-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.connections-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.connections-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* Karta – sdílí vizuál EntityCard */
.connection-card {
  display: flex;
  align-items: stretch;
  gap: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0;
  transition: border-color var(--transition);
  position: relative;
}

.connection-card:hover {
  border-color: var(--accent);
}

/* Levá polovina: odkaz na entitu */
.connection-entity-link {
  flex: 0 0 50%;
  max-width: 50%;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: var(--space-md);
  text-decoration: none;
  color: inherit;
  border-right: 1px solid var(--border);
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  transition: background var(--transition);
}

a.connection-entity-link:hover {
  background: var(--bg-muted);
}

.conn-type-badge {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  flex-shrink: 0;
}

.conn-code {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}

.conn-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  min-width: 0;
}

/* Pravá polovina: poznámka */
.connection-note-btn {
  flex: 0 0 calc(50% - 36px); /* odečteme kebab */
  max-width: calc(50% - 36px);
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: var(--space-md);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--text);
  transition: background var(--transition);
}

.connection-note-btn:hover {
  background: var(--bg-muted);
}

.connection-note-btn:hover .conn-note-pencil {
  opacity: 1;
}

.conn-note-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  flex: 1;
  min-width: 0;
}

.conn-note-pencil {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity var(--transition);
}

.connection-note-btn--empty .conn-note-empty {
  font-size: 0.8rem;
  color: var(--text-muted);
  opacity: 0.4;
  font-style: italic;
}

/* Inline editor poznámky */
.connection-note-edit {
  flex: 0 0 calc(50% - 36px);
  max-width: calc(50% - 36px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-left: 1px solid var(--border);
}

.conn-note-textarea {
  font-size: 0.85rem;
  resize: vertical;
  min-height: 3.5rem;
}

.conn-note-edit-actions {
  display: flex;
  gap: var(--space-xs);
  justify-content: flex-end;
}

.connections-empty {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}

/* Filtr podle typu entity */
.conn-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.conn-filter-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 500;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  font-family: inherit;
  user-select: none;
}

.conn-filter-badge:hover:not(.conn-filter-badge--active) {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-muted);
}

.conn-filter-badge--active {
  background: var(--accent-muted);
  color: var(--text);
  border-color: var(--text);
  font-weight: 600;
}

.conn-filter-badge--active:hover {
  background: color-mix(in srgb, var(--accent) 25%, var(--bg-elevated));
  border-color: var(--accent-hover);
  color: var(--accent-hover);
}

.form-error {
  color: var(--error);
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

/* Záhlaví s více tlačítky */
.connections-header-actions {
  display: flex;
  gap: var(--space-xs);
}

/* AI: načítání */
.ai-loading {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.ai-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* AI: chyba */
.ai-error {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
}

.ai-error-msg {
  color: var(--error);
  font-size: 0.875rem;
  margin: 0;
}

/* AI: seznam návrhů */
.ai-suggestions-list {
  list-style: none;
  margin: 0 0 var(--space-md);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ai-suggestion-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: opacity var(--transition);
}

.ai-suggestion-card--exists {
  opacity: 0.6;
}

.ai-suggestion-card--confirmed {
  opacity: 0.55;
  border-color: var(--accent);
}

.ai-suggestion-card--rejected {
  opacity: 0.35;
}

.ai-suggestion-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ai-suggestion-entity {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.ai-already-badge {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: var(--bg-muted);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.4rem;
}

.ai-suggestion-note {
  font-size: 0.85rem;
  resize: vertical;
  min-height: 3rem;
}

.ai-suggestion-note-existing {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
  font-style: italic;
}

.ai-action-btns {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.ai-action-status {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 500;
  flex-shrink: 0;
  align-self: center;
}
</style>
