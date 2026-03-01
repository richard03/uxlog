import { defineStore } from 'pinia'
import { ref } from 'vue'
import { projectsApi } from '@/api/projects'

export const useProjectsStore = defineStore('projects', () => {
  const list           = ref([])
  const currentProject = ref(null)
  const loading        = ref(false)
  const error          = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value   = null
    try {
      const res  = await projectsApi.list()
      list.value = res.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to load projects'
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id) {
    loading.value = true
    error.value   = null
    try {
      const res            = await projectsApi.get(id)
      currentProject.value = res.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Project not found'
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const res     = await projectsApi.create(data)
    const project = res.data
    list.value.unshift(project)
    return project
  }

  async function update(id, data) {
    const res     = await projectsApi.update(id, data)
    const updated = res.data
    const idx     = list.value.findIndex(p => p.id === id)
    if (idx !== -1) list.value[idx] = updated
    if (currentProject.value?.id === id) currentProject.value = updated
    return updated
  }

  async function remove(id) {
    await projectsApi.delete(id)
    const numId = Number(id)
    list.value = list.value.filter(p => Number(p.id) !== numId)
    if (Number(currentProject.value?.id) === numId) currentProject.value = null
  }

  return { list, currentProject, loading, error, fetchAll, fetchOne, create, update, remove }
})
