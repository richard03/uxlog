/**
 * Vstupní bod UXLog (jen desktopová aplikace – Tauri).
 *
 * Nejdřív načte úložiště ze SQLite do paměti (initStorage) a teprve pak načte zbytek aplikace
 * (dynamický import) – moduly, které čtou nastavení už při importu, tak vždy vidí aktuální data.
 */

import { isTauri, initStorage } from './lib/tauriBridge.js'
import cs from './i18n/cs.js'

/** Mimo Tauri (prohlížeč) se aplikace spustí jen při vývoji – data jsou pak jen v paměti. */
function showDesktopOnly() {
  const el = document.getElementById('app')
  el.textContent = ''
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;'
  const h1 = document.createElement('h1')
  h1.textContent = cs.app.desktopOnlyTitle
  const p = document.createElement('p')
  p.textContent = cs.app.desktopOnly
  wrapper.append(h1, p)
  el.append(wrapper)
}

async function bootstrap() {
  console.log('[UXLog] Aplikace startuje')
  if (!isTauri && !import.meta.env.DEV) {
    showDesktopOnly()
    return
  }
  if (!isTauri) console.warn(`[UXLog] ${cs.app.previewWarning}`)
  await initStorage()
  const { startApp } = await import('./app.js')
  startApp()
}

bootstrap().catch((err) => {
  console.error('UXLog init error:', err)
  const el = document.getElementById('app')
  el.textContent = ''
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;'
  const h1 = document.createElement('h1')
  h1.textContent = cs.app.initErrorTitle
  const p1 = document.createElement('p')
  p1.textContent = cs.app.initError
  const p2 = document.createElement('p')
  p2.style.cssText = 'color: #666; font-size: 0.9rem;'
  p2.textContent = cs.app.initErrorDetail(err.message)
  wrapper.append(h1, p1, p2)
  el.append(wrapper)
})
