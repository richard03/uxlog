import { describe, it, expect } from 'vitest'
import {
  normalizeFrame, normalizeFrames, normalizeFrameTitle, frameFromRect, updateFrame, removeFrame, resizeFrame,
  sortFramesForRender, nextFrameTitle,
  FRAME_MIN_WIDTH, FRAME_MIN_HEIGHT, FRAME_DEFAULT_WIDTH, FRAME_DEFAULT_HEIGHT, FRAME_TITLE_MAX_LENGTH,
} from './canvasFrames.js'

const frame = { id: 'f1', title: 'Výzkum', x: 10, y: 20, width: 400, height: 300, color: null }

describe('normalizeFrame / normalizeFrames', () => {
  it('ponechá platný rámeček a doplní chybějící hodnoty', () => {
    expect(normalizeFrame(frame)).toEqual(frame)
    expect(normalizeFrame({ id: 'a', x: 0, y: 0 })).toEqual({
      id: 'a', title: '', x: 0, y: 0, width: FRAME_DEFAULT_WIDTH, height: FRAME_DEFAULT_HEIGHT, color: null,
    })
    expect(normalizeFrame({ ...frame, width: 5, height: -1, color: '#ABC', title: '  A \n B ' }))
      .toMatchObject({ width: FRAME_MIN_WIDTH, height: FRAME_MIN_HEIGHT, color: '#aabbcc', title: 'A B' })
  })

  it('neplatné rámečky vypadnou, duplicitní id se nezopakuje', () => {
    for (const raw of [null, 'x', {}, { id: '', x: 0, y: 0 }, { id: 'a', x: 'x', y: 0 }, { id: 'a', x: 0, y: NaN }]) {
      expect(normalizeFrame(raw)).toBeNull()
    }
    expect(normalizeFrames([frame, { ...frame, title: 'kopie' }, null]).map((f) => f.title)).toEqual(['Výzkum'])
    expect(normalizeFrames('nesmysl')).toEqual([])
  })

  it('normalizeFrameTitle omezí délku', () => {
    expect(normalizeFrameTitle('x'.repeat(500))).toHaveLength(FRAME_TITLE_MAX_LENGTH)
    expect(normalizeFrameTitle(null)).toBe('')
  })
})

describe('frameFromRect', () => {
  it('nakreslený obdélník se zaokrouhlí', () => {
    expect(frameFromRect({ x: 10.4, y: 20.6, width: 300.2, height: 200.7 }, { id: 'n', title: 'T' }))
      .toEqual({ id: 'n', title: 'T', x: 10, y: 21, width: 300, height: 201, color: null })
  })

  it('kliknutí bez tažení dá rámeček výchozí velikosti; malý tah se zvětší na minimum', () => {
    expect(frameFromRect({ x: 5, y: 5, width: 3, height: 2 }, { id: 'n' }))
      .toMatchObject({ x: 5, y: 5, width: FRAME_DEFAULT_WIDTH, height: FRAME_DEFAULT_HEIGHT })
    expect(frameFromRect({ x: 0, y: 0, width: 100, height: 20 }, { id: 'n' }))
      .toMatchObject({ width: FRAME_MIN_WIDTH, height: FRAME_MIN_HEIGHT })
  })

  it('bez id nebo polohy null', () => {
    expect(frameFromRect({ x: 0, y: 0, width: 300, height: 300 }, {})).toBeNull()
    expect(frameFromRect(null, { id: 'n' })).toBeNull()
  })
})

describe('updateFrame / removeFrame / resizeFrame', () => {
  it('updateFrame změní jen povolená pole a výsledek normalizuje', () => {
    const [next] = updateFrame([frame], 'f1', { title: '  Nový ', x: 50.6, width: 10, id: 'jiné', foo: 1, color: '#FFF' })
    expect(next).toEqual({ ...frame, title: 'Nový', x: 51, width: FRAME_MIN_WIDTH, color: '#ffffff' })
    expect(updateFrame([frame], 'f1', { x: 'x' })[0].x).toBe(10)
    expect(updateFrame([frame], 'f1', { color: null })[0].color).toBeNull()
    expect(updateFrame([frame], 'jiný', { title: 'X' })).toEqual([frame])
    expect(frame.title).toBe('Výzkum')
  })

  it('removeFrame odebere rámeček', () => {
    expect(removeFrame([frame, { ...frame, id: 'f2' }], 'f1').map((f) => f.id)).toEqual(['f2'])
    expect(removeFrame(undefined, 'f1')).toEqual([])
  })

  it('resizeFrame drží minimum', () => {
    expect(resizeFrame(frame, 50.4, -20)).toEqual({ width: 450, height: 280 })
    expect(resizeFrame(frame, -1000, -1000)).toEqual({ width: FRAME_MIN_WIDTH, height: FRAME_MIN_HEIGHT })
    expect(resizeFrame(frame, NaN, undefined)).toEqual({ width: 400, height: 300 })
  })
})

describe('sortFramesForRender / nextFrameTitle', () => {
  it('větší rámečky dospod', () => {
    const small = { ...frame, id: 's', width: 200, height: 200 }
    const big = { ...frame, id: 'b', width: 900, height: 900 }
    expect(sortFramesForRender([small, big, frame]).map((f) => f.id)).toEqual(['b', 'f1', 's'])
  })

  it('nextFrameTitle vybere první volné číslo', () => {
    expect(nextFrameTitle([], 'Rámeček')).toBe('Rámeček 1')
    expect(nextFrameTitle([{ title: 'Rámeček 1' }, { title: 'Výzkum' }], 'Rámeček')).toBe('Rámeček 2')
    expect(nextFrameTitle([{ title: 'Rámeček 2' }], 'Rámeček')).toBe('Rámeček 1')
    expect(nextFrameTitle(undefined, 'R')).toBe('R 1')
  })
})
