/**
 * Vstupní bod Vue aplikace UXLog.
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'
import './lib/store.js'

console.log('[UXLog] Aplikace startuje')

try {
  const app = createApp(App)
  app.config.errorHandler = (err) => {
    console.error('Vue error:', err)
    const el = document.getElementById('app')
    if (el && !el.querySelector('[data-error-display]')) {
      el.innerHTML = `<div data-error-display style="padding: 2rem; font-family: system-ui;">
        <h1>Došlo k chybě</h1>
        <p>${err.message}</p>
      </div>`
    }
  }
  app.use(router)
  app.mount('#app')
} catch (err) {
  console.error('UXLog init error:', err)
  document.getElementById('app').innerHTML = `
    <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
      <h1>Chyba při načítání</h1>
      <p>Aplikace se nepodařilo spustit. Zkuste obnovit stránku nebo použít jiný prohlížeč.</p>
      <p style="color: #666; font-size: 0.9rem;">Technické info: ${err.message}</p>
    </div>
  `
}
