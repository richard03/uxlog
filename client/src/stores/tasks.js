import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tasksApi } from '@/api/tasks'

export const useTasksStore = defineStore('tasks', () => {
  const items   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  async function fetchAll(projectId) {
    loading.value = true
    error.value   = null
    try {
      const res  = await tasksApi.list(projectId)
      items.value = res.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to load tasks'
    } finally {
      loading.value = false
    }
  }

  async function create(projectId, data) {
    const res  = await tasksApi.create(projectId, data)
    items.value.push(res.data)
    return res.data
  }

  async function update(projectId, taskId, data) {
    const res     = await tasksApi.update(projectId, taskId, data)
    const updated = res.data
    const idx     = items.value.findIndex(t => t.id === taskId)
    if (idx !== -1) items.value[idx] = updated
    return updated
  }

  async function remove(projectId, taskId) {
    await tasksApi.delete(projectId, taskId)
    items.value = items.value.filter(t => t.id !== taskId)
  }

  async function reorder(projectId, orderedIds) {
    // Optimistic update
    const map = Object.fromEntries(items.value.map(t => [t.id, t]))
    items.value = orderedIds.map((id, i) => ({ ...map[id], sort_order: i + 1 }))

    // Persist each changed order
    await Promise.all(
      orderedIds.map((id, i) => tasksApi.update(projectId, id, { sort_order: i + 1 }))
    )
  }

  return { items, loading, error, fetchAll, create, update, remove, reorder }
})
