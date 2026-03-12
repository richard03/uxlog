<template>
  <div class="export-btn-wrap" ref="wrapRef">
    <button type="button" class="btn btn-secondary" @click="toggle" :aria-expanded="open" aria-haspopup="menu">
      {{ t.project.export }}
    </button>
    <ul v-if="open" class="export-menu" role="menu">
      <li role="none">
        <button type="button" role="menuitem" @click="handleClipboard">{{ t.project.exportClipboard }}</button>
      </li>
      <li role="none">
        <button type="button" role="menuitem" @click="handleDownload">{{ t.project.exportDownload }}</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { downloadYaml, copyYaml } from '../utils/exportHelper.js'

const props = defineProps({
  getYaml: { type: Function, required: true },
  filename: { type: String, required: true },
})

const { t } = useI18n()
const open = ref(false)
const wrapRef = ref(null)

function toggle() { open.value = !open.value }

async function handleClipboard() {
  open.value = false
  const yaml = props.getYaml()
  const ok = await copyYaml(yaml)
  if (!ok) {
    // clipboard nedostupný – fallback na stažení
    downloadYaml(yaml, props.filename)
  }
}

function handleDownload() {
  open.value = false
  downloadYaml(props.getYaml(), props.filename)
}

function onClickOutside(e) {
  if (wrapRef.value && !wrapRef.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside, true))
onUnmounted(() => document.removeEventListener('click', onClickOutside, true))
</script>

<style scoped>
.export-btn-wrap {
  position: relative;
}

.export-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  list-style: none;
  margin: 0;
  padding: var(--space-xs) 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
  min-width: 180px;
}

.export-menu button {
  display: block;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  text-align: left;
  font-family: inherit;
  font-size: 0.9375rem;
  color: var(--text);
  cursor: pointer;
}

.export-menu button:hover {
  background: var(--bg-muted);
}

.export-menu button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: -2px;
}
</style>
