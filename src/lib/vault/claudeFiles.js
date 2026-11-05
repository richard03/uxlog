/**
 * Vault – soubory pro Claude Code, které aplikace zapisuje do složky dat:
 *   CLAUDE.md                          jen vytvoří, pokud chybí (uživatel si ho smí upravit); importuje pravidla
 *   .uxlog/claude/RULES.md             pravidla formátu a práce s daty (šablona data/vault/RULES.md)
 *   .uxlog/bin/uxlog.mjs               CLI (sestavené src/cli/uxlog.js)
 *   .claude/settings.json              hooky (kontrola po úpravě, zákaz úprav souborů aplikace) a oprávnění
 *   .claude/skills/uxlog-* /SKILL.md   skilly (šablony data/vault/skills/*.md)
 * Čisté funkce – šablony a zdroj CLI se předávají parametrem.
 */

import { VAULT_COLLECTIONS, META_DIR, VAULT_LAYOUT, normalizeLayout } from './paths.js'
import { ENTITY_CONFIG } from '../dataConfig.js'

export const RULES_FILE = `${META_DIR}/claude/RULES.md`
export const CLI_FILE = `${META_DIR}/bin/uxlog.mjs`
export const CLAUDE_SETTINGS_FILE = '.claude/settings.json'
export const ROOT_CLAUDE_FILE = 'CLAUDE.md'

/** Příkaz hooku – $CLAUDE_PROJECT_DIR nastavuje Claude Code na kořen projektu (složku dat). */
const HOOK_COMMAND = `node "$CLAUDE_PROJECT_DIR/${CLI_FILE}" hook`

/**
 * Nastavení Claude Code pro složku dat: kontrola každé úpravy souboru a zákaz úprav souborů aplikace.
 * @returns {Object}
 */
export function buildClaudeSettings() {
  const hook = [{ type: 'command', command: HOOK_COMMAND }]
  return {
    permissions: {
      deny: [`Edit(/${META_DIR}/**)`, `Write(/${META_DIR}/**)`],
    },
    hooks: {
      PreToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: hook }],
      PostToolUse: [{ matcher: 'Edit|Write|MultiEdit', hooks: hook }],
    },
  }
}

/**
 * Seznam typů záznamů pro pravidla (odrážky „složka – typ, kód“).
 * @param {Object} [entityConfig]
 * @returns {string}
 */
export function entityTypeList(entityConfig = ENTITY_CONFIG) {
  return VAULT_COLLECTIONS.map(({ dir, entityType }) => {
    const prefix = entityConfig?.[entityType]?.codePrefix
    return `  - \`${dir}/\` – ${entityType}${prefix ? ` (kód ${prefix}-NNN)` : ''}`
  }).join('\n')
}

/** Dosadí zástupné značky {{NÁZEV}} v šabloně. */
function fill(template, values) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (m, key) => (key in values ? values[key] : m))
}

/**
 * Sestaví soubory pro Claude Code.
 * @param {{
 *   rulesTemplate: string,
 *   skillTemplates: Object.<string, string>,   název skillu → obsah SKILL.md
 *   cliSource?: string,
 *   cliHelp?: string,
 *   rootClaudeMd: string,
 *   structureShared?: string,                  popis struktury výchozí složky
 *   structureProject?: string,                 popis struktury vlastní složky projektu
 *   layout?: string,                           rozložení složky ('shared' | 'project')
 *   entityConfig?: Object,
 * }} input
 * @returns {Array<{ path: string, content: string, createOnly?: boolean }>}
 */
export function buildClaudeFiles(input) {
  const { rulesTemplate, skillTemplates = {}, cliSource, cliHelp = '', rootClaudeMd, entityConfig } = input ?? {}
  const structure = normalizeLayout(input?.layout) === VAULT_LAYOUT.PROJECT ? input?.structureProject : input?.structureShared
  const values = { ENTITY_TYPES: entityTypeList(entityConfig), CLI_HELP: cliHelp }
  const rules = fill(fill(rulesTemplate, { STRUCTURE: String(structure ?? '').trim() }), values)
  const files = [
    { path: ROOT_CLAUDE_FILE, content: rootClaudeMd ?? `@${RULES_FILE}\n`, createOnly: true },
    { path: RULES_FILE, content: rules },
    { path: CLAUDE_SETTINGS_FILE, content: `${JSON.stringify(buildClaudeSettings(), null, 2)}\n` },
  ]
  if (typeof cliSource === 'string' && cliSource) files.push({ path: CLI_FILE, content: cliSource })
  for (const name of Object.keys(skillTemplates).sort()) {
    if (!/^uxlog-[a-z0-9-]+$/.test(name)) continue
    files.push({ path: `.claude/skills/${name}/SKILL.md`, content: skillTemplates[name] })
  }
  return files
}
