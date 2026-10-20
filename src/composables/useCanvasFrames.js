/**
 * Composable pro rámečky na plátně: kreslení (nástroj Rámeček, zkratka F), výběr, přesun za nadpis
 * (i s kartičkami a vnořenými rámečky uvnitř), změna velikosti za pravý dolní roh, přejmenování,
 * barva a smazání (kartičky zůstanou).
 *
 * Během tažení se nic neukládá – rámeček i jeho obsah se jen posouvají v náhledu (cardPreview pro
 * kartičky si bere useProjectCanvas); uloží se až po puštění jedním zápisem.
 */

import { ref, computed, unref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from './useStore.js'
import { useI18n } from './useI18n.js'
import { APP_CONFIG } from '../lib/dataConfig.js'
import {
  screenToCanvas, canvasToScreen, rectFromPoints, frameContents, floatingToolbarPlacement, CANVAS_TOP_INSET,
} from '../lib/canvas.js'
import { resizeFrame, nextFrameTitle, FRAME_TITLE_MAX_LENGTH } from '../lib/canvasFrames.js'

/** Maximální délka názvu rámečku (pro pole v šabloně – view nevolá lib přímo). */
export { FRAME_TITLE_MAX_LENGTH }
import { cardColorScheme } from '../lib/color.js'

/** Posun ukazatele (px), od kterého jde o tažení, ne o kliknutí. */
const DRAG_THRESHOLD = 4
/** Výška nadpisu nad rámečkem (px v souřadnicích plátna) – lišta rámečku se umísťuje nad něj. */
const FRAME_TITLE_HEIGHT = 30

function isTypingTarget(target) {
  const tag = target?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable
}

function capturePointer(event) {
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {
    // Ukazatel už není aktivní – tažení funguje i bez zachycení
  }
}

/**
 * @param {import('vue').Ref<string>} projectId
 * @param {import('vue').Ref<HTMLElement|null>} surfaceEl - element plátna
 * @param {{
 *   getViewport: () => { x: number, y: number, zoom: number },
 *   getCards: () => Array<{ key: string, x: number, y: number }>,
 *   onSelect?: () => void,
 * }} options - getCards: kartičky s uloženými pozicemi; onSelect: výběr rámečku (zruší výběr kartiček)
 */
export function useCanvasFrames(projectId, surfaceEl, { getViewport, getCards, onSelect }) {
  const store = useStore()
  const { t } = useI18n()

  const storedFrames = computed(() => store.getCanvasFrames(unref(projectId)))

  /** Režim kreslení (nástroj Rámeček). */
  const drawMode = ref(false)
  /** Kreslený obdélník: { pointerId, start, end } v px relativně k plátnu. */
  const drawing = ref(null)
  const selectedFrameId = ref(null)
  const editingFrameId = ref(null)
  /** Tažení rámečku: { type: 'move'|'resize', id, pointerId, startX, startY, dx, dy, moved, contents } */
  const gesture = ref(null)
  /** Rámeček čekající na potvrzení smazání. */
  const confirmDeleteId = ref(null)

  // --- Souřadnice ---
  function surfacePoint(event) {
    const rect = surfaceEl.value?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  function surfaceSize() {
    const rect = surfaceEl.value?.getBoundingClientRect()
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
  }

  // --- Rámečky s náhledem probíhajícího tažení ---
  const frames = computed(() => {
    const g = gesture.value
    if (!g?.moved) return storedFrames.value
    if (g.type === 'resize') {
      return storedFrames.value.map((f) => (f.id === g.id ? { ...f, ...resizeFrame(f, g.dx, g.dy) } : f))
    }
    const moving = new Set([g.id, ...g.contents.frameIds])
    return storedFrames.value.map((f) => (moving.has(f.id) ? { ...f, x: f.x + g.dx, y: f.y + g.dy } : f))
  })

  /** Náhled posunu kartiček uvnitř taženého rámečku (pro useProjectCanvas); jinak null. */
  const cardPreview = computed(() => {
    const g = gesture.value
    if (!g?.moved || g.type !== 'move' || !g.contents.cardKeys.length) return null
    return { keys: new Set(g.contents.cardKeys), dx: g.dx, dy: g.dy }
  })

  const selectedFrame = computed(() => frames.value.find((f) => f.id === selectedFrameId.value) ?? null)

  // Smazaný rámeček (nebo přepnutý projekt) nesmí zůstat vybraný
  watch(storedFrames, (list) => {
    if (selectedFrameId.value && !list.some((f) => f.id === selectedFrameId.value)) selectedFrameId.value = null
    if (editingFrameId.value && !list.some((f) => f.id === editingFrameId.value)) editingFrameId.value = null
  })

  watch(() => unref(projectId), () => {
    drawMode.value = false
    drawing.value = null
    gesture.value = null
    selectedFrameId.value = null
    editingFrameId.value = null
    confirmDeleteId.value = null
  })

  /** Styl rámečku: poloha a rozměr v souřadnicích plátna, vlastní barva přes CSS proměnné. */
  function frameStyle(frame) {
    const style = { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px` }
    const scheme = cardColorScheme(frame.color)
    if (scheme) style['--frame-color'] = scheme.background
    return style
  }

  // --- Výběr ---
  function selectFrame(id) {
    if (selectedFrameId.value === id) return
    selectedFrameId.value = id
    if (id) onSelect?.()
  }

  function deselectFrame() {
    selectedFrameId.value = null
  }

  // --- Kreslení ---
  function toggleDrawMode(force) {
    drawMode.value = typeof force === 'boolean' ? force : !drawMode.value
    drawing.value = null
    if (drawMode.value) {
      deselectFrame()
      editingFrameId.value = null
    }
  }

  function onDrawPointerDown(event) {
    // Pravé / prostřední tlačítko probublá na plátno (posun pohledu i v režimu kreslení)
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const point = surfacePoint(event)
    drawing.value = { pointerId: event.pointerId, start: point, end: point }
    capturePointer(event)
  }

  function onDrawPointerMove(event) {
    const d = drawing.value
    if (!d || event.pointerId !== d.pointerId) return
    drawing.value = { ...d, end: surfacePoint(event) }
  }

  function onDrawPointerUp(event) {
    const d = drawing.value
    if (!d || event.pointerId !== d.pointerId) return
    drawing.value = null
    const viewport = getViewport()
    const rect = rectFromPoints(screenToCanvas(viewport, d.start), screenToCanvas(viewport, d.end))
    const frame = store.addCanvasFrame(unref(projectId), rect, nextFrameTitle(storedFrames.value, t.canvas.frameDefaultTitle))
    drawMode.value = false
    if (frame) {
      selectFrame(frame.id)
      // Nový rámeček rovnou nabídne přejmenování
      editingFrameId.value = frame.id
    }
  }

  /** Kreslený obdélník v px relativně k plátnu (pro náhled); null, když se nekreslí. */
  const drawStyle = computed(() => {
    const d = drawing.value
    if (!d) return null
    const r = rectFromPoints(d.start, d.end)
    return { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` }
  })

  // --- Přesun (za nadpis) a změna velikosti (za roh) ---
  function startGesture(event, frame, type) {
    if (event.button !== 0) return false
    event.stopPropagation()
    selectFrame(frame.id)
    gesture.value = {
      type,
      id: frame.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      moved: false,
      // Obsah rámečku se určí na začátku tažení (podle uložených pozic)
      contents: type === 'move' ? frameContents(frame, getCards(), storedFrames.value) : { cardKeys: [], frameIds: [] },
    }
    capturePointer(event)
    return true
  }

  function onTitlePointerDown(event, frame) {
    // Prostřední / pravé tlačítko necháme probublat na plátno (posun pohledu)
    if (event.button !== 0 || editingFrameId.value === frame.id) return
    startGesture(event, frame, 'move')
  }

  function onResizePointerDown(event, frame) {
    startGesture(event, frame, 'resize')
  }

  function onGesturePointerMove(event) {
    const g = gesture.value
    if (!g || event.pointerId !== g.pointerId) return
    const sx = event.clientX - g.startX
    const sy = event.clientY - g.startY
    if (!g.moved && Math.hypot(sx, sy) < DRAG_THRESHOLD) return
    const zoom = getViewport().zoom
    gesture.value = { ...g, moved: true, dx: sx / zoom, dy: sy / zoom }
  }

  function onGesturePointerUp(event) {
    const g = gesture.value
    if (!g || event.pointerId !== g.pointerId) return
    gesture.value = null
    if (!g.moved) return
    const frame = storedFrames.value.find((f) => f.id === g.id)
    if (!frame) return
    if (g.type === 'resize') store.updateCanvasFrame(unref(projectId), g.id, resizeFrame(frame, g.dx, g.dy))
    else store.moveCanvasFrame(unref(projectId), g.id, g.dx, g.dy)
  }

  function onGesturePointerCancel() {
    gesture.value = null
  }

  // --- Přejmenování ---
  function startRename(id) {
    selectFrame(id)
    editingFrameId.value = id
  }

  function commitRename(value) {
    const id = editingFrameId.value
    editingFrameId.value = null
    if (!id) return
    const title = String(value ?? '').trim()
    // Prázdný název se neuloží – rámeček si nechá původní
    if (title) store.updateCanvasFrame(unref(projectId), id, { title })
  }

  function cancelRename() {
    editingFrameId.value = null
  }

  // --- Lišta vybraného rámečku: barva a menu ---
  const colors = APP_CONFIG.canvasCardColors.map((c) => ({
    color: c.color,
    label: (c.labelKey && t.canvas.colors[c.labelKey]) || c.color,
  }))

  const menuItems = computed(() => [
    { label: t.canvas.frameRename, action: 'rename' },
    { label: t.canvas.frameDelete, action: 'delete', variant: 'danger' },
  ])

  function setColor(color) {
    if (selectedFrameId.value) store.updateCanvasFrame(unref(projectId), selectedFrameId.value, { color })
  }

  function onMenuAction(action) {
    const id = selectedFrameId.value
    if (!id) return
    if (action === 'rename') startRename(id)
    else if (action === 'delete') confirmDeleteId.value = id
  }

  const deleteDialog = computed(() => {
    const frame = storedFrames.value.find((f) => f.id === confirmDeleteId.value)
    return frame ? { title: t.canvas.frameDelete, message: t.canvas.frameDeleteConfirm(frame.title || t.canvas.frameUntitled) } : null
  })

  function confirmDelete() {
    const id = confirmDeleteId.value
    confirmDeleteId.value = null
    if (id) store.deleteCanvasFrame(unref(projectId), id)
  }

  function cancelDelete() {
    confirmDeleteId.value = null
  }

  /** Pozice lišty vybraného rámečku (nad nadpisem); během tažení a přejmenování se skryje. */
  const toolbarPlacement = computed(() => {
    const frame = selectedFrame.value
    if (!frame || gesture.value?.moved || editingFrameId.value) return null
    const viewport = getViewport()
    const topLeft = canvasToScreen(viewport, { x: frame.x, y: frame.y - FRAME_TITLE_HEIGHT })
    const rect = {
      x: topLeft.x,
      y: topLeft.y,
      width: frame.width * viewport.zoom,
      height: (frame.height + FRAME_TITLE_HEIGHT) * viewport.zoom,
    }
    const p = floatingToolbarPlacement(rect, surfaceSize(), { topInset: CANVAS_TOP_INSET })
    if (!p) return null
    return {
      align: p.align,
      style: { left: `${p.left}px`, top: `${p.top}px`, transform: p.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)' },
    }
  })

  // --- Klávesy: F = nástroj Rámeček, Esc, Delete na vybraném rámečku ---
  function onWindowKeydown(event) {
    if (isTypingTarget(event.target) || event.target?.closest?.('[data-canvas-keys="off"]')) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault()
      toggleDrawMode()
      return
    }
    if (event.key === 'Escape') {
      if (drawMode.value) toggleDrawMode(false)
      else deselectFrame()
      return
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedFrameId.value) {
      event.preventDefault()
      confirmDeleteId.value = selectedFrameId.value
    }
  }

  onMounted(() => window.addEventListener('keydown', onWindowKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onWindowKeydown))

  return {
    frames,
    cardPreview,
    frameStyle,
    selectedFrameId,
    editingFrameId,
    selectFrame,
    deselectFrame,
    drawMode,
    drawStyle,
    toggleDrawMode,
    onDrawPointerDown,
    onDrawPointerMove,
    onDrawPointerUp,
    onTitlePointerDown,
    onResizePointerDown,
    onGesturePointerMove,
    onGesturePointerUp,
    onGesturePointerCancel,
    startRename,
    commitRename,
    cancelRename,
    colors,
    currentColor: computed(() => selectedFrame.value?.color ?? null),
    setColor,
    menuItems,
    onMenuAction,
    toolbarStyle: computed(() => toolbarPlacement.value?.style ?? null),
    toolbarAlign: computed(() => toolbarPlacement.value?.align ?? 'start'),
    deleteDialog,
    confirmDelete,
    cancelDelete,
    isDragging: computed(() => Boolean(gesture.value?.moved)),
  }
}
