import { describe, it, expect } from 'vitest'
import { stickyTopOffset } from './stickyOffset.js'

describe('stickyTopOffset', () => {
  it('krátký sloupec zůstává u horního okraje', () => {
    expect(stickyTopOffset({ viewportHeight: 800, elementHeight: 300, topGap: 16, bottomGap: 40 })).toBe(16)
  })

  it('vysoký sloupec se přichytí spodkem nad spodní okraj', () => {
    expect(stickyTopOffset({ viewportHeight: 800, elementHeight: 1200, topGap: 16, bottomGap: 40 })).toBe(-440)
  })

  it('sloupec přesně na výšku okna nemá záporné odsazení navíc', () => {
    expect(stickyTopOffset({ viewportHeight: 800, elementHeight: 744, topGap: 16, bottomGap: 40 })).toBe(16)
    expect(stickyTopOffset({ viewportHeight: 800, elementHeight: 745, topGap: 16, bottomGap: 40 })).toBe(15)
  })

  it('neplatné nebo chybějící rozměry vrátí horní okraj', () => {
    expect(stickyTopOffset({ viewportHeight: NaN, elementHeight: 500, topGap: 16 })).toBe(16)
    expect(stickyTopOffset({ viewportHeight: 800, elementHeight: 0, topGap: 16 })).toBe(16)
    expect(stickyTopOffset({ viewportHeight: 800, elementHeight: 500, topGap: 'x' })).toBe(0)
    expect(stickyTopOffset()).toBe(0)
  })
})
