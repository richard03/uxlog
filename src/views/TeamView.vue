<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.team }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.teamMember.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="m in items" :key="m.id" class="card card-clickable">
        <router-link :to="{ name: 'teamMemberDetail', params: { id: projectId, memberId: m.id } }" class="card-body">
          <h3 class="card-title">{{ m.name || t.teamMember.name }}</h3>
          <p v-if="m.role" class="card-role">{{ m.role }}</p>
          <div class="card-meta">
            <span v-if="m.email" class="badge">{{ m.email }}</span>
            <span v-if="m.phone" class="badge">{{ m.phone }}</span>
          </div>
        </router-link>
      </li>
    </ul>

    <Modal v-if="showForm" :title="t.teamMember.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="tm-name">{{ t.teamMember.name }}</label>
          <input id="tm-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="tm-role">{{ t.teamMember.role }}</label>
          <input id="tm-role" v-model="form.role" />
        </div>
        <div class="form-group">
          <label for="tm-email">{{ t.teamMember.email }}</label>
          <input id="tm-email" type="email" v-model="form.email" />
        </div>
        <div class="form-group">
          <label for="tm-phone">{{ t.teamMember.phone }}</label>
          <input id="tm-phone" type="tel" v-model="form.phone" />
        </div>
        <div class="form-group">
          <label for="tm-note">{{ t.teamMember.note }}</label>
          <textarea id="tm-note" v-model="form.note" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import Breadcrumb from '../components/Breadcrumb.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getTeamMembers(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.team },
])

const showForm = ref(false)
const form = ref({ name: '', role: '', email: '', phone: '', note: '' })

function openForm() {
  form.value = { name: '', role: '', email: '', phone: '', note: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addTeamMember(projectId.value, form.value)
  closeForm()
}
</script>

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card-body { flex: 1; text-decoration: none; color: inherit; display: block; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-role { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-meta { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); flex-wrap: wrap; }
.card-clickable:hover { border-color: var(--accent); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
