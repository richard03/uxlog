import { describe, it, expect } from 'vitest'
import { createDialogStack, nextFocusIndex } from './dialogStack.js'

describe('createDialogStack', () => {
  it('only the last opened dialog is on top', () => {
    const stack = createDialogStack()
    expect(stack.isTop('a')).toBe(false)
    stack.push('a')
    stack.push('b')
    expect(stack.isTop('b')).toBe(true)
    expect(stack.isTop('a')).toBe(false)
    expect(stack.size()).toBe(2)
    stack.remove('b')
    expect(stack.isTop('a')).toBe(true)
    stack.remove('a')
    expect(stack.size()).toBe(0)
  })

  it('tolerates repeated push and unknown remove', () => {
    const stack = createDialogStack()
    stack.push('a')
    stack.push('b')
    stack.push('a')
    expect(stack.isTop('a')).toBe(true)
    expect(stack.size()).toBe(2)
    stack.remove('neni')
    expect(stack.size()).toBe(2)
  })
})

describe('nextFocusIndex', () => {
  it('wraps around at both ends', () => {
    expect(nextFocusIndex(3, 2, false)).toBe(0)
    expect(nextFocusIndex(3, 0, true)).toBe(2)
  })

  it('lets the browser move inside', () => {
    expect(nextFocusIndex(3, 0, false)).toBeNull()
    expect(nextFocusIndex(3, 2, true)).toBeNull()
  })

  it('brings focus from outside back in', () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0)
    expect(nextFocusIndex(3, -1, true)).toBe(2)
  })

  it('handles empty dialogs and invalid input', () => {
    expect(nextFocusIndex(0, 0, false)).toBeNull()
    expect(nextFocusIndex('x', 0, false)).toBeNull()
  })
})
