/**
 * Chování modálního dialogu (Modal, ConfirmDialog, MoveToProjectModal):
 * - po otevření zaměří první pole (jinak první tlačítko v těle, jinak dialog),
 * - Tab drží fokus uvnitř dialogu,
 * - Esc a klik mimo dialog zavírají – jen nejvyšší dialog (vnořený potvrzovací dialog nezavře i ten pod ním),
 * - po zavření vrátí fokus prvku, který ho měl před otevřením,
 * - stránka se neposouvá, dokud je otevřený aspoň jeden dialog.
 * Zásobník a pohyb fokusu: lib/dialogStack.js.
 */

import { onMounted, onUnmounted, nextTick } from 'vue'
import { createDialogStack, nextFocusIndex } from '../lib/dialogStack.js'

const stack = createDialogStack()
let counter = 0

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')
const FIELDS = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [autofocus]'

function visible(el) {
  return el.getClientRects().length > 0
}

function focusables(root) {
  return root ? [...root.querySelectorAll(FOCUSABLE)].filter(visible) : []
}

/**
 * @param {import('vue').Ref<HTMLElement|null>} dialogRef - prvek dialogu (bez překryvu)
 * @param {{ onClose: () => void }} options - zavření (Esc, klik mimo)
 */
export function useDialog(dialogRef, { onClose }) {
  const id = `dialog-${++counter}`
  let previousFocus = null
  let clickTimer = null

  function initialFocus() {
    const root = dialogRef.value
    if (!root) return
    const body = root.querySelector('.modal-body') || root
    const field = [...body.querySelectorAll(FIELDS)].find(visible)
    const target = field || focusables(body)[0] || focusables(root)[0] || root
    if (target === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }

  function onKeydown(e) {
    // Prvek uvnitř dialogu, který klávesu sám zpracoval (např. Esc ruší úpravu), má přednost
    if (!stack.isTop(id) || e.defaultPrevented) return
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = focusables(dialogRef.value)
    const index = nextFocusIndex(items.length, items.indexOf(document.activeElement), e.shiftKey)
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    if (index !== null) {
      e.preventDefault()
      items[index].focus()
    }
  }

  function onDocumentClick(e) {
    // Prvky odstraněné z DOM (přepnutí obsahu dialogu) nejsou klik mimo
    if (!stack.isTop(id) || !e.target.isConnected) return
    if (dialogRef.value && !dialogRef.value.contains(e.target)) onClose()
  }

  onMounted(() => {
    previousFocus = document.activeElement
    stack.push(id)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    // Zpoždění, aby se nezachytil stejný klik, který dialog otevřel
    clickTimer = setTimeout(() => document.addEventListener('click', onDocumentClick), 0)
    nextTick(initialFocus)
  })

  onUnmounted(() => {
    clearTimeout(clickTimer)
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('click', onDocumentClick)
    stack.remove(id)
    if (stack.size() === 0) document.body.style.overflow = ''
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') {
      previousFocus.focus({ preventScroll: true })
    }
  })
}
