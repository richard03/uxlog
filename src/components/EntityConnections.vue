<template>
  <section class="entity-connections" aria-labelledby="connections-heading">
    <div class="connections-header">
      <h2 id="connections-heading" class="connections-title">{{ t.connection.title }}</h2>
      <AppButton variant="secondary" size="sm" @click="openAdd">{{ t.connection.add }}</AppButton>
    </div>

    <ul v-if="connections.length > 0" class="connections-list" role="list">
      <li
        v-for="conn in connections"
        :key="conn.id"
        class="entity-card connection-card"
      >
        <!-- Levá polovina: odkaz na entitu -->
        <router-link
          v-if="otherRoute(conn)"
          :to="otherRoute(conn)"
          class="connection-entity-link"
          :aria-label="entityAriaLabel(conn)"
        >
          <span class="conn-type-badge">{{ entityTypeLabel(otherType(conn)) }}</span>
          <span v-if="otherCode(conn)" class="conn-code">{{ otherCode(conn) }}</span>
          <span class="conn-name">{{ otherName(conn) }}</span>
        </router-link>
        <span v-else class="connection-entity-link connection-entity-deleted" aria-label="Smazaná entita">
          <span class="conn-type-badge">{{ entityTypeLabel(otherType(conn)) }}</span>
          <span class="conn-name conn-name--deleted">{{ t.common.deleted }}</span>
        </span>

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
    <p v-else class="connections-empty">{{ t.connection.noConnections }}</p>

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
  'personas', 'scenarios', 'requirements', 'tasks', 'bugs',
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

.connection-entity-deleted {
  opacity: 0.55;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.conn-name--deleted {
  font-style: italic;
  color: var(--text-muted);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.form-error {
  color: var(--error);
  font-size: 0.875rem;
  margin: 0.25rem 0;
}
</style>
