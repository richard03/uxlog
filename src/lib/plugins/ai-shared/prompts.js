/**
 * Sdílené prompt buildery a parsery pro AI pluginy.
 * Obsahuje veškerou logiku nezávislou na konkrétním LLM provideru.
 */

// ---------------------------------------------------------------------------
// Notebook processing
// ---------------------------------------------------------------------------

/**
 * Sestaví přehled existujících entit projektu pro prompt.
 * @param {Object} projectData
 * @returns {string}
 */
export function buildProjectContext(projectData) {
  const lines = []

  const sections = [
    { key: 'goals', label: 'Cíle', fields: (g) => `ID:${g.id} Kód:${g.code || '—'} Název:${g.name}` },
    { key: 'stakeholders', label: 'Stakeholdeři', fields: (s) => `ID:${s.id} Název:${s.name}` },
    { key: 'competitions', label: 'Konkurence', fields: (c) => `ID:${c.id} Název:${c.name}` },
    { key: 'hypotheses', label: 'Hypotézy', fields: (h) => `ID:${h.id} Kód:${h.code || '—'} Název:${h.name} Stav:${h.status}` },
    { key: 'personas', label: 'Persony', fields: (p) => `ID:${p.id} Kód:${p.code || '—'} Jméno:${p.name} Stav:${p.status}` },
    { key: 'scenarios', label: 'Scénáře', fields: (s) => `ID:${s.id} Kód:${s.code || '—'} Název:${s.name}` },
    { key: 'requirements', label: 'Požadavky', fields: (r) => `ID:${r.id} Kód:${r.code || '—'} Název:${r.name} Priorita:${r.priority}` },
    { key: 'teamMembers', label: 'Tým', fields: (m) => `ID:${m.id} Jméno:${m.name} Role:${m.role}` },
  ]

  for (const { key, label, fields } of sections) {
    const items = projectData[key]
    if (items?.length) {
      lines.push(`## ${label}`)
      items.forEach((item) => lines.push('- ' + fields(item)))
    }
  }

  return lines.join('\n') || '(projekt zatím neobsahuje žádné záznamy)'
}

/**
 * Sestaví prompt pro zpracování zápisníku.
 * @param {string} notebookText
 * @param {string} projectContext
 * @returns {string}
 */
export function buildNotebookPrompt(notebookText, projectContext) {
  return `Jsi asistent pro UX design týmy. Analyzuješ nestrukturované poznámky z projektu a extrahuješ z nich konkrétní akce pro aktualizaci projektové databáze.

## Existující záznamy projektu:
${projectContext}

## Poznámky ze zápisníku:
${notebookText}

## Tvůj úkol:
Analyzuj poznámky a navrhni seznam konkrétních akcí pro vytvoření nebo úpravu záznamů v projektové databázi.

Podporované typy entit a jejich pole:
- persona: code, name, status (protopersona/persona), description, motivation, needs, problems, context, recruitmentCriteria, targetGroupSize, targetGroupValue, url
- requirement: code, name, description, motivation, priority (must/should/could/wont), wontHaveExplanation, url
- goal: code, name, description, metrics, url
- stakeholder: name, description, influenceLevel (high/medium/low), interestLevel (high/medium/low)
- competition: name, description, strengths, weaknesses, inspiration, url
- hypothesis: code, name, description, status (untested/tested/refuted), explanation, url
- scenario: code, name, type (main/secondary/error), description, url
- teamMember: name, role, email, phone, note

Pravidla:
1. Navrhuj POUZE akce, které jsou přímo a jednoznačně odvoditelné z textu.
2. Pro úpravu existujícího záznamu použij "update" a příslušné ID z přehledu výše.
3. Pro nový záznam použij "create" a entityId nastav na null.
4. "sourceText" musí být přesná citace části textu z poznámek (bez jakýchkoli úprav).
5. Do "fields" zahrň POUZE pole, která text skutečně zmiňuje.
6. Do "residualText" zahrň veškerý text z poznámek, který nebyl základem žádné akce — doslova zkopírovaný bez úprav. Pokud byl celý text zpracován, nastav "residualText" na prázdný řetězec.

Vrať POUZE validní JSON objekt (bez markdown bloků, bez komentářů):
{
  "actions": [
    {
      "type": "create",
      "entity": "persona",
      "entityId": null,
      "entityName": "Jméno nebo kód entity",
      "fields": { "name": "...", "description": "..." },
      "sourceText": "přesná citace z poznámek"
    }
  ],
  "residualText": "text který nebyl základem žádné akce"
}

Pokud z poznámek nevyplývají žádné konkrétní akce, vrať: { "actions": [], "residualText": "<celý text poznámek>" }`
}

/**
 * Parsuje JSON z odpovědi LLM (odolné vůči markdown wrapperům).
 * @param {string} text
 * @returns {{ actions: Array, residualText: string }}
 */
export function parseActions(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  const parsed = JSON.parse(cleaned)
  const rawActions = Array.isArray(parsed) ? parsed : (parsed?.actions ?? [])
  const residualText = typeof parsed?.residualText === 'string' ? parsed.residualText : ''
  const actions = rawActions.filter(
    (a) =>
      a &&
      (a.type === 'create' || a.type === 'update') &&
      typeof a.entity === 'string' &&
      a.fields && typeof a.fields === 'object'
  )
  return { actions, residualText }
}

// ---------------------------------------------------------------------------
// Connection suggestions
// ---------------------------------------------------------------------------

/**
 * Sestaví popis polí entity pro prompt.
 * @param {Object} entity
 * @returns {string}
 */
function buildEntityDescription(entity) {
  const SKIP = new Set(['id', 'projectId', 'createdAt', 'updatedAt'])
  const lines = []
  for (const [k, v] of Object.entries(entity)) {
    if (SKIP.has(k)) continue
    if (typeof v === 'string' && v.trim()) lines.push(`${k}: ${v}`)
    else if (typeof v === 'number') lines.push(`${k}: ${v}`)
  }
  return lines.join('\n') || entity.name || entity.id
}

/**
 * Sestaví kontext projektu pro hledání souvislostí.
 * @param {Object} projectData
 * @param {string} excludeType
 * @param {string} excludeId
 * @returns {string}
 */
export function buildConnectionsContext(projectData, excludeType, excludeId) {
  const lines = []

  const desc = (s) => (s ? ' — ' + s : '')
  const sections = [
    { key: 'goals', label: 'Cíle', fields: (g) => `ID:${g.id} Kód:${g.code || '—'} Název:${g.name}${desc(g.description)}` },
    { key: 'stakeholders', label: 'Stakeholdeři', fields: (s) => `ID:${s.id} Název:${s.name}${desc(s.description)}` },
    { key: 'competitions', label: 'Konkurence', fields: (c) => `ID:${c.id} Název:${c.name}${desc(c.description)}` },
    { key: 'hypotheses', label: 'Hypotézy', fields: (h) => `ID:${h.id} Kód:${h.code || '—'} Název:${h.name} Stav:${h.status}${desc(h.description)}` },
    { key: 'personas', label: 'Persony', fields: (p) => `ID:${p.id} Kód:${p.code || '—'} Jméno:${p.name}${desc(p.description)}` },
    { key: 'scenarios', label: 'Scénáře', fields: (s) => `ID:${s.id} Kód:${s.code || '—'} Název:${s.name}${desc(s.description)}` },
    { key: 'requirements', label: 'Požadavky', fields: (r) => `ID:${r.id} Kód:${r.code || '—'} Název:${r.name} Priorita:${r.priority}${desc(r.description)}` },
    { key: 'teamMembers', label: 'Tým', fields: (m) => `ID:${m.id} Jméno:${m.name} Role:${m.role || '—'}` },
    { key: 'activities', label: 'Aktivity', fields: (a) => `ID:${a.id} Název:${a.name}${desc(a.description)}` },
    { key: 'tasks', label: 'Úkoly', fields: (t) => `ID:${t.id} Název:${t.name}${desc(t.description)}` },
    { key: 'bugs', label: 'Chyby', fields: (b) => `ID:${b.id} Název:${b.name}${desc(b.description)}` },
  ]

  for (const { key, label, fields } of sections) {
    const items = (projectData[key] ?? []).filter(
      (item) => !(key === excludeType && item.id === excludeId)
    )
    if (items.length) {
      lines.push(`## ${label}`)
      items.forEach((item) => lines.push('- ' + fields(item)))
    }
  }

  return lines.join('\n') || '(projekt neobsahuje žádné jiné záznamy)'
}

/**
 * Sestaví prompt pro hledání souvislostí.
 * @param {Object} entity
 * @param {string} entityType
 * @param {string} context
 * @returns {string}
 */
export function buildConnectionsPrompt(entity, entityType, context) {
  const TYPE_LABELS = {
    goals: 'Cíl', stakeholders: 'Stakeholder', competitions: 'Konkurence',
    hypotheses: 'Hypotéza', personas: 'Persona', scenarios: 'Scénář',
    requirements: 'Požadavek', teamMembers: 'Člen týmu', activities: 'Aktivita',
    tasks: 'Úkol', bugs: 'Chyba',
  }
  const typeLabel = TYPE_LABELS[entityType] || entityType
  const entityDesc = buildEntityDescription(entity)

  return `Jsi asistent pro UX design týmy. Hledáš smysluplné souvislosti mezi entitami projektu.

## Aktuální entita (${typeLabel}):
${entityDesc}

## Ostatní entity projektu:
${context}

## Tvůj úkol:
Navrhni seznam entit z projektu, které smysluplně souvisejí s aktuální entitou. Pro každou navrhovanou souvislost uveď stručný komentář v češtině, v čem tato souvislost spočívá.

Pravidla:
1. Navrhuj POUZE skutečně smysluplné souvislosti – jasná funkční, konceptuální nebo kontextová vazba.
2. Nenavrhuj triviální ani příliš obecné souvislosti.
3. Každá navrhovaná entita musí být ze seznamu výše (použij přesné ID).
4. Pokud nenajdeš žádné smysluplné souvislosti, vrať prázdný seznam.

Vrať POUZE validní JSON objekt (bez markdown bloků, bez komentářů):
{
  "suggestions": [
    {
      "entityType": "personas",
      "entityId": "abc123",
      "note": "Stručný komentář proč entity souvisejí"
    }
  ]
}`
}

/**
 * Parsuje JSON s návrhy souvislostí z odpovědi LLM.
 * @param {string} text
 * @returns {Array<{ entityType: string, entityId: string, note: string }>}
 */
export function parseSuggestions(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  const parsed = JSON.parse(cleaned)
  const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
  return suggestions.filter(
    (s) => s && typeof s.entityType === 'string' && typeof s.entityId === 'string'
  )
}
