/**
 * Composable pro kontextovou lištu výběru na plátně: barva kartiček a menu „…“
 * (přesun / kopie do jiného projektu, smazání – stejné akce jako v detailu entity).
 *
 * Dialogy pracují se snímkem výběru z okamžiku otevření, takže je nerozbije změna výběru
 * (např. Esc mimo dialog) ani zmizení lišty.
 */

import { ref, computed, unref } from 'vue'
import { useStore } from './useStore.js'
import { useI18n } from './useI18n.js'
import { showToast } from './useToast.js'
import { APP_CONFIG } from '../lib/dataConfig.js'
import { parseCardKey } from '../lib/canvas.js'

/** Typ kartičky (kolekce) → sekce v i18n s texty delete / deleteConfirm. */
const I18N_SECTION = {
  goals: 'goal', stakeholders: 'stakeholder', teamMembers: 'teamMember', competitions: 'competition',
  hypotheses: 'hypothesis', personas: 'persona', scenarios: 'scenario', requirements: 'requirement',
  risks: 'risk', activities: 'activity', tasks: 'task', bugs: 'bug',
}

/**
 * @param {import('vue').Ref<string>} projectId
 * @param {import('vue').Ref<string[]>} selectedKeys - klíče vybraných kartiček
 * @param {import('vue').Ref<Array<{ key: string, color: string|null }>>} cards - kartičky plátna
 */
export function useCanvasSelectionActions(projectId, selectedKeys, cards) {
  const store = useStore()
  const { t } = useI18n()

  /** Paleta z data/app.yaml s popisky z i18n. */
  const colors = APP_CONFIG.canvasCardColors.map((c) => ({
    color: c.color,
    label: (c.labelKey && t.canvas.colors[c.labelKey]) || c.color,
  }))

  const selectedCards = computed(() => {
    const wanted = new Set(unref(selectedKeys))
    return (unref(cards) || []).filter((c) => wanted.has(c.key))
  })

  /** Společná barva výběru: hex, null (bez barvy) nebo 'mixed' (kartičky mají různé barvy). */
  const currentColor = computed(() => {
    const list = selectedCards.value
    if (!list.length) return null
    const first = list[0].color || null
    return list.every((c) => (c.color || null) === first) ? first : 'mixed'
  })

  function setColor(color) {
    store.setCanvasCardColor(unref(projectId), selectedCards.value.map((c) => c.key), color)
  }

  /** Popisek a potvrzení smazání: u jedné kartičky podle jejího typu (jako v detailu), jinak souhrnně. */
  function deleteTexts(keys) {
    if (keys.length === 1) {
      const section = t[I18N_SECTION[parseCardKey(keys[0])?.stateKey]]
      if (section?.delete) return { label: section.delete, confirm: section.deleteConfirm }
    }
    return { label: t.canvas.deleteSelected(keys.length), confirm: t.canvas.deleteSelectedConfirm(keys.length) }
  }

  const menuItems = computed(() => [
    { label: t.common.moveToProject, action: 'move' },
    { label: t.common.copyToProject, action: 'copy' },
    { label: deleteTexts(selectedCards.value.map((c) => c.key)).label, action: 'delete', variant: 'danger' },
  ])

  /** Otevřený dialog: { action: 'move'|'copy'|'delete', keys: string[] } nebo null. */
  const dialog = ref(null)

  function onMenuAction(action) {
    const keys = selectedCards.value.map((c) => c.key)
    if (!keys.length || !['move', 'copy', 'delete'].includes(action)) return
    dialog.value = { action, keys }
  }

  function closeDialog() {
    dialog.value = null
  }

  /** Entity dialogu pro přesun / kopii ({ stateKey, id }). */
  const dialogEntities = computed(() => (dialog.value?.keys || []).map(parseCardKey).filter(Boolean))

  const deleteDialog = computed(() => (dialog.value?.action === 'delete' ? deleteTexts(dialog.value.keys) : null))

  function confirmDelete() {
    const keys = dialog.value?.keys || []
    dialog.value = null
    const deleted = store.deleteCanvasCards(unref(projectId), keys)
    if (deleted > 1) showToast(t.canvas.deletedToast(deleted))
  }

  function onMoved() {
    dialog.value = null
  }

  function onCopied(targetProjectId) {
    const count = dialogEntities.value.length
    dialog.value = null
    showToast(t.canvas.copiedToast(count, store.getProject(targetProjectId)?.name || ''))
  }

  return {
    colors,
    currentColor,
    setColor,
    menuItems,
    onMenuAction,
    dialog,
    dialogEntities,
    deleteDialog,
    closeDialog,
    confirmDelete,
    onMoved,
    onCopied,
  }
}
