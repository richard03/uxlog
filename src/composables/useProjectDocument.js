/**
 * Režim Dokument – data projektu jako upravitelný dokument.
 * Odvozuje dokument ze store (pole podle konfigurace entit, přeložené nadpisy) a ukládá úpravy
 * textu zpět do entit. Export do Markdownu.
 */

import { ref, computed } from 'vue'
import { useStore } from './useStore.js'
import { useConfig } from './useConfig.js'
import { useI18n } from './useI18n.js'
import {
  DOCUMENT_SECTIONS, DOCUMENT_EXTRA_FIELDS, documentToMarkdown, normalizeDocumentText,
} from '../lib/projectDocument.js'
import { entityDetailRoute } from '../lib/entityRoutes.js'
import { formatCalendarDate } from '../utils/formatDate.js'

/**
 * @param {import('vue').Ref<string>} projectId
 */
export function useProjectDocument(projectId) {
  const store = useStore()
  const { t, tPath } = useI18n()
  const { getEffectiveEntityFields } = useConfig()

  const project = computed(() => store.getProject(projectId.value))

  /** Zobrazit i prázdná pole (aby šla v dokumentu doplnit). */
  const showEmpty = ref(false)

  /** Efektivní pole podle typu entity (konfigurace + vlastní pole), řešitel úkolu z členů týmu. */
  const fields = computed(() => {
    const out = {}
    for (const { entityType } of DOCUMENT_SECTIONS) {
      const extra = (DOCUMENT_EXTRA_FIELDS[entityType] || []).map((f) => ({ ...f, label: tPath(f.labelKey) }))
      out[entityType] = [...extra, ...getEffectiveEntityFields(entityType, tPath)]
    }
    out.task = out.task.map((f) =>
      f.key === 'assignee'
        ? {
            ...f,
            options: [
              { value: '', label: t.document.notSelected },
              ...store.getTeamMembers(projectId.value).filter((m) => m.name).map((m) => ({ value: m.name, label: m.name })),
            ],
          }
        : f,
    )
    return out
  })

  const sectionTitles = computed(() =>
    Object.fromEntries(DOCUMENT_SECTIONS.map((s) => [s.stateKey, tPath(s.labelKey)])),
  )

  /** Vlastnosti projektu pod hlavním nadpisem (jen ke čtení – upravují se v přehledu projektu). */
  const meta = computed(() => {
    const p = project.value
    if (!p) return []
    return [
      { label: t.project.scope, value: p.scope ? tPath(`scope.${p.scope}`) : '' },
      { label: t.project.priority, value: p.priority ? tPath(`priority.${p.priority}`) : '' },
      { label: t.project.phase, value: p.phase ? tPath(`phase.${p.phase}`) : '' },
      { label: t.project.deadlineLabel, value: p.deadline ? formatCalendarDate(p.deadline, { month: 'long' }) : '' },
    ]
  })

  const doc = computed(() =>
    store.getProjectDocument(projectId.value, {
      fields: fields.value,
      sectionTitles: sectionTitles.value,
      meta: meta.value,
    }),
  )

  /** Počet entit v dokumentu (pro prázdný stav). */
  const itemCount = computed(() => (doc.value?.sections || []).reduce((n, s) => n + s.items.length, 0))

  /**
   * Definice pole entity podle klíče (pro uložení – nese valueKey, unitKey, id vlastního pole…).
   * @param {string} entityType
   * @param {string} key
   */
  function fieldDef(entityType, key) {
    return (fields.value[entityType] || []).find((f) => f.key === key) || null
  }

  /**
   * Uloží název projektu; prázdný název se neuloží.
   * @param {string} text
   * @returns {boolean}
   */
  function saveTitle(text) {
    const name = normalizeDocumentText(text, { single: true })
    if (!name || !project.value || name === project.value.name) return false
    store.updateProject(projectId.value, { name })
    return true
  }

  /**
   * Uloží název entity; prázdný název se neuloží.
   * @param {{ stateKey: string, id: string, name: string }} item
   * @param {string} text
   * @returns {boolean}
   */
  function saveName(item, text) {
    const name = normalizeDocumentText(text, { single: true })
    if (!name || name === item.name) return false
    return store.updateDocumentEntity(projectId.value, item.stateKey, item.id, { name })
  }

  /**
   * Uloží pole entity.
   * @param {{ stateKey: string, entityType: string, id: string }} item
   * @param {{ key: string }} field - pole dokumentu
   * @param {string} value
   * @param {string} [unit] - jednotka u number-unit
   * @returns {boolean}
   */
  function saveField(item, field, value, unit) {
    const def = fieldDef(item.entityType, field.key)
    if (!def) return false
    return store.updateDocumentField(projectId.value, item.stateKey, item.id, def, value, unit)
  }

  /** Cíl odkazu na detail entity v Datech. */
  function detailRoute(item) {
    return entityDetailRoute(item.stateKey, projectId.value, item.id)
  }

  /** Dokument jako Markdown (export). */
  function toMarkdown() {
    return documentToMarkdown(doc.value, { untitled: t.document.untitled })
  }

  return { project, doc, itemCount, showEmpty, saveTitle, saveName, saveField, detailRoute, toMarkdown }
}
