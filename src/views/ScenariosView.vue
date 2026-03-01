<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <h1>{{ t.sections.scenarios }}</h1>
      <button type="button" class="btn btn-primary" @click="openForm()">{{ t.scenario.add }}</button>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <button type="button" class="btn btn-primary" @click="openForm()">{{ t.scenario.add }}</button>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="s in items" :key="s.id" class="card">
        <div class="card-body">
          <span v-if="s.code" class="badge badge-accent">{{ s.code }}</span>
          <span class="badge">{{ tPath(`moscow.${s.moscowRating}`) }}</span>
          <h3 class="card-title">{{ s.name || t.scenario.name }}</h3>
          <p v-if="s.description" class="card-desc">{{ s.description }}</p>
          <p v-if="s.frequency"><strong>{{ t.scenario.frequency }}:</strong> {{ s.frequency }}</p>
          <p v-if="s.value"><strong>{{ t.scenario.value }}:</strong> {{ s.value }}</p>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost" @click="openForm(s)">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete(s)">{{ t.common.delete }}</button>
        </div>
      </li>
    </ul>

    <Modal v-if="showForm" :title="editing ? t.scenario.edit : t.scenario.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="s-code">{{ t.scenario.code }}</label>
          <input id="s-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="s-name">{{ t.scenario.name }}</label>
          <input id="s-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="s-desc">{{ t.scenario.description }}</label>
          <textarea id="s-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="s-frequency">{{ t.scenario.frequency }}</label>
          <input id="s-frequency" v-model="form.frequency" />
        </div>
        <div class="form-group">
          <label for="s-value">{{ t.scenario.value }}</label>
          <input id="s-value" v-model="form.value" />
        </div>
        <div class="form-group">
          <label for="s-moscow">{{ t.scenario.moscowRating }}</label>
          <select id="s-moscow" v-model="form.moscowRating">
            <option value="must">{{ t.moscow.must }}</option>
            <option value="should">{{ t.moscow.should }}</option>
            <option value="could">{{ t.moscow.could }}</option>
            <option value="wont">{{ t.moscow.wont }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.scenario.delete" :message="t.scenario.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getScenarios(projectId.value))

const showForm = ref(false)
const showConfirm = ref(false)
const editing = ref(null)
const deleteId = ref(null)
const form = ref({ code: '', name: '', description: '', frequency: '', value: '', moscowRating: 'could' })

function openForm(item = null) {
  editing.value = item
  form.value = item ? { ...item } : { code: '', name: '', description: '', frequency: '', value: '', moscowRating: 'could' }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function save() {
  if (editing.value) store.updateScenario(editing.value.id, form.value)
  else store.addScenario(projectId.value, form.value)
  closeForm()
}

function confirmDelete(item) {
  deleteId.value = item.id
  showConfirm.value = true
}

function doDelete() {
  if (deleteId.value) store.deleteScenario(deleteId.value)
  showConfirm.value = false
  deleteId.value = null
}
</script>

<style scoped>
.page-header { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg); }
.back-link { width: 100%; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
.card-body { flex: 1; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-actions { display: flex; gap: var(--space-xs); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
