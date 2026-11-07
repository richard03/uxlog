import { describe, it, expect } from 'vitest'
import { BACKUP_PREFIX, backupKeyFor, keyFromBackup, retryDelay, RETRY_DELAYS_MS, summarizeSaveProblem } from './saveRecovery.js'

describe('backup keys', () => {
  it('round-trips and does not start with uxlog_ (startup migration would clear it)', () => {
    expect(backupKeyFor('uxlog_data')).toBe(`${BACKUP_PREFIX}uxlog_data`)
    expect(backupKeyFor('uxlog_data').startsWith('uxlog_')).toBe(false)
    expect(keyFromBackup(backupKeyFor('uxlog_data'))).toBe('uxlog_data')
  })

  it('ignores foreign and invalid keys', () => {
    expect(keyFromBackup('uxlog_data')).toBeNull()
    expect(keyFromBackup(`${BACKUP_PREFIX}jina_aplikace`)).toBeNull()
    expect(keyFromBackup(null)).toBeNull()
  })
})

describe('retryDelay', () => {
  it('grows and then stays at the last delay', () => {
    expect(retryDelay(0)).toBe(RETRY_DELAYS_MS[0])
    expect(retryDelay(1)).toBe(RETRY_DELAYS_MS[1])
    expect(retryDelay(99)).toBe(RETRY_DELAYS_MS.at(-1))
    expect(retryDelay(-1)).toBe(RETRY_DELAYS_MS[0])
    expect(retryDelay('x')).toBe(RETRY_DELAYS_MS[0])
  })
})

describe('summarizeSaveProblem', () => {
  it('is null when nothing failed', () => {
    expect(summarizeSaveProblem(new Map())).toBeNull()
    expect(summarizeSaveProblem(undefined)).toBeNull()
  })

  it('reports keys, last error and whether everything is backed up', () => {
    const failed = new Map([
      ['uxlog_data', { error: 'disk full', backedUp: true }],
      ['uxlog_history', { error: 'locked', backedUp: true }],
    ])
    expect(summarizeSaveProblem(failed)).toEqual({ keys: ['uxlog_data', 'uxlog_history'], backedUp: true, error: 'locked' })
    failed.set('uxlog_config', { error: 'x', backedUp: false })
    expect(summarizeSaveProblem(failed).backedUp).toBe(false)
  })
})
