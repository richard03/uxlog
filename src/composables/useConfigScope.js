/**
 * Rozsah obrazovek konfigurace: výchozí konfigurace (/config/…, vzor pro nové projekty) nebo
 * konfigurace projektu (/project/:id/config/…, uvnitř ProjectLayout). Obrazovky konfigurace jsou
 * pro oba rozsahy stejné – composable jim dá konfiguraci, routy a drobkovou navigaci podle rozsahu.
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConfig } from './useConfig.js'
import { useStore } from './useStore.js'
import { useI18n } from './useI18n.js'

/** Routy výchozí konfigurace → routy konfigurace projektu. */
const PROJECT_ROUTES = Object.freeze({
  config: 'projectConfig',
  configEntities: 'projectConfigEntities',
  configEntityAttrs: 'projectConfigEntityAttrs',
  configActivities: 'projectConfigActivities',
  configActivityTemplate: 'projectConfigActivityTemplate',
  configDeadlines: 'projectConfigDeadlines',
})

export function useConfigScope() {
  const route = useRoute()
  const store = useStore()
  const { t } = useI18n()

  /** Id projektu, jde-li o konfiguraci projektu (jinak null). */
  const projectId = computed(() => (route.name && String(route.name).startsWith('projectConfig') ? route.params.id : null) || null)
  const project = computed(() => (projectId.value ? store.getProject(projectId.value) : null))
  const isProject = computed(() => Boolean(projectId.value))
  const config = useConfig(() => projectId.value)

  /**
   * Cíl routy obrazovky konfigurace v aktuálním rozsahu.
   * @param {string} name - název routy výchozí konfigurace (např. 'configEntities')
   * @param {Object} [params]
   */
  function to(name, params = {}) {
    if (!isProject.value) return { name, params }
    return { name: PROJECT_ROUTES[name] ?? name, params: { ...params, id: projectId.value } }
  }

  /**
   * Drobková navigace: začátek podle rozsahu + položky obrazovky.
   * @param {Array<{ label: string, to?: Object }>} items - položky za kořenem konfigurace
   */
  function breadcrumbs(items = []) {
    const root = isProject.value
      ? [
          { label: t.nav.projects, to: { name: 'projects' } },
          { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
          { label: t.config.projectTitle, to: items.length ? to('config') : undefined },
        ]
      : [{ label: t.nav.config, to: items.length ? { name: 'config' } : undefined }]
    return [...root, ...items]
  }

  return { projectId, project, isProject, config, to, breadcrumbs }
}
