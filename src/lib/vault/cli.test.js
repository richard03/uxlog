import { describe, it, expect } from 'vitest'
import cs from '../../i18n/cs.js'
import { runCliCommand, parseArgs } from './cli.js'
import { markdownToEntity, createHeadingResolver } from './format.js'
import { buildVaultFiles } from './workspace.js'
import { getEmptyData } from '../storage.js'
import { getEntityDefaults } from '../dataConfig.js'

const headingFor = createHeadingResolver(cs)

function vault() {
  return [
    { path: '.uxlog/workspace.yaml', content: 'formatVersion: 1\n' },
    { path: 'projects/E-shop/project.md', content: '---\nid: p1\n---\n# E-shop\n' },
    { path: 'projects/E-shop/personas/PER-001-anna.md', content: '---\nid: per1\ncode: PER-001\nscenarioIds: [scn1]\n---\n# Anna\n\n## Motivace\n\nČas\n' },
    { path: 'projects/E-shop/scenarios/SCN-001-nakup.md', content: '---\nid: scn1\ncode: SCN-001\n---\n# Nákup\n' },
    { path: 'projects/E-shop/scenarios/SCN-002-reklamace.md', content: '---\nid: scn2\ncode: SCN-002\n---\n# Reklamace\n' },
    { path: 'projects/E-shop/connections.yaml', content: 'connections:\n  - id: c1\n    entityType1: personas\n    entityId1: per1\n    entityType2: scenarios\n    entityId2: scn2\n    note: ""\n' },
    { path: 'projects/Jiný/project.md', content: '---\nid: p2\n---\n# Jiný\n' },
    { path: 'projects/Jiný/personas/PER-001-petr.md', content: '---\nid: per9\ncode: PER-001\n---\n# Petr\n' },
  ]
}

let counter = 0
const run = (argv, files = vault(), extra = {}) => runCliCommand(argv, {
  files, messages: cs, now: () => '2026-11-04T12:00:00.000Z', generateId: () => `new-${++counter}`, ...extra,
})
const written = (out, path) => out.writes.find((w) => w.path === path)?.content

describe('parseArgs', () => {
  it('rozliší poziční argumenty, přepínače a opakované --set', () => {
    expect(parseArgs(['new', 'persona', '--project', 'E-shop', '--set', 'a=1', '--set=b=2', '--json'])).toEqual({
      positional: ['new', 'persona'], flags: { project: 'E-shop', set: ['a=1', 'b=2'], json: true },
    })
  })
})

describe('validate', () => {
  it('platný vault → exit 0 a souhrn', () => {
    const out = run(['validate'])
    expect(out.exitCode).toBe(0)
    expect(out.stdout.at(-1)).toBe('Chyb: 0, varování: 0')
  })

  it('chyba → exit 1, řádek s cestou a textem; filtr podle cesty', () => {
    const files = vault()
    files[2].content = files[2].content.replace('scenarioIds: [scn1]', 'status: hotovo')
    const out = run(['validate'], files)
    expect(out.exitCode).toBe(1)
    expect(out.stdout.join('\n')).toContain('projects/E-shop/personas/PER-001-anna.md: chyba: Pole „status“ má neplatnou hodnotu „hotovo“')
    expect(run(['validate', 'projects/E-shop/scenarios'], files).exitCode).toBe(0)
  })

  it('--json vrátí strojově čitelný výstup', () => {
    const data = JSON.parse(run(['validate', '--json']).stdout[0])
    expect(data).toEqual({ errors: 0, warnings: 0, issues: [] })
  })
})

describe('schema a list', () => {
  it('schema bez typu vypíše typy, s typem pole, sekce a povolené hodnoty', () => {
    expect(run(['schema']).stdout.join('\n')).toContain('persona (personas) – personas/ kód: PER')
    const text = run(['schema', 'persona']).stdout.join('\n')
    expect(text).toContain('## Motivace   (motivation)')
    expect(text).toContain('status: string  povolené: protopersona | persona')
    expect(text).toContain('scenarioIds: list  → scenarios')
    expect(run(['schema', 'auto']).exitCode).toBe(1)
  })

  it('list vypíše záznamy, filtruje podle typu a projektu', () => {
    const out = run(['list', 'persona', '--project', 'E-shop'])
    expect(out.stdout).toEqual(['PER-001\tAnna\tprojects/E-shop/personas/PER-001-anna.md\tper1'])
  })
})

describe('new', () => {
  it('vytvoří záznam s id, dalším kódem a výchozími hodnotami', () => {
    const out = run(['new', 'scenario', '--project', 'E-shop', '--name', 'Vrácení zboží', '--set', 'priority=must', '--set', 'personaIds=per1'])
    expect(out.exitCode).toBe(0)
    const path = 'projects/E-shop/scenarios/SCN-003-vraceni-zbozi.md'
    expect(out.stdout[0]).toMatch(/^Vytvořeno: projects\/E-shop\/scenarios\/SCN-003-vraceni-zbozi\.md \(id new-\d+, kód SCN-003\)$/)
    const { entity } = markdownToEntity('scenario', written(out, path), { headingFor })
    expect(entity).toMatchObject({ code: 'SCN-003', name: 'Vrácení zboží', priority: 'must', personaIds: ['per1'], createdAt: '2026-11-04T12:00:00.000Z' })
    expect(written(out, path)).toContain('- per1 # PER-001 Anna')
  })

  it('odmítne záznam, který by přinesl chybu (neplatná hodnota, neexistující vazba)', () => {
    const out = run(['new', 'persona', '--project', 'E-shop', '--name', 'X', '--set', 'status=hotovo'])
    expect(out.exitCode).toBe(1)
    expect(out.writes).toEqual([])
    expect(out.stderr[0]).toBe(cs.vaultCli.rejected)
    expect(run(['new', 'persona', '--project', 'E-shop', '--name', 'X', '--set', 'scenarioIds=neni']).exitCode).toBe(1)
  })

  it('hlídá projekt, název a zakázaná pole', () => {
    expect(run(['new', 'persona', '--name', 'X']).stderr[0]).toBe(cs.vaultCli.projectRequired)
    expect(run(['new', 'persona', '--project', 'Neni', '--name', 'X']).stderr[0]).toBe(cs.vaultCli.projectNotFound)
    expect(run(['new', 'persona', '--project', 'E-shop']).stderr[0]).toBe(cs.vaultCli.nameRequired)
    expect(run(['new', 'persona', '--project', 'E-shop', '--name', 'X', '--set', 'id=1']).exitCode).toBe(1)
  })

  it('kolize názvu souboru dostane příponu', () => {
    const files = vault()
    files.push({ path: 'projects/E-shop/goals/GOL-001-cil.md', content: '---\nid: g0\n---\n# Bez kódu\n' })
    const out = run(['new', 'goal', '--project', 'E-shop', '--name', 'Cíl'], files)
    expect(out.writes[0].path).toBe('projects/E-shop/goals/GOL-001-cil-2.md')
  })

  it('vytvoří projekt', () => {
    const out = run(['new', 'project', '--name', 'Nový: projekt'])
    expect(out.writes[0].path).toBe('projects/Nový- projekt/project.md')
    expect(out.writes[0].content).toContain('# Nový: projekt')
  })
})

describe('link, unlink, delete', () => {
  it('link přidá vazbu podle kódu v rámci projektu záznamu', () => {
    const out = run(['link', 'PER-001', 'scenarioIds', 'SCN-002', '--project', 'E-shop'])
    expect(out.exitCode).toBe(0)
    const { entity } = markdownToEntity('persona', written(out, 'projects/E-shop/personas/PER-001-anna.md'), { headingFor })
    expect(entity.scenarioIds).toEqual(['scn1', 'scn2'])
    expect(entity.motivation).toBe('Čas')
  })

  it('kód ve více projektech bez --project je nejednoznačný', () => {
    expect(run(['link', 'PER-001', 'scenarioIds', 'SCN-002']).stderr[0]).toBe(cs.vaultCli.entityAmbiguous)
  })

  it('link odmítne špatné pole a cíl jiného typu', () => {
    expect(run(['link', 'per1', 'goalIds', 'SCN-002']).stderr[0]).toContain('Pole „goalIds“ není vazba typu persona')
    expect(run(['link', 'per1', 'scenarioIds', 'per1']).stderr[0]).toContain('nepatří do scenarios')
  })

  it('unlink odebere vazbu (i podle cesty)', () => {
    const out = run(['unlink', 'projects/E-shop/personas/PER-001-anna.md', 'scenarioIds', 'SCN-001'])
    const { entity } = markdownToEntity('persona', written(out, 'projects/E-shop/personas/PER-001-anna.md'), { headingFor })
    expect(entity.scenarioIds).toEqual([])
  })

  it('delete smaže soubor a odstraní odkazy i souvislosti', () => {
    const out = run(['delete', 'scn2'])
    expect(out.deletes).toEqual(['projects/E-shop/scenarios/SCN-002-reklamace.md'])
    expect(written(out, 'projects/E-shop/connections.yaml')).toBe('connections: []\n')
    const out2 = run(['delete', 'scn1'])
    const { entity } = markdownToEntity('persona', written(out2, 'projects/E-shop/personas/PER-001-anna.md'), { headingFor })
    expect(entity.scenarioIds).toEqual([])
  })
})

describe('hook', () => {
  it('PreToolUse zakáže soubory spravované aplikací', () => {
    for (const relPath of ['.uxlog/manifest.json', '.claude/settings.json', '.claude/skills/uxlog-data/SKILL.md']) {
      const out = run(['hook'], vault(), { hook: { event: 'PreToolUse', relPath } })
      expect(out.exitCode, relPath).toBe(2)
    }
    expect(run(['hook'], vault(), { hook: { event: 'PreToolUse', relPath: 'projects/E-shop/personas/x.md' } }).exitCode).toBe(0)
    expect(run(['hook'], vault(), { hook: { event: 'PreToolUse', relPath: '.claude/settings.local.json' } }).exitCode).toBe(0)
    expect(run(['hook'], vault(), { hook: { event: 'PreToolUse', relPath: null } }).exitCode).toBe(0)
  })

  it('PostToolUse vrátí chyby upraveného souboru s exit 2, jinak 0', () => {
    const files = vault()
    files[2].content = files[2].content.replace('scenarioIds: [scn1]', 'status: hotovo')
    const bad = run(['hook'], files, { hook: { event: 'PostToolUse', relPath: 'projects/E-shop/personas/PER-001-anna.md' } })
    expect(bad.exitCode).toBe(2)
    expect(bad.stderr.join('\n')).toContain('má neplatnou hodnotu „hotovo“')
    const other = run(['hook'], files, { hook: { event: 'PostToolUse', relPath: 'projects/E-shop/scenarios/SCN-001-nakup.md' } })
    expect(other.exitCode).toBe(0)
  })

  it('PostToolUse s varováním (neexistující odkaz) neblokuje, ale předá kontext', () => {
    const files = vault()
    files[2].content = files[2].content.replace('scenarioIds: [scn1]', 'scenarioIds: [neni]')
    const out = run(['hook'], files, { hook: { event: 'PostToolUse', relPath: 'projects/E-shop/personas/PER-001-anna.md' } })
    expect(out.exitCode).toBe(0)
    const json = JSON.parse(out.stdout[0])
    expect(json.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    expect(json.hookSpecificOutput.additionalContext).toContain('odkazuje na neexistující záznam neni')
  })
})

it('help a neznámý příkaz', () => {
  expect(run([]).stdout[0]).toBe(cs.vaultCli.help)
  expect(run(['blbost']).exitCode).toBe(1)
})

describe('vlastní složka projektu', () => {
  const single = () => {
    const data = getEmptyData()
    data.projects = [{ id: 'p1', ...getEntityDefaults('project'), name: 'Jediný', createdAt: '2026-01-01' }]
    return buildVaultFiles(data, { headingFor: createHeadingResolver(cs), layout: 'project' }).files
  }
  const env = (files) => ({ files, messages: cs, generateId: () => 'new-id', now: () => '2026-02-01T00:00:00.000Z', layout: 'project' })

  it('jediný projekt se nemusí zadávat', () => {
    const out = runCliCommand(['new', 'persona', '--name', 'Eva'], env(single()))
    expect(out.exitCode).toBe(0)
    expect(out.writes[0].path).toMatch(/^projects\/__project__\/personas\//)
  })

  it('další projekt do vlastní složky projektu založit nejde', () => {
    const out = runCliCommand(['new', 'project', '--name', 'Druhý'], env(single()))
    expect(out.exitCode).toBe(1)
    expect(out.stderr.join('')).toContain('jednomu projektu')
  })
})
