import { ref } from 'vue'

const visible  = ref(false)
const message  = ref('')
let resolver   = null

export function useConfirm() {
  function confirm(msg) {
    message.value = msg
    visible.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function accept() {
    visible.value = false
    resolver?.(true)
    resolver = null
  }

  function cancel() {
    visible.value = false
    resolver?.(false)
    resolver = null
  }

  return { visible, message, confirm, accept, cancel }
}
