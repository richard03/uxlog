/**
 * Plovoucí okna s detaily entit nad plátnem projektu – čisté funkce.
 * Okno: { key, type, id, x, y, width, height, z } – pozice a rozměr v px relativně k plátnu, z = pořadí vrstvy
 * (vyšší je nahoře). Pořadí v poli = pořadí otevření a nemění se (přeskládání DOM by shodilo fokus v oknech).
 * Klíč okna = klíč kartičky (`kolekce:id`), jedna entita má nejvýš jedno okno.
 */

import { cardKey } from './canvas.js'

export const WINDOW_WIDTH = 560
export const WINDOW_HEIGHT = 480
export const WINDOW_MIN_WIDTH = 360
export const WINDOW_MIN_HEIGHT = 240
/** Odsazení nového okna od okraje plátna. */
export const WINDOW_MARGIN = 16
/** Posun každého dalšího okna (kaskáda), aby nová okna nezakrývala předchozí úplně. */
export const WINDOW_CASCADE = 32
/** Kolik px okna musí zůstat na plátně vodorovně, aby šlo chytit za lištu. */
const WINDOW_VISIBLE_MIN = 80
/** Výška lišty okna, která musí zůstat na plátně. */
const WINDOW_BAR_HEIGHT = 40

function finite(n, fallback) {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

function normalizeBounds(bounds) {
  return { width: Math.max(0, finite(bounds?.width, 0)), height: Math.max(0, finite(bounds?.height, 0)) }
}

/**
 * Omezí rozměr okna na minimum a na prostor plátna od pozice okna.
 * @param {{ x: number, y: number }} pos
 * @param {{ width: number, height: number }} size
 * @param {{ width: number, height: number }} bounds - rozměr plátna
 */
export function clampWindowSize(pos, size, bounds) {
  const b = normalizeBounds(bounds)
  const maxW = Math.max(WINDOW_MIN_WIDTH, b.width - Math.max(0, finite(pos?.x, 0)))
  const maxH = Math.max(WINDOW_MIN_HEIGHT, b.height - Math.max(0, finite(pos?.y, 0)))
  return {
    width: Math.round(Math.min(maxW, Math.max(WINDOW_MIN_WIDTH, finite(size?.width, WINDOW_WIDTH)))),
    height: Math.round(Math.min(maxH, Math.max(WINDOW_MIN_HEIGHT, finite(size?.height, WINDOW_HEIGHT)))),
  }
}

/**
 * Omezí pozici okna tak, aby jeho lišta zůstala na plátně (okno smí přesahovat vpravo, vlevo a dolů).
 * @param {{ x: number, y: number }} pos
 * @param {number} width - šířka okna
 * @param {{ width: number, height: number }} bounds
 */
export function clampWindowPosition(pos, width, bounds) {
  const b = normalizeBounds(bounds)
  const w = Math.max(0, finite(width, WINDOW_WIDTH))
  const minX = Math.min(0, WINDOW_VISIBLE_MIN - w)
  const maxX = Math.max(minX, b.width - WINDOW_VISIBLE_MIN)
  const maxY = Math.max(0, b.height - WINDOW_BAR_HEIGHT)
  return {
    x: Math.round(Math.min(maxX, Math.max(minX, finite(pos?.x, 0)))),
    y: Math.round(Math.min(maxY, Math.max(0, finite(pos?.y, 0)))),
  }
}

/**
 * Pozice a rozměr nového okna: první u pravého horního rohu plátna, další v kaskádě vlevo dolů
 * od posledního otevřeného; když by kaskáda vyjela z plátna, začne znovu u pravého horního rohu.
 * @param {Array<Object>} windows - otevřená okna
 * @param {{ width: number, height: number }} bounds
 */
export function nextWindowRect(windows, bounds) {
  const b = normalizeBounds(bounds)
  const width = Math.max(WINDOW_MIN_WIDTH, Math.min(WINDOW_WIDTH, b.width - 2 * WINDOW_MARGIN))
  const height = Math.max(WINDOW_MIN_HEIGHT, Math.min(WINDOW_HEIGHT, b.height - 2 * WINDOW_MARGIN))
  const start = { x: Math.max(0, b.width - width - WINDOW_MARGIN), y: WINDOW_MARGIN }
  const last = Array.isArray(windows) && windows.length ? windows[windows.length - 1] : null
  let pos = start
  if (last) {
    const cascaded = { x: finite(last.x, start.x) - WINDOW_CASCADE, y: finite(last.y, start.y) + WINDOW_CASCADE }
    const fits = cascaded.x >= 0 && cascaded.y + height <= b.height
    pos = fits ? cascaded : start
  }
  // Nové okno nemá přesně zakrýt jiné otevřené okno – posune se o další krok kaskády
  const taken = new Set((Array.isArray(windows) ? windows : []).map((w) => `${w.x}:${w.y}`))
  for (let i = 0; i < 20; i++) {
    const clamped = clampWindowPosition(pos, width, b)
    if (!taken.has(`${clamped.x}:${clamped.y}`)) return { ...clamped, width, height }
    pos = { x: pos.x - WINDOW_CASCADE, y: pos.y + WINDOW_CASCADE }
  }
  return { ...clampWindowPosition(pos, width, b), width, height }
}

function topZ(list) {
  return list.reduce((max, w) => Math.max(max, finite(w.z, 0)), 0)
}

/**
 * Přenese okno navrch (nejvyšší z); okno, které už navrchu je, nemění.
 * @param {Array<Object>} windows
 * @param {string} key
 */
export function bringWindowToFront(windows, key) {
  const list = Array.isArray(windows) ? windows : []
  const win = list.find((w) => w.key === key)
  if (!win) return list
  const top = topZ(list)
  if (finite(win.z, 0) === top && list.filter((w) => finite(w.z, 0) === top).length === 1) return list
  return list.map((w) => (w.key === key ? { ...w, z: top + 1 } : w))
}

/**
 * Klíč okna navrchu, nebo null.
 * @param {Array<Object>} windows
 */
export function topWindowKey(windows) {
  const list = Array.isArray(windows) ? windows : []
  let top = null
  for (const w of list) if (!top || finite(w.z, 0) >= finite(top.z, 0)) top = w
  return top?.key ?? null
}

/**
 * Otevře detail entity v novém okně; je-li už otevřený, jen jeho okno přesune navrch.
 * @param {Array<Object>} windows
 * @param {{ type: string, id: string }} entity
 * @param {{ width: number, height: number }} bounds
 * @returns {Array<Object>}
 */
export function openWindow(windows, entity, bounds) {
  const list = Array.isArray(windows) ? windows : []
  if (!entity?.type || !entity?.id) return list
  const key = cardKey(entity.type, entity.id)
  if (list.some((w) => w.key === key)) return bringWindowToFront(list, key)
  return [...list, { key, type: entity.type, id: entity.id, ...nextWindowRect(list, bounds), z: topZ(list) + 1 }]
}

/** Zavře okno. */
export function closeWindow(windows, key) {
  return (Array.isArray(windows) ? windows : []).filter((w) => w.key !== key)
}

/**
 * Přesune okno (pozice se omezí na plátno).
 * @param {Array<Object>} windows
 * @param {string} key
 * @param {{ x: number, y: number }} pos
 * @param {{ width: number, height: number }} bounds
 */
export function moveWindow(windows, key, pos, bounds) {
  return (Array.isArray(windows) ? windows : []).map((w) =>
    w.key === key ? { ...w, ...clampWindowPosition(pos, w.width, bounds) } : w)
}

/**
 * Změní rozměr okna (omezí se na minimum a na prostor plátna).
 * @param {Array<Object>} windows
 * @param {string} key
 * @param {{ width: number, height: number }} size
 * @param {{ width: number, height: number }} bounds
 */
export function resizeWindow(windows, key, size, bounds) {
  return (Array.isArray(windows) ? windows : []).map((w) =>
    w.key === key ? { ...w, ...clampWindowSize(w, size, bounds) } : w)
}

/**
 * Zahodí okna entit, které už neexistují.
 * @param {Array<Object>} windows
 * @param {Iterable<string>} existingKeys
 */
export function pruneWindows(windows, existingKeys) {
  const keep = new Set(existingKeys ?? [])
  return (Array.isArray(windows) ? windows : []).filter((w) => keep.has(w.key))
}
