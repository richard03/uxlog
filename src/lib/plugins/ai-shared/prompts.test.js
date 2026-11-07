/**
 * Unit testy pro AI prompt buildery a parsery – analýza konkurence.
 */

import { describe, it, expect } from 'vitest'
import {
  buildSourcesContext,
  buildNotebookPrompt as buildNotebookPromptForChat,
  buildAskPrompt as buildAskPromptForSources,
  buildCompetitionAnalysisPrompt,
  parseCompetitionAnalysis,
  parseActions,
  aiFieldToPlainString,
  buildAskContext,
  buildAskNotes,
  buildAskPrompt,
  parseAskAnswer,
  buildAskMethodology,
  buildNotebookPrompt,
  NOTEBOOK_METHOD_RULES,
  salvageActions,
  splitNotebookText,
  mergeActions,
  processNotebookInParts,
  detectTextLanguage,
  buildLanguageRule,
  buildConnectionsPrompt,
  buildProjectContext,
  buildMergePrompt,
  parseMergeResult,
  notebookFieldKeys,
  deriveEntityName,
  ensureActionName,
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

describe('buildNotebookPrompt – metodika', () => {
  it('obsahuje nová pole entit a metodická pravidla', () => {
    const p = buildNotebookPrompt('poznámky', '(nic)')
    expect(p).toContain('category (data/function/quality/constraint)')
    expect(p).toContain('attitude (positive/neutral/negative)')
    expect(p).toContain('trigger, outcome')
    expect(p).toContain('competitorType (direct/indirect)')
    expect(p).toContain(NOTEBOOK_METHOD_RULES)
    expect(NOTEBOOK_METHOD_RULES).toContain('Myslím si, že')
    expect(NOTEBOOK_METHOD_RULES).toContain('ne konkrétní řešení')
  })
})

describe('buildAskMethodology', () => {
  it('vypíše metodiku aktivit s postupem a výstupy', () => {
    const m = buildAskMethodology([
      { name: 'Kick-off', guide: { why: 'Sjednotí očekávání.', when: 'Na začátku.', duration: '', who: 'Tým', steps: ['Pozvi lidi', 'Proveď workshop'], outputs: ['Zápis'] } },
    ])
    expect(m).toBe('### Kick-off\nProč: Sjednotí očekávání.\nKdy: Na začátku.\nKoho potřebuji: Tým\nPostup:\n1. Pozvi lidi\n2. Proveď workshop\nVýstupy:\n1. Zápis')
  })

  it('vynechá aktivity bez metodiky, duplicity a poškozená data', () => {
    const m = buildAskMethodology([
      null,
      { name: 'Vlastní', guide: null },
      { name: '', guide: { why: 'x' } },
      { name: 'A', guide: { why: 'první' } },
      { name: 'A', guide: { why: 'druhá' } },
      { name: 'B', guide: { steps: 'není pole' } },
    ])
    expect(m).toBe('### A\nProč: první')
  })

  it('bez metodiky vrátí zástupný text', () => {
    expect(buildAskMethodology(undefined)).toBe('(projekt nemá aktivity s metodikou)')
  })
})

describe('buildAskPrompt – metodika', () => {
  it('vloží sekci metodiky a pravidlo pro metodické dotazy', () => {
    const p = buildAskPrompt('Jak na kick-off?', 'ctx', 'notes', '### Kick-off\nProč: x')
    expect(p).toContain('## Metodika aktivit projektu:\n### Kick-off')
    expect(p).toContain('„Metodika aktivit projektu“')
  })
})

describe('dlouhé poznámky – useknutá odpověď a zpracování po částech', () => {
  const action = (name, extra = {}) => ({ type: 'create', entity: 'persona', entityId: null, entityName: name, fields: { name, ...extra }, sourceText: 'x' })

  it('salvageActions vytáhne kompletní akce z useknutého JSONu', () => {
    const full = JSON.stringify({ actions: [action('Jana'), action('Petr, "Pepa"')] })
    const truncated = full.slice(0, full.indexOf('Petr') + 6)
    expect(salvageActions(truncated).map((a) => a.entityName)).toEqual(['Jana'])
    expect(salvageActions(full)).toHaveLength(2)
    expect(salvageActions('nic')).toEqual([])
  })

  it('parseActions u useknuté odpovědi vrátí kompletní akce a příznak truncated', () => {
    const full = JSON.stringify({ actions: [action('Jana'), action('Petr')] })
    const res = parseActions(full.slice(0, -20))
    expect(res.truncated).toBe(true)
    expect(res.actions.map((a) => a.entityName)).toEqual(['Jana'])
  })

  it('parseActions bez jediné kompletní akce vyhodí srozumitelnou chybu', () => {
    expect(() => parseActions('{"actions": [{"type": "cre')).toThrow(/neúplnou nebo neplatnou odpověď/)
  })

  it('parseActions omezí citace (bez výpustky) a starší sourceText převede na quotes', () => {
    const res = parseActions(JSON.stringify({ actions: [{ ...action('A'), quotes: ['y'.repeat(1000), 'b', 'b', ''] }] }))
    expect(res.actions[0].quotes).toEqual(['y'.repeat(400), 'b'])
    expect(parseActions(JSON.stringify({ actions: [action('B')] })).actions[0]).toMatchObject({ quotes: ['x'] })
    expect(parseActions(JSON.stringify({ actions: [action('B')] })).actions[0]).not.toHaveProperty('sourceText')
  })

  it('prompt zápisníku nežádá opisování celého textu a omezuje citace', () => {
    const p = buildNotebookPrompt('text', 'ctx', { index: 2, total: 3 })
    expect(p).not.toContain('residualText')
    expect(p).toContain('nejvýše 400 znaků')
    expect(p).toContain('DOSLOVA')
    expect(p).toContain('"quotes"')
    expect(p).toContain('část 2 z 3')
  })

  it('splitNotebookText dělí po odstavcích, dlouhé odstavce po větách a nic neztratí', () => {
    expect(splitNotebookText('krátký')).toEqual(['krátký'])
    expect(splitNotebookText('   ')).toEqual([])
    const paras = Array.from({ length: 10 }, (_, i) => `Odstavec ${i}. ` + 'slovo '.repeat(30))
    const chunks = splitNotebookText(paras.join('\n\n'), 500)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.length <= 500)).toBe(true)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(paras.join(' ').replace(/\s+/g, ' ').trim())
    const oneLong = 'x'.repeat(1200)
    expect(splitNotebookText(oneLong, 500).join('')).toBe(oneLong)
  })

  it('mergeActions spojí stejný záznam z více částí', () => {
    const merged = mergeActions([
      [action('Jana', { description: 'Účetní' })],
      [action('jana', { description: 'Pracuje z domova', needs: 'Rychlost' }), { type: 'update', entity: 'goal', entityId: 'g1', entityName: 'Cíl', fields: { metrics: 'A' } }],
      [{ type: 'update', entity: 'goal', entityId: 'g1', entityName: 'Cíl', fields: { metrics: 'A' } }],
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0].fields).toEqual({ name: 'Jana', description: 'Účetní\n\nPracuje z domova', needs: 'Rychlost' })
    expect(merged[1].fields.metrics).toBe('A')
  })

  it('processNotebookInParts zpracuje text po částech, chybnou část zopakuje a nahlásí', async () => {
    const text = ['Jana je účetní.', 'Petr je vedoucí.', 'Eva je studentka.'].join('\n\n')
    let calls = 0
    const callModel = async (prompt) => {
      calls++
      if (prompt.includes('Eva')) return '{"actions": [' // vždy useknuté bez kompletní akce
      const name = prompt.includes('Jana') ? 'Jana' : 'Petr'
      return JSON.stringify({ actions: [action(name)] })
    }
    const res = await processNotebookInParts(text, 'ctx', callModel, 20)
    expect(res.actions.map((a) => a.entityName)).toEqual(['Jana', 'Petr'])
    expect(res).toMatchObject({ failedParts: 1, totalParts: 3 })
    expect(calls).toBe(4) // část s Evou se zkusila dvakrát
  })

  it('processNotebookInParts: zrušení ukončí celé zpracování, vypršení limitu se neopakuje', async () => {
    const text = ['Jana je účetní.', 'Petr je vedoucí.', 'Eva je studentka.'].join('\n\n')
    let calls = 0
    const cancelled = Object.assign(new Error('zrušeno'), { code: 'AI_CANCELLED' })
    await expect(processNotebookInParts(text, 'ctx', async () => { calls++; throw cancelled }, 20)).rejects.toBe(cancelled)
    expect(calls).toBe(1)

    calls = 0
    const callModel = async (prompt) => {
      calls++
      if (prompt.includes('Petr')) throw Object.assign(new Error('limit'), { code: 'AI_TIMEOUT' })
      return JSON.stringify({ actions: [action(prompt.includes('Jana') ? 'Jana' : 'Eva')] })
    }
    const res = await processNotebookInParts(text, 'ctx', callModel, 20)
    expect(res).toMatchObject({ failedParts: 1, totalParts: 3 })
    expect(calls).toBe(3) // část s Petrem jen jednou
  })

  it('processNotebookInParts vyhodí chybu, když nezíská žádnou akci kvůli selhání', async () => {
    await expect(processNotebookInParts('text', 'ctx', async () => 'nesmysl')).rejects.toThrow(/neúplnou nebo neplatnou/)
    await expect(processNotebookInParts('text', 'ctx', async () => '{"actions": []}')).resolves.toMatchObject({ actions: [], failedParts: 0 })
  })
})

describe('jazyk odpovědi AI', () => {
  it('detectTextLanguage rozpozná češtinu podle diakritiky', () => {
    expect(detectTextLanguage('Uživatel řekl, že potřebuje přehled objednávek.')).toBe('cs')
    expect(detectTextLanguage('Účastník chce šetřit čas')).toBe('cs')
    expect(detectTextLanguage('The user needs an overview of orders.')).toBeNull()
    expect(detectTextLanguage('Pouzivatel potrebuje prehlad')).toBeNull()
    expect(detectTextLanguage('Používateľ potrebuje väčší prehľad')).toBeNull()
    expect(detectTextLanguage('Kolik máme person a jaké jsou?')).toBe('cs')
    expect(detectTextLanguage('¿Qué día es hoy?')).toBeNull()
    expect(detectTextLanguage('Café im Büro')).toBeNull()
  })

  it('detectTextLanguage toleruje prázdný a neplatný vstup', () => {
    expect(detectTextLanguage('')).toBeNull()
    expect(detectTextLanguage('   ')).toBeNull()
    expect(detectTextLanguage(null)).toBeNull()
    expect(detectTextLanguage(42)).toBeNull()
  })

  it('buildLanguageRule u češtiny výslovně žádá češtinu, jinak jazyk uživatele', () => {
    const cs = buildLanguageRule('Rozhovor s uživatelkou o nákupu', { source: 'poznámky', output: 'Texty', json: true })
    expect(cs).toMatch(/čeština/)
    expect(cs).toMatch(/nepřekládej do angličtiny/)
    expect(cs).toMatch(/klíče JSON/)
    const other = buildLanguageRule('Interview notes', { source: 'poznámky', output: 'Texty' })
    expect(other).toMatch(/ve stejném jazyce jako poznámky/)
    expect(other).not.toMatch(/klíče JSON/)
  })

  it('prompt zápisníku obsahuje pravidlo jazyka podle poznámek (i u části bez diakritiky)', () => {
    expect(buildNotebookPrompt('Uživatelka řekla, že nákup je složitý.', 'ctx')).toMatch(/Jazyk – poznámky uživatele: čeština/)
    const part = buildNotebookPrompt('Jana, Petr', 'ctx', { index: 2, total: 2 }, 'Rozhovor s uživateli: Jana, Petr – nákup je složitý')
    expect(part).toMatch(/Jazyk – poznámky uživatele: čeština/)
  })

  it('processNotebookInParts určí jazyk z celých poznámek', async () => {
    const prompts = []
    const text = 'Jana Petr Karel\n\nUživatelka řekla, že nákup je složitý.'
    await processNotebookInParts(text, 'ctx', async (p) => { prompts.push(p); return '{"actions": []}' }, 20)
    expect(prompts.length).toBeGreaterThan(1)
    for (const p of prompts) expect(p).toMatch(/Jazyk – poznámky uživatele: čeština/)
  })

  it('dotaz, analýza konkurence i souvislosti respektují jazyk uživatele', () => {
    expect(buildAskPrompt('Kolik máme person a jaké jsou?', 'ctx', 'notes')).toMatch(/Jazyk – dotaz uživatele: čeština/)
    expect(buildAskPrompt('How many personas do we have?', 'ctx', 'notes')).toMatch(/ve stejném jazyce jako dotaz uživatele/)
    expect(buildCompetitionAnalysisPrompt('e-shop se šperky a hodinkami', 'ctx')).toMatch(/čeština/)
    expect(buildConnectionsPrompt({ id: 'p1', name: 'Jana', description: 'Matka dvou dětí, nakupuje přes mobil' }, 'personas', 'ctx'))
      .toMatch(/Jazyk – texty aktuální entity: čeština/)
  })
})

describe('doplňování existujících záznamů', () => {
  it('přehled projektu obsahuje zkrácený obsah záznamů', () => {
    const ctx = buildProjectContext({
      personas: [{ id: 'p1', code: 'PER-001', name: 'Jana', status: 'persona', description: 'Nákupčí velkoobchodu', needs: 'x'.repeat(500) }],
      teamMembers: [{ id: 'm', name: 'Petr', role: 'UX' }],
    })
    expect(ctx).toContain('O záznamu: Nákupčí velkoobchodu | xxx')
    expect(ctx.split('\n').find((l) => l.includes('PER-001')).length).toBeLessThan(340)
    expect(ctx).toContain('Jméno:Petr Role:UX')
  })

  it('prompt zápisníku: tatáž entita jinými slovy → update, nová (i podobná) → create', () => {
    const p = buildNotebookPrompt('Rozhovor s nákupčí', 'ctx')
    expect(p).toMatch(/TÉŽE entitě.*i pod jiným jménem, z jiného pohledu/)
    expect(p).toMatch(/Novou entitu vždy založ, i když se některé existující podobá/)
    expect(p).toMatch(/Pokud si nejsi jistý, že jde o tutéž entitu, použij "create"/)
  })

  it('mergeActions sloučí citace z částí bez duplicit', () => {
    const a = { type: 'update', entity: 'persona', entityId: 'p1', entityName: 'Jana', fields: { needs: 'A' }, quotes: ['q1'] }
    const b = { ...a, fields: { needs: 'B' }, quotes: ['q1', 'q2'] }
    const [merged] = mergeActions([[a], [b]])
    expect(merged.quotes).toEqual(['q1', 'q2'])
  })

  it('merge prompt obsahuje současné hodnoty, citace a pravidlo o doslovných citacích', () => {
    const p = buildMergePrompt('persona', { name: 'Jana', needs: 'Rychlé objednání.', quote: '' }, ['„Objednávám každé pondělí.“'], {
      proposed: { needs: 'Objednávka z mobilu' },
      languageSample: 'Rozhovor s nákupčí, objednává každé pondělí přes telefon.',
    })
    expect(p).toContain('### needs\nRychlé objednání.')
    expect(p).toContain('### quote\n(prázdné)')
    expect(p).toContain('1. <<<„Objednávám každé pondělí.“>>>')
    expect(p).toContain('- needs: Objednávka z mobilu')
    expect(p).toMatch(/DOSLOVA, znak po znaku/)
    expect(p).toMatch(/CELÉ nové znění/)
    expect(p).toMatch(/čeština/)
  })

  it('parseMergeResult toleruje markdown a text kolem, ponechá jen povolená pole', () => {
    const res = parseMergeResult('Tady:\n```json\n{ "fields": { "needs": ["A", "B"], "id": "x", "foo": "y" } }\n```', 'persona')
    expect(res).toEqual({ fields: { needs: 'A\nB' } })
    expect(parseMergeResult('{"fields":{}}', 'persona')).toEqual({ fields: {} })
    expect(() => parseMergeResult('nic', 'persona')).toThrow(/neplatnou odpověď/)
  })

  it('deriveEntityName vezme první větu textu a dlouhou zkrátí na hranici slova', () => {
    expect(deriveEntityName({ description: 'Nákupčí velkoobchodu. Objednává každé pondělí.' })).toBe('Nákupčí velkoobchodu')
    expect(deriveEntityName({ status: 'persona', needs: '- Přehled o dodávce' })).toBe('Přehled o dodávce')
    const long = deriveEntityName({ description: 'Uživatel potřebuje mít neustále přehled o tom, kde se právě nachází jeho objednané zboží a kdy dorazí' })
    expect(long.length).toBeLessThanOrEqual(61)
    expect(long.endsWith('…')).toBe(true)
    expect(long).not.toMatch(/\s…$/)
    expect(deriveEntityName({ code: 'PER-001', url: 'https://x.cz', status: 'persona' })).toBe('')
    expect(deriveEntityName(null)).toBe('')
  })

  it('parseActions doplní chybějící název nové entity (z entityName, jinak z textu)', () => {
    const parse = (a) => parseActions(JSON.stringify({ actions: [a] })).actions[0]
    const base = { type: 'create', entity: 'requirement', entityId: null, quotes: [] }
    expect(parse({ ...base, entityName: 'Sledování dodávky', fields: { description: 'X' } }).fields.name).toBe('Sledování dodávky')
    const derived = parse({ ...base, entityName: '', fields: { name: '  ', description: 'Nákupčí vidí stav dodávky. Bez telefonu.' } })
    expect(derived.fields.name).toBe('Nákupčí vidí stav dodávky')
    expect(derived.entityName).toBe('Nákupčí vidí stav dodávky')
  })

  it('u úpravy prázdný název z návrhu vypadne (nesmaže stávající)', () => {
    expect(ensureActionName({ type: 'update', entityId: 'p1', fields: { name: '', needs: 'A' } }).fields).toEqual({ needs: 'A' })
  })

  it('prompt vyžaduje název nové entity', () => {
    expect(buildNotebookPrompt('text', 'ctx')).toMatch(/"name" v "fields" POVINNÉ/)
    expect(buildMergePrompt('persona', {}, [])).toMatch(/"name" nikdy nevracej prázdné/)
  })

  it('notebookFieldKeys vrací klíče bez popisu výčtu', () => {
    expect(notebookFieldKeys('risk')).toContain('likelihood')
    expect(notebookFieldKeys('nic')).toEqual([])
  })
})

describe('zdroje a chat', () => {
  const sources = [
    { code: 'ZDR-001', name: 'Rozhovor s Janou', kind: 'interview', content: 'Jana platí kartou.', createdAt: '2026-11-01' },
    { code: 'ZDR-002', name: 'Mail od klienta', kind: 'email', content: 'Chceme rychlejší objednávku.', createdAt: '2026-11-03' },
    { code: 'ZDR-003', name: 'Prázdný', kind: 'other', content: '  ', createdAt: '2026-11-04' },
  ]

  it('buildSourcesContext: od nejnovějších, s kódem a typem, bez prázdných', () => {
    const text = buildSourcesContext(sources)
    expect(text.indexOf('ZDR-002')).toBeLessThan(text.indexOf('ZDR-001'))
    expect(text).toContain('### ZDR-001 Rozhovor s Janou (přepis rozhovoru)\nJana platí kartou.')
    expect(text).not.toContain('ZDR-003')
    expect(buildSourcesContext(null)).toBe('')
  })

  it('buildSourcesContext dodrží limit délky', () => {
    expect(buildSourcesContext(sources, 80)).toContain('ZDR-002')
    expect(buildSourcesContext(sources, 80)).not.toContain('ZDR-001')
  })

  it('prompt pro pokyn ke změně obsahuje pokyn a zdroje, prompt pro poznámky ne', () => {
    const instruction = buildNotebookPromptForChat('Založ personu podle rozhovoru s Janou', '(nic)', null, 'Založ personu', { instruction: true, sources: 'ZDROJE-TEXT' })
    expect(instruction).toContain('## Pokyn uživatele:')
    expect(instruction).toContain('ZDROJE-TEXT')
    const notes = buildNotebookPromptForChat('Poznámka ze schůzky', '(nic)')
    expect(notes).toContain('## Poznámky ze zápisníku:')
    expect(notes).not.toContain('Pokyn uživatele')
  })

  it('dotaz dostane zdroje projektu', () => {
    expect(buildAskPromptForSources('Co říkala Jana?', '(data)', '(nic)', undefined, 'ZDROJE-TEXT')).toContain('ZDROJE-TEXT')
    expect(buildAskPromptForSources('Co?', '(data)', '(nic)')).toContain('(projekt nemá žádné zdroje)')
  })
})
