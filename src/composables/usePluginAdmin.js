/**
 * Composable pro administraci pluginů (konfigurace API klíčů, Flexi sync).
 * Používá se v ConfigApiKeysView a ConfigView.
 */

import { loadAiKeys, saveAiKeys, isAiServiceEnabled, setAiServiceEnabled } from '../lib/plugins/ai-shared/keys.js'
import { SERVICE_DEF as GEMINI_SERVICE } from '../lib/plugins/gemini/index.js'
import { SERVICE_DEF as OPENAI_SERVICE } from '../lib/plugins/openai/index.js'
import { loadFlexiConfig, saveFlexiConfig } from '../lib/plugins/flexi/flexiApi.js'
import { initFlexiSync, setFlexiSnapshot } from '../lib/plugins/flexi/flexiSync.js'

export function usePluginAdmin() {
  return {
    loadAiKeys,
    saveAiKeys,
    isAiServiceEnabled,
    setAiServiceEnabled,
    GEMINI_SERVICE,
    OPENAI_SERVICE,
    loadFlexiConfig,
    saveFlexiConfig,
    initFlexiSync,
    setFlexiSnapshot,
  }
}
