/**
 * Plugin registry – event bus, capabilities a status items.
 *
 * Pluginy se registrují přes registerPlugin() a komunikují s jádrem
 * aplikace prostřednictvím událostí (emit/on) a capabilities.
 *
 * Jádro (state.js) emituje události, pluginy na ně reagují.
 * Pluginy registrují capabilities, které mohou UI komponenty volat.
 */

import { reactive, ref } from 'vue'

// ---------------------------------------------------------------------------
// Plugin config persistence (enabled/disabled state)
// ---------------------------------------------------------------------------

const PLUGIN_CONFIG_KEY = 'uxlog_plugins'

/**
 * Načte konfiguraci pluginů z localStorage.
 * @returns {{ [pluginId: string]: { enabled: boolean } }}
 */
export function loadPluginConfig() {
  try {
    const raw = localStorage.getItem(PLUGIN_CONFIG_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Uloží konfiguraci pluginů do localStorage.
 * @param {{ [pluginId: string]: { enabled: boolean } }} config
 */
export function savePluginConfig(config) {
  try {
    localStorage.setItem(PLUGIN_CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('[PluginRegistry] savePluginConfig failed:', e)
  }
}

/**
 * Vrátí true, pokud je plugin povolený (výchozí: true).
 * @param {string} pluginId
 * @returns {boolean}
 */
export function isPluginEnabled(pluginId) {
  const config = loadPluginConfig()
  return config[pluginId]?.enabled !== false
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** @type {Map<string, Object>} Registered plugins by id */
const plugins = new Map()

/** @type {Map<string, Object>} All known plugin definitions (including disabled) */
const allPluginDefs = new Map()

/** @type {Map<string, Set<Function>>} Event listeners */
const listeners = new Map()

/** @type {Map<string, { pluginId: string, handler: Function }>} */
const capabilities = new Map()

/** @type {import('vue').Ref<number>} Bumped on every capability/plugin change so computed refs re-evaluate */
const capabilityVersion = ref(0)

/** Reactive array of status items for StatusBar */
const statusItems = reactive([])

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------

/**
 * Emit an event to all registered listeners.
 * @param {string} event
 * @param {*} [payload]
 */
export function emit(event, payload) {
  const set = listeners.get(event)
  if (!set) return
  for (const handler of set) {
    try {
      handler(payload)
    } catch (e) {
      console.error(`[PluginRegistry] Error in listener for "${event}":`, e)
    }
  }
}

/** @type {Map<string, Array<{event: string, handler: Function}>>} Listeners per plugin for cleanup */
const pluginListeners = new Map()

/**
 * Subscribe to an event. Tracks the listener per plugin for cleanup on unregister.
 * @param {string} event
 * @param {Function} handler
 * @param {string} [pluginId] Owner plugin id (set internally by buildContext)
 * @returns {Function} Unsubscribe function
 */
function on(event, handler, pluginId) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(handler)
  if (pluginId) {
    if (!pluginListeners.has(pluginId)) pluginListeners.set(pluginId, [])
    pluginListeners.get(pluginId).push({ event, handler })
  }
  return () => listeners.get(event)?.delete(handler)
}

/**
 * Unregister all event listeners owned by a plugin.
 * @param {string} pluginId
 */
function unregisterListeners(pluginId) {
  const entries = pluginListeners.get(pluginId)
  if (!entries) return
  for (const { event, handler } of entries) {
    listeners.get(event)?.delete(handler)
  }
  pluginListeners.delete(pluginId)
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Register a capability that UI components can call.
 * Pokud capability se stejným id už existuje (od jiného pluginu), nepřepíše ji.
 * Díky tomu při zapnutých obou AI pluginech „vyhraje" ten první registrovaný.
 * @param {string} id  Capability identifier (e.g. 'ai:notebook')
 * @param {Function} handler
 * @param {string} pluginId  Owning plugin id
 */
function registerCapability(id, handler, pluginId) {
  const existing = capabilities.get(id)
  if (existing && existing.pluginId !== pluginId) {
    console.debug(`[PluginRegistry] Capability "${id}" already provided by "${existing.pluginId}", skipping "${pluginId}"`)
    return
  }
  capabilities.set(id, { pluginId, handler })
  capabilityVersion.value++
}

/**
 * Unregister all capabilities owned by a plugin.
 * @param {string} pluginId
 */
function unregisterCapabilities(pluginId) {
  for (const [id, cap] of capabilities) {
    if (cap.pluginId === pluginId) capabilities.delete(id)
  }
  capabilityVersion.value++
}

/**
 * Check if a capability is available.
 * Access capabilityVersion.value to make this reactive in Vue computed.
 * @param {string} id
 * @returns {boolean}
 */
export function hasCapability(id) {
  // Touch reactive version so Vue tracks the dependency
  void capabilityVersion.value
  return capabilities.has(id)
}

/**
 * Call a registered capability. Returns undefined if not available.
 * @param {string} id
 * @param  {...any} args
 * @returns {*}
 */
export function callCapability(id, ...args) {
  const cap = capabilities.get(id)
  if (!cap) return undefined
  return cap.handler(...args)
}

// ---------------------------------------------------------------------------
// Status items
// ---------------------------------------------------------------------------

/**
 * Register a status item for StatusBar.
 * @param {{ id: string, label: string, value: import('vue').Ref, visible?: import('vue').Ref<boolean>|Function }} item
 * @param {string} pluginId
 */
function registerStatusItem(item, pluginId) {
  statusItems.push({ ...item, pluginId })
}

/**
 * Unregister all status items owned by a plugin.
 * @param {string} pluginId
 */
function unregisterStatusItems(pluginId) {
  let idx = statusItems.findIndex((s) => s.pluginId === pluginId)
  while (idx >= 0) {
    statusItems.splice(idx, 1)
    idx = statusItems.findIndex((s) => s.pluginId === pluginId)
  }
}

/**
 * Get all registered status items (reactive array).
 * @returns {Array}
 */
export function getStatusItems() {
  return statusItems
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

/**
 * Build the context object passed to plugin.install().
 * @param {string} pluginId
 * @param {{ getState: Function, getReactiveState: Function, persist: Function }} coreRefs
 * @returns {Object}
 */
function buildContext(pluginId, coreRefs) {
  return {
    on: (event, handler) => on(event, handler, pluginId),
    emit,
    getState: coreRefs.getState,
    getReactiveState: coreRefs.getReactiveState,
    persist: coreRefs.persist,
    registerCapability: (id, handler) => registerCapability(id, handler, pluginId),
    registerStatusItem: (item) => registerStatusItem(item, pluginId),
  }
}

/** Core references injected by install.js before plugins are registered. */
let _coreRefs = { getState: () => ({}), getReactiveState: () => ({}), persist: () => {} }

/**
 * Inject core references (getState, persist, etc.).
 * Must be called before any registerPlugin().
 * @param {{ getState: Function, getReactiveState: Function, persist: Function }} refs
 */
export function setCoreRefs(refs) {
  _coreRefs = refs
}

/**
 * Register a plugin. Respects the enabled/disabled config from localStorage.
 * Disabled plugins are stored in allPluginDefs but not installed.
 * @param {Object} plugin  Plugin definition with id, name, install()
 */
export function registerPlugin(plugin) {
  // Vždy uložíme definici (pro UI seznam a pozdější enable)
  allPluginDefs.set(plugin.id, plugin)

  if (!isPluginEnabled(plugin.id)) {
    console.log(`[PluginRegistry] Plugin "${plugin.name}" (${plugin.id}) is disabled, skipping install`)
    capabilityVersion.value++
    return
  }

  if (plugins.has(plugin.id)) {
    console.warn(`[PluginRegistry] Plugin "${plugin.id}" already registered, skipping`)
    return
  }
  plugins.set(plugin.id, plugin)
  const ctx = buildContext(plugin.id, _coreRefs)
  if (typeof plugin.install === 'function') {
    plugin.install(ctx)
  }
  capabilityVersion.value++
  console.log(`[PluginRegistry] Registered plugin: ${plugin.name} (${plugin.id})`)
}

/**
 * Unregister a plugin (internal). Keeps the definition in allPluginDefs.
 * @param {string} id
 */
function unregisterPluginInternal(id) {
  const plugin = plugins.get(id)
  if (!plugin) return
  if (typeof plugin.uninstall === 'function') {
    plugin.uninstall()
  }
  unregisterCapabilities(id)
  unregisterStatusItems(id)
  unregisterListeners(id)
  plugins.delete(id)
  capabilityVersion.value++
  console.log(`[PluginRegistry] Unregistered plugin: ${id}`)
}

/**
 * Unregister a plugin and remove its definition.
 * @param {string} id
 */
export function unregisterPlugin(id) {
  unregisterPluginInternal(id)
  allPluginDefs.delete(id)
}

/**
 * Enable a plugin at runtime. Installs it if not already running.
 * Persists the enabled state to localStorage.
 * @param {string} id
 */
export function enablePlugin(id) {
  const config = loadPluginConfig()
  config[id] = { enabled: true }
  savePluginConfig(config)

  const plugin = allPluginDefs.get(id)
  if (!plugin) return
  if (plugins.has(id)) return // Already running

  plugins.set(id, plugin)
  const ctx = buildContext(id, _coreRefs)
  if (typeof plugin.install === 'function') {
    plugin.install(ctx)
  }
  capabilityVersion.value++
  console.log(`[PluginRegistry] Enabled plugin: ${plugin.name} (${id})`)
}

/**
 * Disable a plugin at runtime. Uninstalls it but keeps the definition.
 * Persists the disabled state to localStorage.
 * @param {string} id
 */
export function disablePlugin(id) {
  const config = loadPluginConfig()
  config[id] = { enabled: false }
  savePluginConfig(config)

  unregisterPluginInternal(id)
  console.log(`[PluginRegistry] Disabled plugin: ${id}`)
}

/**
 * Get a registered (active) plugin by id.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getPlugin(id) {
  return plugins.get(id)
}

/**
 * Get all registered (active) plugins.
 * @returns {Object[]}
 */
export function getPlugins() {
  return [...plugins.values()]
}

/**
 * Get all known plugin definitions (including disabled).
 * @returns {Object[]}
 */
export function getAllPluginDefs() {
  void capabilityVersion.value
  return [...allPluginDefs.values()]
}

/**
 * Check if a plugin is currently active (installed).
 * @param {string} id
 * @returns {boolean}
 */
export function isPluginActive(id) {
  void capabilityVersion.value
  return plugins.has(id)
}
