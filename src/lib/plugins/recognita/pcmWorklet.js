/* global AudioWorkletProcessor, registerProcessor */
/**
 * AudioWorklet: předává vzorky z mikrofonu (první kanál) hlavnímu vláknu.
 * Převod na 16 kHz PCM dělá hlavní vlákno (`lib/dictation.js`).
 */
class UxlogPcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel && channel.length) this.port.postMessage(channel.slice(0))
    return true
  }
}

registerProcessor('uxlog-pcm-capture', UxlogPcmCapture)
