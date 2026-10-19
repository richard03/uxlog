<template>
  <!-- Kontextová lišta výběru na plátně; klávesy a ukazatel v ní plátno neovládají -->
  <div
    ref="rootEl"
    class="canvas-toolbar"
    :class="`canvas-toolbar--${align}`"
    role="toolbar"
    :aria-label="t.canvas.toolbar"
    data-canvas-keys="off"
    @pointerdown.stop
    @dblclick.stop
    @wheel.stop
    @keydown.esc="paletteOpen = false"
  >
    <div class="ct-color">
      <button
        type="button"
        class="ct-btn"
        :title="t.canvas.cardColor"
        :aria-label="t.canvas.cardColor"
        aria-haspopup="true"
        :aria-expanded="paletteOpen"
        @click="paletteOpen = !paletteOpen"
      >
        <span
          class="ct-swatch"
          :class="{ 'ct-swatch--none': !currentColor, 'ct-swatch--mixed': currentColor === 'mixed' }"
          :style="currentColor && currentColor !== 'mixed' ? { background: currentColor } : null"
          aria-hidden="true"
        ></span>
      </button>

      <div v-if="paletteOpen" class="ct-palette" role="group" :aria-label="t.canvas.cardColor">
        <button
          type="button"
          class="ct-none"
          :aria-pressed="!currentColor"
          @click="pick(null)"
        >
          <span class="ct-swatch ct-swatch--none" aria-hidden="true"></span>
          {{ t.canvas.noColor }}
        </button>
        <div class="ct-grid">
          <button
            v-for="c in colors"
            :key="c.color"
            type="button"
            class="ct-option"
            :class="{ 'ct-option--active': currentColor === c.color }"
            :style="{ background: c.color }"
            :title="c.label"
            :aria-label="c.label"
            :aria-pressed="currentColor === c.color"
            @click="pick(c.color)"
          ></button>
        </div>
      </div>
    </div>

    <span class="ct-sep" aria-hidden="true"></span>

    <KebabMenu :items="menuItems" :aria-label="t.canvas.selectionActions" @action="(a) => emit('action', a)" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import KebabMenu from './KebabMenu.vue'

/**
 * @prop {Array<{ color: string, label: string }>} colors - paleta barev kartiček
 * @prop {string|null} currentColor - společná barva výběru, null = bez barvy, 'mixed' = různé barvy
 * @prop {Array} menuItems - položky menu „…“ (jako KebabMenu)
 * @prop {'start'|'end'} align - kam se rozbalují nabídky (start = doprava od lišty, end = doleva)
 * @emits color - zvolená barva (hex) nebo null (výchozí barvy)
 * @emits action - akce z menu „…“
 */
defineProps({
  colors: { type: Array, required: true },
  currentColor: { type: String, default: null },
  menuItems: { type: Array, required: true },
  align: { type: String, default: 'start' },
})

const emit = defineEmits(['color', 'action'])

const { t } = useI18n()
const rootEl = ref(null)
const paletteOpen = ref(false)

function pick(color) {
  paletteOpen.value = false
  emit('color', color)
}

function onOutsideClick(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) paletteOpen.value = false
}

/** Otevření menu „…“ zavře paletu (KebabMenu ohlašuje otevření událostí na dokumentu). */
function onKebabOpen() {
  paletteOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onOutsideClick)
  document.addEventListener('kebab-open', onKebabOpen)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick)
  document.removeEventListener('kebab-open', onKebabOpen)
})
</script>

<style scoped>
.canvas-toolbar {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  cursor: default;
  white-space: nowrap;
}

.ct-color {
  position: relative;
}

.ct-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
}

.ct-btn:hover,
.ct-btn[aria-expanded='true'] {
  background: var(--bg-muted);
}

.ct-btn:focus-visible,
.ct-option:focus-visible,
.ct-none:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.ct-swatch {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border);
}

/* Bez barvy: přeškrtnutý kroužek */
.ct-swatch--none {
  background: linear-gradient(135deg, transparent 45%, var(--error) 45%, var(--error) 55%, transparent 55%), var(--bg);
}

/* Výběr s různými barvami */
.ct-swatch--mixed {
  background: conic-gradient(#fca5a5, #fde68a, #86efac, #93c5fd, #c4b5fd, #fca5a5);
}

.ct-palette {
  position: absolute;
  top: calc(100% + 8px);
  left: -4px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.ct-none {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 4px 6px;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--text);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.ct-none:hover,
.ct-none[aria-pressed='true'] {
  background: var(--bg-muted);
}

.ct-grid {
  display: grid;
  grid-template-columns: repeat(6, 24px);
  gap: 6px;
}

.ct-option {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.ct-option:hover {
  transform: scale(1.15);
}

.ct-option--active {
  box-shadow: 0 0 0 2px var(--bg-elevated), 0 0 0 4px var(--text);
}

.ct-sep {
  width: 1px;
  align-self: stretch;
  margin: 2px 2px;
  background: var(--border);
}

/* Lišta u pravého okraje plátna rozbaluje nabídky doleva */
.canvas-toolbar--end .ct-palette {
  left: auto;
  right: -36px;
}

/* Tlačítko „…“ je v liště vždy plně viditelné; menu se rozbalí směrem do plátna */
.canvas-toolbar :deep(.kebab-btn) {
  opacity: 1;
}

.canvas-toolbar--start :deep(.kebab-dropdown) {
  left: 0;
  right: auto;
}
</style>
