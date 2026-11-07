import { describe, it, expect } from 'vitest'
import { aiFetch, cancelAiRequests, aiRequestsRunning, isAiCancelled, isAiTimeout, AI_ERROR } from './request.js'

/** fetch, který odpoví až po `ms`, nebo skončí chybou AbortError po zrušení signálu. */
function slowFetch(ms) {
  return (url, init) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response('ok')), ms)
    init.signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}

describe('aiFetch', () => {
  it('returns the response and counts running requests', async () => {
    const pending = aiFetch('x', {}, { fetchImpl: slowFetch(5) })
    expect(aiRequestsRunning.value).toBe(1)
    const res = await pending
    expect(await res.text()).toBe('ok')
    expect(aiRequestsRunning.value).toBe(0)
  })

  it('times out with AI_TIMEOUT and a user message', async () => {
    const err = await aiFetch('x', {}, { timeoutMs: 10, fetchImpl: slowFetch(1000) }).catch((e) => e)
    expect(err.code).toBe(AI_ERROR.TIMEOUT)
    expect(isAiTimeout(err)).toBe(true)
    expect(err.message).toBeTruthy()
    expect(aiRequestsRunning.value).toBe(0)
  })

  it('cancels all running requests, later requests run normally', async () => {
    const a = aiFetch('a', {}, { fetchImpl: slowFetch(1000) }).catch((e) => e)
    const b = aiFetch('b', {}, { fetchImpl: slowFetch(1000) }).catch((e) => e)
    cancelAiRequests()
    const [ea, eb] = await Promise.all([a, b])
    expect(isAiCancelled(ea)).toBe(true)
    expect(isAiCancelled(eb)).toBe(true)
    const res = await aiFetch('c', {}, { fetchImpl: slowFetch(1) })
    expect(res.ok).toBe(true)
  })

  it('passes other errors through', async () => {
    const err = await aiFetch('x', {}, { fetchImpl: async () => { throw new TypeError('offline') } }).catch((e) => e)
    expect(err).toBeInstanceOf(TypeError)
    expect(isAiCancelled(err) || isAiTimeout(err)).toBe(false)
  })
})
