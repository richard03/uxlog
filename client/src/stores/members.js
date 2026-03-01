import { defineStore } from 'pinia'
import { ref } from 'vue'
import { membersApi } from '@/api/members'

export const useMembersStore = defineStore('members', () => {
  const items   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  async function fetchAll(projectId) {
    loading.value = true
    error.value   = null
    try {
      const res   = await membersApi.list(projectId)
      items.value = res.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to load members'
    } finally {
      loading.value = false
    }
  }

  async function create(projectId, data) {
    const res = await membersApi.create(projectId, data)
    items.value.push(res.data)
    return res.data
  }

  async function update(projectId, memberId, data) {
    const res     = await membersApi.update(projectId, memberId, data)
    const updated = res.data
    const idx     = items.value.findIndex(m => m.id === memberId)
    if (idx !== -1) items.value[idx] = updated
    return updated
  }

  async function remove(projectId, memberId) {
    await membersApi.delete(projectId, memberId)
    items.value = items.value.filter(m => m.id !== memberId)
  }

  return { items, loading, error, fetchAll, create, update, remove }
})
