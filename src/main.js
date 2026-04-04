/**
 * Vstupní bod Vue aplikace UXLog.
 *
 * V Tauri prostředí nejdřív obnoví localStorage z nativního storage (pokud je prázdný)
 * a teprve pak inicializuje store a Vue app.
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'
import './components/pending-review.css'
import { initStore } from './lib/store.js'
import { installPlugins } from './lib/plugins/install.js'
import { isTauri, restoreAllFromTauri } from './lib/tauriBridge.js'

async function bootstrap() {
  console.log('[UXLog] Aplikace startuje')

  if (isTauri) {
    await restoreAllFromTauri()
    initStore()
    console.log('[UXLog] Tauri: data obnovena z nativního storage')
  }

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
