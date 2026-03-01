<template>
  <div class="member-list-wrap">
    <div class="list-header">
      <h3>Team Members</h3>
      <button class="btn-add" @click="openAdd">+ Add member</button>
    </div>

    <LoadingSpinner v-if="members.loading" />
    <ErrorBanner :message="members.error" @dismiss="members.error = null" />

    <div v-if="members.items.length" class="list">
      <MemberCard
        v-for="m in members.items"
        :key="m.id"
        :member="m"
        @edit="openEdit"
        @delete="handleDelete"
      />
    </div>
    <EmptyState v-else-if="!members.loading" icon="👥" title="No team members" subtitle="Add your first team member." />

    <Modal :open="showForm" :title="editing ? 'Edit Member' : 'Add Member'" @close="closeForm">
      <MemberForm :member="editing" @submit="handleSubmit" @cancel="closeForm" />
    </Modal>
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMembersStore } from '@/stores/members'
import { useConfirm }      from '@/composables/useConfirm'
import MemberCard          from './MemberCard.vue'
import MemberForm          from './MemberForm.vue'
import Modal               from '@/components/ui/Modal.vue'
import LoadingSpinner      from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner         from '@/components/ui/ErrorBanner.vue'
import EmptyState          from '@/components/ui/EmptyState.vue'
import ConfirmDialog       from '@/components/ui/ConfirmDialog.vue'

const props   = defineProps({ projectId: { type: [Number, String], required: true } })
const members = useMembersStore()
const { confirm } = useConfirm()

const showForm = ref(false)
const editing  = ref(null)

onMounted(() => members.fetchAll(props.projectId))

function openAdd()  { editing.value = null; showForm.value = true }
function openEdit(m){ editing.value = m;    showForm.value = true }
function closeForm() { showForm.value = false; editing.value = null }

async function handleSubmit(data) {
  if (editing.value) {
    await members.update(props.projectId, editing.value.id, data)
  } else {
    await members.create(props.projectId, data)
  }
  closeForm()
}

async function handleDelete(id) {
  const ok = await confirm('Remove this team member?')
  if (ok) await members.remove(props.projectId, id)
}
</script>

<style scoped>
.member-list-wrap { display: flex; flex-direction: column; gap: 1rem; }
.list-header { display: flex; align-items: center; justify-content: space-between; }
h3 { margin: 0; font-size: 1rem; }
.list { display: flex; flex-direction: column; gap: 0.5rem; }
.btn-add {
  padding: 0.4rem 0.875rem; border: none; border-radius: 6px;
  background: #4f46e5; color: #fff; cursor: pointer; font-size: 0.875rem;
}
</style>
