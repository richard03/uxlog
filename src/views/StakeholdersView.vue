<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <div class="header-row">
        <h1>{{ t.sections.stakeholders }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.stakeholder.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="s in items" :key="s.id" class="card">
        <div class="card-body">
          <h3 class="card-title">{{ s.name || t.stakeholder.name }}</h3>
          <p v-if="s.description" class="card-desc">{{ s.description }}</p>
          <div class="card-meta">
            <span v-if="s.influenceLevel" class="badge">{{ t.stakeholder.influenceLevel }}: {{ s.influenceLevel }}</span>
            <span v-if="s.interestLevel" class="badge">{{ t.stakeholder.interestLevel }}: {{ s.interestLevel }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost" @click="openForm(s)">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete(s)">{{ t.common.delete }}</button>
        </div>
      </li>
    </ul>

    <Modal v-if="showForm" :title="editing ? t.stakeholder.edit : t.stakeholder.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="sh-name">{{ t.stakeholder.name }}</label>
          <input id="sh-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="sh-desc">{{ t.stakeholder.description }}</label>
          <textarea id="sh-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="sh-influence">{{ t.stakeholder.influenceLevel }}</label>
          <input id="sh-influence" v-model="form.influenceLevel" />
        </div>
        <div class="form-group">
          <label for="sh-interest">{{ t.stakeholder.interestLevel }}</label>
          <input id="sh-interest" v-model="form.interestLevel" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.stakeholder.delete" :message="t.stakeholder.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
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
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getStakeholders(projectId.value))

const showForm = ref(false)
const showConfirm = ref(false)
const editing = ref(null)
const deleteId = ref(null)
const form = ref({ name: '', description: '', influenceLevel: '', interestLevel: '' })

function openForm(item = null) {
  editing.value = item
  form.value = item ? { ...item } : { name: '', description: '', influenceLevel: '', interestLevel: '' }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function save() {
  if (editing.value) store.updateStakeholder(editing.value.id, form.value)
  else store.addStakeholder(projectId.value, form.value)
  closeForm()
}

function confirmDelete(item) {
  deleteId.value = item.id
  showConfirm.value = true
}

function doDelete() {
  if (deleteId.value) store.deleteStakeholder(deleteId.value)
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
.card-meta { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); }
.card-actions { display: flex; gap: var(--space-xs); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
