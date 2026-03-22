<template>
  <div class="app">
    <a href="#main" class="skip-link">{{ t.common.skipToContent }}</a>
    <AppHeader />
    <main id="main" class="main" role="main">
      <router-view v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="container">
              <p>{{ t.common.loading }}</p>
            </div>
          </template>
        </Suspense>
      </router-view>
    </main>
    <StatusBar />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { toRaw } from 'vue'
import AppHeader from './components/AppHeader.vue'
import StatusBar from './components/StatusBar.vue'
import { useI18n } from './composables/useI18n.js'
import { state, getData, persist } from './lib/stores/index.js'
import { hasCapability, callCapability } from './lib/plugins/registry.js'

const { t } = useI18n()

/** Interval automatického syncu (každých 60 s). */
const SYNC_INTERVAL_MS = 60_000
let syncTimer = null
let syncing = false

async function runSync() {
  if (syncing || !hasCapability('sync:run')) return
  // Ověř, zda je sync skutečně povolený (URL nastaveno + syncEnabled)
  const isEnabled = callCapability('sync:enabled')
  if (!isEnabled) return
  syncing = true
  try {
    await callCapability('sync:run', toRaw(getData()), (updates) => {
      Object.assign(state, updates)
      persist()
    })
  } finally {
    syncing = false
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // Záložka se stala viditelnou: okamžitý sync + obnov interval
    runSync()
    if (!syncTimer) syncTimer = setInterval(runSync, SYNC_INTERVAL_MS)
  } else {
    // Záložka na pozadí: zastav periodický sync
    clearInterval(syncTimer)
    syncTimer = null
  }
}

onMounted(() => {
  // Počáteční sync hned po startu
  runSync()
  // Opakovaný sync pro zachycení změn z jiných prohlížečů
  syncTimer = setInterval(runSync, SYNC_INTERVAL_MS)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  clearInterval(syncTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding-top: var(--space-md);
  padding-bottom: 24px; /* rezerva pro StatusBar */
}
</style>
