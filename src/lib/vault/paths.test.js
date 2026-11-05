import { describe, it, expect } from 'vitest'
import {
  VAULT_COLLECTIONS, slugify, sanitizeFolderName, assignProjectFolders, entityFileBase,
  assignEntityFileNames, canvasFilePath, normalizeVaultPath, collectionByDir, collectionInfo,
  toPhysicalPath, toLogicalPath, isProjectLayoutDataPath, normalizeLayout, rootKey, isSameOrInside,
} from './paths.js'
import { getEmptyData } from '../storage.js'
import { CANVAS_ENTITY_TYPES } from '../canvas.js'

describe('VAULT_COLLECTIONS', () => {
  it('pokrývá všechny kolekce entit projektu (kromě projektů a souvislostí)', () => {
    const expected = Object.keys(getEmptyData()).filter((k) => k !== 'projects' && k !== 'connections')
    expect(VAULT_COLLECTIONS.map((c) => c.collection).sort()).toEqual(expected.sort())
  })

  it('obsahuje všechny typy z plátna a složky jsou unikátní', () => {
    for (const type of CANVAS_ENTITY_TYPES) expect(collectionInfo(type)).not.toBeNull()
    const dirs = VAULT_COLLECTIONS.map((c) => c.dir)
    expect(new Set(dirs).size).toBe(dirs.length)
  })

  it('najde kolekci podle složky', () => {
    expect(collectionByDir('team').collection).toBe('teamMembers')
    expect(collectionByDir('neznamy')).toBeNull()
  })
})

describe('slugify', () => {
  it('odstraní diakritiku a nepovolené znaky', () => {
    expect(slugify('Anna, učitelka na ZŠ')).toBe('anna-ucitelka-na-zs')
    expect(slugify('  --Žluťoučký kůň!--  ')).toBe('zlutoucky-kun')
  })

  it('zvládne prázdné a neplatné vstupy', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify('???')).toBe('')
    expect(slugify(42)).toBe('42')
  })

  it('omezí délku bez koncové pomlčky', () => {
    const slug = slugify('a'.repeat(59) + ' bcd')
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('sanitizeFolderName', () => {
  it('zachová mezery, diakritiku a velikost písmen', () => {
    expect(sanitizeFolderName('Portál pro lékaře')).toBe('Portál pro lékaře')
  })

  it('nahradí znaky zakázané ve Windows', () => {
    expect(sanitizeFolderName('A/B: "C" <D>|E?*\\F')).toBe('A-B- -C- -D--E---F')
  })

  it('odstraní tečky a mezery na konci a sloučí bílé znaky', () => {
    expect(sanitizeFolderName('  Projekt\t\tX...  ')).toBe('Projekt X')
  })

  it('ošetří zakázané názvy Windows', () => {
    expect(sanitizeFolderName('CON')).toBe('CON_')
    expect(sanitizeFolderName('lpt1.txt')).toBe('lpt1.txt_')
  })

  it('normalizuje na NFC', () => {
    const nfd = 'Lékař'.normalize('NFD')
    expect(sanitizeFolderName(nfd)).toBe('Lékař'.normalize('NFC'))
  })

  it('prázdný vstup → prázdný řetězec', () => {
    expect(sanitizeFolderName('')).toBe('')
    expect(sanitizeFolderName(undefined)).toBe('')
    expect(sanitizeFolderName('...')).toBe('')
  })
})

describe('assignProjectFolders', () => {
  const a = { id: 'a', name: 'E-shop', createdAt: '2026-01-01' }
  const b = { id: 'b', name: 'e-shop', createdAt: '2026-02-01' }
  const c = { id: 'c', name: 'E-shop', createdAt: '2026-03-01' }

  it('kolize řeší příponou podle stáří, bez ohledu na pořadí a velikost písmen', () => {
    const expected = new Map([['a', 'E-shop'], ['b', 'e-shop (2)'], ['c', 'E-shop (3)']])
    expect(assignProjectFolders([a, b, c])).toEqual(expected)
    expect(assignProjectFolders([c, b, a])).toEqual(expected)
  })

  it('projekt bez názvu dostane složku podle id, neplatné položky přeskočí', () => {
    const result = assignProjectFolders([{ id: 'x1', name: '' }, null, { name: 'bez id' }])
    expect(result).toEqual(new Map([['x1', 'x1']]))
    expect(assignProjectFolders(null)).toEqual(new Map())
  })
})

describe('názvy souborů entit', () => {
  it('složí kód a slug, bez kódu jen slug, bez obojího id', () => {
    expect(entityFileBase({ id: '1', code: 'PER-001', name: 'Anna Nováková' })).toBe('PER-001-anna-novakova')
    expect(entityFileBase({ id: '1', code: '', name: 'Jan' })).toBe('jan')
    expect(entityFileBase({ id: 'abc-123', code: '', name: '' })).toBe('abc-123')
    expect(entityFileBase({})).toBe('entity')
  })

  it('kolize dostanou příponu -2 deterministicky', () => {
    const e1 = { id: 'b', name: 'Jan', createdAt: '2026-01-01' }
    const e2 = { id: 'a', name: 'Jan', createdAt: '2026-01-02' }
    const expected = new Map([['b', 'jan.md'], ['a', 'jan-2.md']])
    expect(assignEntityFileNames([e1, e2])).toEqual(expected)
    expect(assignEntityFileNames([e2, e1])).toEqual(expected)
  })
})

describe('cesty', () => {
  it('canvasFilePath odstraní nebezpečné znaky', () => {
    expect(canvasFilePath('abc-123')).toBe('.uxlog/canvas/abc-123.yaml')
    expect(canvasFilePath('../x')).toBe('.uxlog/canvas/___x.yaml')
  })

  it('normalizeVaultPath sjednotí lomítka a začátek cesty', () => {
    expect(normalizeVaultPath('.\\projects\\A\\project.md')).toBe('projects/A/project.md')
    expect(normalizeVaultPath('/projects//A/x.md')).toBe('projects/A/x.md')
  })
})

describe('rozložení složky dat', () => {
  it('ve výchozí složce cesty nemění', () => {
    expect(toPhysicalPath('projects/A/goals/g.md', 'shared')).toBe('projects/A/goals/g.md')
    expect(toLogicalPath('projects/A/goals/g.md', 'shared')).toBe('projects/A/goals/g.md')
  })

  it('ve vlastní složce projektu odřízne a doplní předponu projektu', () => {
    expect(toPhysicalPath('projects/Libovolná/personas/PER-001-anna.md', 'project')).toBe('personas/PER-001-anna.md')
    expect(toPhysicalPath('projects/__project__/project.md', 'project')).toBe('project.md')
    expect(toLogicalPath('team/x.md', 'project')).toBe('projects/__project__/team/x.md')
    expect(toLogicalPath('connections.yaml', 'project')).toBe('projects/__project__/connections.yaml')
  })

  it('metadata a soubory pro Clauda zůstanou, cizí soubory odmítne', () => {
    for (const p of ['.uxlog/manifest.json', '.claude/settings.json', 'CLAUDE.md']) {
      expect(toPhysicalPath(p, 'project')).toBe(p)
      expect(toLogicalPath(p, 'project')).toBe(p)
    }
    expect(toLogicalPath('README.md', 'project')).toBeNull()
    expect(toLogicalPath('src/index.js', 'project')).toBeNull()
    expect(toLogicalPath('personas/hluboko/x.md', 'project')).toBeNull()
    expect(toPhysicalPath('projects/A/neznamy/x.md', 'project')).toBeNull()
    expect(toPhysicalPath('jinde/x.md', 'project')).toBeNull()
  })

  it('isProjectLayoutDataPath a normalizeLayout', () => {
    expect(isProjectLayoutDataPath('INDEX.md')).toBe(true)
    expect(isProjectLayoutDataPath('goals/g.md')).toBe(true)
    expect(isProjectLayoutDataPath('notes.md')).toBe(false)
    expect(normalizeLayout('project')).toBe('project')
    expect(normalizeLayout('x')).toBe('shared')
  })

  it('rootKey a isSameOrInside', () => {
    expect(rootKey('C:\\Data\\')).toBe('c:/data')
    expect(isSameOrInside('C:\\Data\\Projekt', 'c:/data')).toBe(true)
    expect(isSameOrInside('C:\\Data', 'C:\\Data')).toBe(true)
    expect(isSameOrInside('C:\\Data2', 'C:\\Data')).toBe(false)
    expect(isSameOrInside('', 'C:\\Data')).toBe(false)
  })
})

describe('vault.rs', () => {
  it('zná všechny složky typů záznamů pro vlastní složku projektu', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../../../src-tauri/src/vault.rs', import.meta.url), 'utf8')
    const match = source.match(/const PROJECT_LAYOUT_DIRS: &\[&str\] = &\[([^\]]*)\]/)
    expect(match).not.toBeNull()
    const dirs = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort()
    expect(dirs).toEqual(VAULT_COLLECTIONS.map((c) => c.dir).sort())
  })
})
