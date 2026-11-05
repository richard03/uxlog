import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import {
  hashText, parseManifest, serializeManifest, planVaultWrite, reconcileManifest, acceptPaths, CONFLICT, MANIFEST_FILE,
  buildBaseSnapshot, parseBase, serializeBase, baseKey,
} from './sync.js'

const file = (path, hash) => ({ path, content: `obsah ${hash}`, hash })

describe('hashText', () => {
  it('vrátí SHA-256 v hex (stejně jako Rust)', async () => {
    const text = 'Žluťoučký kůň\n## Motivace'
    expect(await hashText(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'))
    expect(await hashText('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(await hashText('é')).not.toBe(await hashText('é'))
  })
})

describe('manifest', () => {
  it('serializace a čtení tam a zpět, seřazené cesty', () => {
    const text = serializeManifest({ 'b.md': '2', 'a.md': '1' })
    expect(text.indexOf('a.md')).toBeLessThan(text.indexOf('b.md'))
    expect(parseManifest(text)).toEqual({ 'a.md': '1', 'b.md': '2' })
  })

  it('poškozený manifest = prázdný, neplatné položky vynechá', () => {
    expect(parseManifest('{nejson')).toEqual({})
    expect(parseManifest(null)).toEqual({})
    expect(parseManifest('{"files":{"a.md":5,"b.md":"x"}}')).toEqual({ 'b.md': 'x' })
  })
})

describe('planVaultWrite', () => {
  it('soubor smazaný mimo aplikaci znovu nevytvoří (konflikt), force ano', () => {
    const input = { desired: [file('a.md', 'h')], disk: [], manifest: { 'a.md': 'h' } }
    const plan = planVaultWrite(input)
    expect(plan.writes).toEqual([])
    expect(plan.conflicts).toEqual([{ path: 'a.md', reason: CONFLICT.DELETED }])
    expect(plan.manifest).toEqual({ 'a.md': 'h' })
    expect(planVaultWrite({ ...input, force: ['a.md'] }).writes.map((w) => w.path)).toEqual(['a.md'])
  })

  it('createOnly zapíše jen chybějící soubor, upravený nechá bez konfliktu a mimo manifest', () => {
    const only = (path, hash) => ({ ...file(path, hash), createOnly: true })
    const plan = planVaultWrite({
      desired: [only('CLAUDE.md', 'x'), only('NEW.md', 'y')],
      disk: [{ path: 'CLAUDE.md', hash: 'upraveno' }],
      manifest: {},
    })
    expect(plan.writes.map((w) => w.path)).toEqual(['NEW.md'])
    expect(plan.conflicts).toEqual([])
    expect(plan.manifest).toEqual({})
  })

  it('nový soubor zapíše, stejný přeskočí, náš nezměněný přepíše', () => {
    const plan = planVaultWrite({
      desired: [file('new.md', 'h1'), file('same.md', 'h2'), file('ours.md', 'h3new')],
      disk: [{ path: 'same.md', hash: 'h2' }, { path: 'ours.md', hash: 'h3old' }],
      manifest: { 'same.md': 'h2', 'ours.md': 'h3old' },
    })
    expect(plan.writes.map((w) => w.path)).toEqual(['new.md', 'ours.md'])
    expect(plan.unchanged).toBe(1)
    expect(plan.conflicts).toEqual([])
    expect(plan.manifest).toEqual({ 'new.md': 'h1', 'same.md': 'h2', 'ours.md': 'h3new' })
  })

  it('soubor změněný mimo aplikaci nepřepíše (konflikt) a ponechá původní hash v manifestu', () => {
    const plan = planVaultWrite({
      desired: [file('a.md', 'appNew')],
      disk: [{ path: 'a.md', hash: 'claudeEdit' }],
      manifest: { 'a.md': 'appOld' },
    })
    expect(plan.writes).toEqual([])
    expect(plan.conflicts).toEqual([{ path: 'a.md', reason: CONFLICT.MODIFIED }])
    expect(plan.manifest).toEqual({ 'a.md': 'appOld' })
  })

  it('cizí soubor na cílové cestě nepřepíše', () => {
    const plan = planVaultWrite({ desired: [file('a.md', 'x')], disk: { 'a.md': 'cizi' }, manifest: {} })
    expect(plan.conflicts).toEqual([{ path: 'a.md', reason: CONFLICT.UNKNOWN }])
    expect(plan.manifest).toEqual({})
  })

  it('force přepíše konfliktní soubor', () => {
    const plan = planVaultWrite({
      desired: [file('a.md', 'x')], disk: { 'a.md': 'cizi' }, manifest: {}, force: ['a.md'],
    })
    expect(plan.writes.map((w) => w.path)).toEqual(['a.md'])
    expect(plan.conflicts).toEqual([])
  })

  it('nepotřebný nezměněný soubor smaže, změněný ponechá s konfliktem, chybějící jen vypustí', () => {
    const plan = planVaultWrite({
      desired: [],
      disk: [{ path: 'old.md', hash: 'h' }, { path: 'edited.md', hash: 'changed' }],
      manifest: { 'old.md': 'h', 'edited.md': 'orig', 'gone.md': 'g' },
    })
    expect(plan.deletes).toEqual(['old.md'])
    expect(plan.conflicts).toEqual([{ path: 'edited.md', reason: CONFLICT.STALE_MODIFIED }])
    expect(plan.manifest).toEqual({})
  })

  it('soubory, které aplikace nezapsala a nepotřebuje, ignoruje', () => {
    const plan = planVaultWrite({ desired: [], disk: [{ path: 'projects/A/personas/nova.md', hash: 'x' }], manifest: {} })
    expect(plan).toMatchObject({ writes: [], deletes: [], conflicts: [] })
  })

  it('manifest se do plánu nezahrnuje a cesty normalizuje (lomítka, NFC)', () => {
    const nfd = 'projects/Lékař/project.md'.normalize('NFD')
    const plan = planVaultWrite({
      desired: [file(MANIFEST_FILE, 'm'), file('projects\\Lékař\\project.md', 'h')],
      disk: [{ path: nfd, hash: 'h' }],
      manifest: { [MANIFEST_FILE]: 'm' },
    })
    expect(plan.writes).toEqual([])
    expect(plan.deletes).toEqual([])
    expect(plan.unchanged).toBe(1)
  })

  it('zvládne neplatný vstup', () => {
    expect(planVaultWrite({ desired: null, disk: null, manifest: null }))
      .toEqual({ writes: [], deletes: [], conflicts: [], unchanged: 0, manifest: {} })
  })
})

describe('reconcileManifest', () => {
  it('nepovedený zápis vrátí původní hash nebo položku vypustí, nepovedené mazání ponechá', () => {
    const planned = { 'a.md': 'new', 'b.md': 'new' }
    const previous = { 'a.md': 'old', 'c.md': 'del' }
    const result = reconcileManifest(planned, previous, { errors: [{ path: 'a.md' }, { path: 'b.md' }, { path: 'c.md' }] }, ['c.md'])
    expect(result).toEqual({ 'a.md': 'old', 'c.md': 'del' })
  })

  it('bez chyb vrátí plánovaný manifest', () => {
    expect(reconcileManifest({ 'a.md': '1' }, {}, { errors: [] })).toEqual({ 'a.md': '1' })
  })
})

describe('acceptPaths', () => {
  it('zapíše hash z disku, chybějící soubor z manifestu vypustí', () => {
    const result = acceptPaths({ 'a.md': 'old', 'gone.md': 'g', 'keep.md': 'k' }, [{ path: 'a.md', hash: 'disk' }], ['a.md', 'gone.md', 'new.md'])
    expect(result).toEqual({ 'a.md': 'disk', 'keep.md': 'k' })
  })
})

describe('základ pro slučování', () => {
  const state = {
    projects: [{ id: 'p1', name: 'P', canvas: { x: 1 }, notebookHistory: [1] }],
    personas: [{ id: 'a', projectId: 'p1', name: 'Anna' }, { id: 'b', projectId: 'p1', name: 'Bob' }],
    connections: [{ id: 'c', projectId: 'p1' }],
  }
  const index = {
    'projects/P/project.md': { collection: 'projects', id: 'p1', projectId: 'p1' },
    'projects/P/personas/a.md': { collection: 'personas', id: 'a', projectId: 'p1' },
    'projects/P/personas/b.md': { collection: 'personas', id: 'b', projectId: 'p1' },
    'projects/P/connections.yaml': { collection: 'connections', id: null, projectId: 'p1' },
  }
  const desired = Object.keys(index).map((path) => ({ path, hash: `h-${path}` }))

  it('soubory v souladu dostanou snímek ze stavu, konfliktní si ponechají předchozí základ', () => {
    const manifest = Object.fromEntries(desired.map((f) => [f.path, f.hash]))
    manifest['projects/P/personas/b.md'] = 'jiny'
    const result = buildBaseSnapshot({ previous: { 'personas:b': { id: 'b', name: 'Starý Bob' }, 'goals:x': {} }, index, desired, manifest, state })
    expect(result).toEqual({
      'projects:p1': { id: 'p1', name: 'P' },
      'personas:a': { id: 'a', projectId: 'p1', name: 'Anna' },
      'personas:b': { id: 'b', name: 'Starý Bob' },
      'connections:p1': [{ id: 'c', projectId: 'p1' }],
    })
  })

  it('serializace a čtení tam a zpět; poškozený soubor = prázdný základ', () => {
    expect(parseBase(serializeBase({ 'b:1': { x: 1 }, 'a:1': [] }))).toEqual({ 'a:1': [], 'b:1': { x: 1 } })
    expect(parseBase('{rozbito')).toEqual({})
    expect(baseKey({ collection: 'connections', id: null, projectId: 'p' })).toBe('connections:p')
  })
})
