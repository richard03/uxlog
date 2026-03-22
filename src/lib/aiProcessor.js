/**
 * Re-export shim – AI processing je nyní rozděleno do pluginů gemini/ a openai/.
 * Sdílené prompt funkce jsou v plugins/ai-shared/prompts.js.
 * Tento shim exportuje pouze sdílené utility pro zpětnou kompatibilitu.
 */
export {
  buildProjectContext, buildNotebookPrompt, parseActions,
  buildConnectionsContext, buildConnectionsPrompt, parseSuggestions,
} from './plugins/ai-shared/prompts.js'
