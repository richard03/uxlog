/**
 * Plugin: Google Gemini AI
 *
 * Poskytuje AI funkce (zápisník, návrhy souvislostí) přes Google Gemini API.
 * Každý plugin spravuje svůj vlastní API klíč v sdíleném localStorage.
 */

import {
  buildProjectContext, buildNotebookPrompt, parseActions,
  buildConnectionsContext, buildConnectionsPrompt, parseSuggestions,
} from '../ai-shared/prompts.js'
import { getAiKey, loadAiKeys } from '../ai-shared/keys.js'

const SERVICE_ID = 'gemini'
const DEFAULT_MODEL = 'gemini-1.5-flash-latest'

/**
 * Zavolá Gemini API.
 * @param {string} apiKey
 * @param {string} prompt
 * @param {string} model
 * @returns {Promise<string>}
 */
async function callGemini(apiKey, prompt, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API chyba: ${res.status}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function getKey() {
  return getAiKey(SERVICE_ID)
}

function getModel() {
  return loadAiKeys()[`${SERVICE_ID}_model`] || DEFAULT_MODEL
}

async function processNotebook(notebookText, projectData) {
  const apiKey = getKey()
  if (!apiKey) throw new Error('Gemini API klíč není nastaven. Přejděte do nastavení.')
  const context = buildProjectContext(projectData)
  const prompt = buildNotebookPrompt(notebookText, context)
  const responseText = await callGemini(apiKey, prompt, getModel())
  return parseActions(responseText)
}

async function suggestConnections(entity, entityType, projectData) {
  const apiKey = getKey()
  if (!apiKey) throw new Error('Gemini API klíč není nastaven. Přejděte do nastavení.')
  const context = buildConnectionsContext(projectData, entityType, entity.id)
  const prompt = buildConnectionsPrompt(entity, entityType, context)
  const responseText = await callGemini(apiKey, prompt, getModel())
  return parseSuggestions(responseText)
}

/** Metadata služby pro konfigurační UI */
export const SERVICE_DEF = {
  id: SERVICE_ID,
  name: 'Google Gemini',
  placeholder: 'AIza...',
  hint: 'aistudio.google.com → Get API key',
  modelPlaceholder: DEFAULT_MODEL,
}

export default {
  id: 'ai-gemini',
  name: 'AI – Google Gemini',

  install(ctx) {
    ctx.registerCapability('ai:available', () => !!getKey())

    ctx.registerCapability('ai:notebook', (notebookText, projectData) => {
      return processNotebook(notebookText, projectData)
    })

    ctx.registerCapability('ai:suggestions', (entity, entityType, projectData) => {
      return suggestConnections(entity, entityType, projectData)
    })
  },
}
