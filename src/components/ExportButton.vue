<template>
  <div class="export-btn-wrap" ref="wrapRef">
    <AppButton variant="secondary" @click="toggle" :aria-expanded="open" aria-haspopup="menu">
      {{ label || t.project.export }}
    </AppButton>
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
import AppButton from './AppButton.vue'
import { downloadText, copyText } from '../utils/exportHelper.js'
import { showToast } from '../composables/useToast.js'

/**
 * @prop {Function} getYaml - vrátí exportovaný text (název z doby, kdy šlo jen o YAML)
 * @prop {string} extension, mimeType - formát staženého souboru (výchozí YAML)
 * @prop {string} label - popisek tlačítka (výchozí „Export“)
 */
const props = defineProps({
  getYaml: { type: Function, required: true },
  filename: { type: String, required: true },
  extension: { type: String, default: 'yaml' },
  mimeType: { type: String, default: 'application/yaml' },
  label: { type: String, default: '' },
})

/** Uloží soubor a oznámí výsledek – v desktopové aplikaci cestu k souboru, při chybě důvod. */
async function download(text) {
  try {
    const path = await downloadText(text, props.filename, { extension: props.extension, mimeType: props.mimeType })
    if (path) showToast(t.common.exportSaved(path), 6000)
  } catch (err) {
    console.error('[UXLog] export download failed:', err)
    showToast(t.common.exportFailed(String(err?.message ?? err ?? '')), 8000)
  }
}

const { t } = useI18n()
const open = ref(false)
const wrapRef = ref(null)

function toggle() { open.value = !open.value }

async function handleClipboard() {
  open.value = false
  const text = props.getYaml()
  const ok = await copyText(text)
  if (ok) {
    showToast(t.common.exportCopiedToClipboard)
  } else {
    // clipboard nedostupný – fallback na stažení
    await download(text)
  }
}

function handleDownload() {
  open.value = false
  download(props.getYaml())
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
