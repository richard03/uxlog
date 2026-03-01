<template>
  <div class="competition-list-root">
    <div class="list-header">
      <h3>Competition</h3>
      <button class="btn-add" @click="openAdd">+ Add competitor</button>
    </div>
    <ErrorBanner :message="error" @dismiss="error = null" />
    <div class="list">
      <CompetitionCard
        v-for="c in figma.competitions"
        :key="c.id"
        :competition="c"
        @edit="openEdit"
        @delete="handleDelete"
      />
      <EmptyState
        v-if="!figma.competitions.length"
        icon="🏆"
        title="No competitors yet"
        subtitle="Add your first competitor or competing product."
      />
    </div>
    <Modal :open="showForm" :title="editing ? 'Edit competitor' : 'Add competitor'" @close="closeForm">
      <CompetitionForm :competition="editing" @submit="handleSubmit" @cancel="closeForm" />
    </Modal>
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFigmaStore } from '@/stores/figma'
import { useConfirm } from '@/composables/useConfirm'
import { competitionsApi } from '@/api/competitions'
import CompetitionCard from './CompetitionCard.vue'
import CompetitionForm from './CompetitionForm.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Modal from '@/components/ui/Modal.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const props = defineProps({ projectId: { type: [Number, String], required: true } })
const figma = useFigmaStore()
const { confirm } = useConfirm()

const showForm = ref(false)
const editing = ref(null)
const error = ref(null)

function openAdd() {
  editing.value = null
  showForm.value = true
}
function openEdit(c) {
  editing.value = c
  showForm.value = true
}
function closeForm() {
  showForm.value = false
  editing.value = null
}

async function handleSubmit(data) {
  error.value = null
  try {
    if (editing.value) {
      await competitionsApi.update(props.projectId, editing.value.id, data)
    } else {
      await competitionsApi.create(props.projectId, data)
    }
    await figma.fetchAll(props.projectId)
    closeForm()
  } catch (e) {
    error.value = e.response?.data?.error || 'Operation failed'
  }
}

async function handleDelete(id) {
  const ok = await confirm('Delete this competitor?')
  if (!ok) return
  error.value = null
  try {
    await competitionsApi.delete(props.projectId, id)
    await figma.fetchAll(props.projectId)
  } catch (e) {
    error.value = e.response?.data?.error || 'Delete failed'
  }
}
</script>

<style scoped>
.competition-list-root { display: flex; flex-direction: column; gap: 1rem; }
.list-header { display: flex; align-items: center; justify-content: space-between; }
h3 { margin: 0; font-size: 1rem; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.btn-add {
  padding: 0.4rem 0.875rem;
  border: none;
  border-radius: 6px;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  font-size: 0.875rem;
}
</style>
