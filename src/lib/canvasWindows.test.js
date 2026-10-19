/**
 * Unit testy plovoucích oken s detaily entit nad plátnem.
 */

import { describe, it, expect } from 'vitest'
import {
  openWindow, closeWindow, bringWindowToFront, topWindowKey, moveWindow, resizeWindow, pruneWindows,
  nextWindowRect, clampWindowPosition, clampWindowSize,
  WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MARGIN, WINDOW_CASCADE,
} from './canvasWindows.js'

const bounds = { width: 1400, height: 800 }

describe('openWindow', () => {
  it('první okno otevře u pravého horního rohu, další v kaskádě a navrchu', () => {
    let list = openWindow([], { type: 'goals', id: 'g1' }, bounds)
    expect(list).toEqual([{
      key: 'goals:g1', type: 'goals', id: 'g1', z: 1,
      x: bounds.width - WINDOW_WIDTH - WINDOW_MARGIN, y: WINDOW_MARGIN, width: WINDOW_WIDTH, height: WINDOW_HEIGHT,
    }])
    list = openWindow(list, { type: 'risks', id: 'r1' }, bounds)
    expect(list).toHaveLength(2)
    expect(list[1]).toMatchObject({ key: 'risks:r1', x: list[0].x - WINDOW_CASCADE, y: list[0].y + WINDOW_CASCADE, z: 2 })
    expect(topWindowKey(list)).toBe('risks:r1')
  })

  it('už otevřenou entitu neotevře podruhé, jen ji přenese navrch', () => {
    let list = openWindow([], { type: 'goals', id: 'g1' }, bounds)
    list = openWindow(list, { type: 'risks', id: 'r1' }, bounds)
    const again = openWindow(list, { type: 'goals', id: 'g1' }, bounds)
    expect(again.map((w) => w.key)).toEqual(['goals:g1', 'risks:r1'])
    expect(topWindowKey(again)).toBe('goals:g1')
  })

  it('neplatná entita nic neotevře, poškozený seznam se toleruje', () => {
    expect(openWindow([], { type: 'goals' }, bounds)).toEqual([])
    expect(openWindow(null, null, bounds)).toEqual([])
    expect(openWindow('x', { type: 'goals', id: 'g' }, bounds)).toHaveLength(1)
  })
})

describe('nextWindowRect', () => {
  it('na malém plátně okno zmenší, ale ne pod minimum', () => {
    const rect = nextWindowRect([], { width: 300, height: 200 })
    expect(rect.width).toBe(WINDOW_MIN_WIDTH)
    expect(rect.height).toBe(WINDOW_MIN_HEIGHT)
    expect(nextWindowRect([], { width: 900, height: 400 }).height).toBe(400 - 2 * WINDOW_MARGIN)
  })

  it('když kaskáda vyjede z plátna, začne znovu nahoře vpravo', () => {
    const last = { x: 10, y: 600, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }
    expect(nextWindowRect([last], bounds)).toMatchObject({ x: bounds.width - WINDOW_WIDTH - WINDOW_MARGIN, y: WINDOW_MARGIN })
  })

  it('nové okno přesně nezakryje jiné otevřené okno', () => {
    const startX = bounds.width - WINDOW_WIDTH - WINDOW_MARGIN
    const first = { x: startX, y: WINDOW_MARGIN, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }
    const last = { x: 10, y: 600, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }
    expect(nextWindowRect([first, last], bounds)).toMatchObject({ x: startX - WINDOW_CASCADE, y: WINDOW_MARGIN + WINDOW_CASCADE })
  })
})

describe('vrstvy, přesun a velikost', () => {
  const base = [
    { key: 'a', x: 0, y: 0, width: 500, height: 400, z: 1 },
    { key: 'b', x: 50, y: 50, width: 500, height: 400, z: 2 },
  ]

  it('bringWindowToFront mění jen z, pořadí v poli zůstává', () => {
    const list = bringWindowToFront(base, 'a')
    expect(list.map((w) => w.key)).toEqual(['a', 'b'])
    expect(list[0].z).toBe(3)
    expect(bringWindowToFront(base, 'b')).toBe(base)
    expect(bringWindowToFront(base, 'neni')).toBe(base)
    expect(topWindowKey([])).toBeNull()
  })

  it('moveWindow nechá lištu na plátně', () => {
    expect(moveWindow(base, 'a', { x: 100.4, y: 30 }, bounds)[0]).toMatchObject({ x: 100, y: 30 })
    const far = moveWindow(base, 'a', { x: 5000, y: 5000 }, bounds)[0]
    expect(far.x).toBe(bounds.width - 80)
    expect(far.y).toBe(bounds.height - 40)
    const left = moveWindow(base, 'a', { x: -5000, y: -10 }, bounds)[0]
    expect(left).toMatchObject({ x: 80 - 500, y: 0 })
    expect(clampWindowPosition({ x: 'x', y: NaN }, 500, bounds)).toEqual({ x: 0, y: 0 })
  })

  it('resizeWindow drží minimum a nepřesáhne plátno', () => {
    expect(resizeWindow(base, 'b', { width: 10, height: 10 }, bounds)[1]).toMatchObject({ width: WINDOW_MIN_WIDTH, height: WINDOW_MIN_HEIGHT })
    expect(resizeWindow(base, 'b', { width: 9999, height: 9999 }, bounds)[1]).toMatchObject({ width: bounds.width - 50, height: bounds.height - 50 })
    expect(clampWindowSize({ x: 0, y: 0 }, null, bounds)).toEqual({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT })
  })

  it('closeWindow a pruneWindows odeberou okna', () => {
    expect(closeWindow(base, 'a').map((w) => w.key)).toEqual(['b'])
    expect(pruneWindows(base, ['b', 'c']).map((w) => w.key)).toEqual(['b'])
    expect(pruneWindows(undefined, undefined)).toEqual([])
  })
})
