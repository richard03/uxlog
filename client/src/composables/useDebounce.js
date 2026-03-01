import { ref } from 'vue'

export function useDebounce(fn, delay = 400) {
  let timer = null
  const pending = ref(false)

  function debounced(...args) {
    clearTimeout(timer)
    pending.value = true
    timer = setTimeout(async () => {
      await fn(...args)
      pending.value = false
    }, delay)
  }

  return { debounced, pending }
}
