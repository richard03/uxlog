/**
 * Konfigurace projektů: každý projekt má vlastní kopii výchozí konfigurace.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.spyOn(console, 'log').mockImplementation(() => {})

let store
let config
beforeAll(async () => {
  store = await import('./index.js')
  config = await import('./config.js')
})

const fieldLabels = (api, type = 'persona') => api.getEntityCustomFields(type).map((f) => f.label)

describe('konfigurace projektů', () => {
  it('nový projekt dostane kopii výchozí konfigurace, další změny výchozí ho neovlivní', () => {
    config.addEntityField('persona', { label: 'Výchozí pole' })
    const a = store.addProject({ name: 'A' }).id
    expect(fieldLabels(config.configFor(a))).toEqual(['Výchozí pole'])

    config.addEntityField('persona', { label: 'Až po založení' })
    expect(fieldLabels(config.configFor(a))).toEqual(['Výchozí pole'])
    expect(fieldLabels(config.configFor(null))).toEqual(['Výchozí pole', 'Až po založení'])
  })

  it('úprava konfigurace projektu neovlivní jiné projekty ani výchozí konfiguraci', () => {
    const a = store.addProject({ name: 'A2' }).id
    const b = store.addProject({ name: 'B2' }).id
    const before = fieldLabels(config.configFor(null))
    config.configFor(a).addEntityField('persona', { label: 'Jen v A' })

    expect(fieldLabels(config.configFor(a))).toContain('Jen v A')
    expect(fieldLabels(config.configFor(b))).not.toContain('Jen v A')
    expect(fieldLabels(config.configFor(null))).toEqual(before)
  })

  it('starší projekt bez konfigurace dostane kopii (ensureProjectConfigs) a úprava nesáhne na výchozí', () => {
    const id = store.addProject({ name: 'Starý' }).id
    delete store.getProject(id).config
    expect(config.ensureProjectConfigs()).toBe(1)
    expect(store.getProject(id).config).toBeTruthy()

    delete store.getProject(id).config
    const before = fieldLabels(config.configFor(null))
    config.configFor(id).addEntityField('persona', { label: 'Jen starý' })
    expect(fieldLabels(config.configFor(null))).toEqual(before)
  })

  it('šablony aktivit nového projektu vznikají z jeho konfigurace', () => {
    const id = store.addProject({ name: 'Šablony' }).id
    const key = config.configFor(id).addCustomTemplate({ name: 'Vlastní aktivita' })
    expect(config.configFor(id).getTemplate(key)?.name).toBe('Vlastní aktivita')
    expect(config.getTemplate(key)).toBeUndefined()
  })

  it('neexistující projekt čte výchozí konfiguraci', () => {
    expect(fieldLabels(config.configFor('neexistuje'))).toEqual(fieldLabels(config.configFor(null)))
  })
})
