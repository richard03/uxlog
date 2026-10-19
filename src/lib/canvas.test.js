/**
 * Unit testy plátna projektu (Canvas).
 */

import { describe, it, expect } from 'vitest'
import {
  cardKey, clampZoom, normalizeViewport, normalizeCanvasLayout, collectCanvasEntities, defaultCardPosition,
  placeCards, setCardPosition, cardPriority, pruneCanvasLayout, screenToCanvas, zoomViewportAt, fitViewport,
  setCardPositions, rectFromPoints, cardsInRect, toggleSelection, mergeSelection, offsetCards,
  parseCardKey, setCardColors, removeCanvasCards, selectionBounds, canvasToScreen,
  canvasTypeCounts, isCardFilteredOut, CANVAS_ENTITY_TYPES,
  CARD_WIDTH, CARD_HEIGHT, CARD_GAP_X, MIN_ZOOM, MAX_ZOOM, DEFAULT_VIEWPORT,
} from './canvas.js'
import { entityDetailRoute } from './entityRoutes.js'

describe('normalizeCanvasLayout', () => {
  it('chybějící nebo poškozená data → prázdné rozvržení s výchozím pohledem', () => {
    for (const raw of [undefined, null, 'x', 42, [], { positions: 'x', viewport: 7 }]) {
      expect(normalizeCanvasLayout(raw)).toEqual({ positions: {}, colors: {}, viewport: { ...DEFAULT_VIEWPORT } })
    }
  })

  it('zahodí neplatné pozice a doplní chybějící hodnoty pohledu', () => {
    const layout = normalizeCanvasLayout({
      positions: { 'goals:a': { x: 10, y: 20 }, 'goals:b': { x: 'x', y: 1 }, 'goals:c': null, 'goals:d': { x: NaN, y: 0 } },
      viewport: { x: 5, zoom: 99 },
    })
    expect(layout.positions).toEqual({ 'goals:a': { x: 10, y: 20 } })
    expect(layout.viewport).toEqual({ x: 5, y: DEFAULT_VIEWPORT.y, zoom: MAX_ZOOM })
  })
})

describe('clampZoom / normalizeViewport', () => {
  it('omezí zoom na rozsah a neplatnou hodnotu nahradí 1', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM)
    expect(clampZoom(10)).toBe(MAX_ZOOM)
    expect(clampZoom(1.5)).toBe(1.5)
    expect(clampZoom(0)).toBe(1)
    expect(clampZoom('2')).toBe(1)
    expect(normalizeViewport({ x: 1, y: 2, zoom: -1 })).toEqual({ x: 1, y: 2, zoom: 1 })
  })
})

describe('collectCanvasEntities', () => {
  const data = {
    goals: [
      { id: 'g2', projectId: 'p1', name: 'Druhý', sortOrder: 20 },
      { id: 'g1', projectId: 'p1', code: 'GOL-001', name: 'První', description: '  více\n řádků ', sortOrder: 10 },
      { id: 'gx', projectId: 'p2', name: 'Cizí' },
    ],
    activities: [
      { id: 'a1', projectId: 'p1', name: 'Rozhovory' },
      { id: 'a2', projectId: 'p1', name: 'Skrytá', dismissed: true },
    ],
    personas: 'poškozeno',
    risks: [null, { projectId: 'p1', name: 'Bez id' }, { id: 'r1', projectId: 'p1', name: 42 }],
  }

  it('vrátí entity projektu v pořadí typů a sortOrder, bez skrytých aktivit a cizích projektů', () => {
    const result = collectCanvasEntities(data, 'p1')
    expect(result.map((e) => e.key)).toEqual(['goals:g1', 'goals:g2', 'risks:r1', 'activities:a1'])
    expect(result[0]).toEqual({ key: 'goals:g1', type: 'goals', id: 'g1', code: 'GOL-001', name: 'První', description: 'více řádků', priority: null })
    expect(result[2].name).toBe('')
  })

  it('zkrátí dlouhý popis a bez projectId nevrátí nic', () => {
    const long = collectCanvasEntities({ goals: [{ id: 'g', projectId: 'p', description: 'a'.repeat(1000) }] }, 'p')
    expect(long[0].description.length).toBeLessThanOrEqual(400)
    expect(long[0].description.endsWith('…')).toBe(true)
    expect(collectCanvasEntities(data, '')).toEqual([])
    expect(collectCanvasEntities(null, 'p1')).toEqual([])
  })
})

describe('cardPriority', () => {
  it('scénáře a požadavky mají MoSCoW, chybějící nebo neplatná = could', () => {
    expect(cardPriority('requirements', { priority: 'must' })).toEqual({ scale: 'moscow', value: 'must', level: 'critical' })
    expect(cardPriority('scenarios', { priority: 'wont' })).toEqual({ scale: 'moscow', value: 'wont', level: 'low' })
    expect(cardPriority('scenarios', {})).toEqual({ scale: 'moscow', value: 'could', level: 'medium' })
    expect(cardPriority('requirements', { priority: 'xxx' }).value).toBe('could')
  })

  it('chyby mají prioritu ze závažnosti a dopadu, bez nich žádnou', () => {
    expect(cardPriority('bugs', { severity: 'critical', impact: 'high' })).toEqual({ scale: 'bug', value: 'critical', level: 'critical' })
    expect(cardPriority('bugs', { severity: 'high' })).toBeNull()
    expect(cardPriority('bugs', null)).toBeNull()
  })

  it('ostatní entity prioritu nemají', () => {
    expect(cardPriority('goals', { priority: 'must' })).toBeNull()
    expect(cardPriority('tasks', {})).toBeNull()
  })
})

describe('placeCards', () => {
  const entities = [
    { key: 'goals:1', type: 'goals' },
    { key: 'goals:2', type: 'goals' },
    { key: 'risks:1', type: 'risks' },
  ]

  it('bez uložených pozic dá každý typ do vlastního sloupce bez mezer', () => {
    const placed = placeCards(entities, { positions: {} })
    expect(placed.map((c) => ({ x: c.x, y: c.y }))).toEqual([
      { x: 0, y: 0 },
      defaultCardPosition(0, 1),
      { x: CARD_WIDTH + CARD_GAP_X, y: 0 },
    ])
  })

  it('uložená pozice má přednost, ostatní kartičky zůstanou na svém výchozím místě', () => {
    const placed = placeCards(entities, { positions: { 'goals:1': { x: 500, y: -40 } } })
    expect(placed[0]).toMatchObject({ x: 500, y: -40 })
    expect(placed[1]).toMatchObject(defaultCardPosition(0, 1))
  })

  it('toleruje chybějící rozvržení i seznam', () => {
    expect(placeCards(entities, undefined)).toHaveLength(3)
    expect(placeCards(null, {})).toEqual([])
  })
})

describe('setCardPosition / pruneCanvasLayout', () => {
  it('uloží zaokrouhlenou pozici a nemění původní rozvržení', () => {
    const before = { positions: { 'goals:1': { x: 1, y: 1 } }, viewport: { x: 0, y: 0, zoom: 1 } }
    const after = setCardPosition(before, 'goals:2', { x: 10.6, y: -3.2 })
    expect(after.positions).toEqual({ 'goals:1': { x: 1, y: 1 }, 'goals:2': { x: 11, y: -3 } })
    expect(before.positions['goals:2']).toBeUndefined()
  })

  it('neplatný vstup rozvržení nezmění', () => {
    expect(setCardPosition({}, 'goals:1', { x: 'a', y: 1 }).positions).toEqual({})
    expect(setCardPosition({}, '', { x: 1, y: 1 }).positions).toEqual({})
  })

  it('odstraní pozice smazaných entit', () => {
    const layout = { positions: { 'goals:1': { x: 1, y: 1 }, 'goals:2': { x: 2, y: 2 } } }
    expect(pruneCanvasLayout(layout, ['goals:2']).positions).toEqual({ 'goals:2': { x: 2, y: 2 } })
  })
})

describe('pohled (posun a zoom)', () => {
  it('převede bod obrazovky na souřadnice plátna', () => {
    expect(screenToCanvas({ x: 100, y: 50, zoom: 2 }, { x: 300, y: 250 })).toEqual({ x: 100, y: 100 })
  })

  it('zoom ponechá bod pod kurzorem na místě', () => {
    const before = { x: 30, y: -20, zoom: 1 }
    const anchor = { x: 200, y: 150 }
    const after = zoomViewportAt(before, 2, anchor)
    expect(after.zoom).toBe(2)
    expect(screenToCanvas(after, anchor)).toEqual(screenToCanvas(before, anchor))
  })

  it('zoom mimo rozsah se omezí', () => {
    expect(zoomViewportAt({ x: 0, y: 0, zoom: 1 }, 100, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM)
  })

  it('fitViewport vycentruje všechny kartičky a nezvětší nad 100 %', () => {
    const cards = [{ x: 0, y: 0 }, { x: 1000, y: 500 }]
    const size = { width: 800, height: 600 }
    const v = fitViewport(cards, size, 40)
    expect(v.zoom).toBeCloseTo(720 / (1000 + CARD_WIDTH))
    const left = v.x
    const right = (1000 + CARD_WIDTH) * v.zoom + v.x
    expect(left).toBeCloseTo(size.width - right)
    expect(fitViewport([{ x: 0, y: 0 }], { width: 2000, height: 2000 }).zoom).toBe(1)
    const top = v.y
    const bottom = (500 + CARD_HEIGHT) * v.zoom + v.y
    expect(top).toBeCloseTo(size.height - bottom)
  })

  it('fitViewport s horním pruhem vycentruje kartičky do zbytku plátna', () => {
    const cards = [{ x: 0, y: 0 }, { x: 1000, y: 500 }]
    const size = { width: 800, height: 600 }
    const v = fitViewport(cards, size, 40, 60)
    const bottom = (500 + CARD_HEIGHT) * v.zoom + v.y
    expect(v.y - 60).toBeCloseTo(size.height - bottom)
    expect(v.y).toBeGreaterThanOrEqual(60 + 40 - 1e-9)
    // Neplatný pruh se ignoruje
    expect(fitViewport(cards, size, 40, NaN)).toEqual(fitViewport(cards, size, 40))
  })

  it('fitViewport bez kartiček nebo rozměru vrátí výchozí pohled', () => {
    expect(fitViewport([], { width: 100, height: 100 })).toEqual({ ...DEFAULT_VIEWPORT })
    expect(fitViewport([{ x: 0, y: 0 }], { width: 0, height: 0 })).toEqual({ ...DEFAULT_VIEWPORT })
  })
})

describe('cardKey / entityDetailRoute', () => {
  it('sestaví klíč kartičky a routu detailu', () => {
    expect(cardKey('personas', 'x1')).toBe('personas:x1')
    expect(entityDetailRoute('teamMembers', 'p1', 'm1')).toEqual({ name: 'teamMemberDetail', params: { id: 'p1', memberId: 'm1' } })
    expect(entityDetailRoute('unknown', 'p1', 'x')).toBeNull()
    expect(entityDetailRoute('goals', 'p1', '')).toBeNull()
  })

})

describe('výběr a posun skupiny', () => {
  const cards = [
    { key: 'a', x: 0, y: 0 },
    { key: 'b', x: 300, y: 0 },
    { key: 'c', x: 0, y: 500 },
  ]

  it('rectFromPoints sestaví obdélník z rohů v libovolném pořadí', () => {
    expect(rectFromPoints({ x: 10, y: 50 }, { x: -5, y: 20 })).toEqual({ x: -5, y: 20, width: 15, height: 30 })
  })

  it('cardsInRect vrátí kartičky, které obdélník alespoň částečně zasahuje', () => {
    expect(cardsInRect(cards, { x: CARD_WIDTH - 1, y: 10, width: 300, height: 10 })).toEqual(['a', 'b'])
    expect(cardsInRect(cards, { x: CARD_WIDTH, y: CARD_HEIGHT, width: 50, height: 50 })).toEqual([])
    expect(cardsInRect(cards, { x: -100, y: -100, width: 2000, height: 2000 })).toEqual(['a', 'b', 'c'])
    expect(cardsInRect(cards, null)).toEqual([])
    expect(cardsInRect(undefined, { x: 0, y: 0, width: 1, height: 1 })).toEqual([])
  })

  it('toggleSelection přidá i odebere kartičku, mergeSelection sjednotí bez duplicit', () => {
    expect(toggleSelection(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleSelection(null, 'a')).toEqual(['a'])
    expect(mergeSelection(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c'])
    expect(mergeSelection(undefined, ['a'])).toEqual(['a'])
  })

  it('offsetCards posune jen vybrané kartičky', () => {
    expect(offsetCards(cards, ['a', 'c', 'neexistuje'], 10, -5)).toEqual({ a: { x: 10, y: -5 }, c: { x: 10, y: 495 } })
    expect(offsetCards(cards, [], 10, 10)).toEqual({})
  })

  it('setCardPositions uloží více pozic najednou', () => {
    const layout = setCardPositions({ positions: { a: { x: 1, y: 1 } } }, { b: { x: 2, y: 2 }, c: { x: 'x', y: 0 } })
    expect(layout.positions).toEqual({ a: { x: 1, y: 1 }, b: { x: 2, y: 2 } })
    expect(setCardPositions(undefined, undefined).positions).toEqual({})
  })
})

describe('barvy kartiček', () => {
  it('normalizeCanvasLayout ponechá jen platné barvy (sjednocené na #rrggbb)', () => {
    const layout = normalizeCanvasLayout({ colors: { 'goals:a': '#FDE68A', 'goals:b': 'red', 'goals:c': null, 'goals:d': '#abc' } })
    expect(layout.colors).toEqual({ 'goals:a': '#fde68a', 'goals:d': '#aabbcc' })
    expect(normalizeCanvasLayout({ colors: 'x' }).colors).toEqual({})
  })

  it('setCardColors nastaví barvu více kartičkám, null nebo neplatná barva ji odebere', () => {
    const before = { positions: { 'goals:a': { x: 1, y: 1 } }, colors: { 'goals:c': '#ffffff' } }
    const colored = setCardColors(before, ['goals:a', 'goals:b', ''], '#2563EB')
    expect(colored.colors).toEqual({ 'goals:a': '#2563eb', 'goals:b': '#2563eb', 'goals:c': '#ffffff' })
    expect(colored.positions).toEqual(before.positions)
    expect(before.colors).toEqual({ 'goals:c': '#ffffff' })
    expect(setCardColors(colored, ['goals:a', 'goals:c'], null).colors).toEqual({ 'goals:b': '#2563eb' })
    expect(setCardColors(colored, ['goals:b'], 'nesmysl').colors).toEqual({ 'goals:a': '#2563eb', 'goals:c': '#ffffff' })
    expect(setCardColors(undefined, undefined, '#fff').colors).toEqual({})
  })

  it('placeCards předá kartičce její barvu, jinak null', () => {
    const placed = placeCards([{ key: 'goals:1', type: 'goals' }, { key: 'goals:2', type: 'goals' }], { positions: {}, colors: { 'goals:2': '#fde68a' } })
    expect(placed.map((c) => c.color)).toEqual([null, '#fde68a'])
    expect(placeCards([{ key: 'goals:1', type: 'goals' }], { positions: {} })[0].color).toBeNull()
  })

  it('pruneCanvasLayout a removeCanvasCards odstraní pozice i barvy', () => {
    const layout = {
      positions: { 'goals:1': { x: 1, y: 1 }, 'goals:2': { x: 2, y: 2 } },
      colors: { 'goals:1': '#fde68a', 'goals:2': '#2563eb' },
    }
    const pruned = pruneCanvasLayout(layout, ['goals:1'])
    expect(Object.keys(pruned.positions)).toEqual(['goals:1'])
    expect(pruned.colors).toEqual({ 'goals:1': '#fde68a' })
    const removed = removeCanvasCards(layout, ['goals:1', 'neexistuje'])
    expect(Object.keys(removed.positions)).toEqual(['goals:2'])
    expect(removed.colors).toEqual({ 'goals:2': '#2563eb' })
    expect(removeCanvasCards(undefined, undefined)).toEqual(normalizeCanvasLayout(undefined))
  })
})

describe('parseCardKey', () => {
  it('rozloží klíč na typ a id (id může obsahovat dvojtečku)', () => {
    expect(parseCardKey('personas:abc')).toEqual({ stateKey: 'personas', id: 'abc' })
    expect(parseCardKey(cardKey('tasks', 'a:b'))).toEqual({ stateKey: 'tasks', id: 'a:b' })
  })

  it('neplatný klíč nebo neznámý typ → null', () => {
    for (const key of [null, 42, '', 'personas', ':abc', 'personas:', 'projects:p1', 'connections:c1']) {
      expect(parseCardKey(key)).toBeNull()
    }
  })
})

describe('selectionBounds / canvasToScreen', () => {
  const cards = [
    { key: 'a', x: 0, y: 0 },
    { key: 'b', x: 300, y: 100 },
    { key: 'c', x: -500, y: -500 },
  ]

  it('obdélník kolem vybraných kartiček', () => {
    expect(selectionBounds(cards, ['a', 'b'])).toEqual({ x: 0, y: 0, width: 300 + CARD_WIDTH, height: 100 + CARD_HEIGHT })
    expect(selectionBounds(cards, ['c'])).toEqual({ x: -500, y: -500, width: CARD_WIDTH, height: CARD_HEIGHT })
  })

  it('bez výběru nebo s neexistujícími klíči null', () => {
    expect(selectionBounds(cards, [])).toBeNull()
    expect(selectionBounds(cards, ['x'])).toBeNull()
    expect(selectionBounds(undefined, undefined)).toBeNull()
  })

  it('canvasToScreen je inverzí screenToCanvas', () => {
    const viewport = { x: 30, y: -20, zoom: 1.5 }
    const point = { x: 100, y: 40 }
    expect(canvasToScreen(viewport, point)).toEqual({ x: 180, y: 40 })
    expect(screenToCanvas(viewport, canvasToScreen(viewport, point))).toEqual(point)
  })
})

describe('filtr typů na plátně', () => {
  it('canvasTypeCounts vrací všechny typy v pořadí sloupců s počty kartiček', () => {
    const counts = canvasTypeCounts([{ type: 'personas' }, { type: 'risks' }, { type: 'personas' }, { type: 'projects' }, null])
    expect(counts.map((c) => c.type)).toEqual(CANVAS_ENTITY_TYPES)
    expect(counts.find((c) => c.type === 'personas').count).toBe(2)
    expect(counts.find((c) => c.type === 'risks').count).toBe(1)
    expect(counts.find((c) => c.type === 'goals').count).toBe(0)
    expect(canvasTypeCounts(undefined).every((c) => c.count === 0)).toBe(true)
  })

  it('isCardFilteredOut potlačí jen kartičky jiného typu, než je ve filtru', () => {
    expect(isCardFilteredOut({ type: 'personas' }, 'personas')).toBe(false)
    expect(isCardFilteredOut({ type: 'risks' }, 'personas')).toBe(true)
    expect(isCardFilteredOut({ type: 'risks' }, null)).toBe(false)
    expect(isCardFilteredOut({ type: 'risks' }, '')).toBe(false)
    expect(isCardFilteredOut({ type: 'risks' }, 'nesmysl')).toBe(false)
    expect(isCardFilteredOut(null, 'personas')).toBe(true)
  })
})
