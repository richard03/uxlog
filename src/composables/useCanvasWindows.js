/**
 * Plovoucí okna s detaily entit nad plátnem projektu: otevření (každá entita ve vlastním okně),
 * pořadí vrstev, přesun tažením za lištu a změna velikosti tažením za roh.
 * Okna žijí jen po dobu zobrazení plátna (neukládají se).
 */

import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import {
  openWindow, closeWindow, bringWindowToFront, moveWindow, resizeWindow, pruneWindows, topWindowKey,
} from '../lib/canvasWindows.js'
import { entityDetailRoute } from '../lib/entityRoutes.js'

/** Komponenty detailů podle názvu routy – stejná instance pro všechna okna (lazy načtení jen jednou). */
const detailComponents = new Map()

function detailComponent(record) {
  const name = record?.name
  if (!name) return null
  if (!detailComponents.has(name)) {
    const c = record.components?.default
    detailComponents.set(name, typeof c === 'function' ? defineAsyncComponent(c) : c)
  }
  return detailComponents.get(name)
}

/** Prvky v liště okna, za které se okno netáhne (tlačítka, odkazy, menu). */
const NO_DRAG_SELECTOR = 'button, a, input, select, textarea, [role="menu"], [role="menuitem"]'

/**
 * @param {import('vue').Ref<string>} projectId
 * @param {import('vue').Ref<HTMLElement|null>} containerEl - element, nad kterým okna plavou (určuje hranice)
 * @param {import('vue').Ref<Array<{ key: string }>>} cards - kartičky plátna (okna smazaných entit zmizí)
 */
export function useCanvasWindows(projectId, containerEl, cards) {
  const router = useRouter()
  const windows = ref([])
  /** Tažení okna: { pointerId, key, mode: 'move'|'resize', startX, startY, orig: { x, y, width, height } } */
  const gesture = ref(null)

  function bounds() {
    const el = containerEl.value
    return el ? { width: el.clientWidth, height: el.clientHeight } : { width: 0, height: 0 }
  }

  const cardByKey = computed(() => new Map((cards.value ?? []).map((c) => [c.key, c])))

  /** Okna existujících entit s komponentou detailu a routou pro detail. */
  const openWindows = computed(() =>
    pruneWindows(windows.value, cardByKey.value.keys()).map((w) => {
      const detailRoute = entityDetailRoute(w.type, projectId.value, w.id)
      const route = detailRoute ? router.resolve(detailRoute) : null
      return {
        ...w,
        card: cardByKey.value.get(w.key),
        route,
        component: detailComponent(route?.matched?.[route.matched.length - 1]),
      }
    }).filter((w) => w.component))

  /** Otevře detail entity v novém okně (už otevřený jen přenese navrch). */
  function open(type, id) {
    windows.value = openWindow(windows.value, { type, id }, bounds())
  }

  function close(key) {
    windows.value = closeWindow(windows.value, key)
  }

  function focus(key) {
    windows.value = bringWindowToFront(windows.value, key)
  }

  function startGesture(event, key, mode) {
    const win = windows.value.find((w) => w.key === key)
    if (!win || event.button !== 0) return
    if (mode === 'move' && event.target?.closest?.(NO_DRAG_SELECTOR)) return
    event.preventDefault()
    try {
      event.currentTarget?.setPointerCapture?.(event.pointerId)
    } catch {
      // Ukazatel už není aktivní – tažení funguje i bez zachycení
    }
    focus(key)
    gesture.value = {
      pointerId: event.pointerId,
      key,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      orig: { x: win.x, y: win.y, width: win.width, height: win.height },
    }
  }

  /** Lišta okna: tažením se okno přesouvá (ne za tlačítka v liště). */
  function onBarPointerDown(event, key) {
    startGesture(event, key, 'move')
  }

  /** Roh okna: tažením se mění velikost. */
  function onResizePointerDown(event, key) {
    startGesture(event, key, 'resize')
  }

  function onGesturePointerMove(event) {
    const g = gesture.value
    if (!g || event.pointerId !== g.pointerId) return
    const dx = event.clientX - g.startX
    const dy = event.clientY - g.startY
    windows.value = g.mode === 'move'
      ? moveWindow(windows.value, g.key, { x: g.orig.x + dx, y: g.orig.y + dy }, bounds())
      : resizeWindow(windows.value, g.key, { width: g.orig.width + dx, height: g.orig.height + dy }, bounds())
  }

  function onGesturePointerUp(event) {
    if (gesture.value && event.pointerId === gesture.value.pointerId) gesture.value = null
  }

  watch(projectId, () => {
    windows.value = []
    gesture.value = null
  })

  return {
    windows: openWindows,
    topKey: computed(() => topWindowKey(openWindows.value)),
    activeGesture: computed(() => gesture.value?.mode ?? null),
    open,
    close,
    focus,
    onBarPointerDown,
    onResizePointerDown,
    onGesturePointerMove,
    onGesturePointerUp,
  }
}
