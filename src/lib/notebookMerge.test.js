import { describe, it, expect } from 'vitest'
import { verifyQuotes, extractQuotedSegments, findAlteredQuotes, changedFields, fallbackMerge } from './notebookMerge.js'

const notes = `Rozhovor s Petrem (nákupčí):
Petr říká: „Objednávám každé pondělí,
většinou přes telefon.“ Chtěl by vidět stav dodávky.`

describe('verifyQuotes', () => {
  it('najde výňatek i s jinými bílými znaky a vrátí přesné znění zdroje', () => {
    const [q] = verifyQuotes(['Objednávám každé pondělí, většinou přes telefon.'], notes)
    expect(q).toEqual({ text: 'Objednávám každé pondělí,\nvětšinou přes telefon.', verified: true })
  })

  it('odstraní uvozovky přidané kolem výňatku', () => {
    expect(verifyQuotes(['"Chtěl by vidět stav dodávky."'], notes)).toEqual([{ text: 'Chtěl by vidět stav dodávky.', verified: true }])
  })

  it('pozměněný výňatek označí jako neověřený, duplicity a prázdné vynechá', () => {
    expect(verifyQuotes(['Chce vidět stav dodávky', '', null, 'Chce vidět stav dodávky'], notes)).toEqual([
      { text: 'Chce vidět stav dodávky', verified: false },
    ])
    expect(verifyQuotes(null, notes)).toEqual([])
  })

  it('přijme i už ověřené položky { text }', () => {
    expect(verifyQuotes([{ text: 'Rozhovor s Petrem' }], notes)[0].verified).toBe(true)
  })
})

describe('extractQuotedSegments / findAlteredQuotes', () => {
  it('najde citace v různých uvozovkách, krátké úseky ignoruje', () => {
    expect(extractQuotedSegments('Řekl „Objednávám každé pondělí“ a "to je vše, díky". Tzv. „UX“.')).toEqual([
      'Objednávám každé pondělí', 'to je vše, díky',
    ])
  })

  it('upozorní na citaci, kterou AI pozměnila; doslovnou nebo z původního záznamu ne', () => {
    const fields = {
      needs: 'Pravidelné objednávky („Objednávám každé pondělí, většinou přes telefon.“)',
      problems: 'Uvedl: „Objednávám každý pondělí přes telefon“',
      context: 'Dříve: „Staré znění z minulého rozhovoru“',
    }
    const altered = findAlteredQuotes(fields, [notes, 'Staré znění z minulého rozhovoru'])
    expect(altered).toEqual([{ field: 'problems', text: 'Objednávám každý pondělí přes telefon' }])
  })

  it('pole quote kontroluje celé', () => {
    expect(findAlteredQuotes({ quote: '„Objednávám každé pondělí“' }, [notes])).toEqual([])
    expect(findAlteredQuotes({ quote: 'Objednávám vždy v pondělí' }, [notes])).toEqual([{ field: 'quote', text: 'Objednávám vždy v pondělí' }])
  })
})

describe('changedFields', () => {
  it('vrátí jen pole, která se liší (bez systémových)', () => {
    const entity = { id: 'a', name: 'Petr', needs: 'A', status: 'persona' }
    expect(changedFields(entity, { id: 'b', name: 'Petr ', needs: 'A\n\nB', status: 'persona', quote: '' })).toEqual({ needs: 'A\n\nB' })
    expect(changedFields(null, { name: 'X' })).toEqual({ name: 'X' })
  })
})

describe('fallbackMerge', () => {
  const entity = { needs: 'Rychlé objednání. Přehled o dodávce.', status: 'protopersona', problems: '' }

  it('textová pole doplní novými větami, výčty přepíše, nic nezmizí', () => {
    expect(fallbackMerge(entity, { needs: 'Přehled o dodávce. Objednávka z mobilu.', status: 'persona', problems: 'Telefonování.' }, { textKeys: ['needs', 'problems'] })).toEqual({
      needs: 'Rychlé objednání. Přehled o dodávce.\n\nObjednávka z mobilu.',
      status: 'persona',
      problems: 'Telefonování.',
    })
  })

  it('beze změny vrátí prázdný objekt', () => {
    expect(fallbackMerge(entity, { needs: 'přehled o dodávce.' }, { textKeys: ['needs'] })).toEqual({})
    expect(fallbackMerge(entity, null)).toEqual({})
  })
})
