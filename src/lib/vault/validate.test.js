import { describe, it, expect } from 'vitest'
import cs from '../../i18n/cs.js'
import { validateVault, formatIssue, getSelectOptions, resolveEntityType, REF_FIELDS } from './validate.js'
import { ENTITY_CONFIG } from '../dataConfig.js'

const project = { path: 'projects/A/project.md', content: '---\nid: p1\n---\n# A\n' }
const persona = (fm, body = '# Anna\n') => ({ path: 'projects/A/personas/per.md', content: `---\nid: per1\ncode: PER-001\n${fm}---\n${body}` })
const scenario = { path: 'projects/A/scenarios/scn.md', content: '---\nid: scn1\ncode: SCN-001\n---\n# Scénář\n' }

const codes = (issues) => issues.map((i) => `${i.level}:${i.code}`)

describe('validateVault', () => {
  it('platný vault nemá žádné problémy', () => {
    const { issues } = validateVault([project, scenario, persona('scenarioIds: [scn1]\n')])
    expect(issues).toEqual([])
  })

  it('odhalí neplatnou hodnotu výběru', () => {
    const { issues } = validateVault([project, persona('status: hotovo\n')])
    expect(issues).toEqual([expect.objectContaining({
      path: 'projects/A/personas/per.md', level: 'error', code: 'invalidOption', field: 'status', value: 'hotovo',
    })])
  })

  it('odhalí odkaz na neexistující záznam i odkaz do jiného projektu', () => {
    const other = { path: 'projects/B/project.md', content: '---\nid: p2\n---\n# B\n' }
    const otherScenario = { path: 'projects/B/scenarios/x.md', content: '---\nid: scn2\n---\n# X\n' }
    const { issues } = validateVault([project, other, otherScenario, persona('scenarioIds: [neni, scn2]\n')])
    expect(issues.filter((i) => i.code === 'danglingRef').map((i) => i.value)).toEqual(['neni', 'scn2'])
  })

  it('odhalí duplicitní kód v projektu a špatný prefix', () => {
    const dup = { path: 'projects/A/personas/dup.md', content: '---\nid: per2\ncode: PER-001\n---\n# B\n' }
    const bad = { path: 'projects/A/personas/bad.md', content: '---\nid: per3\ncode: SCN-009\n---\n# C\n' }
    const { issues } = validateVault([project, persona(''), dup, bad])
    expect(codes(issues)).toEqual(expect.arrayContaining(['error:duplicateCode', 'warning:codePrefix']))
  })

  it('hlásí chyby parsování, chybějící id a název jako problémy', () => {
    const broken = { path: 'projects/A/goals/x.md', content: '---\nid: [\n---\n' }
    const noId = { path: 'projects/A/goals/new.md', content: '# Nový cíl\n' }
    const noName = { path: 'projects/A/goals/n.md', content: '---\nid: g9\n---\n' }
    const { issues } = validateVault([project, broken, noId, noName])
    expect(codes(issues)).toEqual(expect.arrayContaining(['error:yamlSyntax', 'warning:missingId', 'warning:missingName']))
  })

  it('kontroluje souvislosti', () => {
    const conn = {
      path: 'projects/A/connections.yaml',
      content: 'connections:\n  - id: c1\n    entityType1: personas\n    entityId1: per1\n    entityType2: goals\n    entityId2: chybi\n  - id: c2\n    entityType1: auta\n    entityId1: x\n    entityType2: personas\n    entityId2: per1\n',
    }
    const { issues } = validateVault([project, persona(''), conn])
    expect(issues.map((i) => [i.path, i.code])).toEqual([
      ['projects/A/connections.yaml', 'danglingRef'],
      ['projects/A/connections.yaml', 'invalidConnectionType'],
    ])
  })
})

describe('pomocné funkce', () => {
  it('formatIssue složí text z i18n, neznámý kód vrátí jako kód', () => {
    expect(formatIssue({ code: 'invalidOption', field: 'status', value: 'x', allowed: ['', 'a'] }, cs))
      .toBe('Pole „status“ má neplatnou hodnotu „x“ – povolené: (prázdné), a')
    expect(formatIssue({ code: 'neznamy' }, cs)).toBe('neznamy')
    expect(formatIssue({ code: 'yamlSyntax', line: 3, message: 'detail' }, cs)).toBe('Chyba syntaxe YAML na řádku 3 (detail)')
  })

  it('každý kód problému má text v i18n', () => {
    const used = ['yamlSyntax', 'frontmatterUnterminated', 'frontmatterNotMap', 'missingId', 'duplicateField', 'duplicateSection',
      'unknownFile', 'duplicateId', 'missingProjectFile', 'newerFormatVersion', 'invalidConnection', 'connectionsNotList',
      'missingName', 'invalidOption', 'refNotList', 'danglingRef', 'duplicateRef', 'codePrefix', 'duplicateCode', 'invalidConnectionType']
    for (const code of used) expect(cs.vaultIssues[code], code).toBeDefined()
  })

  it('getSelectOptions vrátí jen pole s pevnými možnostmi', () => {
    expect(getSelectOptions('persona').status).toEqual(['protopersona', 'persona'])
    expect(getSelectOptions('task').assignee).toBeUndefined()
  })

  it('všechna pole vazeb z entities.yaml jsou v REF_FIELDS', () => {
    const refKeys = new Set()
    for (const def of Object.values(ENTITY_CONFIG)) {
      for (const [key, value] of Object.entries(def.defaults ?? {})) if (/Ids$/.test(key) && Array.isArray(value)) refKeys.add(key)
    }
    expect([...refKeys].filter((k) => !REF_FIELDS[k])).toEqual([])
  })

  it('resolveEntityType přijme jednotné i množné číslo i složku', () => {
    expect(resolveEntityType('persona').collection).toBe('personas')
    expect(resolveEntityType('personas').collection).toBe('personas')
    expect(resolveEntityType('team').collection).toBe('teamMembers')
    expect(resolveEntityType('auto')).toBeNull()
  })
})
