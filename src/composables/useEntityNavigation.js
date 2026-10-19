/**
 * Navigace mezi detaily entit podle kontextu: v pohledu Data vede na obrazovku detailu,
 * v plovoucím okně nad plátnem projektu (Canvas) otevírá detaily v dalších oknech a plátno neopouští.
 * Okno předává svůj kontext přes provide(CANVAS_WINDOW_KEY, …) – viz CanvasEntityWindow.vue.
 */

import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { entityDetailRoute } from '../lib/entityRoutes.js'

/**
 * Kontext okna detailu nad plátnem:
 * { actionsTargetId: string, open(type, id): void, close(): void }
 */
export const CANVAS_WINDOW_KEY = Symbol('canvasWindow')

export function useEntityNavigation() {
  const router = useRouter()
  const canvasWindow = inject(CANVAS_WINDOW_KEY, null)

  /** Cíl odkazu na detail entity v pohledu Data (v okně nad plátnem slouží jako href). */
  function detailRoute(type, projectId, id) {
    return entityDetailRoute(type, projectId, id)
  }

  /** Otevře detail entity: v okně nad plátnem v dalším okně, jinak obrazovku detailu. */
  function openDetail(type, projectId, id) {
    if (canvasWindow) {
      canvasWindow.open(type, id)
      return
    }
    const to = detailRoute(type, projectId, id)
    if (to) router.push(to)
  }

  /**
   * Opuštění detailu (po smazání nebo přesunu entity): okno nad plátnem zavře,
   * jinak přejde na zadanou obrazovku (typicky seznam).
   * @param {Object} fallback - cíl v pohledu Data
   */
  function leaveDetail(fallback) {
    if (canvasWindow) canvasWindow.close()
    else router.push(fallback)
  }

  return { canvasWindow, inCanvas: Boolean(canvasWindow), detailRoute, openDetail, leaveDetail }
}
