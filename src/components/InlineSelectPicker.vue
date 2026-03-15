<template>
  <!-- Chip picker: ≤ CHIP_THRESHOLD options → segmented chip buttons, no edit mode -->
  <div v-if="isSmall && realOptions.length > 0" class="chip-picker" role="group" :aria-label="ariaLabel">
    <button
      v-for="opt in realOptions"
      :key="opt.value"
      type="button"
      class="chip"
      :class="{ 'chip-active': isSelected(opt.value) }"
      :aria-pressed="isSelected(opt.value)"
      @click.stop="pick(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>

  <!-- Popover picker: > CHIP_THRESHOLD options → floating listbox -->
  <div v-else-if="realOptions.length > 0" ref="pickerRef" class="popover-picker">
    <button
      type="button"
      class="popover-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click.stop="toggleOpen"
      @keydown.escape="close"
    >
      <span>{{ currentLabel }}</span>
      <svg
        class="chevron"
        :class="{ 'chevron-open': isOpen }"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    <div v-if="isOpen" class="popover-list" role="listbox" :aria-label="ariaLabel">
      <button
        v-for="opt in realOptions"
        :key="opt.value"
        type="button"
        role="option"
        :aria-selected="isSelected(opt.value)"
        class="popover-option"
        :class="{ 'popover-option-active': isSelected(opt.value) }"
        @click.stop="pick(opt.value)"
        @keydown.escape="close"
      >
        <svg
          v-if="isSelected(opt.value)"
          class="check-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span v-else class="check-placeholder" aria-hidden="true" />
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * InlineSelectPicker – výběr hodnoty bez editačního módu.
 * ≤ 5 opcí → chip tlačítka (vždy viditelná, klik = okamžité uložení).
 * > 5 opcí → popover s listboxem (klik na trigger → seznam → klik = uložení).
 *
 * @prop {Array<{value: string|number, label: string}>} options - seznam možností
 * @prop {string|number} modelValue - aktuálně vybraná hodnota
 * @prop {string} ariaLabel - label pro přístupnost skupiny
 */
defineOptions({ name: 'InlineSelectPicker' })

const CHIP_THRESHOLD = 5

const props = defineProps({
  options: { type: Array, default: () => [] },
  modelValue: { type: [String, Number], default: '' },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

// Filtrujeme prázdný placeholder (value === '') – nezobrazovat jako chip ani popover položku
const realOptions = computed(() => props.options.filter(o => String(o.value) !== ''))
// Chipy jen pro 2–CHIP_THRESHOLD položek; 1 položka nebo >CHIP_THRESHOLD → popover
const isSmall = computed(() => realOptions.value.length >= 2 && realOptions.value.length <= CHIP_THRESHOLD)
const isOpen = ref(false)
const pickerRef = ref(null)

function isSelected(val) {
  return String(props.modelValue) === String(val)
}

const currentLabel = computed(() => {
  const found = realOptions.value.find(o => isSelected(o.value))
  return found ? found.label : '—'
})

function pick(val) {
  emit('update:modelValue', val)
  isOpen.value = false
}

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function onDocumentClick(e) {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
/* ── Chip picker ── */
.chip-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 1px 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.6;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.chip:hover:not(.chip-active) {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-muted);
}

.chip-active {
  background: var(--accent-muted);
  color: var(--text);
  border-color: var(--text);
  font-weight: 600;
}

.chip-active:hover {
  background: color-mix(in srgb, var(--accent) 25%, var(--bg-elevated));
  border-color: var(--accent-hover);
  color: var(--accent-hover);
}

.chip:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* ── Popover picker ── */
.popover-picker {
  position: relative;
  display: inline-block;
}

.popover-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 500;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.popover-trigger:hover {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.popover-trigger:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
  color: var(--text-muted);
}

.chevron-open {
  transform: rotate(180deg);
}

.popover-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 200;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  min-width: 160px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 400;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.popover-option:hover {
  background: var(--bg-muted);
}

.popover-option-active {
  font-weight: 600;
  color: var(--accent);
}

.popover-option:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: -2px;
}

.check-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.check-placeholder {
  display: inline-block;
  width: 14px;
  flex-shrink: 0;
}
</style>
