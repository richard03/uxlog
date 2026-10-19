/**
 * Plátno projektu (Canvas) – čisté funkce.
 *
 * Entity projektu se na plátně zobrazují jako kartičky. Uložené rozvržení je na projektu
 * v poli `canvas`: { positions: { [cardKey]: { x, y } }, colors: { [cardKey]: '#rrggbb' }, viewport: { x, y, zoom } }.
 * cardKey = `${stateKey}:${id}` (např. 'personas:abc'). Kartička bez uložené pozice dostane
 * výchozí místo ve sloupci svého typu – dokud ji uživatel nepřesune, její pozice se neukládá.
 * Souřadnice pozic jsou v souřadnicích plátna (před posunem a zoomem pohledu).
 */

import { getBugPriority } from './models.js'
import { normalizeHexColor } from './color.js'

/** Typy entit na plátně (klíče ve state) v pořadí sloupců výchozího rozvržení. */
export const CANVAS_ENTITY_TYPES = [
  'goals', 'stakeholders', 'teamMembers', 'competitions', 'hypotheses', 'personas',
  'scenarios', 'requirements', 'risks', 'activities', 'tasks', 'bugs',
]

/** Rozměry kartičky a mezery výchozího rozvržení (px v souřadnicích plátna). */
export const CARD_WIDTH = 220
export const CARD_HEIGHT = CARD_WIDTH // čtvercové kartičky – víc místa na víceřádkový název a popis
export const CARD_GAP_X = 40
export const CARD_GAP_Y = 24

export const MIN_ZOOM = 0.2
export const MAX_ZOOM = 2.5
/** Pruh u horní hrany plátna, který zabírá plovoucí filtr typů (px na obrazovce). */
export const CANVAS_TOP_INSET = 56
export const DEFAULT_VIEWPORT = Object.freeze({ x: 40, y: CANVAS_TOP_INSET + 24, zoom: 1 })

/** Délka popisu na kartičce (znaků); co se nevejde, ořízne CSS. */
const CARD_DESCRIPTION_CHARS = 400

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Klíč kartičky.
 * @param {string} type - klíč ve state (např. 'personas')
 * @param {string} id
 * @returns {string}
 */
export function cardKey(type, id) {
  return `${type}:${id}`
}

/**
 * Rozloží klíč kartičky na typ entity a id; neplatný klíč nebo neznámý typ → null.
 * @param {unknown} key
 * @returns {{ stateKey: string, id: string }|null}
 */
export function parseCardKey(key) {
  if (typeof key !== 'string') return null
  const i = key.indexOf(':')
  if (i <= 0 || i === key.length - 1) return null
  const stateKey = key.slice(0, i)
  if (!CANVAS_ENTITY_TYPES.includes(stateKey)) return null
  return { stateKey, id: key.slice(i + 1) }
}

/**
 * Omezí zoom na povolený rozsah; neplatná hodnota → 1.
 * @param {number} zoom
 * @returns {number}
 */
export function clampZoom(zoom) {
  if (!isFiniteNumber(zoom) || zoom <= 0) return 1
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/**
 * Normalizuje pohled (posun + zoom); chybějící nebo neplatné hodnoty nahradí výchozími.
 * @param {unknown} raw
 * @returns {{ x: number, y: number, zoom: number }}
 */
export function normalizeViewport(raw) {
  const v = raw && typeof raw === 'object' ? raw : {}
  return {
    x: isFiniteNumber(v.x) ? v.x : DEFAULT_VIEWPORT.x,
    y: isFiniteNumber(v.y) ? v.y : DEFAULT_VIEWPORT.y,
    zoom: isFiniteNumber(v.zoom) ? clampZoom(v.zoom) : DEFAULT_VIEWPORT.zoom,
  }
}

/**
 * Normalizuje uložené rozvržení plátna – toleruje chybějící, poškozená i starší data.
 * @param {unknown} raw - project.canvas
 * @returns {{ positions: Object<string, {x: number, y: number}>, colors: Object<string, string>, viewport: {x: number, y: number, zoom: number} }}
 */
export function normalizeCanvasLayout(raw) {
  const layout = raw && typeof raw === 'object' ? raw : {}
  const positions = {}
  const rawPositions = layout.positions && typeof layout.positions === 'object' ? layout.positions : {}
  for (const [key, pos] of Object.entries(rawPositions)) {
    if (pos && isFiniteNumber(pos.x) && isFiniteNumber(pos.y)) positions[key] = { x: pos.x, y: pos.y }
  }
  const colors = {}
  const rawColors = layout.colors && typeof layout.colors === 'object' ? layout.colors : {}
  for (const [key, color] of Object.entries(rawColors)) {
    const hex = normalizeHexColor(color)
    if (hex) colors[key] = hex
  }
  return { positions, colors, viewport: normalizeViewport(layout.viewport) }
}

/**
 * Zkrátí text pro kartičku (jeden řádek bez zalomení, s výpustkou).
 * @param {unknown} text
 * @returns {string}
 */
function shortText(text) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return s.length > CARD_DESCRIPTION_CHARS ? `${s.slice(0, CARD_DESCRIPTION_CHARS - 1)}…` : s
}

/** MoSCoW priorita → úroveň barvy tagu (stejná škála jako priorita chyb). */
const MOSCOW_LEVELS = { must: 'critical', should: 'high', could: 'medium', wont: 'low' }
const BUG_LEVELS = ['critical', 'high', 'medium', 'low']

/**
 * Priorita entity pro tag na kartičce, nebo null (entita prioritu nemá).
 * Scénáře a požadavky mají MoSCoW (chybějící = could, jako ve výchozích hodnotách),
 * chyby prioritu vypočtenou ze závažnosti a dopadu.
 * @param {string} type - klíč kolekce
 * @param {Object} entity
 * @returns {{ scale: 'moscow'|'bug', value: string, level: 'critical'|'high'|'medium'|'low' }|null}
 */
export function cardPriority(type, entity) {
  if (type === 'scenarios' || type === 'requirements') {
    const value = MOSCOW_LEVELS[entity?.priority] ? entity.priority : 'could'
    return { scale: 'moscow', value, level: MOSCOW_LEVELS[value] }
  }
  if (type === 'bugs') {
    const value = getBugPriority(entity?.severity, entity?.impact)
    return BUG_LEVELS.includes(value) ? { scale: 'bug', value, level: value } : null
  }
  return null
}

/**
 * Entity projektu, které se zobrazí na plátně (ve stabilním pořadí podle typu a sortOrder).
 * Skryté (dismissed) aktivity se nezobrazují.
 * @param {Object} data - stav aplikace
 * @param {string} projectId
 * @returns {Array<{ key: string, type: string, id: string, code: string, name: string, description: string, priority: Object|null }>}
 */
export function collectCanvasEntities(data, projectId) {
  const result = []
  if (!projectId) return result
  for (const type of CANVAS_ENTITY_TYPES) {
    const list = Array.isArray(data?.[type]) ? data[type] : []
    const items = list
      .filter((e) => e?.id && e.projectId === projectId && !(type === 'activities' && e.dismissed))
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
    for (const e of items) {
      result.push({
        key: cardKey(type, e.id),
        type,
        id: e.id,
        code: typeof e.code === 'string' ? e.code : '',
        name: typeof e.name === 'string' ? e.name : '',
        description: shortText(e.description),
        priority: cardPriority(type, e),
      })
    }
  }
  return result
}

/**
 * Počty kartiček podle typu pro filtr plátna – všechny typy plátna v pořadí sloupců (i s nulou).
 * @param {Array<{ type: string }>} cards
 * @returns {Array<{ type: string, count: number }>}
 */
export function canvasTypeCounts(cards) {
  const counts = new Map(CANVAS_ENTITY_TYPES.map((type) => [type, 0]))
  for (const c of cards || []) {
    if (counts.has(c?.type)) counts.set(c.type, counts.get(c.type) + 1)
  }
  return CANVAS_ENTITY_TYPES.map((type) => ({ type, count: counts.get(type) }))
}

/**
 * Je kartička potlačená filtrem typu? Bez filtru (nebo s neznámým typem filtru) není potlačená žádná.
 * @param {{ type: string }} card
 * @param {string|null} filterType - typ, který má zůstat zvýrazněný
 * @returns {boolean}
 */
export function isCardFilteredOut(card, filterType) {
  if (!filterType || !CANVAS_ENTITY_TYPES.includes(filterType)) return false
  return card?.type !== filterType
}

/**
 * Výchozí pozice kartičky: každý typ má svůj sloupec, kartičky typu jdou pod sebe.
 * @param {number} column - pořadí sloupce
 * @param {number} row - pořadí kartičky ve sloupci
 * @returns {{ x: number, y: number }}
 */
export function defaultCardPosition(column, row) {
  return {
    x: column * (CARD_WIDTH + CARD_GAP_X),
    y: row * (CARD_HEIGHT + CARD_GAP_Y),
  }
}

/**
 * Doplní kartičkám pozice (uloženou, nebo výchozí ve sloupci jejich typu) a barvu (null = barvy motivu).
 * Sloupce dostávají jen typy, které v projektu mají nějakou entitu (bez prázdných mezer).
 * @param {Array<{ key: string, type: string }>} entities - z collectCanvasEntities
 * @param {{ positions: Object, colors?: Object }} layout - normalizované rozvržení
 * @returns {Array<Object>} entity s x, y, color
 */
export function placeCards(entities, layout) {
  const positions = layout?.positions || {}
  const colors = layout?.colors || {}
  const columns = new Map()
  const rows = new Map()
  return (entities || []).map((entity) => {
    if (!columns.has(entity.type)) columns.set(entity.type, columns.size)
    const row = rows.get(entity.type) ?? 0
    rows.set(entity.type, row + 1)
    const saved = positions[entity.key]
    const pos = saved || defaultCardPosition(columns.get(entity.type), row)
    return { ...entity, x: pos.x, y: pos.y, color: colors[entity.key] || null }
  })
}

/**
 * Nové rozvržení s pozicí jedné kartičky (původní objekt se nemění).
 * @param {Object} layout - normalizované rozvržení
 * @param {string} key
 * @param {{ x: number, y: number }} pos
 * @returns {Object}
 */
export function setCardPosition(layout, key, pos) {
  const base = normalizeCanvasLayout(layout)
  if (!key || !pos || !isFiniteNumber(pos.x) || !isFiniteNumber(pos.y)) return base
  return { ...base, positions: { ...base.positions, [key]: { x: Math.round(pos.x), y: Math.round(pos.y) } } }
}

/**
 * Nové rozvržení s barvou kartiček (null nebo neplatná barva = výchozí barvy motivu).
 * @param {Object} layout
 * @param {Iterable<string>} keys
 * @param {string|null} color
 * @returns {Object}
 */
export function setCardColors(layout, keys, color) {
  const base = normalizeCanvasLayout(layout)
  const hex = normalizeHexColor(color)
  const colors = { ...base.colors }
  for (const key of keys || []) {
    if (!key) continue
    if (hex) colors[key] = hex
    else delete colors[key]
  }
  return { ...base, colors }
}

/** Ponechá v objektu jen klíče, které projdou filtrem. */
function filterKeys(obj, keep) {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    if (keep(key)) out[key] = value
  }
  return out
}

/**
 * Odstraní pozice a barvy kartiček, jejichž entita už neexistuje.
 * @param {Object} layout
 * @param {Iterable<string>} existingKeys
 * @returns {Object}
 */
export function pruneCanvasLayout(layout, existingKeys) {
  const base = normalizeCanvasLayout(layout)
  const keep = new Set(existingKeys)
  const has = (key) => keep.has(key)
  return { ...base, positions: filterKeys(base.positions, has), colors: filterKeys(base.colors, has) }
}

/**
 * Odstraní pozice a barvy daných kartiček (např. entity přesunuté do jiného projektu).
 * @param {Object} layout
 * @param {Iterable<string>} keys
 * @returns {Object}
 */
export function removeCanvasCards(layout, keys) {
  const base = normalizeCanvasLayout(layout)
  const drop = new Set(keys || [])
  const keep = (key) => !drop.has(key)
  return { ...base, positions: filterKeys(base.positions, keep), colors: filterKeys(base.colors, keep) }
}

/**
 * Obdélník obklopující vybrané kartičky (v souřadnicích plátna); bez vybraných kartiček null.
 * @param {Array<{ key: string, x: number, y: number }>} cards
 * @param {Iterable<string>} keys
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function selectionBounds(cards, keys) {
  const wanted = new Set(keys || [])
  const selected = (cards || []).filter((c) => wanted.has(c.key))
  if (!selected.length) return null
  const minX = Math.min(...selected.map((c) => c.x))
  const minY = Math.min(...selected.map((c) => c.y))
  const maxX = Math.max(...selected.map((c) => c.x + CARD_WIDTH))
  const maxY = Math.max(...selected.map((c) => c.y + CARD_HEIGHT))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Bod plátna → bod na obrazovce (relativně k plátnu).
 * @param {{ x: number, y: number, zoom: number }} viewport
 * @param {{ x: number, y: number }} point
 * @returns {{ x: number, y: number }}
 */
export function canvasToScreen(viewport, point) {
  const v = normalizeViewport(viewport)
  return { x: point.x * v.zoom + v.x, y: point.y * v.zoom + v.y }
}

/**
 * Bod na obrazovce (relativně k plátnu) → souřadnice plátna.
 * @param {{ x: number, y: number, zoom: number }} viewport
 * @param {{ x: number, y: number }} point
 * @returns {{ x: number, y: number }}
 */
export function screenToCanvas(viewport, point) {
  const v = normalizeViewport(viewport)
  return { x: (point.x - v.x) / v.zoom, y: (point.y - v.y) / v.zoom }
}

/**
 * Změní zoom tak, aby bod pod kurzorem zůstal na místě.
 * @param {{ x: number, y: number, zoom: number }} viewport
 * @param {number} nextZoom
 * @param {{ x: number, y: number }} anchor - bod na obrazovce (relativně k plátnu)
 * @returns {{ x: number, y: number, zoom: number }}
 */
export function zoomViewportAt(viewport, nextZoom, anchor) {
  const v = normalizeViewport(viewport)
  const zoom = clampZoom(nextZoom)
  const world = screenToCanvas(v, anchor)
  return { x: anchor.x - world.x * zoom, y: anchor.y - world.y * zoom, zoom }
}

/**
 * Pohled, ve kterém jsou vidět všechny kartičky (s okrajem); bez kartiček výchozí pohled.
 * Zoom se nezvětšuje nad 1.
 * @param {Array<{ x: number, y: number }>} cards
 * @param {{ width: number, height: number }} size - rozměr plátna na obrazovce
 * @param {number} [padding]
 * @param {number} [topInset] - pruh nahoře zakrytý ovládáním (kartičky se vycentrují pod něj)
 * @returns {{ x: number, y: number, zoom: number }}
 */
export function fitViewport(cards, size, padding = 40, topInset = 0) {
  if (!cards?.length || !(size?.width > 0) || !(size?.height > 0)) return { ...DEFAULT_VIEWPORT }
  const minX = Math.min(...cards.map((c) => c.x))
  const minY = Math.min(...cards.map((c) => c.y))
  const maxX = Math.max(...cards.map((c) => c.x + CARD_WIDTH))
  const maxY = Math.max(...cards.map((c) => c.y + CARD_HEIGHT))
  const inset = isFiniteNumber(topInset) && topInset > 0 ? Math.min(topInset, size.height / 2) : 0
  const areaH = size.height - inset
  const availW = Math.max(1, size.width - padding * 2)
  const availH = Math.max(1, areaH - padding * 2)
  const zoom = clampZoom(Math.min(1, availW / (maxX - minX), availH / (maxY - minY)))
  return {
    x: (size.width - (maxX - minX) * zoom) / 2 - minX * zoom,
    y: inset + (areaH - (maxY - minY) * zoom) / 2 - minY * zoom,
    zoom,
  }
}

/**
 * Nové rozvržení s pozicemi více kartiček najednou (posun skupiny).
 * @param {Object} layout
 * @param {Object<string, {x: number, y: number}>} moves - klíč kartičky → nová pozice
 * @returns {Object}
 */
export function setCardPositions(layout, moves) {
  let next = normalizeCanvasLayout(layout)
  for (const [key, pos] of Object.entries(moves || {})) next = setCardPosition(next, key, pos)
  return next
}

/**
 * Obdélník ze dvou rohů (v libovolném pořadí).
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function rectFromPoints(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

/**
 * Klíče kartiček, které výběrový obdélník (v souřadnicích plátna) alespoň částečně zasahuje.
 * @param {Array<{ key: string, x: number, y: number }>} cards
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @returns {string[]}
 */
export function cardsInRect(cards, rect) {
  if (!rect) return []
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  return (cards || [])
    .filter((c) => c.x < right && c.x + CARD_WIDTH > rect.x && c.y < bottom && c.y + CARD_HEIGHT > rect.y)
    .map((c) => c.key)
}

/**
 * Výběr s přidanou, nebo naopak odebranou kartičkou (Shift/Ctrl+klik).
 * @param {string[]} selection
 * @param {string} key
 * @returns {string[]}
 */
export function toggleSelection(selection, key) {
  const list = Array.isArray(selection) ? selection : []
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

/**
 * Sjednocení výběrů bez duplicit (zachová pořadí).
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
export function mergeSelection(a, b) {
  return [...new Set([...(a || []), ...(b || [])])]
}

/**
 * Nové pozice posunutých kartiček.
 * @param {Array<{ key: string, x: number, y: number }>} cards
 * @param {string[]} keys - posouvané kartičky
 * @param {number} dx
 * @param {number} dy
 * @returns {Object<string, {x: number, y: number}>}
 */
export function offsetCards(cards, keys, dx, dy) {
  const wanted = new Set(keys || [])
  const moves = {}
  for (const c of cards || []) {
    if (wanted.has(c.key)) moves[c.key] = { x: c.x + dx, y: c.y + dy }
  }
  return moves
}
