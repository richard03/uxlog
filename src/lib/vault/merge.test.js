import { describe, it, expect } from 'vitest'
import { mergeRecord, mergeIdLists, isMassChange, stableStringify } from './merge.js'

const base = { id: 'x', name: 'Anna', motivation: 'Čas', needs: 'A', scenarioIds: ['s1', 's2'], updatedAt: '1' }

describe('mergeRecord', () => {
  it('pole změněné jen v souboru převezme', () => {
    const r = mergeRecord({ base, app: base, file: { ...base, motivation: 'Rychlost' } })
    expect(r.patch).toEqual({ motivation: 'Rychlost' })
    expect(r.fields).toEqual([{ field: 'motivation', before: 'Čas', after: 'Rychlost' }])
    expect(r.conflicts).toEqual([])
  })

  it('pole změněné jen v aplikaci ponechá', () => {
    const r = mergeRecord({ base, app: { ...base, motivation: 'Z aplikace' }, file: base })
    expect(r.patch).toEqual({})
    expect(r.conflicts).toEqual([])
  })

  it('různá pole změněná na obou stranách sloučí bez konfliktu', () => {
    const r = mergeRecord({ base, app: { ...base, motivation: 'App' }, file: { ...base, needs: 'Soubor' } })
    expect(r.patch).toEqual({ needs: 'Soubor' })
    expect(r.conflicts).toEqual([])
  })

  it('stejné pole změněné na obou stranách různě je konflikt; stejně je v pořádku', () => {
    const r = mergeRecord({ base, app: { ...base, motivation: 'App' }, file: { ...base, motivation: 'Soubor', needs: 'B' } })
    expect(r.patch).toEqual({ needs: 'B' })
    expect(r.conflicts).toEqual([{ field: 'motivation', base: 'Čas', app: 'App', file: 'Soubor' }])
    expect(mergeRecord({ base, app: { ...base, motivation: 'X' }, file: { ...base, motivation: 'X' } }).conflicts).toEqual([])
  })

  it('vazby změněné na obou stranách sloučí jako množiny', () => {
    const r = mergeRecord({
      base, app: { ...base, scenarioIds: ['s1', 's2', 'a3'] }, file: { ...base, scenarioIds: ['s2', 'f4'] },
    })
    expect(r.patch).toEqual({ scenarioIds: ['s2', 'a3', 'f4'] })
    expect(r.conflicts).toEqual([])
  })

  it('bez základu vyhrává soubor', () => {
    const r = mergeRecord({ base: null, app: { ...base, motivation: 'App' }, file: { ...base, motivation: 'Soubor' } })
    expect(r.patch).toEqual({ motivation: 'Soubor' })
    expect(r.conflicts).toEqual([])
  })

  it('ignoruje časová razítka a vyřazená pole; chybějící pole doplní z výchozích hodnot', () => {
    const r = mergeRecord({
      base, app: { id: 'x', name: 'Anna', motivation: 'Čas', needs: 'A', scenarioIds: ['s1', 's2'] },
      file: { ...base, updatedAt: '9', canvas: { x: 1 }, status: 'protopersona' },
      defaults: { status: 'protopersona' }, excluded: ['canvas'],
    })
    expect(r.patch).toEqual({})
  })

  it('odebrané extraSections v souboru odebere', () => {
    const withExtra = { ...base, extraSections: [{ heading: 'X', content: 'y' }] }
    const r = mergeRecord({ base: withExtra, app: withExtra, file: base })
    expect(r.patch).toEqual({ extraSections: undefined })
    expect('extraSections' in r.patch).toBe(true)
  })
})

describe('mergeIdLists', () => {
  it('zachová pořadí aplikace, nové ze souboru přidá na konec', () => {
    expect(mergeIdLists(['a', 'b'], ['b', 'a', 'c'], ['a', 'b', 'd'])).toEqual(['b', 'a', 'c', 'd'])
    expect(mergeIdLists(undefined, ['a'], ['b'])).toEqual(['a', 'b'])
  })
})

describe('isMassChange', () => {
  const limits = { maxDeletes: 10, maxShare: 0.3, minChanges: 5 }
  const state = { projects: [{ id: 'p' }], personas: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, projectId: 'p' })) }
  const changes = (kind, n) => Array.from({ length: n }, (_, i) => ({ kind, projectId: 'p', entityId: `p${i}` }))

  it('víc než maxDeletes smazání je hromadná změna', () => {
    expect(isMassChange(changes('delete', 10), { personas: [] }, limits)).toBe(false)
    expect(isMassChange(changes('delete', 11), { personas: [] }, limits)).toBe(true)
  })

  it('změna víc než podílu záznamů projektu (od minChanges) je hromadná', () => {
    expect(isMassChange(changes('update', 6), state, limits)).toBe(false) // 6/20 = 30 %
    expect(isMassChange(changes('update', 7), state, limits)).toBe(true)
    expect(isMassChange(changes('update', 4), { personas: state.personas.slice(0, 5) }, limits)).toBe(false) // pod minChanges
  })

  it('nové záznamy se nepočítají', () => {
    expect(isMassChange(changes('create', 50), state, limits)).toBe(false)
  })
})

it('stableStringify nezáleží na pořadí klíčů', () => {
  expect(stableStringify({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(stableStringify({ b: [1, { d: 3, c: 2 }], a: 1 }))
})
