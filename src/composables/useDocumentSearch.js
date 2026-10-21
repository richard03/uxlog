/**
 * Fulltextové hledání v zobrazeném dokumentu (jako „Najít na stránce“).
 * Prochází textové uzly dokumentu, nalezená místa zvýrazní přes CSS Custom Highlight API
 * (bez zásahu do DOM – funguje i v upravovaných odstavcích) a k aktuálnímu výsledku posune.
 * Hledá se bez ohledu na velikost písmen a diakritiku (findTextMatches).
 */

import { ref, shallowRef, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { findTextMatches } from '../lib/projectDocument.js'

/** Názvy zvýraznění – styl ::highlight(…) je v DocumentView.vue. */
export const SEARCH_HIGHLIGHT = 'uxlog-doc-search'
export const SEARCH_HIGHLIGHT_CURRENT = 'uxlog-doc-search-current'

/** Prodleva před hledáním při psaní dotazu (ms). */
const SEARCH_DEBOUNCE_MS = 120

const highlightSupported = () =>
  typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'

/**
 * @param {import('vue').Ref<HTMLElement|null>} rootEl - prohledávaný obsah
 * @param {import('vue').Ref<HTMLElement|null>} scrollEl - scrollovací kontejner
 * @param {() => unknown} contentSource - zdroj změn obsahu (po změně se hledání přepočítá)
 */
export function useDocumentSearch(rootEl, scrollEl, contentSource) {
  const query = ref('')
  /** @type {import('vue').ShallowRef<Range[]>} */
  const matches = shallowRef([])
  const current = ref(-1)
  const count = computed(() => matches.value.length)
  const active = computed(() => query.value.trim().length > 0)

  function paint() {
    if (!highlightSupported()) return
    const list = matches.value
    if (!list.length) {
      CSS.highlights.delete(SEARCH_HIGHLIGHT)
      CSS.highlights.delete(SEARCH_HIGHLIGHT_CURRENT)
      return
    }
    CSS.highlights.set(SEARCH_HIGHLIGHT, new Highlight(...list))
    const cur = list[current.value]
    if (cur) CSS.highlights.set(SEARCH_HIGHLIGHT_CURRENT, new Highlight(cur))
    else CSS.highlights.delete(SEARCH_HIGHLIGHT_CURRENT)
  }

  /** Najde výskyty v textových uzlech dokumentu (mimo prvky označené data-doc-search="off"). */
  function collect() {
    const root = rootEl.value
    const q = query.value
    if (!root || !q.trim()) {
      matches.value = []
      current.value = -1
      paint()
      return
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement?.closest('select, option, [data-doc-search="off"]')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    })
    const ranges = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const m of findTextMatches(node.data, q)) {
        const range = document.createRange()
        range.setStart(node, m.start)
        range.setEnd(node, m.end)
        ranges.push(range)
      }
    }
    matches.value = ranges
    if (!ranges.length) current.value = -1
    else if (current.value < 0 || current.value >= ranges.length) current.value = 0
    paint()
  }

  /** Posune scrollovací kontejner tak, aby byl aktuální výsledek uprostřed. */
  function revealCurrent() {
    const range = matches.value[current.value]
    const box = scrollEl.value
    if (!range || !box) return
    const rect = range.getBoundingClientRect()
    const area = box.getBoundingClientRect()
    if (rect.top >= area.top + 40 && rect.bottom <= area.bottom - 40) return
    box.scrollTop += rect.top - area.top - area.height / 2
  }

  /**
   * Přejde na další (1) / předchozí (-1) výsledek, dokola.
   * @param {number} delta
   */
  function go(delta) {
    const n = matches.value.length
    if (!n) return
    current.value = (((current.value + delta) % n) + n) % n
    paint()
    revealCurrent()
  }

  function clear() {
    query.value = ''
  }

  let timer = null
  watch(query, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      current.value = 0
      collect()
      revealCurrent()
    }, SEARCH_DEBOUNCE_MS)
  })

  // Po změně obsahu (úprava, jiný projekt, zobrazení prázdných polí) se staré rozsahy rozpadnou
  watch(contentSource, () => {
    if (active.value) nextTick(collect)
  })

  onBeforeUnmount(() => {
    clearTimeout(timer)
    if (highlightSupported()) {
      CSS.highlights.delete(SEARCH_HIGHLIGHT)
      CSS.highlights.delete(SEARCH_HIGHLIGHT_CURRENT)
    }
  })

  return { query, count, current, active, next: () => go(1), prev: () => go(-1), clear, refresh: collect }
}
