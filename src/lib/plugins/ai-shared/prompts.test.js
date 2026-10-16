/**
 * Unit testy pro AI prompt buildery a parsery – analýza konkurence.
 */

import { describe, it, expect } from 'vitest'
import {
  buildCompetitionAnalysisPrompt,
  parseCompetitionAnalysis,
  parseActions,
  aiFieldToPlainString,
  buildAskContext,
  buildAskNotes,
  buildAskPrompt,
  parseAskAnswer,
} from './prompts.js'

describe('buildCompetitionAnalysisPrompt', () => {
  it('obsahuje téma uživatele v promptu', () => {
    const prompt = buildCompetitionAnalysisPrompt('e-shop se šperky', '(žádné záznamy)')
    expect(prompt).toContain('e-shop se šperky')
  })

  it('obsahuje kontext projektu', () => {
    const ctx = '## Konkurence\n- ID:abc Název:Existing'
    const prompt = buildCompetitionAnalysisPrompt('téma', ctx)
    expect(prompt).toContain('Existing')
  })

  it('instruuje AI vrátit JSON s competitors polem', () => {
    const prompt = buildCompetitionAnalysisPrompt('cokoliv', '')
    expect(prompt).toContain('"competitors"')
  })
})

describe('parseCompetitionAnalysis', () => {
  it('parsuje validní JSON odpověď', () => {
    const json = JSON.stringify({
      competitors: [
        {
          name: 'Test Co',
          url: 'https://test.com',
          description: 'popis',
          strengths: 'silné',
          weaknesses: 'slabé',
          inspiration: 'inspirace',
        },
      ],
    })
    const result = parseCompetitionAnalysis(json)
    expect(result.actions).toHaveLength(1)
    expect(result.actions[0].type).toBe('create')
    expect(result.actions[0].entity).toBe('competition')
    expect(result.actions[0].entityName).toBe('Test Co')
    expect(result.actions[0].fields.url).toBe('https://test.com')
    expect(result.actions[0].fields.strengths).toBe('silné')
  })

  it('zpracuje odpověď zabalenou v markdown bloku', () => {
    const json = '```json\n' + JSON.stringify({
      competitors: [{ name: 'X', url: '', description: '', strengths: '', weaknesses: '', inspiration: '' }],
    }) + '\n```'
    const result = parseCompetitionAnalysis(json)
    expect(result.actions).toHaveLength(1)
    expect(result.actions[0].entityName).toBe('X')
  })

  it('odfiltruje konkurenty bez jména', () => {
    const json = JSON.stringify({
      competitors: [
        { name: '', url: 'x', description: '', strengths: '', weaknesses: '', inspiration: '' },
        { name: 'Valid', url: '', description: '', strengths: '', weaknesses: '', inspiration: '' },
      ],
    })
    const result = parseCompetitionAnalysis(json)
    expect(result.actions).toHaveLength(1)
    expect(result.actions[0].entityName).toBe('Valid')
  })

  it('vrátí prázdné pole pro prázdný seznam', () => {
    const result = parseCompetitionAnalysis('{ "competitors": [] }')
    expect(result.actions).toHaveLength(0)
    expect(result.residualText).toBe('')
  })

  it('defaultuje chybějící pole na prázdný řetězec', () => {
    const json = JSON.stringify({
      competitors: [{ name: 'Minimal' }],
    })
    const result = parseCompetitionAnalysis(json)
    expect(result.actions[0].fields.url).toBe('')
    expect(result.actions[0].fields.description).toBe('')
    expect(result.actions[0].fields.strengths).toBe('')
  })

  it('převede pole stringů (SWOT) na víceřádkový text bez JSON závorek', () => {
    const json = JSON.stringify({
      competitors: [
        {
          name: 'Firma',
          strengths: ['rychlost', 'cena'],
          weaknesses: ['podpora'],
          url: '',
          description: '',
          inspiration: '',
        },
      ],
    })
    const result = parseCompetitionAnalysis(json)
    expect(result.actions[0].fields.strengths).toBe('rychlost\ncena')
    expect(result.actions[0].fields.weaknesses).toBe('podpora')
  })
})

describe('aiFieldToPlainString', () => {
  it('spojí pole na řádky', () => {
    expect(aiFieldToPlainString(['a', 'b'])).toBe('a\nb')
  })
})

describe('parseActions', () => {
  it('normalizuje fields z pole na řetězec', () => {
    const payload = {
      actions: [
        {
          type: 'create',
          entity: 'persona',
          entityId: null,
          entityName: 'P',
          fields: { name: 'P', needs: ['x', 'y'] },
          sourceText: 'c',
        },
      ],
      residualText: '',
    }
    const result = parseActions(JSON.stringify(payload))
    expect(result.actions).toHaveLength(1)
    expect(result.actions[0].fields.needs).toBe('x\ny')
  })
})

describe('buildAskContext', () => {
  it('vypíše položku s kódem a názvem, vyplněná pole a vynechá technická', () => {
    const ctx = buildAskContext({
      personas: [{ id: 'x', projectId: 'p', sortOrder: 1, code: 'PER-001', name: 'Jana', description: 'Účetní', motivation: '' }],
    })
    expect(ctx).toContain('## Persony')
    expect(ctx).toContain('- Persona PER-001 „Jana“ | description: Účetní | souvislosti: žádné')
    expect(ctx).not.toContain('projectId')
    expect(ctx).not.toContain('motivation')
  })

  it('zahrne vlastní atributy (customFields)', () => {
    const ctx = buildAskContext({ personas: [{ id: 'x', name: 'Jana', customFields: { vek: 42, mesto: 'Brno', prazdne: '' } }] })
    expect(ctx).toContain('vek: 42 | mesto: Brno')
    expect(ctx).not.toContain('prazdne')
  })

  it('vypíše souvislosti obousměrně i s poznámkou', () => {
    const ctx = buildAskContext({
      personas: [{ id: 'p1', code: 'PER-001', name: 'Jana' }],
      scenarios: [{ id: 's1', code: 'SCN-001', name: 'Nákup' }, { id: 's2', code: 'SCN-002', name: 'Reklamace' }],
      connections: [{ projectId: 'x', entityType1: 'personas', entityId1: 'p1', entityType2: 'scenarios', entityId2: 's1', note: 'hlavní' }],
    })
    expect(ctx).toContain('- Persona PER-001 „Jana“ | souvislosti: Scénář SCN-001 „Nákup“ (poznámka: hlavní)')
    expect(ctx).toContain('- Scénář SCN-001 „Nákup“ | souvislosti: Persona PER-001 „Jana“ (poznámka: hlavní)')
    // nepřiřazený scénář je výslovně označen
    expect(ctx).toContain('- Scénář SCN-002 „Reklamace“ | souvislosti: žádné')
  })

  it('ignoruje starší pole ID v entitách (UI je nezobrazuje, addScenario je plní všemi scénáři)', () => {
    const ctx = buildAskContext({
      personas: [{ id: 'p1', name: 'Jana', scenarioIds: ['s1'] }],
      scenarios: [{ id: 's1', name: 'Nákup', personaIds: ['p1'] }],
    })
    expect(ctx).toContain('- Persona „Jana“ | souvislosti: žádné')
    expect(ctx.split('\n')).toContain('- Scénář „Nákup“ | souvislosti: žádné')
    expect(ctx).not.toContain('scenarioIds')
  })

  it('stejnou souvislost zadanou z obou stran vypíše jednou', () => {
    const ctx = buildAskContext({
      personas: [{ id: 'p1', name: 'Jana' }],
      scenarios: [{ id: 's1', name: 'Nákup' }],
      connections: [
        { entityType1: 'personas', entityId1: 'p1', entityType2: 'scenarios', entityId2: 's1' },
        { entityType1: 'scenarios', entityId1: 's1', entityType2: 'personas', entityId2: 'p1', note: 'pozn' },
      ],
    })
    expect(ctx).toContain('- Persona „Jana“ | souvislosti: Scénář „Nákup“ (poznámka: pozn)')
    expect(ctx.split('\n')).toContain('- Scénář „Nákup“ | souvislosti: Persona „Jana“ (poznámka: pozn)')
  })

  it('vynechá odkazy na smazané položky a poškozené souvislosti', () => {
    const ctx = buildAskContext({
      personas: [{ id: 'p1', name: 'Jana' }],
      connections: [null, { entityType1: 'personas', entityId1: 'p1', entityType2: 'goals', entityId2: 'neni' }, { entityType1: 'personas' }],
    })
    expect(ctx).toContain('- Persona „Jana“ | souvislosti: žádné')
  })

  it('zkrátí dlouhá pole a snese chybějící/poškozená data', () => {
    const ctx = buildAskContext({ goals: [null, { id: 'g', name: 'G', description: 'x'.repeat(800) }], personas: 'nonsense' })
    expect(ctx).toContain('x'.repeat(500) + '…')
    expect(buildAskContext(null)).toBe('(projekt zatím neobsahuje žádné záznamy)')
  })
})

describe('buildAskNotes', () => {
  it('rozliší poznámky a dotazy s odpověďmi', () => {
    const notes = buildAskNotes([
      { mode: 'process', text: 'Schůzka s Janou' },
      { mode: 'ask', text: 'Kdo je Jana?', answer: 'Účetní.' },
      { text: '  ' },
    ])
    expect(notes).toBe('Poznámka: Schůzka s Janou\n\nDotaz: Kdo je Jana?\nOdpověď: Účetní.')
  })

  it('v limitu ponechá nejnovější zprávy', () => {
    const big = Array.from({ length: 30 }, (_, i) => ({ text: `${i}-${'a'.repeat(1000)}` }))
    const notes = buildAskNotes(big)
    expect(notes).toContain('29-')
    expect(notes).not.toContain('Poznámka: 0-')
  })

  it('snese neplatný vstup', () => {
    expect(buildAskNotes(undefined)).toBe('(zatím žádné poznámky)')
  })
})

describe('buildAskPrompt / parseAskAnswer', () => {
  it('prompt obsahuje dotaz, kontext i poznámky a zakazuje změny', () => {
    const p = buildAskPrompt('Kolik máme person?', '## Persony\n- name: Jana', 'Poznámka: x')
    expect(p).toContain('Kolik máme person?')
    expect(p).toContain('name: Jana')
    expect(p).toContain('Poznámka: x')
    expect(p).toContain('nenavrhuj JSON, akce ani změny dat')
    expect(p).toContain('„souvislosti“')
  })

  it('odpověď ořízne a snese null', () => {
    expect(parseAskAnswer('  Dvě.  ')).toEqual({ answer: 'Dvě.' })
    expect(parseAskAnswer(null)).toEqual({ answer: '' })
  })
})
