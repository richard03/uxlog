<template>
  <div class="expandable" :class="{ 'expandable--clamped': clamped }">
    <div
      ref="contentEl"
      class="expandable-content"
      :style="expanded ? null : { maxHeight }"
      @click="overflowing || expanded ? toggle() : null"
    >
      <slot />
    </div>
    <button
      v-if="overflowing || expanded"
      type="button"
      class="expandable-toggle"
      :aria-expanded="expanded"
      @click="toggle"
    >
      {{ expanded ? t.common.showLess : t.common.showMore }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from '../composables/useI18n.js'

/**
 * Zkrácený obsah: přesáhne-li `maxHeight`, ořízne se (se ztmavením dole) a kliknutím
 * na obsah nebo na „Zobrazit celé“ se rozbalí. Přetečení se měří (ResizeObserver),
 * krátký obsah se nezkracuje a tlačítko nemá.
 * @prop {string} maxHeight - výška zkráceného obsahu (CSS délka, např. '6em')
 */
const props = defineProps({
  maxHeight: { type: String, default: '6em' },
})

const emit = defineEmits(['toggle'])

const { t } = useI18n()

const contentEl = ref(null)
const expanded = ref(false)
const overflowing = ref(false)
const clamped = computed(() => overflowing.value && !expanded.value)
let observer = null

/** Zjistí, zda obsah přesahuje zkrácenou výšku (jen ve sbaleném stavu). */
function measure() {
  const el = contentEl.value
  if (!el || expanded.value) return
  overflowing.value = el.scrollHeight > el.clientHeight + 1
}

function toggle() {
  expanded.value = !expanded.value
  emit('toggle', expanded.value)
  if (!expanded.value) nextTick(measure)
}

onMounted(() => {
  measure()
  // Po načtení webového fontu se text přelije – přetečení je potřeba změřit znovu
  document.fonts?.ready.then(measure)
  if (typeof ResizeObserver !== 'undefined' && contentEl.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(contentEl.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())

defineExpose({ measure })
</script>

<style scoped>
.expandable-content {
  overflow: hidden;
}

.expandable--clamped .expandable-content {
  cursor: pointer;
  /* Ztmavení posledního řádku naznačuje, že text pokračuje */
  -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent);
  mask-image: linear-gradient(to bottom, #000 60%, transparent);
}

.expandable-toggle {
  margin-top: var(--space-xs);
  padding: 0;
  background: none;
  border: none;
  color: var(--accent);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.expandable-toggle:hover {
  text-decoration: underline;
}
</style>
