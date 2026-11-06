/**
 * Přichycený sloupec (position: sticky) vedle dlouhého obsahu, který může být vyšší než okno.
 * Hlídá výšku sloupce i okna a vrací odsazení `top` (logika `stickyTopOffset`).
 */

import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { stickyTopOffset } from '../lib/stickyOffset.js'

/** Mezera nad sloupcem (odpovídá --space-md). */
const TOP_GAP = 16
/** Mezera pod sloupcem: StatusBar (24px, fixed) + okraj. */
const BOTTOM_GAP = 24 + 16

/**
 * @param {import('vue').Ref<HTMLElement|null>} elRef přichycený prvek
 * @returns {{ top: import('vue').Ref<number> }} odsazení v px
 */
export function useStickyColumn(elRef) {
  const top = ref(TOP_GAP)
  let observer = null

  function update() {
    const el = elRef.value
    if (!el || typeof window === 'undefined') return
    top.value = stickyTopOffset({
      viewportHeight: window.innerHeight,
      elementHeight: el.offsetHeight,
      topGap: TOP_GAP,
      bottomGap: BOTTOM_GAP,
    })
  }

  function observe(el) {
    observer?.disconnect()
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = observer ?? new ResizeObserver(update)
      observer.observe(el)
    }
    update()
  }

  onMounted(() => {
    window.addEventListener('resize', update)
    observe(elRef.value)
  })
  watch(elRef, observe)
  onBeforeUnmount(() => {
    window.removeEventListener('resize', update)
    observer?.disconnect()
    observer = null
  })

  return { top }
}
