/**
 * Šablony souborů pro Claude Code ze složky data/vault/ (přibalené při buildu).
 * Upravujte je tam, ne v kódu: RULES.md (pravidla), structure-shared.md / structure-project.md (popis
 * struktury výchozí a vlastní složky projektu, dosadí se do RULES.md), CLAUDE.md (výchozí CLAUDE.md složky
 * dat), skills/<název>.md (skilly – název souboru = název skillu, musí začínat „uxlog-“).
 */

import rulesTemplate from '../../../data/vault/RULES.md?raw'
import rootClaudeMd from '../../../data/vault/CLAUDE.md?raw'
import structureShared from '../../../data/vault/structure-shared.md?raw'
import structureProject from '../../../data/vault/structure-project.md?raw'

const skillModules = import.meta.glob('../../../data/vault/skills/*.md', { query: '?raw', import: 'default', eager: true })

/** Skilly: název (bez .md) → obsah SKILL.md. */
const skillTemplates = Object.fromEntries(
  Object.entries(skillModules).map(([path, content]) => [path.split('/').pop().replace(/\.md$/, ''), content]),
)

export const CLAUDE_TEMPLATES = Object.freeze({ rulesTemplate, rootClaudeMd, skillTemplates, structureShared, structureProject })
