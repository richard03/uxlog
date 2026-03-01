<template>
  <div class="task-list-wrap">
    <LoadingSpinner v-if="tasks.loading" />
    <ErrorBanner :message="tasks.error" @dismiss="tasks.error = null" />

    <ul v-if="tasks.items.length" class="task-list">
      <TaskItem
        v-for="task in tasks.items"
        :key="task.id"
        :task="task"
        @update="handleUpdate"
        @delete="handleDelete"
      />
    </ul>
    <EmptyState v-else-if="!tasks.loading" icon="✅" title="No tasks yet" subtitle="Add your first task below." />

    <TaskAddBar @add="handleAdd" />
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTasksStore }  from '@/stores/tasks'
import { useConfirm }     from '@/composables/useConfirm'
import TaskItem           from './TaskItem.vue'
import TaskAddBar         from './TaskAddBar.vue'
import LoadingSpinner     from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner        from '@/components/ui/ErrorBanner.vue'
import EmptyState         from '@/components/ui/EmptyState.vue'
import ConfirmDialog      from '@/components/ui/ConfirmDialog.vue'

const props   = defineProps({ projectId: { type: [Number, String], required: true } })
const tasks   = useTasksStore()
const { confirm } = useConfirm()

onMounted(() => tasks.fetchAll(props.projectId))

async function handleAdd(title) {
  await tasks.create(props.projectId, { title })
}

async function handleUpdate(taskId, data) {
  await tasks.update(props.projectId, taskId, data)
}

async function handleDelete(taskId) {
  const ok = await confirm('Delete this task?')
  if (ok) await tasks.remove(props.projectId, taskId)
}
</script>

<style scoped>
.task-list-wrap { padding: 0; }
.task-list { margin: 0; padding: 0; }
</style>
