/**
 * Vstupní bod Vue aplikace UXLog.
 *
 * V Tauri prostředí nejdřív obnoví localStorage ze souborů (pokud je prázdný)
 * a teprve pak inicializuje store a Vue app.
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'
import { initStore } from './lib/store.js'
import { installPlugins } from './lib/plugins/install.js'
import { isTauri, restoreAllFromTauri } from './lib/tauriBridge.js'

async function bootstrap() {
  console.log('[UXLog] Aplikace startuje')

  if (isTauri) {
    await restoreAllFromTauri()
    initStore()
    console.log('[UXLog] Tauri: data obnovena ze souborů')
  }

  installPlugins()

  const app = createApp(App)
  app.config.errorHandler = (err) => {
    console.error('Vue error:', err)
    const el = document.getElementById('app')
    if (el && !el.querySelector('[data-error-display]')) {
      el.textContent = ''
      const wrapper = document.createElement('div')
      wrapper.setAttribute('data-error-display', '')
      wrapper.style.cssText = 'padding: 2rem; font-family: system-ui;'
      const h1 = document.createElement('h1')
      h1.textContent = 'Došlo k chybě'
      const p = document.createElement('p')
      p.textContent = err.message
      wrapper.append(h1, p)
      el.append(wrapper)
    }
  }
  app.use(router)
  app.mount('#app')
}

bootstrap().catch((err) => {
  console.error('UXLog init error:', err)
  const el = document.getElementById('app')
  el.textContent = ''
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;'
  const h1 = document.createElement('h1')
  h1.textContent = 'Chyba při načítání'
  const p1 = document.createElement('p')
  p1.textContent = 'Aplikace se nepodařilo spustit. Zkuste obnovit stránku nebo použít jiný prohlížeč.'
  const p2 = document.createElement('p')
  p2.style.cssText = 'color: #666; font-size: 0.9rem;'
  p2.textContent = `Technické info: ${err.message}`
  wrapper.append(h1, p1, p2)
  el.append(wrapper)
})
