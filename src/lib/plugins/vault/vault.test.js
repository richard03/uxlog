import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'

/**
 * Souborové systémy složek v paměti místo Tauri: složka → (cesta na disku → obsah).
 * Převod logických cest dělá stejně jako Rust (toPhysicalPath / toLogicalPath).
 */
const disks = new Map()
const diskOf = (root) => {
  const key = String(root).toLowerCase()
  if (!disks.has(key)) disks.set(key, new Map())
  return disks.get(key)
}
const ROOT = 'C:\\vault'
const disk = diskOf(ROOT)
const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
const { toPhysicalPath, toLogicalPath } = await import('../../vault/paths.js')
const logicalEntries = (root, layout) => [...diskOf(root).entries()]
  .map(([path, content]) => [toLogicalPath(path, layout), content])
  .filter(([path]) => path)

/** Úložiště aplikace (SQLite) v paměti – značka synchronizace. */
const storage = vi.hoisted(() => new Map())
vi.spyOn(console, 'log').mockImplementation(() => {})

vi.mock('./cliSource.js', () => ({ default: '// uxlog cli' }))
vi.mock('../../tauriBridge.js', () => ({
  isTauri: true,
  readStoredValue: (key) => (storage.has(key) ? storage.get(key) : null),
  writeStoredValue: vi.fn(async (key, value) => { storage.set(key, String(value)) }),
  vaultDefaultRoot: vi.fn(async () => 'C:\\Users\\x\\Documents\\UXLog\\Data'),
  vaultScan: vi.fn(async (root, layout) => logicalEntries(root, layout).map(([path, content]) => ({ path, hash: sha(content) }))),
  vaultReadFile: vi.fn(async (root, path, layout) => diskOf(root).get(toPhysicalPath(path, layout)) ?? null),
  vaultReadFiles: vi.fn(async (root, layout) => logicalEntries(root, layout)
    .filter(([path]) => path.startsWith('projects/') || path.startsWith('.uxlog/'))
    .filter(([path]) => /\.(md|yaml|json)$/.test(path))
    .map(([path, content]) => ({ path, content }))),
  vaultWatch: vi.fn(async () => []),
  vaultUnwatch: vi.fn(async () => {}),
  listenToVaultChanges: vi.fn(async () => () => {}),
  vaultApply: vi.fn(async (root, writes, deletes, layout) => {
    const target = diskOf(root)
    const errors = []
    for (const w of writes) {
      const physical = toPhysicalPath(w.path, layout)
      if (physical) target.set(physical, w.content)
      else errors.push({ path: w.path, message: 'mimo data' })
    }
    for (const d of deletes) target.delete(toPhysicalPath(d, layout))
    return { written: writes.map((w) => w.path).filter((p) => !errors.some((e) => e.path === p)), deleted: deletes, errors }
  }),
}))

const {
  default: plugin, vaultSettings, vaultStatus, updateVaultSettings, exportVaultNow, collectVaultChanges, acceptVaultPaths,
  setVaultChangeApplier, setVaultStateReplacer, setProjectVaultFolder,
} = await import('./index.js')
const { getEmptyData } = await import('../../storage.js')
const { getEntityDefaults } = await import('../../dataConfig.js')

let state
const ctx = {
  getState: () => state,
  on: vi.fn(),
  registerStatusItem: vi.fn(),
}

function sampleState() {
  const data = getEmptyData()
  data.projects = [{ id: 'p1', ...getEntityDefaults('project'), name: 'E-shop', createdAt: '2026-01-01' }]
  data.personas = [{ id: 'per1', projectId: 'p1', ...getEntityDefaults('persona'), code: 'PER-001', name: 'Anna', motivation: 'Čas' }]
  data.goals = [{ id: 'g1', projectId: 'p1', ...getEntityDefaults('goal'), code: 'GOL-001', name: 'Konverze' }]
  return data
}

const PERSONA = 'projects/E-shop/personas/PER-001-anna.md'
const GOAL = 'projects/E-shop/goals/GOL-001-konverze.md'
const dataFiles = () => [...disk.keys()].filter((p) => p.startsWith('projects/')).sort()

/** Zjednodušené zapsání potvrzených změn do stavu (v aplikaci to dělá stores/vaultImport.js). */
function applyToState(changes) {
  for (const c of changes) {
    if (c.kind === 'create') state[c.collection].push(c.record)
    if (c.kind === 'update') Object.assign(state[c.collection].find((r) => r.id === c.entityId), c.patch)
    if (c.kind === 'delete') state[c.collection] = state[c.collection].filter((r) => r.id !== c.entityId)
  }
  return { applied: changes, skipped: [] }
}

const clone = (v) => JSON.parse(JSON.stringify(v))
const SYNC_KEY = 'uxlog_vault_sync'
/** Značka složky uložená v databázi. */
const cacheSyncId = (root = ROOT) => JSON.parse(storage.get(SYNC_KEY) ?? '{}').roots?.[String(root).replace(/\\/g, '/').toLowerCase()]
/** Konflikty bez údajů o složce. */
const conflictsOf = () => vaultStatus.conflicts.map(({ path, reason }) => ({ path, reason }))
const manifestSyncId = () => JSON.parse(disk.get('.uxlog/manifest.json')).syncId

beforeEach(async () => {
  for (const d of disks.values()) d.clear()
  storage.delete(SYNC_KEY)
  state = sampleState()
  setVaultChangeApplier(null) // ruční načítání; automatické testuje vlastní blok
  setVaultStateReplacer((data) => { state = { ...state, ...clone(data) } })
  plugin.install(ctx)
  vaultSettings.projects = {}
  updateVaultSettings({ enabled: true, root: ROOT })
  await exportVaultNow()
})

describe('plugin Složka dat – zápis', () => {
  it('první zápis vytvoří data, rejstřík, metadata, manifest a soubory pro Claude Code', () => {
    expect(dataFiles()).toEqual([GOAL, 'projects/E-shop/INDEX.md', PERSONA, 'projects/E-shop/project.md'].sort())
    expect([...disk.keys()]).toEqual(expect.arrayContaining([
      '.uxlog/manifest.json', '.uxlog/workspace.yaml', '.uxlog/bin/uxlog.mjs', '.uxlog/claude/RULES.md',
      'CLAUDE.md', '.claude/settings.json', '.claude/skills/uxlog-data/SKILL.md',
    ]))
    expect(disk.get(PERSONA)).toContain('## Motivace\n\nČas')
    expect(disk.get('projects/E-shop/INDEX.md')).toContain('| PER-001 | Anna | personas/PER-001-anna.md | per1 |')
    expect(vaultStatus).toMatchObject({ conflicts: [], lastError: '' })
  })

  it('druhý zápis bez změn nic nezapíše, změna entity zapíše její soubor a rejstřík', async () => {
    const before = new Map(disk)
    await exportVaultNow()
    expect(new Map(disk)).toEqual(before)
    state.personas[0].name = 'Anna N.'
    await exportVaultNow()
    expect(disk.has('projects/E-shop/personas/PER-001-anna-n.md')).toBe(true)
    expect(disk.get('projects/E-shop/INDEX.md')).toContain('Anna N.')
  })

  it('upravený CLAUDE.md nepřepíše a nehlásí jako změnu', async () => {
    disk.set('CLAUDE.md', 'moje poznámky')
    await exportVaultNow()
    expect(disk.get('CLAUDE.md')).toBe('moje poznámky')
    expect(conflictsOf()).toEqual([])
  })

  it('soubor upravený mimo aplikaci nepřepíše a nahlásí; force ho přepíše', async () => {
    disk.set(PERSONA, disk.get(PERSONA).replace('Čas', 'Úprava od Clauda'))
    state.personas[0].motivation = 'Změna v aplikaci'
    await exportVaultNow()
    expect(disk.get(PERSONA)).toContain('Úprava od Clauda')
    expect(conflictsOf()).toEqual([{ path: PERSONA, reason: 'modifiedExternally' }])

    await exportVaultNow({ force: [{ root: ROOT, path: PERSONA }] })
    expect(disk.get(PERSONA)).toContain('Změna v aplikaci')
    expect(conflictsOf()).toEqual([])
  })

  it('smazaná entita v aplikaci smaže svůj soubor', async () => {
    state.goals = []
    await exportVaultNow()
    expect(disk.has(GOAL)).toBe(false)
  })

  it('soubor smazaný mimo aplikaci znovu nevytvoří a nahlásí', async () => {
    disk.delete(GOAL)
    await exportVaultNow()
    expect(disk.has(GOAL)).toBe(false)
    expect(conflictsOf()).toEqual([{ path: GOAL, reason: 'deletedExternally' }])
  })

  it('nový soubor od Clauda nechá být a nahlásí jako nový', async () => {
    const claudeFile = 'projects/E-shop/personas/nova-persona.md'
    disk.set(claudeFile, '# Nová persona\n')
    await exportVaultNow()
    expect(disk.get(claudeFile)).toBe('# Nová persona\n')
    expect(conflictsOf()).toEqual([{ path: claudeFile, reason: 'newFile' }])
  })

  it('vypnutý zápis nespustí automatický export', async () => {
    updateVaultSettings({ enabled: false })
    expect(vaultSettings.enabled).toBe(false)
    const handler = ctx.on.mock.calls.find(([event]) => event === 'data:persisted')[1]
    state.personas[0].motivation = 'nezapíše se'
    vi.useFakeTimers()
    handler()
    vi.advanceTimersByTime(5000)
    vi.useRealTimers()
    expect(disk.get(PERSONA)).not.toContain('nezapíše se')
  })
})

describe('plugin Složka dat – načtení změn', () => {
  it('úprava, nový soubor a smazání → změny k potvrzení; po přijetí se složka srovná', async () => {
    const newFile = 'projects/E-shop/personas/petr.md'
    disk.set(PERSONA, disk.get(PERSONA).replace('Čas', 'Rychlost'))
    disk.set(newFile, '# Petr\n\n## Motivace\n\nCena\n')
    disk.delete(GOAL)

    const { changes, invalid } = await collectVaultChanges()
    expect(invalid).toEqual([])
    expect(changes.map((c) => [c.kind, c.path])).toEqual([
      ['delete', GOAL], ['update', PERSONA], ['create', newFile],
    ])

    applyToState(changes)
    await acceptVaultPaths(changes.map((c) => ({ root: c.root, path: c.path })))

    expect(conflictsOf()).toEqual([])
    expect(disk.has(newFile)).toBe(false) // přejmenován na kanonický název
    expect(disk.get('projects/E-shop/personas/PER-002-petr.md')).toContain('Cena')
    expect(disk.get(PERSONA)).toContain('Rychlost')
    expect(disk.has(GOAL)).toBe(false)
    expect(state.personas.map((p) => p.code)).toEqual(['PER-001', 'PER-002'])
  })

  it('přeskočená změna zůstane nahlášená a soubor se nepřepíše', async () => {
    disk.set(PERSONA, disk.get(PERSONA).replace('Čas', 'Rychlost'))
    const { changes } = await collectVaultChanges()
    expect(changes).toHaveLength(1)
    await exportVaultNow()
    expect(disk.get(PERSONA)).toContain('Rychlost')
    expect(conflictsOf()).toEqual([{ path: PERSONA, reason: 'modifiedExternally' }])
  })

  it('soubor s chybou se nenačte a vrátí se jako neplatný', async () => {
    disk.set(PERSONA, '---\nid: [\n---\n')
    const { changes, invalid } = await collectVaultChanges()
    expect(changes).toEqual([])
    expect(invalid.map((i) => i.path)).toEqual([PERSONA])
  })

  it('bez změn v projektech nic nečte', async () => {
    expect(await collectVaultChanges()).toEqual({ changes: [], invalid: [], unchanged: [] })
  })
})

describe('plugin Složka dat – automatické načítání', () => {
  beforeEach(() => setVaultChangeApplier(applyToState))

  it('zapíše základ pro slučování', () => {
    const base = JSON.parse(disk.get('.uxlog/base.json'))
    expect(base.records['personas:per1']).toMatchObject({ name: 'Anna', motivation: 'Čas' })
  })

  it('úpravu, nový soubor i smazání od Clauda načte sám a složku srovná', async () => {
    disk.set(PERSONA, disk.get(PERSONA).replace('Čas', 'Rychlost'))
    disk.set('projects/E-shop/personas/petr.md', '# Petr\n')
    disk.delete(GOAL)
    await exportVaultNow()

    expect(state.personas.find((p) => p.id === 'per1').motivation).toBe('Rychlost')
    expect(state.personas.map((p) => p.code)).toEqual(['PER-001', 'PER-002'])
    expect(state.goals).toEqual([])
    expect(vaultStatus.lastImport).toMatchObject({ count: 3 })
    expect(conflictsOf()).toEqual([])
    expect(disk.has('projects/E-shop/personas/PER-002-petr.md')).toBe(true)
    expect(disk.has('projects/E-shop/personas/petr.md')).toBe(false)
  })

  it('stejné pole změněné v aplikaci i v souboru → konflikt; ostatní pole se načtou, soubor se nepřepíše', async () => {
    disk.set(PERSONA, disk.get(PERSONA).replace('Čas', 'Ze souboru').replace('status: protopersona', 'status: persona'))
    state.personas[0].motivation = 'Z aplikace'
    await exportVaultNow()

    expect(state.personas[0]).toMatchObject({ motivation: 'Z aplikace', status: 'persona' })
    expect(vaultStatus.pendingConflicts).toHaveLength(1)
    expect(vaultStatus.pendingConflicts[0].conflicts).toEqual([{ field: 'motivation', base: 'Čas', app: 'Z aplikace', file: 'Ze souboru' }])
    expect(disk.get(PERSONA)).toContain('Ze souboru')

    // další kontrola konflikt nezdvojí ani nezmění data
    await exportVaultNow()
    expect(vaultStatus.pendingConflicts).toHaveLength(1)
    expect(state.personas[0].motivation).toBe('Z aplikace')

    // vyřešení (zvoleno „ze souboru“) → přijetí → soubor v souladu, konflikt zmizí
    applyToState([{ kind: 'update', collection: 'personas', entityId: 'per1', patch: { motivation: 'Ze souboru' } }])
    await acceptVaultPaths([{ root: ROOT, path: PERSONA }])
    expect(vaultStatus.pendingConflicts).toEqual([])
    expect(conflictsOf()).toEqual([])
    expect(JSON.parse(disk.get('.uxlog/base.json')).records['personas:per1'].motivation).toBe('Ze souboru')
  })

  it('hromadné smazání nenačte samo (pojistka)', async () => {
    for (let i = 0; i < 11; i++) state.goals.push({ id: `g${i + 2}`, projectId: 'p1', code: `GOL-${String(i + 2).padStart(3, '0')}`, name: `Cíl ${i}` })
    await exportVaultNow()
    for (const path of [...disk.keys()].filter((p) => p.includes('/goals/'))) disk.delete(path)
    await exportVaultNow()
    expect(vaultStatus.massChange).toBe(true)
    expect(state.goals).toHaveLength(12)
  })

  it('soubor s chybou nenačte a nahlásí', async () => {
    disk.set(PERSONA, '---\nid: [\n---\n')
    await exportVaultNow()
    expect(vaultStatus.invalidFiles.map((f) => f.path)).toEqual([PERSONA])
    expect(state.personas[0].motivation).toBe('Čas')
    expect(disk.get(PERSONA)).toBe('---\nid: [\n---\n')
  })

})

describe('plugin Složka dat – složka jako zdroj pravdy', () => {
  it('po zápisu nese manifest i databáze stejnou značku; zápis beze změn ji nemění', async () => {
    const syncId = manifestSyncId()
    expect(syncId).toBeTruthy()
    expect(cacheSyncId()).toBe(syncId)
    await exportVaultNow()
    expect(manifestSyncId()).toBe(syncId)
    state.personas[0].name = 'Anna N.'
    await exportVaultNow()
    expect(manifestSyncId()).not.toBe(syncId)
    expect(cacheSyncId()).toBe(manifestSyncId())
  })

  it('prázdná databáze soubory nesmaže – sestaví se ze složky', async () => {
    const files = dataFiles()
    state = getEmptyData()
    storage.delete(SYNC_KEY)
    await exportVaultNow()
    expect(dataFiles()).toEqual(files)
    expect(state.personas.map((p) => p.name)).toEqual(['Anna'])
    expect(state.goals.map((g) => g.id)).toEqual(['g1'])
    expect(vaultStatus.lastRebuild.count).toBeGreaterThan(0)
  })

  it('stará databáze (obnovená záloha) nepřepíše novější složku', async () => {
    const backup = { state: clone(state), sync: storage.get(SYNC_KEY) }
    state.personas[0].motivation = 'Novější'
    await exportVaultNow()
    state = backup.state
    storage.set(SYNC_KEY, backup.sync)
    await exportVaultNow()
    expect(state.personas[0].motivation).toBe('Novější')
    expect(disk.get(PERSONA)).toContain('Novější')
  })

  it('složku zapsanou jiným počítačem načte, i když soubory odpovídají manifestu', async () => {
    // Jiný počítač: upravený soubor, manifest s jeho hashem a novou značkou
    const content = disk.get(PERSONA).replace('Čas', 'Z jiného počítače')
    disk.set(PERSONA, content)
    const manifest = JSON.parse(disk.get('.uxlog/manifest.json'))
    manifest.files[PERSONA] = sha(content)
    manifest.syncId = 'jiny-pocitac'
    disk.set('.uxlog/manifest.json', JSON.stringify(manifest))
    await exportVaultNow()
    expect(state.personas[0].motivation).toBe('Z jiného počítače')
    expect(disk.get(PERSONA)).toContain('Z jiného počítače')
    expect(conflictsOf()).toEqual([])
    expect(cacheSyncId()).toBe(manifestSyncId())
  })

  it('soubor s chybou při obnově nesmaže záznam', async () => {
    disk.set(PERSONA, '---\nid: [\n---\n')
    state = getEmptyData()
    storage.delete(SYNC_KEY)
    await exportVaultNow()
    expect(state.goals.map((g) => g.id)).toEqual(['g1'])
    expect(disk.get(PERSONA)).toBe('---\nid: [\n---\n')
  })

  it('složka bez projektů (smazaná data, starý manifest): data aplikace se zapíší znovu', async () => {
    for (const path of dataFiles()) disk.delete(path)
    await exportVaultNow()
    expect(dataFiles()).toContain(PERSONA)
    expect(state.personas).toHaveLength(1)
    expect(conflictsOf()).toEqual([])
  })

  it('starší instalace bez značek pokračuje bez obnovy a značku doplní', async () => {
    const manifest = JSON.parse(disk.get('.uxlog/manifest.json'))
    delete manifest.syncId
    disk.set('.uxlog/manifest.json', JSON.stringify(manifest))
    storage.delete(SYNC_KEY)
    vaultStatus.lastRebuild = null
    state.personas[0].motivation = 'Neuložená úprava'
    await exportVaultNow()
    expect(vaultStatus.lastRebuild).toBeNull()
    expect(disk.get(PERSONA)).toContain('Neuložená úprava')
    expect(cacheSyncId()).toBe(manifestSyncId())
  })


  it('historie chatu se ukládá do .uxlog/notebook a při obnově se zachová', async () => {
    state.projects[0].notebookHistory = [{ id: 'm1', mode: 'process', text: 'Poznámka', status: 'done' }]
    await exportVaultNow()
    expect(disk.get('.uxlog/notebook/p1.yaml')).toContain('Poznámka')
    state = getEmptyData()
    storage.delete(SYNC_KEY)
    await exportVaultNow()
    expect(state.projects[0].notebookHistory).toEqual([{ id: 'm1', mode: 'process', text: 'Poznámka', status: 'done' }])
  })
})

describe('plugin Složka dat – vlastní složka projektu', () => {
  const REPO = 'D:\\repo'
  const repo = () => diskOf(REPO)
  const addSecondProject = () => {
    state.projects.push({ id: 'p2', ...getEntityDefaults('project'), name: 'Mobilní aplikace', createdAt: '2026-01-02' })
    state.personas.push({ id: 'per2', projectId: 'p2', ...getEntityDefaults('persona'), code: 'PER-001', name: 'Boris', motivation: 'Klid' })
  }

  beforeEach(async () => {
    addSecondProject()
    await exportVaultNow()
    setVaultChangeApplier(applyToState)
    repo().clear()
    repo().set('README.md', 'kód projektu')
    setProjectVaultFolder('p2', { root: REPO })
    await exportVaultNow()
  })

  it('projekt se zapíše přímo do kořene vlastní složky a z výchozí složky zmizí', () => {
    expect(repo().has('project.md')).toBe(true)
    expect(repo().has('personas/PER-001-boris.md')).toBe(true)
    expect(repo().get('.uxlog/workspace.yaml')).toContain('layout: project')
    expect(repo().get('.uxlog/claude/RULES.md')).toContain('patří jednomu projektu')
    expect(repo().get('README.md')).toBe('kód projektu')
    expect(dataFiles().some((p) => p.startsWith('projects/Mobilní aplikace/'))).toBe(false)
    expect(disk.has(PERSONA)).toBe(true)
    expect(cacheSyncId(REPO)).toBe(JSON.parse(repo().get('.uxlog/manifest.json')).syncId)
  })

  it('úpravu souboru ve vlastní složce načte do aplikace', async () => {
    repo().set('personas/PER-001-boris.md', repo().get('personas/PER-001-boris.md').replace('Klid', 'Rychlost'))
    await exportVaultNow()
    expect(state.personas.find((p) => p.id === 'per2').motivation).toBe('Rychlost')
    expect(vaultStatus.conflicts).toEqual([])
  })

  it('návrat do výchozí složky projekt přesune a vlastní složku uklidí', async () => {
    setProjectVaultFolder('p2', null)
    await exportVaultNow()
    expect(disk.has('projects/Mobilní aplikace/personas/PER-001-boris.md')).toBe(true)
    expect(repo().has('project.md')).toBe(false)
    expect(repo().has('personas/PER-001-boris.md')).toBe(false)
    expect(repo().has('.uxlog/manifest.json')).toBe(false)
    expect(repo().get('README.md')).toBe('kód projektu')
  })

  it('vyřazený projekt se nezapisuje nikam', async () => {
    setProjectVaultFolder('p2', { off: true })
    await exportVaultNow()
    expect(repo().has('project.md')).toBe(false)
    expect(dataFiles().some((p) => p.startsWith('projects/Mobilní aplikace/'))).toBe(false)
    expect(state.projects.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('složka s jiným projektem: nic nezapíše a nahlásí problém', async () => {
    const OTHER = 'E:\\cizi'
    diskOf(OTHER).set('project.md', '---\nid: jiny-projekt\n---\n# Cizí\n')
    setProjectVaultFolder('p2', { root: OTHER })
    await exportVaultNow()
    expect(diskOf(OTHER).has('personas/PER-001-boris.md')).toBe(false)
    expect(vaultStatus.folderIssues).toEqual([{ projectId: 'p2', root: OTHER, code: 'foreignProject' }])
    expect(state.personas.find((p) => p.id === 'per2')).toBeTruthy()
  })

  it('neplatná vlastní složka (uvnitř výchozí) se nahlásí a projekt se nezapíše', async () => {
    setProjectVaultFolder('p2', { root: 'C:\\vault\\podsložka' })
    await exportVaultNow()
    expect(vaultStatus.folderIssues).toEqual([{ projectId: 'p2', root: 'C:\\vault\\podsložka', code: 'insideDefault' }])
  })

  it('obnova ze složky se týká jen projektu té složky', async () => {
    const content = repo().get('personas/PER-001-boris.md').replace('Klid', 'Z jiného počítače')
    repo().set('personas/PER-001-boris.md', content)
    const manifest = JSON.parse(repo().get('.uxlog/manifest.json'))
    manifest.files['projects/__project__/personas/PER-001-boris.md'] = sha(content)
    manifest.syncId = 'jiny-pocitac'
    repo().set('.uxlog/manifest.json', JSON.stringify(manifest))
    state.personas[0].motivation = 'Neuložená úprava v p1'
    await exportVaultNow()
    expect(state.personas.find((p) => p.id === 'per2').motivation).toBe('Z jiného počítače')
    expect(state.personas.find((p) => p.id === 'per1').motivation).toBe('Neuložená úprava v p1')
    expect(vaultStatus.lastRebuild).toMatchObject({ root: REPO, count: 1 })
  })
})
