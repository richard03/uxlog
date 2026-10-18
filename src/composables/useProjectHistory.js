/**
 * Composable pro obrazovku historie projektu – převádí záznamy historie na texty pro UI.
 */

import { computed, unref } from 'vue'
import { useStore } from './useStore.js'
import { useI18n } from './useI18n.js'
import { describeHistoryEntry } from '../lib/history.js'

/** Kolekce → klíč sekce v i18n (popisky polí). */
const I18N_SECTION = {
  projects: 'project', goals: 'goal', stakeholders: 'stakeholder', competitions: 'competition',
  hypotheses: 'hypothesis', personas: 'persona', scenarios: 'scenario', requirements: 'requirement',
  activities: 'activity', teamMembers: 'teamMember', tasks: 'task', bugs: 'bug', risks: 'risk',
  connections: 'connection',
}

/**
 * @param {import('vue').Ref<string>|string} projectId
 */
export function useProjectHistory(projectId) {
  const store = useStore()
  const { t } = useI18n()

  function typeLabel(collection) {
    return t.history.types[collection] || collection
  }

  function fieldLabel(collection, field) {
    const label = t[I18N_SECTION[collection]]?.[field]
    return typeof label === 'string' ? label : (t.history.fields[field] || field)
  }

  function itemText(item) {
    const action = t.history.actions[item.action]
    const name = item.name ? ` „${item.name}“` : ''
    return `${action}: ${typeLabel(item.collection)}${name}`
  }

  const entries = computed(() => store.getProjectHistory(unref(projectId)).map((entry) => {
    const { main, items } = describeHistoryEntry(entry)
    const base = main ? itemText(main) : t.history.emptyChange
    const summary = entry.kind === 'revert' ? t.history.revertSummary(base) : base
    return {
      id: entry.id,
      at: entry.at,
      kind: entry.kind,
      reverted: !!entry.reverted,
      summary,
      more: items.length > 1 ? t.history.moreChanges(items.length - 1) : '',
      details: items.map((i) => ({
        key: `${i.collection}:${i.id}`,
        text: itemText(i),
        fields: i.fields.map((f) => fieldLabel(i.collection, f)).join(', '),
      })),
    }
  }))

  function revert(entryId) {
    return store.revertHistoryEntry(unref(projectId), entryId)
  }

  return { entries, revert }
}
