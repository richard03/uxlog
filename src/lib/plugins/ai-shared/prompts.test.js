/**
 * Unit testy pro AI prompt buildery a parsery – analýza konkurence.
 */

import { describe, it, expect } from 'vitest'
import {
  buildCompetitionAnalysisPrompt,
  parseCompetitionAnalysis,
  parseActions,
  aiFieldToPlainString,
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
