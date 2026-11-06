/**
 * Spuštění Vue aplikace UXLog. Načítá se z main.js až po načtení úložiště (initStorage),
 * takže story, konfigurace i pluginy při importu čtou data ze SQLite.
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'
import './components/pending-review.css'
import { initStore, ensureProjectConfigs, migrateNotebookToSources } from './lib/store.js'
import { installPlugins } from './lib/plugins/install.js'
import { initTheme } from './composables/useTheme.js'
import './themes/amiga.css'
import './themes/macos.css'
import './themes/pixelart.css'
import './themes/scifi.css'

export function startApp() {
  initTheme()
  initStore()

  // Starší projekty bez vlastní konfigurace dostanou kopii výchozí (pak už jsou na ní nezávislé)
  ensureProjectConfigs()
  // Starší zprávy Zápisníku „Vložit informace“ se stanou zdroji (dotazy zůstanou v chatu)
  migrateNotebookToSources()

  installPlugins()

  const app = createApp(App)
  app.config.errorHandler = (err) => {
    console.error('Vue error:', err)
    // Show a dismissible banner instead of destroying the app
    const existing = document.querySelector('[data-error-display]')
    if (existing) existing.remove()
    const banner = document.createElement('div')
    banner.setAttribute('data-error-display', '')
    banner.setAttribute('role', 'alert')
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b91c1c;color:#fff;' +
      'padding:0.75rem 1rem;font-family:system-ui;display:flex;align-items:center;gap:0.75rem;'
    const msg = document.createElement('span')
    msg.style.cssText = 'flex:1;'
    msg.textContent = 'Došlo k chybě: ' + err.message
    const btn = document.createElement('button')
    btn.textContent = '✕'
    btn.style.cssText =
      'background:none;border:none;color:#fff;font-size:1.25rem;cursor:pointer;padding:0 0.25rem;'
    btn.onclick = () => banner.remove()
    banner.append(msg, btn)
    document.body.prepend(banner)
  }
  app.use(router)
  app.mount('#app')
}
