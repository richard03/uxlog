<template>
  <div class="kebab-menu" ref="containerRef">
    <button
      type="button"
      class="kebab-btn"
      :aria-label="ariaLabel || t.common.actions"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <circle cx="8" cy="3" r="1.5"/>
        <circle cx="8" cy="8" r="1.5"/>
        <circle cx="8" cy="13" r="1.5"/>
      </svg>
    </button>
    <ul v-if="open" class="kebab-dropdown" role="menu">
      <li v-for="item in items" :key="item.action" role="none">
        <button
          type="button"
          class="kebab-item"
          :class="item.variant ? `kebab-item-${item.variant}` : ''"
          role="menuitem"
          @click.stop="select(item)"
        >{{ item.label }}</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../composables/useI18n.js'

const { t } = useI18n()

const props = defineProps({
  items: { type: Array, required: true },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['action'])

const open = ref(false)
const containerRef = ref(null)
const uid = Symbol()

function toggle() {
  const next = !open.value
  if (next) {
    document.dispatchEvent(new CustomEvent('kebab-open', { detail: uid }))
  }
  open.value = next
}

function select(item) {
  open.value = false
  emit('action', item.action)
}

function onOutsideClick(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    open.value = false
  }
}

function onKebabOpen(e) {
  if (e.detail !== uid) open.value = false
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
.kebab-menu {
  position: relative;
  flex-shrink: 0;
  align-self: center;
}

.kebab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0.3;
  transition: opacity var(--transition), background var(--transition), color var(--transition);
}

.kebab-btn:hover,
.kebab-btn:focus-visible {
  opacity: 1;
  background: var(--bg-muted);
  color: var(--text);
}

.kebab-menu:has(.kebab-dropdown) .kebab-btn {
  opacity: 1;
  background: var(--bg-muted);
  color: var(--text);
}

.kebab-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 100;
  min-width: 140px;
  list-style: none;
  margin: 0;
  padding: 4px 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
}

.kebab-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9rem;
  color: var(--text);
  cursor: pointer;
  transition: background var(--transition);
}

.kebab-item:hover {
  background: var(--bg-muted);
}

.kebab-item-danger {
  color: var(--error);
}
</style>
