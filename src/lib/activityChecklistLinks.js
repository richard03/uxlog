/**
 * Čisté funkce pro vazby mezi položkami checklistu aktivity a úkoly
 * a pro sestavení efektivního seznamu položek checklistu.
 */

/**
 * Vrátí efektivní položky checklistu (základ mínus odebrané + vlastní položky).
 * @param {Object} activity
 * @param {Array<{id: string, label?: string}>|null|undefined} templateChecklist - checklist ze šablony (caller použije config / výchozí typy)
 * @returns {Array<{id: string, label?: string}>}
 */
export function getEffectiveActivityChecklist(activity, templateChecklist) {
  if (!activity) return []
  const removed = new Set(activity.removedChecklistItems || [])
  const baseChecklist = activity.baseChecklist || templateChecklist || []
  const defaults = baseChecklist.filter((ci) => !removed.has(ci.id))
  return [...defaults, ...(activity.customChecklistItems || [])]
}

/**
 * Vrátí zobrazený text položky checklistu (vlastní popisek z aktivity nebo výchozí z položky).
 * @param {Object} [checklistLabels] - mapa id položky → vlastní text
 * @param {{ id: string, label?: string }} item - položka z efektivního checklistu
 * @returns {string}
 */
export function resolveActivityChecklistItemLabel(checklistLabels, item) {
  if (!item?.id) return ''
  const custom = checklistLabels?.[item.id]
  if (custom !== undefined && String(custom).trim() !== '') return String(custom).trim()
  return String(item.label ?? '').trim()
}

/**
 * Z mapy checklistItemTaskIds odstraní záznam pro danou položku checklistu.
 * @param {Object.<string, string>|undefined} checklistItemTaskIds
 * @param {string} checklistItemId
 * @returns {Object.<string, string>}
 */
export function omitChecklistItemTaskLink(checklistItemTaskIds, checklistItemId) {
  if (!checklistItemTaskIds || !checklistItemId) return { ...(checklistItemTaskIds || {}) }
  const { [checklistItemId]: _removed, ...rest } = checklistItemTaskIds
  return rest
}

/**
 * Z mapy odstraní všechny položky, které ukazují na smazaný úkol.
 * @param {Object.<string, string>|undefined} checklistItemTaskIds
 * @param {string} deletedTaskId
 * @returns {Object.<string, string>}
 */
export function dropChecklistLinksPointingToTask(checklistItemTaskIds, deletedTaskId) {
  if (!checklistItemTaskIds || !deletedTaskId) return { ...(checklistItemTaskIds || {}) }
  const next = { ...checklistItemTaskIds }
  for (const [itemId, taskId] of Object.entries(next)) {
    if (taskId === deletedTaskId) delete next[itemId]
  }
  return next
}
