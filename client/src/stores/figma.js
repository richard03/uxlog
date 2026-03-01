import { defineStore } from 'pinia'
import { ref } from 'vue'
import { figmaApi } from '@/api/figma'

export const useFigmaStore = defineStore('figma', () => {
  const connection    = ref(null)
  const stakeholders  = ref([])
  const personas      = ref([])
  const goals         = ref([])
  const scenarios     = ref([])
  const requirements  = ref([])
  const competitions  = ref([])
  const syncing       = ref(false)
  const syncError     = ref(null)

  function _applyData(data) {
    if (data.connection    !== undefined) connection.value    = data.connection
    if (data.stakeholders  !== undefined) stakeholders.value  = data.stakeholders
    if (data.personas      !== undefined) personas.value      = data.personas
    if (data.goals         !== undefined) goals.value          = data.goals
    if (data.scenarios     !== undefined) scenarios.value     = data.scenarios
    if (data.requirements  !== undefined) requirements.value  = data.requirements
    if (data.competitions  !== undefined) competitions.value  = data.competitions
  }

  async function fetchAll(projectId) {
    const res = await figmaApi.get(projectId)
    _applyData(res.data)
  }

  async function saveConnection(projectId, data) {
    const res = await figmaApi.set(projectId, data)
    connection.value = res.data.connection
  }

  async function sync(projectId) {
    syncing.value   = true
    syncError.value = null
    try {
      const res = await figmaApi.sync(projectId)
      _applyData(res.data)
      if (connection.value) {
        connection.value.sync_status    = 'ok'
        connection.value.last_synced_at = new Date().toISOString()
      }
    } catch (e) {
      syncError.value = e.response?.data?.error || 'Sync failed'
      if (connection.value) connection.value.sync_status = 'error'
    } finally {
      syncing.value = false
    }
  }

  function $reset() {
    connection.value   = null
    stakeholders.value = []
    personas.value     = []
    goals.value        = []
    scenarios.value    = []
    requirements.value = []
    syncing.value      = false
    syncError.value    = null
  }

  return {
    connection, stakeholders, personas, goals, scenarios, requirements, competitions,
    syncing, syncError,
    fetchAll, saveConnection, sync, $reset,
  }
})
