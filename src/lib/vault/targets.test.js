import { describe, it, expect } from 'vitest'
import { resolveVaultTargets, checkProjectRoot, scopeState, findOrphans, defaultProjectFolderPath, TARGET_ISSUE } from './targets.js'

const state = {
  projects: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
  goals: [{ id: 'g1', projectId: 'a' }, { id: 'g2', projectId: 'b' }],
  connections: [{ id: 'k', projectId: 'b' }],
}

describe('resolveVaultTargets', () => {
  it('vypnuto nebo bez složky = žádné cíle', () => {
    expect(resolveVaultTargets({ enabled: false, root: 'C:\\Data' }, state)).toEqual({ targets: [], issues: [] })
    expect(resolveVaultTargets({ enabled: true, root: '' }, state).targets).toEqual([])
  })

  it('rozdělí projekty: výchozí složka, vlastní složka, vyřazený projekt', () => {
    const { targets, issues } = resolveVaultTargets({
      enabled: true,
      root: 'C:\\Data',
      projects: { b: { root: 'D:\\Repo\\B' }, c: { off: true } },
    }, state)
    expect(targets).toEqual([
      { root: 'C:\\Data', layout: 'shared', projectIds: ['a', 'd'] },
      { root: 'D:\\Repo\\B', layout: 'project', projectIds: ['b'] },
    ])
    expect(issues).toEqual([])
  })

  it('neplatnou vlastní složku nezapíše a nahlásí', () => {
    const { targets, issues } = resolveVaultTargets({
      enabled: true,
      root: 'C:\\Data',
      projects: { a: { root: 'c:/data/' }, b: { root: 'D:\\X' }, c: { root: 'd:\\x' }, d: { root: 'D:\\X\\Y' } },
    }, state)
    expect(targets.map((t) => t.projectIds)).toEqual([[], ['b']])
    expect(issues.map((i) => [i.projectId, i.code])).toEqual([
      ['a', TARGET_ISSUE.SAME_AS_DEFAULT], ['c', TARGET_ISSUE.DUPLICATE], ['d', TARGET_ISSUE.NESTED],
    ])
  })

  it('zvládne neplatný vstup', () => {
    expect(resolveVaultTargets(null, null).targets).toEqual([])
    expect(resolveVaultTargets({ enabled: true, root: 'C:\\D' }, { projects: [null, {}] }).targets[0].projectIds).toEqual([])
  })
})

describe('checkProjectRoot', () => {
  it('složka ve výchozí složce nebo obsahující výchozí složku je problém', () => {
    expect(checkProjectRoot('C:\\Data\\P', 'C:\\Data')).toBe(TARGET_ISSUE.INSIDE_DEFAULT)
    expect(checkProjectRoot('C:\\', 'C:\\Data')).toBe(TARGET_ISSUE.CONTAINS_DEFAULT)
    expect(checkProjectRoot('D:\\P', 'C:\\Data', ['D:\\P\\Q'])).toBe(TARGET_ISSUE.NESTED)
    expect(checkProjectRoot('D:\\P', 'C:\\Data', ['D:\\Q'])).toBeNull()
  })
})

describe('scopeState', () => {
  it('ponechá jen vybrané projekty a jejich záznamy', () => {
    const scoped = scopeState(state, ['b'])
    expect(scoped.projects).toEqual([{ id: 'b' }])
    expect(scoped.goals).toEqual([{ id: 'g2', projectId: 'b' }])
    expect(scoped.connections).toHaveLength(1)
    expect(scoped.personas).toEqual([])
    expect(scopeState(null, null).projects).toEqual([])
  })
})

describe('findOrphans', () => {
  it('spočítá záznamy bez existujícího projektu', () => {
    expect(findOrphans({ projects: [{ id: 'a' }], goals: [{ projectId: 'a' }, { projectId: 'x' }], connections: [{ projectId: 'y' }] }))
      .toEqual([{ code: 'orphanEntities', collection: 'goals', count: 1 }, { code: 'orphanEntities', collection: 'connections', count: 1 }])
    expect(findOrphans(null)).toEqual([])
  })
})

describe('defaultProjectFolderPath', () => {
  const data = { projects: [{ id: 'a', name: 'HPS', createdAt: '1' }, { id: 'b', name: 'HPS', createdAt: '2' }, { id: 'c', name: 'Jiný' }] }

  it('vrátí složku projektu ve výchozí složce (Windows i jiné cesty)', () => {
    expect(defaultProjectFolderPath({ root: 'C:\\Data\\' }, data, 'a')).toBe('C:\\Data\\projects\\HPS')
    expect(defaultProjectFolderPath({ root: '/home/x/Data' }, data, 'c')).toBe('/home/x/Data/projects/Jiný')
  })

  it('přípona při shodě názvů jen s projekty výchozí složky', () => {
    expect(defaultProjectFolderPath({ root: 'C:\\Data' }, data, 'b')).toBe('C:\\Data\\projects\\HPS (2)')
    expect(defaultProjectFolderPath({ root: 'C:\\Data', projects: { a: { root: 'D:\\A' } } }, data, 'b')).toBe('C:\\Data\\projects\\HPS')
  })

  it('bez výchozí složky nebo projektu prázdný řetězec', () => {
    expect(defaultProjectFolderPath({ root: '' }, data, 'a')).toBe('')
    expect(defaultProjectFolderPath({ root: 'C:\\Data' }, data, 'x')).toBe('')
    expect(defaultProjectFolderPath(null, null, 'a')).toBe('')
  })
})
