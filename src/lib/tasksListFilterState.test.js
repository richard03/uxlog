import { describe, it, expect, beforeEach } from 'vitest'
import {
  TASK_LIST_FILTER_DEFAULTS,
  getTasksListFilterState,
  setTasksListFilterState,
  resetTasksListFilterCacheForTests,
} from './tasksListFilterState.js'

describe('tasksListFilterState', () => {
  beforeEach(() => {
    resetTasksListFilterCacheForTests()
  })

  it('returns defaults for unknown project', () => {
    expect(getTasksListFilterState('p1')).toEqual(TASK_LIST_FILTER_DEFAULTS)
  })

  it('persists and restores state per project', () => {
    setTasksListFilterState('p1', {
      ...TASK_LIST_FILTER_DEFAULTS,
      filterIncomplete: false,
      filterDone: true,
      filterText: 'foo',
    })
    expect(getTasksListFilterState('p1')).toMatchObject({
      filterIncomplete: false,
      filterDone: true,
      filterText: 'foo',
    })
    expect(getTasksListFilterState('p2')).toEqual(TASK_LIST_FILTER_DEFAULTS)
  })
})
