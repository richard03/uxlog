import { describe, it, expect } from 'vitest'
import { getEmptyConfig, normalizeConfig, fillMissingProjectConfigs } from './projectConfig.js'

describe('normalizeConfig', () => {
  it('prázdná nebo poškozená konfigurace = výchozí', () => {
    expect(normalizeConfig(null)).toEqual(getEmptyConfig())
    expect(normalizeConfig('x')).toEqual(getEmptyConfig())
    expect(normalizeConfig({ customActivityTemplates: 'x', entityCustomFields: [] })).toEqual(getEmptyConfig())
  })

  it('zachová platné části, zahodí zrušené délky projektů a nemění vstup', () => {
    const raw = { customActivityTemplates: [{ key: 'a' }, null], projectDurationDays: { small: 10 }, extra: 1 }
    const out = normalizeConfig(raw)
    expect(out.customActivityTemplates).toEqual([{ key: 'a' }])
    expect('projectDurationDays' in out).toBe(false)
    expect(out.extra).toBe(1)
    out.customActivityTemplates.push({ key: 'b' })
    expect(raw.customActivityTemplates).toHaveLength(2)
  })
})

describe('fillMissingProjectConfigs', () => {
  it('doplní konfiguraci jen projektům bez ní, každému vlastní kopii', () => {
    const data = { projects: [{ id: 'a' }, { id: 'b', config: { mine: true } }, null, { name: 'bez id' }] }
    const filled = fillMissingProjectConfigs(data, () => getEmptyConfig())
    expect(filled).toBe(1)
    expect(data.projects[0].config).toEqual(getEmptyConfig())
    expect(data.projects[1].config).toEqual({ mine: true })
    expect(data.projects[3].config).toBeUndefined()
  })

  it('zvládne neplatný vstup', () => {
    expect(fillMissingProjectConfigs(null, () => ({}))).toBe(0)
    expect(fillMissingProjectConfigs({ projects: [{ id: 'a' }] }, null)).toBe(0)
  })
})
