import { describe, it, expect } from 'vitest'
import {
  getEffectiveActivityChecklist,
  resolveActivityChecklistItemLabel,
  omitChecklistItemTaskLink,
  dropChecklistLinksPointingToTask,
} from './activityChecklistLinks.js'

describe('getEffectiveActivityChecklist', () => {
  it('sloučí šablonu, vynechá removed a přidá vlastní', () => {
    const activity = {
      baseChecklist: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      removedChecklistItems: ['b'],
      customChecklistItems: [{ id: 'c', label: 'C' }],
    }
    expect(getEffectiveActivityChecklist(activity, null)).toEqual([
      { id: 'a', label: 'A' },
      { id: 'c', label: 'C' },
    ])
  })

  it('bez aktivity vrátí prázdné pole', () => {
    expect(getEffectiveActivityChecklist(null, [])).toEqual([])
  })
})

describe('resolveActivityChecklistItemLabel', () => {
  it('použije vlastní popisek, pokud je neprázdný', () => {
    expect(
      resolveActivityChecklistItemLabel({ x: '  Vlastní  ' }, { id: 'x', label: 'Šablona' })
    ).toBe('Vlastní')
  })

  it('při prázdném vlastním textu použije výchozí label', () => {
    expect(resolveActivityChecklistItemLabel({ x: '   ' }, { id: 'x', label: 'Krok' })).toBe('Krok')
  })

  it('bez položky vrátí prázdný řetězec', () => {
    expect(resolveActivityChecklistItemLabel({}, null)).toBe('')
  })
})

describe('omitChecklistItemTaskLink', () => {
  it('odstraní jeden klíč', () => {
    expect(omitChecklistItemTaskLink({ a: 't1', b: 't2' }, 'a')).toEqual({ b: 't2' })
  })

  it('bez mapy vrátí prázdný objekt', () => {
    expect(omitChecklistItemTaskLink(undefined, 'a')).toEqual({})
  })
})

describe('dropChecklistLinksPointingToTask', () => {
  it('odstraní všechny položky checklistu ukazující na úkol', () => {
    expect(
      dropChecklistLinksPointingToTask({ i1: 't1', i2: 't1', i3: 't2' }, 't1')
    ).toEqual({ i3: 't2' })
  })

  it('bez mapy vrátí prázdný objekt', () => {
    expect(dropChecklistLinksPointingToTask(undefined, 't')).toEqual({})
  })
})
