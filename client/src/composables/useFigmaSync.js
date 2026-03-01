import { useFigmaStore } from '@/stores/figma'

export function useFigmaSync() {
  const figma = useFigmaStore()

  async function triggerSync(projectId) {
    await figma.sync(projectId)
  }

  return {
    syncing:   figma.syncing,
    syncError: figma.syncError,
    triggerSync,
  }
}
