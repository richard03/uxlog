/**
 * Rámečky na plátně projektu (Canvas) – čisté funkce nad seznamem rámečků.
 *
 * Rámeček = { id, title, x, y, width, height, color } v souřadnicích plátna (color = '#rrggbb' nebo null).
 * Ukládá se v rozvržení plátna projektu (`project.canvas.frames`). Které kartičky do rámečku patří,
 * se neukládá – určuje se z polohy (střed kartičky uvnitř rámečku, viz frameContents v canvas.js).
 */

import { normalizeHexColor } from './color.js'

export const FRAME_MIN_WIDTH = 160
export const FRAME_MIN_HEIGHT = 120
/** Výchozí rámeček (kliknutí bez tažení) – vejdou se do něj dvě kartičky vedle sebe. */
export const FRAME_DEFAULT_WIDTH = 520
export const FRAME_DEFAULT_HEIGHT = 320
export const FRAME_TITLE_MAX_LENGTH = 120

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Normalizuje název rámečku (jeden řádek, oříznutý, omezená délka).
 * @param {unknown} title
 * @returns {string}
 */
export function normalizeFrameTitle(title) {
  return String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, FRAME_TITLE_MAX_LENGTH)
}

/**
 * Normalizuje jeden rámeček; bez id nebo s neplatnou polohou → null.
 * Příliš malý rozměr se zvětší na minimum.
 * @param {unknown} raw
 * @returns {{ id: string, title: string, x: number, y: number, width: number, height: number, color: string|null }|null}
 */
export function normalizeFrame(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.id !== 'string' || !raw.id) return null
  if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) return null
  return {
    id: raw.id,
    title: normalizeFrameTitle(raw.title),
    x: raw.x,
    y: raw.y,
    width: Math.max(FRAME_MIN_WIDTH, isFiniteNumber(raw.width) ? raw.width : FRAME_DEFAULT_WIDTH),
    height: Math.max(FRAME_MIN_HEIGHT, isFiniteNumber(raw.height) ? raw.height : FRAME_DEFAULT_HEIGHT),
    color: normalizeHexColor(raw.color),
  }
}

/**
 * Normalizuje seznam rámečků (zahodí neplatné a duplicitní id).
 * @param {unknown} raw
 * @returns {Array<Object>}
 */
export function normalizeFrames(raw) {
  const out = []
  const seen = new Set()
  for (const item of Array.isArray(raw) ? raw : []) {
    const frame = normalizeFrame(item)
    if (!frame || seen.has(frame.id)) continue
    seen.add(frame.id)
    out.push(frame)
  }
  return out
}

/**
 * Nový rámeček z nakresleného obdélníku (souřadnice plátna). Obdélník menší než minimum
 * (kliknutí bez tažení) dá rámeček výchozí velikosti s levým horním rohem v bodě kliknutí.
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {{ id: string, title?: string, color?: string|null }} props
 * @returns {Object|null}
 */
export function frameFromRect(rect, { id, title = '', color = null } = {}) {
  if (!rect || !isFiniteNumber(rect.x) || !isFiniteNumber(rect.y)) return null
  const drawn = rect.width >= FRAME_MIN_WIDTH / 2 || rect.height >= FRAME_MIN_HEIGHT / 2
  return normalizeFrame({
    id,
    title,
    color,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(drawn ? rect.width : FRAME_DEFAULT_WIDTH),
    height: Math.round(drawn ? rect.height : FRAME_DEFAULT_HEIGHT),
  })
}

/**
 * Nový seznam s upraveným rámečkem; povolené jsou jen title, x, y, width, height, color.
 * @param {Array<Object>} frames
 * @param {string} id
 * @param {Object} patch
 * @returns {Array<Object>}
 */
export function updateFrame(frames, id, patch) {
  const allowed = ['title', 'x', 'y', 'width', 'height', 'color']
  return normalizeFrames(frames).map((f) => {
    if (f.id !== id) return f
    const next = { ...f }
    for (const key of allowed) {
      if (patch && key in patch) next[key] = key === 'x' || key === 'y' || key === 'width' || key === 'height'
        ? (isFiniteNumber(patch[key]) ? Math.round(patch[key]) : f[key])
        : patch[key]
    }
    return normalizeFrame(next) || f
  })
}

/**
 * Nový seznam bez rámečku (kartičky v něm zůstávají na svém místě).
 * @param {Array<Object>} frames
 * @param {string} id
 * @returns {Array<Object>}
 */
export function removeFrame(frames, id) {
  return normalizeFrames(frames).filter((f) => f.id !== id)
}

/**
 * Rozměr rámečku po tažení pravého dolního rohu (ne menší než minimum).
 * @param {{ width: number, height: number }} frame
 * @param {number} dw
 * @param {number} dh
 * @returns {{ width: number, height: number }}
 */
export function resizeFrame(frame, dw, dh) {
  const w = (frame?.width ?? FRAME_DEFAULT_WIDTH) + (isFiniteNumber(dw) ? dw : 0)
  const h = (frame?.height ?? FRAME_DEFAULT_HEIGHT) + (isFiniteNumber(dh) ? dh : 0)
  return { width: Math.round(Math.max(FRAME_MIN_WIDTH, w)), height: Math.round(Math.max(FRAME_MIN_HEIGHT, h)) }
}

/**
 * Pořadí vykreslení: větší rámečky dospod, menší (vnořené) navrch, aby šly chytit.
 * @param {Array<Object>} frames
 * @returns {Array<Object>}
 */
export function sortFramesForRender(frames) {
  return [...(frames || [])].sort((a, b) => b.width * b.height - a.width * a.height)
}

/**
 * Výchozí název nového rámečku: „<základ> n“ s nejmenším n, které ještě nemá žádný rámeček.
 * @param {Array<{ title: string }>} frames
 * @param {string} base - např. „Rámeček“
 * @returns {string}
 */
export function nextFrameTitle(frames, base) {
  const used = new Set((frames || []).map((f) => f.title))
  let n = (frames || []).length + 1
  for (let i = 1; i <= n; i++) {
    if (!used.has(`${base} ${i}`)) { n = i; break }
  }
  return `${base} ${n}`
}
