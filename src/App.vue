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
    <ToastNotification />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { toRaw } from 'vue'
import AppHeader from './components/AppHeader.vue'
import StatusBar from './components/StatusBar.vue'
import ToastNotification from './components/ToastNotification.vue'
import { useI18n } from './composables/useI18n.js'
import { state, getData, persist } from './lib/stores/index.js'
import { replaceStateFromStorage } from './lib/stores/state.js'
import { hasCapability, callCapability } from './lib/plugins/registry.js'
import {
  isTauri,
  isMirrorInFlight,
  listenToTauriStorageUpdates,
  pullUxlogDataFromDiskIntoApp,
  openExternal,
} from './lib/tauriBridge.js'

const { t } = useI18n()

/** Interval automatického syncu (každých 60 s). */
const SYNC_INTERVAL_MS = 60_000
/** Tauri: periodická kontrola nativního storage pro zápisy z Figma HTTP API mimo WebView. */
const DISK_STORAGE_POLL_MS = 2_500
let syncTimer = null
let diskPollTimer = null
let syncing = false
let stopStorageListener = null

/**
 * Pokud se v nativním storage změnilo uxlog_data (např. PUT z Figmy), přepíše localStorage a Vue state.
 */
async function applyUxlogDataFromDiskIfChanged() {
  if (!isTauri) return
  if (isMirrorInFlight()) return
  const changed = await pullUxlogDataFromDiskIntoApp()
  if (!changed) return
  replaceStateFromStorage()
  if (hasCapability('sync:set-snapshot')) {
    callCapability('sync:set-snapshot', toRaw(getData()))
  }
}

async function runSync() {
  if (syncing || !hasCapability('sync:run')) return
  // Ověř, zda je sync skutečně povolený (URL nastaveno + syncEnabled)
  const isEnabled = callCapability('sync:enabled')
  if (!isEnabled) return
  syncing = true
  try {
    await callCapability('sync:run', toRaw(getData()), (updates) => {
      Object.assign(state, updates)
      persist({ history: false })
      // Po persist aktualizuj snapshot, aby diffAndSync neviděl updatedAt jako změnu
      if (hasCapability('sync:set-snapshot')) {
        callCapability('sync:set-snapshot', toRaw(getData()))
      }
    })
  } finally {
    syncing = false
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // Záložka se stala viditelnou: okamžitý sync + obnov interval
    runSync()
    applyUxlogDataFromDiskIfChanged()
    if (!syncTimer) syncTimer = setInterval(runSync, SYNC_INTERVAL_MS)
    if (isTauri && !diskPollTimer) {
      diskPollTimer = setInterval(applyUxlogDataFromDiskIfChanged, DISK_STORAGE_POLL_MS)
    }
  } else {
    // Záložka na pozadí: zastav periodický sync
    clearInterval(syncTimer)
    syncTimer = null
    if (diskPollTimer) {
      clearInterval(diskPollTimer)
      diskPollTimer = null
    }
  }
}

/**
 * Globální handler: kliknutí na <a target="_blank"> nebo <a href="http...">
 * v Tauri otevře odkaz v externím prohlížeči.
 */
function handleExternalLink(e) {
  if (!isTauri) return
  const link = e.target.closest('a[href]')
  if (!link) return
  const href = link.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return
  // Pouze externí URL (http/https) nebo target=_blank
  const isExternal = /^https?:\/\//.test(href)
  const isBlank = link.getAttribute('target') === '_blank'
  if (isExternal || isBlank) {
    e.preventDefault()
    openExternal(href)
  }
}

onMounted(() => {
  document.addEventListener('click', handleExternalLink)
  // Počáteční sync hned po startu
  runSync()
  applyUxlogDataFromDiskIfChanged()
  // Opakovaný sync pro zachycení změn z jiných prohlížečů
  syncTimer = setInterval(runSync, SYNC_INTERVAL_MS)
  if (isTauri) {
    diskPollTimer = setInterval(applyUxlogDataFromDiskIfChanged, DISK_STORAGE_POLL_MS)
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  if (isTauri) {
    listenToTauriStorageUpdates(async (payload) => {
      if (payload?.key !== 'uxlog_data') return
      await applyUxlogDataFromDiskIfChanged()
    }).then((unlisten) => {
      stopStorageListener = unlisten
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleExternalLink)
  clearInterval(syncTimer)
  if (diskPollTimer) {
    clearInterval(diskPollTimer)
    diskPollTimer = null
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (stopStorageListener) {
    stopStorageListener()
    stopStorageListener = null
  }
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
