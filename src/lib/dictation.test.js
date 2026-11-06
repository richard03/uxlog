import { describe, it, expect } from 'vitest'
import {
  normalizeBaseUrl, buildStreamUrl, resampleTo16k, createResampleState, floatToPcm16, bytesToBase64,
  chunkByteLength, parseDictationMessage, closeCodeToError, normalizeDictationError, liveSpokenText,
  initialDictationState, reduceDictation, normalizeDictationTimings, composeDictatedText,
  DICTATION_STATUS, DICTATION_ERROR, DEFAULT_DICTATION_TIMINGS,
} from './dictation.js'

describe('normalizeBaseUrl', () => {
  it('doplní https a odřízne lomítka i cestu k API', () => {
    expect(normalizeBaseUrl('example.net:9443/')).toBe('https://example.net:9443')
    expect(normalizeBaseUrl('https://example.net:9443/api/docs')).toBe('https://example.net:9443')
    expect(normalizeBaseUrl('https://example.net/api/v1/stream')).toBe('https://example.net')
    expect(normalizeBaseUrl('http://host/sub/')).toBe('http://host/sub')
    expect(normalizeBaseUrl('wss://host')).toBe('https://host')
  })
  it('neplatné vstupy vrací prázdný řetězec', () => {
    expect(normalizeBaseUrl('')).toBe('')
    expect(normalizeBaseUrl(null)).toBe('')
    expect(normalizeBaseUrl('ftp://host')).toBe('')
    expect(normalizeBaseUrl('https://')).toBe('')
  })
})

describe('buildStreamUrl', () => {
  it('sestaví wss adresu s parametry', () => {
    const url = buildStreamUrl('https://example.net:9443', { language: 'cs', initialPrompt: 'UXLog, persona', filename: 'diktát' })
    expect(url.startsWith('wss://example.net:9443/api/v1/stream?')).toBe(true)
    const q = new URL(url).searchParams
    expect(q.get('language')).toBe('cs')
    expect(q.get('initial_prompt')).toBe('UXLog, persona')
    expect(q.get('filename')).toBe('diktát')
  })
  it('http → ws, prázdný jazyk = autodetekce, výchozí cs', () => {
    expect(buildStreamUrl('http://h', { language: '' })).toBe('ws://h/api/v1/stream?language=')
    expect(buildStreamUrl('http://h')).toBe('ws://h/api/v1/stream?language=cs')
  })
  it('neplatná adresa', () => {
    expect(buildStreamUrl('')).toBe('')
  })
})

describe('resampleTo16k', () => {
  it('48 kHz → třetinový počet vzorků, navazující bloky bez ztráty', () => {
    const block = new Float32Array(480).map((_, i) => i / 480)
    let st = createResampleState()
    let total = 0
    for (let k = 0; k < 10; k++) {
      const r = resampleTo16k(block, 48000, st)
      st = r.state
      total += r.samples.length
    }
    expect(Math.abs(total - 1600)).toBeLessThanOrEqual(1)
  })
  it('interpoluje lineárně', () => {
    const r = resampleTo16k([0, 1, 2, 3], 32000, createResampleState())
    expect(Array.from(r.samples)).toEqual([0, 2])
  })
  it('16 kHz projde beze změny, prázdný vstup nic nevrátí', () => {
    expect(Array.from(resampleTo16k([0.5, -0.5], 16000).samples)).toEqual([0.5, -0.5])
    expect(resampleTo16k([], 48000).samples.length).toBe(0)
    expect(resampleTo16k(null, 48000).samples.length).toBe(0)
  })
})

describe('floatToPcm16 + bytesToBase64', () => {
  it('ořízne rozsah a zapíše little-endian', () => {
    const b = floatToPcm16([0, 1, -1, 2, NaN])
    const v = new DataView(b.buffer)
    expect(v.getInt16(0, true)).toBe(0)
    expect(v.getInt16(2, true)).toBe(32767)
    expect(v.getInt16(4, true)).toBe(-32768)
    expect(v.getInt16(6, true)).toBe(32767)
    expect(v.getInt16(8, true)).toBe(0)
  })
  it('base64 odpovídá standardu včetně doplnění', () => {
    const enc = (s) => bytesToBase64(new TextEncoder().encode(s))
    expect(enc('')).toBe('')
    expect(enc('f')).toBe('Zg==')
    expect(enc('fo')).toBe('Zm8=')
    expect(enc('foo')).toBe('Zm9v')
    expect(enc('foobar')).toBe('Zm9vYmFy')
    expect(bytesToBase64(new Uint8Array([255, 254, 253]))).toBe('//79')
  })
  it('blok 250 ms má 8000 bajtů', () => {
    expect(chunkByteLength()).toBe(8000)
  })
})

describe('parseDictationMessage', () => {
  it('přečte známé zprávy', () => {
    expect(parseDictationMessage('{"type":"ready","id":"abc"}')).toEqual({ type: 'ready', id: 'abc' })
    expect(parseDictationMessage({ type: 'partial', committed: 'a', tentative: 1 })).toEqual({ type: 'partial', committed: 'a', tentative: '' })
    expect(parseDictationMessage({ type: 'done', id: null, text: 'x' })).toEqual({ type: 'done', id: null, text: 'x' })
    expect(parseDictationMessage({ type: 'error', detail: 'busy' })).toEqual({ type: 'error', detail: 'busy' })
  })
  it('neznámé a poškozené zprávy ignoruje', () => {
    expect(parseDictationMessage('nejson')).toBeNull()
    expect(parseDictationMessage('{"type":"other"}')).toBeNull()
    expect(parseDictationMessage(null)).toBeNull()
    expect(parseDictationMessage('42')).toBeNull()
  })
})

describe('closeCodeToError / normalizeDictationError', () => {
  it('mapuje kódy zavření', () => {
    expect(closeCodeToError(1000)).toBeNull()
    expect(closeCodeToError(4401)).toBe(DICTATION_ERROR.UNAUTHORIZED)
    expect(closeCodeToError(4409)).toBe(DICTATION_ERROR.BUSY)
    expect(closeCodeToError(1006)).toBe(DICTATION_ERROR.CONNECTION_LOST)
    expect(closeCodeToError(undefined)).toBe(DICTATION_ERROR.CONNECTION_LOST)
  })
  it('neznámý kód chyby = server', () => {
    expect(normalizeDictationError('busy')).toBe('busy')
    expect(normalizeDictationError('xyz')).toBe(DICTATION_ERROR.SERVER)
    expect(normalizeDictationError(undefined)).toBe(DICTATION_ERROR.SERVER)
  })
})

describe('liveSpokenText', () => {
  it('spojí potvrzenou a předběžnou část', () => {
    expect(liveSpokenText('Dobrý den', 'tohle je')).toBe('Dobrý den tohle je')
    expect(liveSpokenText('', ' x ')).toBe('x')
    expect(liveSpokenText(undefined, undefined)).toBe('')
  })
})

describe('reduceDictation', () => {
  const T = DEFAULT_DICTATION_TIMINGS
  const msg = (m) => ({ type: 'message', message: m })
  const start = () => reduceDictation(initialDictationState(), { type: 'start' }, 1000)

  it('běžný průběh: připojení → poslech → dokončení', () => {
    let s = start()
    expect(s.status).toBe(DICTATION_STATUS.CONNECTING)
    s = reduceDictation(s, msg({ type: 'ready', id: 'a' }), 1100)
    expect(s.status).toBe(DICTATION_STATUS.LISTENING)
    s = reduceDictation(s, msg({ type: 'partial', committed: 'Dobrý den', tentative: 'tohle' }), 2000)
    expect(liveSpokenText(s.committed, s.tentative)).toBe('Dobrý den tohle')
    s = reduceDictation(s, { type: 'stop' }, 3000)
    expect(s.status).toBe(DICTATION_STATUS.FINISHING)
    s = reduceDictation(s, msg({ type: 'done', id: 'a', text: 'Dobrý den, tohle je test.' }), 3500)
    expect(s.status).toBe(DICTATION_STATUS.IDLE)
    expect(s.final).toBe('Dobrý den, tohle je test.')
    expect(s.incomplete).toBe(false)
  })

  it('potvrzený text se starší zprávou nezkrátí', () => {
    let s = reduceDictation(start(), msg({ type: 'ready' }), 1100)
    s = reduceDictation(s, msg({ type: 'partial', committed: 'Ahoj světe', tentative: '' }), 1200)
    s = reduceDictation(s, msg({ type: 'partial', committed: 'Ahoj', tentative: 'x' }), 1300)
    expect(s.committed).toBe('Ahoj světe')
  })

  it('done s prázdným textem použije živý text', () => {
    let s = reduceDictation(start(), msg({ type: 'ready' }), 1100)
    s = reduceDictation(s, msg({ type: 'partial', committed: 'Text', tentative: 'navíc' }), 1200)
    s = reduceDictation(s, msg({ type: 'done', text: '' }), 1300)
    expect(s.final).toBe('Text navíc')
  })

  it('nedostupný server při připojení → timeout', () => {
    let s = start()
    s = reduceDictation(s, { type: 'tick' }, 1000 + T.connectTimeoutMs - 1)
    expect(s.status).toBe(DICTATION_STATUS.CONNECTING)
    s = reduceDictation(s, { type: 'tick' }, 1000 + T.connectTimeoutMs + 1)
    expect(s.status).toBe(DICTATION_STATUS.ERROR)
    expect(s.error).toBe(DICTATION_ERROR.TIMEOUT)
  })

  it('pomalý server: upozornění, pak výpadek s uchovaným textem', () => {
    let s = reduceDictation(start(), msg({ type: 'ready' }), 1000)
    s = reduceDictation(s, msg({ type: 'partial', committed: 'Uložený text', tentative: 'konec' }), 1000)
    s = reduceDictation(s, { type: 'tick' }, 1000 + T.slowAfterMs + 1)
    expect(s.slow).toBe(true)
    expect(s.status).toBe(DICTATION_STATUS.LISTENING)
    s = reduceDictation(s, { type: 'alive' }, 1000 + T.slowAfterMs + 2)
    expect(s.slow).toBe(false)
    const last = s.lastSeenAt
    s = reduceDictation(s, { type: 'tick' }, last + T.stallAfterMs + 1)
    expect(s.status).toBe(DICTATION_STATUS.ERROR)
    expect(s.error).toBe(DICTATION_ERROR.STALLED)
    expect(s.final).toBe('Uložený text konec')
  })

  it('server nedokončí přepis včas → text zůstane, označený jako neúplný', () => {
    let s = reduceDictation(start(), msg({ type: 'ready' }), 1000)
    s = reduceDictation(s, msg({ type: 'partial', committed: 'Ahoj', tentative: '' }), 1000)
    s = reduceDictation(s, { type: 'stop' }, 2000)
    s = reduceDictation(s, { type: 'tick' }, 2000 + T.finishTimeoutMs + 1)
    expect(s.status).toBe(DICTATION_STATUS.IDLE)
    expect(s.final).toBe('Ahoj')
    expect(s.incomplete).toBe(true)
  })

  it('zavření spojení: 4409 obsazeno, 4401 klíč, 1000 řádný konec', () => {
    const listening = reduceDictation(start(), msg({ type: 'ready' }), 1000)
    expect(reduceDictation(listening, { type: 'closed', code: 4409 }, 1100).error).toBe(DICTATION_ERROR.BUSY)
    expect(reduceDictation(start(), { type: 'closed', code: 4401 }, 1100).error).toBe(DICTATION_ERROR.UNAUTHORIZED)
    const finishing = reduceDictation(listening, { type: 'stop' }, 1200)
    const closed = reduceDictation(finishing, { type: 'closed', code: 1000 }, 1300)
    expect(closed.status).toBe(DICTATION_STATUS.IDLE)
    expect(closed.incomplete).toBe(false)
  })

  it('chyba spojení uchová dosavadní text', () => {
    let s = reduceDictation(start(), msg({ type: 'ready' }), 1000)
    s = reduceDictation(s, msg({ type: 'partial', committed: 'Něco', tentative: '' }), 1100)
    s = reduceDictation(s, { type: 'error', code: 'connectionLost' }, 1200)
    expect(s.status).toBe(DICTATION_STATUS.ERROR)
    expect(s.final).toBe('Něco')
  })

  it('zastavení během připojování skončí bez chyby; nečinný stav události ignoruje', () => {
    const s = reduceDictation(start(), { type: 'stop' }, 1100)
    expect(s.status).toBe(DICTATION_STATUS.IDLE)
    expect(reduceDictation(s, { type: 'tick' }, 99999)).toBe(s)
    expect(reduceDictation(undefined, { type: 'alive' }, 1).status).toBe(DICTATION_STATUS.IDLE)
  })
})

describe('normalizeDictationTimings', () => {
  it('doplní výchozí hodnoty a odmítne nesmysly', () => {
    expect(normalizeDictationTimings(undefined)).toEqual(DEFAULT_DICTATION_TIMINGS)
    const t = normalizeDictationTimings({ connectTimeoutMs: 5000, slowAfterMs: 10, stallAfterMs: 'x' })
    expect(t.connectTimeoutMs).toBe(5000)
    expect(t.slowAfterMs).toBe(DEFAULT_DICTATION_TIMINGS.slowAfterMs)
    expect(t.stallAfterMs).toBe(DEFAULT_DICTATION_TIMINGS.stallAfterMs)
  })
})

describe('composeDictatedText', () => {
  it('vloží text s mezerami na místo kurzoru', () => {
    expect(composeDictatedText({ before: 'Ahoj', after: 'konec', spoken: 'světe' })).toEqual({ text: 'Ahoj světe konec', caret: 10 })
    expect(composeDictatedText({ before: 'Ahoj ', after: '. Dál', spoken: 'světe' })).toEqual({ text: 'Ahoj světe. Dál', caret: 10 })
    expect(composeDictatedText({ before: '', after: '', spoken: ' text ' })).toEqual({ text: 'text', caret: 4 })
  })
  it('prázdný diktát nic nezmění', () => {
    expect(composeDictatedText({ before: 'a', after: 'b', spoken: '' })).toEqual({ text: 'ab', caret: 1 })
    expect(composeDictatedText()).toEqual({ text: '', caret: 0 })
  })
})
