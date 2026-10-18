/**
 * Unit testy pro YAML serializér.
 */

import { describe, it, expect } from 'vitest'
import { toYaml, parseYaml, stripYamlComment } from './yaml.js'

describe('toYaml', () => {
  it('serializuje primitiva', () => {
    expect(toYaml(null)).toBe('null')
    expect(toYaml(true)).toBe('true')
    expect(toYaml(false)).toBe('false')
    expect(toYaml(42)).toBe('42')
    expect(toYaml('')).toBe("''")
    expect(toYaml('hello')).toBe('hello')
  })

  it('escapuje speciální znaky v řetězcích', () => {
    expect(toYaml('text: s dvojtečkou')).toBe('"text: s dvojtečkou"')
    expect(toYaml('true')).toBe('"true"')
    expect(toYaml('null')).toBe('"null"')
    expect(toYaml('#komentář')).toBe('"#komentář"')
    expect(toYaml('řádek1\nřádek2')).toBe('"řádek1\\nřádek2"')
  })

  it('serializuje prázdné kolekce', () => {
    expect(toYaml([])).toBe('[]')
    expect(toYaml({})).toBe('{}')
  })

  it('serializuje plochý objekt', () => {
    const result = toYaml({ id: 'a1', name: 'Projekt', priority: 'high' })
    expect(result).toBe('id: a1\nname: Projekt\npriority: high')
  })

  it('serializuje objekt s null hodnotou', () => {
    const result = toYaml({ id: 'a1', description: null })
    expect(result).toBe('id: a1\ndescription: null')
  })

  it('serializuje objekt s prázdným polem', () => {
    const result = toYaml({ id: 'a1', tags: [] })
    expect(result).toBe('id: a1\ntags: []')
  })

  it('serializuje pole řetězců', () => {
    const result = toYaml(['alpha', 'beta', 'gamma'])
    expect(result).toBe('- alpha\n- beta\n- gamma')
  })

  it('serializuje pole objektů', () => {
    const result = toYaml([
      { id: 'g1', name: 'Cíl 1' },
      { id: 'g2', name: 'Cíl 2' },
    ])
    expect(result).toBe('- id: g1\n  name: Cíl 1\n- id: g2\n  name: Cíl 2')
  })

  it('serializuje vnořené pole v objektu', () => {
    const result = toYaml({
      projects: [
        { id: 'p1', name: 'E-shop', relatedIds: ['r1', 'r2'] },
      ],
    })
    expect(result).toBe(
      'projects:\n' +
      '  - id: p1\n' +
      '    name: E-shop\n' +
      '    relatedIds:\n' +
      '      - r1\n' +
      '      - r2'
    )
  })

  it('serializuje typickou datovou strukturu aplikace', () => {
    const data = {
      projects: [
        { id: 'p1', name: 'Redesign', scope: 'medium', priority: 'high', phase: 'Design' },
      ],
      goals: [
        { id: 'g1', projectId: 'p1', code: 'GOL-001', name: 'Zvýšit konverzi', description: 'Popsat cíl', metrics: 'KPI > 5%' },
      ],
      stakeholders: [],
    }
    const result = toYaml(data)
    expect(result).toContain('projects:')
    expect(result).toContain('  - id: p1')
    expect(result).toContain('    name: Redesign')
    expect(result).toContain('goals:')
    expect(result).toContain('    code: GOL-001')
    expect(result).toContain('stakeholders: []')
  })
})

describe('parseYaml', () => {
  it('parsuje YAML s projects: [] a personas', () => {
    const yaml = [
      'projects: []',
      'personas:',
      '  - id: 82eb8457-4003-4f64-b0c2-c322fdae722e',
      '    projectId: eccd3ac6-a99c-48b6-b617-5b04a860c7d0',
      '    code: PER-001',
      '    name: designer Richard',
      '    status: protopersona',
      '    description: "UX designér, pracuje v bance pod NDA"',
      '    scenarioIds: []',
      '    requirementIds: []',
    ].join('\n')
    const parsed = parseYaml(yaml)
    expect(parsed).toBeTruthy()
    expect(parsed.projects).toEqual([])
    expect(Array.isArray(parsed.personas)).toBe(true)
    expect(parsed.personas.length).toBe(1)
    expect(parsed.personas[0].id).toBe('82eb8457-4003-4f64-b0c2-c322fdae722e')
    expect(parsed.personas[0].projectId).toBe('eccd3ac6-a99c-48b6-b617-5b04a860c7d0')
    expect(parsed.personas[0].code).toBe('PER-001')
    expect(parsed.personas[0].name).toBe('designer Richard')
  })

  it('parsuje YAML s problematickými Unicode znaky (NBSP)', () => {
    const yaml = 'requirements:\n  - id: r1\n    description: Text\u00A0s\u00A0mezerami'
    const parsed = parseYaml(yaml)
    expect(parsed.requirements[0].description).toBe('Text s mezerami')
  })

  it('odstraní zero-width znaky, které rozbíjejí parsování', () => {
    const yaml = 'requirements:\n  - id: r1\n    description: Text\u200B\u200C\u200Dbez'
    const parsed = parseYaml(yaml)
    expect(parsed.requirements[0].description).toBe('Textbez')
  })

  it('parsuje YAML s vícerořádkovým popisem (pokračování bez key:)', () => {
    const yaml = [
      'requirements:',
      '  - id: r1',
      '    code: R1',
      '    description: První řádek',
      '    pokračování na dalším řádku',
      '    motivation: Krátká motivace',
    ].join('\n')
    const parsed = parseYaml(yaml)
    expect(parsed.requirements[0].description).toBe('První řádek\npokračování na dalším řádku')
    expect(parsed.requirements[0].motivation).toBe('Krátká motivace')
  })

  it('parsuje YAML s CRLF line endings (Windows)', () => {
    const yaml = 'requirements:\r\n  - id: req-1\r\n    code: REQ-001\r\n    name: Test\r\n'
    const parsed = parseYaml(yaml)
    expect(parsed).toBeTruthy()
    expect(parsed.requirements).toHaveLength(1)
    expect(parsed.requirements[0].id).toBe('req-1')
    expect(parsed.requirements[0].code).toBe('REQ-001')
  })

  it('převede Figma LINE SEPARATOR (U+2028) v unquoted hodnotě na odřádkování', () => {
    // Simuluje starý Figma export – \u2028 v hodnotě nezabalené do uvozovek
    const yaml = 'requirements:\n  - id: r1\n    description: Řádek 1\u2028Řádek 2\u2028Řádek 3'
    const parsed = parseYaml(yaml)
    expect(parsed.requirements[0].description).toBe('Řádek 1\nŘádek 2\nŘádek 3')
  })

  it('převede Figma LINE SEPARATOR (U+2028) v quoted hodnotě na odřádkování', () => {
    // Starý Figma export – \u2028 uvnitř quoted stringu (např. hodnota začínající pomlčkou)
    const yaml = 'requirements:\n  - id: r1\n    description: "Řádek 1\u2028Řádek 2"'
    const parsed = parseYaml(yaml)
    expect(parsed.requirements[0].description).toBe('Řádek 1\nŘádek 2')
  })

  it('převede Figma PARAGRAPH SEPARATOR (U+2029) na odřádkování', () => {
    const yaml = 'requirements:\n  - id: r1\n    description: Odstavec A\u2029Odstavec B'
    const parsed = parseYaml(yaml)
    expect(parsed.requirements[0].description).toBe('Odstavec A\nOdstavec B')
  })

  it('převede Figma odrážkový znak (U+2022 •) na pomlčku', () => {
    // Odrážka v hodnotě – \u2022 je interpunkce a projde normalizeParseInput
    const yaml = 'requirements:\n  - id: r1\n    description: \u2022 Položka'
    const parsed = parseYaml(yaml)
    expect(parsed.requirements[0].description).toBe('- Položka')
  })

  it('převede kombinaci Figma oddělovačů a odrážek na čitelný text', () => {
    // Simuluje Figma text: odrážky oddělené LINE SEPARATOR – celé v jedné YAML hodnotě
    const yaml = 'personas:\n  - id: p1\n    needs: \u2022 Rychlé rozhraní\u2028\u2022 Tmavý režim\u2028\u2022 Export dat'
    const parsed = parseYaml(yaml)
    expect(parsed.personas[0].needs).toBe('- Rychlé rozhraní\n- Tmavý režim\n- Export dat')
  })
})

describe('parseYaml – konfigurační režim (config: true)', () => {
  it('ignoruje řádkové komentáře a komentáře za hodnotou', () => {
    const text = [
      '# Hlavička souboru',
      'items:',
      '  # komentář v seznamu',
      '  - key: a # vysvětlivka',
      '    label: "Text # uvnitř uvozovek"',
      '  - key: b',
      'color: "#e05252" # barva',
    ].join('\n')
    expect(parseYaml(text, { config: true })).toEqual({
      items: [{ key: 'a', label: 'Text # uvnitř uvozovek' }, { key: 'b' }],
      color: '#e05252',
    })
  })

  it('podporuje jednoduché uvozovky včetně zdvojeného apostrofu', () => {
    expect(parseYaml("a: 'it''s: ok'\nb: 'x # y'", { config: true })).toEqual({ a: "it's: ok", b: 'x # y' })
  })

  it('bez config režimu se # ani jednoduché uvozovky nezpracovávají (import uživatelských dat)', () => {
    expect(parseYaml("a: Krok #2\nb: 'x'")).toEqual({ a: 'Krok #2', b: "'x'" })
  })
})

describe('stripYamlComment', () => {
  it('odstraní komentář jen mimo uvozovky a jen za mezerou', () => {
    expect(stripYamlComment('  # celý řádek')).toBe('')
    expect(stripYamlComment('a: b # c')).toBe('a: b')
    expect(stripYamlComment('a: b#c')).toBe('a: b#c')
    expect(stripYamlComment('a: "b # c"')).toBe('a: "b # c"')
    expect(stripYamlComment("- 'b # c' # d")).toBe("- 'b # c'")
  })
})
