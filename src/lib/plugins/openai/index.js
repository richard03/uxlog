/**
 * Plugin: OpenAI (ChatGPT) AI
 *
 * Poskytuje AI funkce (zápisník, návrhy souvislostí) přes OpenAI API.
 * Každý plugin spravuje svůj vlastní API klíč v sdíleném localStorage.
 */

import {
  buildProjectContext, buildNotebookPrompt, parseActions,
  buildConnectionsContext, buildConnectionsPrompt, parseSuggestions,
} from '../ai-shared/prompts.js'
import { getAiKey, loadAiKeys } from '../ai-shared/keys.js'

const SERVICE_ID = 'openai'
const DEFAULT_MODEL = 'gpt-4o-mini'

/**
 * Zavolá OpenAI-kompatibilní API.
 * @param {string} apiKey
 * @param {string} prompt
 * @param {string} model
 * @returns {Promise<string>}
 */
async function callOpenAI(apiKey, prompt, model) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI API chyba: ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

function getKey() {
  return getAiKey(SERVICE_ID)
}

function getModel() {
  return loadAiKeys()[`${SERVICE_ID}_model`] || DEFAULT_MODEL
}

async function processNotebook(notebookText, projectData) {
  const apiKey = getKey()
  if (!apiKey) throw new Error('OpenAI API klíč není nastaven. Přejděte do nastavení.')
  const context = buildProjectContext(projectData)
  const prompt = buildNotebookPrompt(notebookText, context)
  const responseText = await callOpenAI(apiKey, prompt, getModel())
  return parseActions(responseText)
}

async function suggestConnections(entity, entityType, projectData) {
  const apiKey = getKey()
  if (!apiKey) throw new Error('OpenAI API klíč není nastaven. Přejděte do nastavení.')
  const context = buildConnectionsContext(projectData, entityType, entity.id)
  const prompt = buildConnectionsPrompt(entity, entityType, context)
  const responseText = await callOpenAI(apiKey, prompt, getModel())
  return parseSuggestions(responseText)
}

/** Metadata služby pro konfigurační UI */
export const SERVICE_DEF = {
  id: SERVICE_ID,
  name: 'OpenAI (ChatGPT)',
  placeholder: 'sk-...',
  hint: 'platform.openai.com → API keys',
  modelPlaceholder: DEFAULT_MODEL,
}

export default {
  id: 'ai-openai',
  name: 'AI – OpenAI (ChatGPT)',

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
