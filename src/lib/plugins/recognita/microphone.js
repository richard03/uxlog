/**
 * Záznam z mikrofonu jako bloky PCM s16le 16 kHz mono (base64) – pro živý přepis.
 * Převzorkování a převod formátu jsou čisté funkce v `lib/dictation.js`.
 */

import {
  DICTATION_SAMPLE_RATE, DICTATION_CHUNK_MS, DICTATION_ERROR,
  createResampleState, resampleTo16k, floatToPcm16, bytesToBase64,
} from '../../dictation.js'

const SAMPLES_PER_CHUNK = Math.round((DICTATION_SAMPLE_RATE * DICTATION_CHUNK_MS) / 1000)

/** Chyba s kódem z DICTATION_ERROR. */
function codedError(code, cause) {
  const err = new Error(code)
  err.code = code
  if (cause) err.cause = cause
  return err
}

/**
 * Spustí záznam. `onChunk(base64)` dostává bloky po ~250 ms.
 * @param {(base64: string) => void} onChunk
 * @returns {Promise<{ stop: () => void }>} stop() odešle zbytek a uvolní mikrofon
 */
export async function startMicrophone(onChunk) {
  if (!navigator?.mediaDevices?.getUserMedia) throw codedError(DICTATION_ERROR.UNSUPPORTED)
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch (e) {
    throw codedError(DICTATION_ERROR.MICROPHONE, e)
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) {
    stream.getTracks().forEach((t) => t.stop())
    throw codedError(DICTATION_ERROR.UNSUPPORTED)
  }
  let ctx
  try {
    // Prohlížeč umí převzorkovat sám; když 16 kHz nepodporuje, převzorkujeme v JS
    ctx = new AudioCtx({ sampleRate: DICTATION_SAMPLE_RATE })
  } catch {
    ctx = new AudioCtx()
  }

  let resampleState = createResampleState()
  let pending = []
  let pendingCount = 0
  let stopped = false

  function flush(force) {
    while (pendingCount >= SAMPLES_PER_CHUNK || (force && pendingCount > 0)) {
      const take = Math.min(SAMPLES_PER_CHUNK, pendingCount)
      const out = new Float32Array(take)
      let filled = 0
      while (filled < take) {
        const head = pending[0]
        const need = take - filled
        if (head.length <= need) {
          out.set(head, filled)
          filled += head.length
          pending.shift()
        } else {
          out.set(head.subarray(0, need), filled)
          pending[0] = head.subarray(need)
          filled += need
        }
      }
      pendingCount -= take
      try {
        onChunk(bytesToBase64(floatToPcm16(out)))
      } catch (e) {
        console.error('[Recognita] onChunk failed:', e)
      }
    }
  }

  function handleSamples(input) {
    if (stopped) return
    const { samples, state } = resampleTo16k(input, ctx.sampleRate, resampleState)
    resampleState = state
    if (!samples.length) return
    pending.push(samples)
    pendingCount += samples.length
    flush(false)
  }

  const source = ctx.createMediaStreamSource(stream)
  let node
  try {
    if (!ctx.audioWorklet) throw new Error('no worklet')
    const { default: workletUrl } = await import('./pcmWorklet.js?url')
    await ctx.audioWorklet.addModule(workletUrl)
    node = new AudioWorkletNode(ctx, 'uxlog-pcm-capture')
    node.port.onmessage = (e) => handleSamples(e.data)
    source.connect(node)
  } catch {
    // Záloha pro prostředí bez AudioWorkletu
    node = ctx.createScriptProcessor(4096, 1, 1)
    node.onaudioprocess = (e) => handleSamples(e.inputBuffer.getChannelData(0).slice(0))
    source.connect(node)
    node.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {})

  return {
    stop() {
      if (stopped) return
      flush(true)
      stopped = true
      try { source.disconnect() } catch { /* už odpojeno */ }
      try { node.disconnect() } catch { /* už odpojeno */ }
      stream.getTracks().forEach((t) => t.stop())
      ctx.close().catch(() => {})
      pending = []
      pendingCount = 0
    },
  }
}
