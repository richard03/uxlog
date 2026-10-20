/**
 * Composable pro plátno projektu (Canvas): kartičky, výběr, přetahování (i skupin), posun pohledu a zoom.
 *
 * Ovládání (jako v Miro):
 * - klik na kartičku ji vybere, Shift/Ctrl+klik ji přidá k výběru / odebere,
 * - tažení prázdného místa kreslí výběrový obdélník (se Shift/Ctrl přidává k výběru),
 * - tažení vybrané kartičky posune celý výběr; šipky posunou výběr z klávesnice,
 * - posun plátna: pravé nebo prostřední tlačítko myši, nebo mezerník + tažení,
 * - dvojklik (nebo Enter) otevře detail (v plovoucím okně nad plátnem), Esc zruší výběr, Ctrl+A vybere vše,
 * - nad výběrem (nebo pod ním, když nahoře není místo) plave kontextová lišta (toolbarStyle),
 * - filtr typů na horní hraně zvýrazní kartičky jednoho typu, ostatní zprůhlední (jen vzhled, výběr dál funguje).
 * Pozice se ukládají až po puštění (během tažení jen lokálně), pohled se ukládá se zpožděním.
 */

import { ref, computed, watch, unref, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from './useStore.js'
import {
  zoomViewportAt, fitViewport, normalizeViewport, screenToCanvas, rectFromPoints, cardsInRect,
  toggleSelection, mergeSelection, offsetCards, selectionBounds, canvasToScreen,
  canvasTypeCounts, isCardFilteredOut, floatingToolbarPlacement, CANVAS_TOP_INSET,
} from '../lib/canvas.js'
import { cardColorScheme } from '../lib/color.js'

/** Rozměry kartičky pro šablonu (view nevolá lib přímo). */
export { CARD_WIDTH, CARD_HEIGHT } from '../lib/canvas.js'

/** Posun ukazatele (px), od kterého jde o tažení, ne o kliknutí. */
const DRAG_THRESHOLD = 4
/** Krok posunu kartiček šipkami (px v souřadnicích plátna). */
const KEYBOARD_STEP = 16
const ZOOM_STEP = 1.2
const VIEWPORT_SAVE_DELAY = 400

/** Klávesy nemají plátno ovládat, když uživatel píše do pole (např. hledání). */
function isTypingTarget(target) {
  const tag = target?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable
}

/** Klávesy z oblasti označené data-canvas-keys="off" (okna detailů nad plátnem) plátno neovládají. */
function isOutsideCanvasKeys(target) {
  return Boolean(target?.closest?.('[data-canvas-keys="off"]'))
}

/** Zachytí ukazatel na elementu (tažení pokračuje i mimo něj); neaktivní ukazatel nevadí. */
function capturePointer(event) {
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {
    // Ukazatel už není aktivní – tažení funguje i bez zachycení, dokud je nad elementem
  }
}

/**
 * @param {import('vue').Ref<string>} projectId
 * @param {import('vue').Ref<HTMLElement|null>} surfaceEl - element plátna (pro rozměr a souřadnice)
 * @param {{
 *   onOpen?: (card: Object) => void,
 *   cardPreview?: import('vue').Ref<{ keys: Set<string>, dx: number, dy: number }|null>,
 *   getExtraFitItems?: () => Array<{ x: number, y: number, width: number, height: number }>,
 * }} [options] - onOpen: dvojklik (nebo Enter) na kartičku; cardPreview: posun kartiček v náhledu
 *   (tažení rámečku); getExtraFitItems: další objekty, které má ukázat „Zobrazit vše“ (rámečky)
 */
export function useProjectCanvas(projectId, surfaceEl, { onOpen, cardPreview, getExtraFitItems } = {}) {
  const store = useStore()

  const viewport = ref(store.getCanvasLayout(projectId.value).viewport)
  /** Klíče vybraných kartiček. */
  const selection = ref([])
  /** Tažení kartiček: { pointerId, key, keys, startX, startY, dx, dy, moved } (do puštění se neukládá). */
  const dragging = ref(null)
  /** Výběrový obdélník: { pointerId, start, end (px relativně k plátnu), moved, base: výběr před začátkem } */
  const marquee = ref(null)
  const isPanning = ref(false)
  const spaceHeld = ref(false)

  const placedCards = computed(() => store.getCanvasCards(projectId.value))

  // --- Filtr typů (zvýraznění) ---
  /** Zvýrazněný typ (klíč kolekce), '' = všechny typy. Neukládá se, platí jen pro otevřené plátno. */
  const typeFilter = ref('')
  const typeCounts = computed(() => canvasTypeCounts(placedCards.value))
  const isFilteredOut = (card) => isCardFilteredOut(card, typeFilter.value)

  const cards = computed(() => {
    const d = dragging.value
    // Náhled posunu: tažené kartičky, nebo kartičky uvnitř taženého rámečku
    const preview = d?.moved ? { keys: new Set(d.keys), dx: d.dx, dy: d.dy } : unref(cardPreview)
    if (!preview) return placedCards.value
    return placedCards.value.map((c) => (preview.keys.has(c.key) ? { ...c, x: c.x + preview.dx, y: c.y + preview.dy } : c))
  })

  const selectedSet = computed(() => new Set(selection.value))
  const isSelected = (key) => selectedSet.value.has(key)

  const worldStyle = computed(() => {
    const { x, y, zoom } = viewport.value
    return { transform: `translate(${x}px, ${y}px) scale(${zoom})` }
  })

  /** Tečkovaná mřížka pozadí se posouvá a zvětšuje s pohledem. */
  const surfaceStyle = computed(() => {
    const { x, y, zoom } = viewport.value
    const size = 24 * zoom
    return { backgroundSize: `${size}px ${size}px`, backgroundPosition: `${x}px ${y}px` }
  })

  /** Výběrový obdélník v px relativně k plátnu (pro vykreslení); null, když se nekreslí. */
  const marqueeStyle = computed(() => {
    const m = marquee.value
    if (!m?.moved) return null
    const r = rectFromPoints(m.start, m.end)
    return { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` }
  })

  const zoomPercent = computed(() => Math.round(viewport.value.zoom * 100))

  /**
   * Pozice kontextové lišty výběru (nad výběrem, jinak pod ním, jinak pod filtrem u horní hrany plátna).
   * Během tažení kartiček a výběrového obdélníku se lišta skryje (null).
   */
  const toolbarPlacement = computed(() => {
    if (!selection.value.length || dragging.value?.moved || marquee.value?.moved) return null
    const bounds = selectionBounds(cards.value, selection.value)
    if (!bounds) return null
    const { zoom } = viewport.value
    const topLeft = canvasToScreen(viewport.value, bounds)
    const rect = { x: topLeft.x, y: topLeft.y, width: bounds.width * zoom, height: bounds.height * zoom }
    // Nad výběrem jen tehdy, když se lišta nepřekryje s filtrem typů u horní hrany;
    // rozbalovací nabídky lišty se otevírají směrem do středu plátna (align)
    const p = floatingToolbarPlacement(rect, surfaceSize(), { topInset: CANVAS_TOP_INSET })
    if (!p) return null
    return {
      align: p.align,
      style: { left: `${p.left}px`, top: `${p.top}px`, transform: p.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)' },
    }
  })

  /** Vlastní barva kartičky jako CSS proměnné (písmo dopočítané podle kontrastu); bez barvy prázdný objekt. */
  function cardColorStyle(card) {
    const scheme = cardColorScheme(card?.color)
    if (!scheme) return {}
    return {
      '--card-bg': scheme.background,
      '--card-fg': scheme.text,
      '--card-muted': scheme.muted,
      '--card-border': scheme.border,
    }
  }

  // --- Ukládání pohledu ---
  let saveTimer = null
  function scheduleViewportSave() {
    clearTimeout(saveTimer)
    const id = projectId.value
    const value = viewport.value
    saveTimer = setTimeout(() => {
      saveTimer = null
      store.setCanvasViewport(id, value)
    }, VIEWPORT_SAVE_DELAY)
  }
  function flushViewportSave() {
    if (!saveTimer) return
    clearTimeout(saveTimer)
    saveTimer = null
    store.setCanvasViewport(projectId.value, viewport.value)
  }

  function setViewport(next) {
    viewport.value = normalizeViewport(next)
    scheduleViewportSave()
  }

  watch(projectId, (id, prevId) => {
    if (prevId && saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      store.setCanvasViewport(prevId, viewport.value)
    }
    viewport.value = store.getCanvasLayout(id).viewport
    dragging.value = null
    marquee.value = null
    selection.value = []
    typeFilter.value = ''
  })

  // Výběr nesmí obsahovat smazané kartičky
  watch(placedCards, (list) => {
    if (!selection.value.length) return
    const existing = new Set(list.map((c) => c.key))
    const kept = selection.value.filter((k) => existing.has(k))
    if (kept.length !== selection.value.length) selection.value = kept
  })

  // --- Souřadnice ---
  function surfacePoint(event) {
    const rect = surfaceEl.value?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  function surfaceSize() {
    const rect = surfaceEl.value?.getBoundingClientRect()
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
  }

  // --- Posun pohledu a výběrový obdélník ---
  let pan = null

  /** Pravé/prostřední tlačítko nebo mezerník + levé → posun plátna (platí i nad kartičkou). */
  function wantsPan(event) {
    return event.button === 1 || event.button === 2 || (event.button === 0 && spaceHeld.value)
  }

  function onSurfacePointerDown(event) {
    if (wantsPan(event)) {
      event.preventDefault()
      pan = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { ...viewport.value } }
      isPanning.value = true
      capturePointer(event)
      return
    }
    if (event.button !== 0) return
    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    const point = surfacePoint(event)
    marquee.value = { pointerId: event.pointerId, start: point, end: point, moved: false, base: additive ? [...selection.value] : [] }
    if (!additive) selection.value = []
    capturePointer(event)
  }

  function onSurfacePointerMove(event) {
    if (pan && event.pointerId === pan.pointerId) {
      viewport.value = {
        ...pan.origin,
        x: pan.origin.x + event.clientX - pan.startX,
        y: pan.origin.y + event.clientY - pan.startY,
      }
      return
    }
    const m = marquee.value
    if (!m || event.pointerId !== m.pointerId) return
    const end = surfacePoint(event)
    const moved = m.moved || Math.hypot(end.x - m.start.x, end.y - m.start.y) >= DRAG_THRESHOLD
    marquee.value = { ...m, end, moved }
    if (!moved) return
    const a = screenToCanvas(viewport.value, m.start)
    const b = screenToCanvas(viewport.value, end)
    selection.value = mergeSelection(m.base, cardsInRect(placedCards.value, rectFromPoints(a, b)))
  }

  function onSurfacePointerUp(event) {
    if (pan && event.pointerId === pan.pointerId) {
      pan = null
      isPanning.value = false
      scheduleViewportSave()
      return
    }
    if (marquee.value && event.pointerId === marquee.value.pointerId) marquee.value = null
  }

  /** Kontextové menu by rušilo posun pravým tlačítkem. */
  function onSurfaceContextMenu(event) {
    event.preventDefault()
  }

  // --- Zoom ---
  function onWheel(event) {
    const factor = Math.exp(-event.deltaY * 0.0015)
    setViewport(zoomViewportAt(viewport.value, viewport.value.zoom * factor, surfacePoint(event)))
  }

  function zoomBy(factor) {
    const { width, height } = surfaceSize()
    setViewport(zoomViewportAt(viewport.value, viewport.value.zoom * factor, { x: width / 2, y: height / 2 }))
  }

  const zoomIn = () => zoomBy(ZOOM_STEP)
  const zoomOut = () => zoomBy(1 / ZOOM_STEP)

  function fitAll() {
    const items = [...placedCards.value, ...(getExtraFitItems?.() || [])]
    setViewport(fitViewport(items, surfaceSize(), undefined, CANVAS_TOP_INSET))
  }

  // --- Výběr a přetahování kartiček ---
  function onCardPointerDown(event, card) {
    // Posun plátna funguje i nad kartičkou – událost necháme probublat na plátno
    if (wantsPan(event) || event.button !== 0) return
    event.stopPropagation()
    const toggle = event.shiftKey || event.ctrlKey || event.metaKey
    const wasSelected = isSelected(card.key)
    if (toggle) selection.value = toggleSelection(selection.value, card.key)
    else if (!wasSelected) selection.value = [card.key]
    // Kartičku odebranou z výběru (Shift/Ctrl+klik) netáhneme
    if (!isSelected(card.key)) return
    dragging.value = {
      pointerId: event.pointerId,
      key: card.key,
      keys: [...selection.value],
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      moved: false,
      // Klik bez tažení na kartičku z vybrané skupiny vybere jen ji
      collapseOnClick: wasSelected && !toggle && selection.value.length > 1,
    }
    capturePointer(event)
  }

  function onCardPointerMove(event) {
    const d = dragging.value
    if (!d || event.pointerId !== d.pointerId) return
    const sx = event.clientX - d.startX
    const sy = event.clientY - d.startY
    if (!d.moved && Math.hypot(sx, sy) < DRAG_THRESHOLD) return
    const zoom = viewport.value.zoom
    dragging.value = { ...d, moved: true, dx: sx / zoom, dy: sy / zoom }
  }

  function onCardPointerUp(event) {
    const d = dragging.value
    if (!d || event.pointerId !== d.pointerId) return
    dragging.value = null
    if (d.moved) store.moveCanvasCards(projectId.value, offsetCards(placedCards.value, d.keys, d.dx, d.dy))
    else if (d.collapseOnClick) selection.value = [d.key]
  }

  function onCardPointerCancel() {
    dragging.value = null
  }

  function onCardDblClick(card) {
    onOpen?.(card)
  }

  const ARROW_MOVES = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

  /** Klávesnice na kartičce: Enter otevře detail, mezerník vybere (se Shift/Ctrl přidá), šipky posunou výběr. */
  function onCardKeydown(event, card) {
    if (event.key === 'Enter') {
      event.preventDefault()
      onOpen?.(card)
      return
    }
    if (event.key === ' ') {
      event.preventDefault()
      const toggle = event.shiftKey || event.ctrlKey || event.metaKey
      selection.value = toggle ? toggleSelection(selection.value, card.key) : [card.key]
      return
    }
    const move = ARROW_MOVES[event.key]
    if (!move) return
    event.preventDefault()
    const step = event.shiftKey ? KEYBOARD_STEP * 4 : KEYBOARD_STEP
    const keys = isSelected(card.key) ? selection.value : [card.key]
    store.moveCanvasCards(projectId.value, offsetCards(placedCards.value, keys, move[0] * step, move[1] * step))
  }

  // --- Klávesy celého okna: mezerník (posun), Esc, Ctrl+A ---
  function onWindowKeydown(event) {
    if (isTypingTarget(event.target) || isOutsideCanvasKeys(event.target)) return
    if (event.code === 'Space') {
      // Mezerník na kartičce ji vybírá (onCardKeydown); jinde drží režim posunu
      if (!event.target?.classList?.contains('canvas-card')) {
        event.preventDefault()
        spaceHeld.value = true
      }
      return
    }
    if (event.key === 'Escape' && selection.value.length) {
      selection.value = []
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      selection.value = placedCards.value.map((c) => c.key)
    }
  }

  function onWindowKeyup(event) {
    if (event.code === 'Space') spaceHeld.value = false
  }

  function onWindowBlur() {
    spaceHeld.value = false
  }

  onMounted(() => {
    window.addEventListener('keydown', onWindowKeydown)
    window.addEventListener('keyup', onWindowKeyup)
    window.addEventListener('blur', onWindowBlur)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onWindowKeydown)
    window.removeEventListener('keyup', onWindowKeyup)
    window.removeEventListener('blur', onWindowBlur)
    flushViewportSave()
  })

  return {
    cards,
    viewport,
    worldStyle,
    surfaceStyle,
    marqueeStyle,
    zoomPercent,
    isPanning,
    spaceHeld,
    selectedCount: computed(() => selection.value.length),
    selectedKeys: computed(() => selection.value),
    clearSelection: () => { selection.value = [] },
    typeFilter,
    typeCounts,
    isFilteredOut,
    toolbarStyle: computed(() => toolbarPlacement.value?.style ?? null),
    toolbarAlign: computed(() => toolbarPlacement.value?.align ?? 'start'),
    cardColorStyle,
    isSelected,
    draggingKeys: computed(() => (dragging.value?.moved ? new Set(dragging.value.keys) : new Set())),
    onSurfacePointerDown,
    onSurfacePointerMove,
    onSurfacePointerUp,
    onSurfaceContextMenu,
    onWheel,
    zoomIn,
    zoomOut,
    fitAll,
    onCardPointerDown,
    onCardPointerMove,
    onCardPointerUp,
    onCardPointerCancel,
    onCardDblClick,
    onCardKeydown,
  }
}
