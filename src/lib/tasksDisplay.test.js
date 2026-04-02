/**
 * Unit testy pro tasksDisplay.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isTaskIncomplete,
  isTaskOverdue,
  isIncompleteTaskOverdue,
  summarizeIncompleteTasksForProjectBadge,
} from './tasksDisplay.js'

describe('isTaskIncomplete', () => {
  it('vrátí true pro výchozí / explicitní incomplete', () => {
    expect(isTaskIncomplete({ status: 'incomplete' })).toBe(true)
    expect(isTaskIncomplete({})).toBe(true)
  })

  it('vrátí false pro hotové a zrušené', () => {
    expect(isTaskIncomplete({ status: 'done' })).toBe(false)
    expect(isTaskIncomplete({ status: 'cancelled' })).toBe(false)
  })
})

describe('isTaskOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T12:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('vrátí false bez termínu', () => {
    expect(isTaskOverdue({ dueDate: '' })).toBe(false)
    expect(isTaskOverdue({})).toBe(false)
  })

  it('vrátí true po termínu', () => {
    expect(isTaskOverdue({ dueDate: '2026-04-01' })).toBe(true)
  })

  it('vrátí false pro dnešek a budoucí termín', () => {
    expect(isTaskOverdue({ dueDate: '2026-04-02' })).toBe(false)
    expect(isTaskOverdue({ dueDate: '2026-04-03' })).toBe(false)
  })
})

describe('isIncompleteTaskOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T12:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('vyžaduje incomplete a prošlý termín', () => {
    expect(isIncompleteTaskOverdue({ status: 'incomplete', dueDate: '2026-04-01' })).toBe(true)
    expect(isIncompleteTaskOverdue({ status: 'done', dueDate: '2026-04-01' })).toBe(false)
    expect(isIncompleteTaskOverdue({ status: 'incomplete', dueDate: '2026-04-10' })).toBe(false)
  })
})

describe('summarizeIncompleteTasksForProjectBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T12:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('spočítá jen nedokončené a po termínu', () => {
    const tasks = [
      { id: '1', status: 'done', dueDate: '2026-01-01' },
      { id: '2', status: 'incomplete', dueDate: '2026-04-01' },
      { id: '3', status: 'incomplete', dueDate: '2026-04-10' },
    ]
    expect(summarizeIncompleteTasksForProjectBadge(tasks)).toEqual({ count: 2, overdueCount: 1 })
  })

  it('vrátí nuly pro prázdný seznam', () => {
    expect(summarizeIncompleteTasksForProjectBadge([])).toEqual({ count: 0, overdueCount: 0 })
    expect(summarizeIncompleteTasksForProjectBadge(null)).toEqual({ count: 0, overdueCount: 0 })
  })
})
