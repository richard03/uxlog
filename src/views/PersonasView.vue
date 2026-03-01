<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <div class="header-row">
        <h1>{{ t.sections.personas }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.persona.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="p in items" :key="p.id" class="card">
        <div class="card-body">
          <span v-if="p.code" class="badge badge-accent">{{ p.code }}</span>
          <span class="badge">{{ tPath(`personaStatus.${p.status}`) }}</span>
          <h3 class="card-title">{{ p.name || t.persona.name }}</h3>
          <p v-if="p.description" class="card-desc">{{ p.description }}</p>
          <p v-if="p.motivation"><strong>{{ t.persona.motivation }}:</strong> {{ p.motivation }}</p>
          <p v-if="p.needs"><strong>{{ t.persona.needs }}:</strong> {{ p.needs }}</p>
          <p v-if="p.problems"><strong>{{ t.persona.problems }}:</strong> {{ p.problems }}</p>
          <p v-if="p.targetGroupSize"><strong>{{ t.persona.targetGroupSize }}:</strong> {{ p.targetGroupSize }}</p>
          <p v-if="p.targetGroupValue"><strong>{{ t.persona.targetGroupValue }}:</strong> {{ p.targetGroupValue }}</p>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost" @click="openForm(p)">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete(p)">{{ t.common.delete }}</button>
        </div>
      </li>
    </ul>

    <Modal v-if="showForm" :title="editing ? t.persona.edit : t.persona.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="p-code">{{ t.persona.code }}</label>
          <input id="p-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="p-name">{{ t.persona.name }}</label>
          <input id="p-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="p-status">{{ t.persona.status }}</label>
          <select id="p-status" v-model="form.status">
            <option value="protopersona">{{ t.personaStatus.protopersona }}</option>
            <option value="persona">{{ t.personaStatus.persona }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="p-desc">{{ t.persona.description }}</label>
          <textarea id="p-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="p-motivation">{{ t.persona.motivation }}</label>
          <textarea id="p-motivation" v-model="form.motivation" />
        </div>
        <div class="form-group">
          <label for="p-needs">{{ t.persona.needs }}</label>
          <textarea id="p-needs" v-model="form.needs" />
        </div>
        <div class="form-group">
          <label for="p-problems">{{ t.persona.problems }}</label>
          <textarea id="p-problems" v-model="form.problems" />
        </div>
        <div class="form-group">
          <label for="p-size">{{ t.persona.targetGroupSize }}</label>
          <input id="p-size" v-model="form.targetGroupSize" />
        </div>
        <div class="form-group">
          <label for="p-value">{{ t.persona.targetGroupValue }}</label>
          <input id="p-value" v-model="form.targetGroupValue" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.persona.delete" :message="t.persona.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { generateNextCode } from '../lib/code.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getPersonas(projectId.value))

const showForm = ref(false)
const showConfirm = ref(false)
const editing = ref(null)
const deleteId = ref(null)
const form = ref({
  code: '', name: '', status: 'protopersona', description: '', motivation: '', needs: '', problems: '',
  targetGroupSize: '', targetGroupValue: '',
})

function openForm(item = null) {
  editing.value = item
  form.value = item ? { ...item } : { code: generateNextCode('PER', items.value), name: '', status: 'protopersona', description: '', motivation: '', needs: '', problems: '', targetGroupSize: '', targetGroupValue: '' }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function save() {
  if (editing.value) store.updatePersona(editing.value.id, form.value)
  else store.addPersona(projectId.value, form.value)
  closeForm()
}

function confirmDelete(item) {
  deleteId.value = item.id
  showConfirm.value = true
}

function doDelete() {
  if (deleteId.value) store.deletePersona(deleteId.value)
  showConfirm.value = false
  deleteId.value = null
}
</script>

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.back-link { width: fit-content; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
.card-body { flex: 1; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-actions { display: flex; gap: var(--space-xs); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
