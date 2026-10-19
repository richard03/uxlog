/**
 * Sdílené prompt buildery a parsery pro AI pluginy.
 * Obsahuje veškerou logiku nezávislou na konkrétním LLM provideru.
 */

// ---------------------------------------------------------------------------
// Jazyk odpovědi
// ---------------------------------------------------------------------------

/** Písmena, která má jen čeština (ne slovenština ani jiné jazyky). */
const CZECH_ONLY_CHARS = /[ěřůĚŘŮ]/
/** Písmena s háčkem používaná v češtině. */
const CZECH_CARON_CHARS = /[ščžťďňŠČŽŤĎŇ]/
/** Samohlásky s čárkou používané v češtině. */
const CZECH_ACUTE_CHARS = /[áéíóúýÁÉÍÓÚÝ]/g
/** Písmena jiných jazyků (slovenština, němčina, francouzština, španělština…), která čeština nemá. */
const NON_CZECH_CHARS = /[äôĺŕľöüßàèìòùâêîûçñ¿¡ÄÔĹŔĽÖÜÀÈÌÒÙÂÊÎÛÇÑ]/

/**
 * Hrubě rozpozná, zda je text psaný česky (podle diakritiky).
 * Bez spolehlivého signálu (např. čeština bez diakritiky) vrací null – jazyk pak určí model sám
 * podle obecného pravidla „piš ve stejném jazyce jako uživatel“.
 * @param {unknown} text
 * @returns {'cs'|null}
 */
export function detectTextLanguage(text) {
  const s = typeof text === 'string' ? text : ''
  if (!s.trim()) return null
  if (CZECH_ONLY_CHARS.test(s)) return 'cs'
  if (NON_CZECH_CHARS.test(s)) return null
  if (CZECH_CARON_CHARS.test(s)) return 'cs'
  return (s.match(CZECH_ACUTE_CHARS) || []).length >= 2 ? 'cs' : null
}

/**
 * Pravidlo pro model: výstup psát v jazyce, ve kterém komunikuje uživatel (nikdy nepřekládat do angličtiny).
 * @param {string} sampleText - text uživatele, podle kterého se jazyk určí
 * @param {{ source: string, output: string, json?: boolean }} opts
 *   source – co uživatel napsal (např. „poznámky uživatele“), output – které texty se týká,
 *   json – doplnit, že anglicky zůstávají jen klíče JSON a hodnoty výčtů
 * @returns {string}
 */
export function buildLanguageRule(sampleText, { source, output, json = false }) {
  const base = detectTextLanguage(sampleText) === 'cs'
    ? `Jazyk – ${source}: čeština. ${output} piš česky, nepřekládej do angličtiny ani do jiného jazyka.`
    : `${output} piš ve stejném jazyce jako ${source}; nepřekládej do angličtiny ani do jiného jazyka.`
  return json
    ? `${base} Anglicky zůstávají jen klíče JSON, typy entit a hodnoty výčtů (např. "create", "persona", "must", "high").`
    : base
}

// ---------------------------------------------------------------------------
// Notebook processing
// ---------------------------------------------------------------------------

/**
 * Převede hodnotu pole z JSON odpovědi LLM na prostý řetězec pro formulář a úložiště.
 * Pole (např. odrážky SWOT) sloučí na řádky bez JSON závorek.
 * @param {unknown} v
 * @returns {string}
 */
export function aiFieldToPlainString(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (x == null) return ''
        if (typeof x === 'object') return JSON.stringify(x)
        return String(x)
      })
      .filter((s) => s !== '')
      .join('\n')
  }
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

/**
 * Normalizuje všechny hodnoty v objektu `fields` z AI akce.
 * @param {Record<string, unknown>|null|undefined} fields
 * @returns {Record<string, string>}
 */
export function normalizeActionFields(fields) {
  if (!fields || typeof fields !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(fields)) {
    out[k] = aiFieldToPlainString(v)
  }
  return out
}

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
    { key: 'risks', label: 'Rizika', fields: (r) => `ID:${r.id} Kód:${r.code || '—'} Název:${r.name} Stav:${r.status || 'open'}` },
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
 * Metodická pravidla pro formulaci záznamů (převyprávěno z knihovny technik design týmu).
 * Pravidla upravují jen PODOBU navržených polí – nové akce kvůli nim nevznikají.
 */
export const NOTEBOOK_METHOD_RULES = `Metodika formulace (použij, pokud z poznámek vzniká daný typ záznamu):
- requirement: popisuj potřebu uživatele či byznysu, ne konkrétní řešení (např. „uživatel musí mít přístup bez instalace“ místo „musí to být webová aplikace“). Pokud to z textu plyne, vyplň category: data = co uživatel potřebuje vidět, function = co potřebuje dělat, quality = jaké to má být, constraint = omezení (termín, rozpočet, technologie, regulace).
- hypothesis: formuluj jako ověřitelné tvrzení ve tvaru „Myslím si, že …, protože …“.
- scenario: popisuj z pohledu uživatele bez technických řešení; spouštěč (kdy potřeba vzniká) dej do trigger a moment uspokojení potřeby do outcome.
- stakeholder: postoj k projektu zapisuj do attitude, domluvenou komunikaci do commFrequency / commChannel / commNeeds.
- competition: rozliš přímého a nepřímého konkurenta v competitorType.
- risk: popiš, co se může stát a proč; opatření (jak riziku předejít nebo zmírnit dopad) dej do mitigation.`

/** Max. délka citace zdroje u akce – odpověď AI musí zůstat krátká i u dlouhých poznámek. */
const NOTEBOOK_SOURCE_MAX_CHARS = 200

/**
 * Sestaví prompt pro zpracování zápisníku.
 * @param {string} notebookText
 * @param {string} projectContext
 * @param {{ index: number, total: number }} [part] - u dlouhých poznámek zpracovávaných po částech
 * @param {string} [languageSample] - text, podle kterého se určí jazyk výstupu (u částí celé poznámky)
 * @returns {string}
 */
export function buildNotebookPrompt(notebookText, projectContext, part = null, languageSample = notebookText) {
  const languageRule = buildLanguageRule(languageSample, {
    source: 'poznámky uživatele',
    output: 'Všechny texty, které navrhuješ (hodnoty ve „fields“, entityName)',
    json: true,
  })
  const partNote = part && part.total > 1
    ? `\n(Toto je část ${part.index} z ${part.total} delších poznámek – zpracuj jen tuto část.)\n`
    : ''
  return `Jsi asistent pro UX design týmy. Analyzuješ nestrukturované poznámky z projektu a extrahuješ z nich konkrétní akce pro aktualizaci projektové databáze.

## Existující záznamy projektu:
${projectContext}

## Poznámky ze zápisníku:${partNote}
${notebookText}

## Tvůj úkol:
Analyzuj poznámky a navrhni seznam konkrétních akcí pro vytvoření nebo úpravu záznamů v projektové databázi.

Podporované typy entit a jejich pole:
- persona: code, name, status (protopersona/persona), description, motivation, needs, problems, barriers, quote, context, recruitmentCriteria, targetGroupSize, targetGroupValue, url
- requirement: code, name, description, motivation, category (data/function/quality/constraint), priority (must/should/could/wont), wontHaveExplanation, url
- goal: code, name, description, metrics, url
- stakeholder: name, description, influenceLevel (high/medium/low), interestLevel (high/medium/low), attitude (positive/neutral/negative), commFrequency, commChannel, commNeeds
- competition: name, description, competitorType (direct/indirect), strengths, weaknesses, inspiration, url
- hypothesis: code, name, description, status (untested/tested/refuted), explanation, url
- scenario: code, name, type (main/secondary/error), description, trigger, outcome, url
- teamMember: name, role, email, phone, note
- risk: code, name, description, likelihood (high/medium/low), impact (high/medium/low), mitigation, status (open/mitigated/occurred/closed)

${NOTEBOOK_METHOD_RULES}

Pravidla:
1. Navrhuj POUZE akce, které jsou přímo a jednoznačně odvoditelné z textu.
2. Pro úpravu existujícího záznamu použij "update" a příslušné ID z přehledu výše.
3. Pro nový záznam použij "create" a entityId nastav na null.
4. "sourceText" je krátká doslovná citace z poznámek, ze které akce vychází – nejvýše ${NOTEBOOK_SOURCE_MAX_CHARS} znaků (u delší pasáže jen její začátek).
5. Do "fields" zahrň POUZE pole, která text skutečně zmiňuje; texty piš stručně, poznámky neopisuj celé.
6. Jeden záznam navrhni jen jednou – všechny informace o něm dej do jedné akce.
7. ${languageRule}

Vrať POUZE validní JSON objekt (bez markdown bloků, bez komentářů):
{
  "actions": [
    {
      "type": "create",
      "entity": "persona",
      "entityId": null,
      "entityName": "Jméno nebo kód entity",
      "fields": { "name": "...", "description": "..." },
      "sourceText": "krátká citace z poznámek"
    }
  ]
}

Pokud z poznámek nevyplývají žádné konkrétní akce, vrať: { "actions": [] }

Připomenutí: ${languageRule}`
}

/**
 * Z (případně useknutého) JSONu odpovědi vytáhne všechny kompletní objekty pole "actions".
 * Používá se, když odpověď AI skončí uprostřed (limit délky výstupu) – kompletní akce se neztratí.
 * @param {string} text
 * @returns {Array<Object>}
 */
export function salvageActions(text) {
  const s = String(text ?? '')
  const key = s.search(/"actions"\s*:\s*\[/)
  const start = key >= 0 ? s.indexOf('[', key) : s.indexOf('[')
  if (start < 0) return []
  const out = []
  let depth = 0
  let objStart = -1
  let inString = false
  for (let i = start + 1; i < s.length; i++) {
    const ch = s[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        try { out.push(JSON.parse(s.slice(objStart, i + 1))) } catch { /* poškozený objekt přeskočíme */ }
        objStart = -1
      }
    } else if (ch === ']' && depth === 0) break
  }
  return out
}

/**
 * Parsuje JSON z odpovědi LLM (odolné vůči markdown wrapperům i useknuté odpovědi).
 * @param {string} text
 * @returns {{ actions: Array, residualText: string, truncated: boolean }}
 * @throws {Error} jen pokud z odpovědi nejde získat ani jedna akce ani prázdný seznam
 */
export function parseActions(text) {
  const cleaned = String(text ?? '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  let parsed
  let truncated = false
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    const salvaged = salvageActions(cleaned)
    if (!salvaged.length) {
      throw new Error('AI vrátila neúplnou nebo neplatnou odpověď. Zkuste zprávu zpracovat znovu, případně ji rozdělte na kratší části.')
    }
    parsed = { actions: salvaged }
    truncated = true
  }
  const rawActions = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.actions) ? parsed.actions : [])
  const residualText = typeof parsed?.residualText === 'string' ? parsed.residualText : ''
  const actions = rawActions
    .filter(
      (a) =>
        a &&
        (a.type === 'create' || a.type === 'update') &&
        typeof a.entity === 'string' &&
        a.fields &&
        typeof a.fields === 'object',
    )
    .map((a) => ({
      ...a,
      fields: normalizeActionFields(a.fields),
      sourceText: typeof a.sourceText === 'string' ? truncateText(a.sourceText, NOTEBOOK_SOURCE_MAX_CHARS) : '',
    }))
  return { actions, residualText, truncated }
}

/** Výchozí max. délka jedné části poznámek posílané AI (znaky). */
export const NOTEBOOK_CHUNK_CHARS = 6000

/**
 * Rozdělí dlouhé poznámky na části do max. délky – přednostně po odstavcích, pak po řádcích/větách,
 * v nejhorším případě natvrdo. Krátký text vrátí jako jedinou část.
 * @param {string} text
 * @param {number} [maxChars]
 * @returns {string[]}
 */
export function splitNotebookText(text, maxChars = NOTEBOOK_CHUNK_CHARS) {
  const src = String(text ?? '').replace(/\r\n?/g, '\n').trim()
  if (!src) return []
  if (src.length <= maxChars) return [src]

  // Jednotky: odstavce; příliš dlouhé odstavce dál po řádcích, věty, nakonec natvrdo
  const pieces = []
  const pushPiece = (p) => {
    if (p.length <= maxChars) { pieces.push(p); return }
    const lines = p.split('\n')
    if (lines.length > 1) { lines.forEach(pushPiece); return }
    const sentences = p.match(/[^.!?…]+[.!?…]*\s*/g) || [p]
    if (sentences.length > 1) { sentences.forEach((x) => pushPiece(x.trim())); return }
    for (let i = 0; i < p.length; i += maxChars) pieces.push(p.slice(i, i + maxChars))
  }
  src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).forEach(pushPiece)

  const chunks = []
  let current = ''
  for (const p of pieces) {
    if (current && current.length + 2 + p.length > maxChars) {
      chunks.push(current)
      current = p
    } else {
      current = current ? `${current}\n\n${p}` : p
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/**
 * Sloučí akce navržené pro jednotlivé části poznámek: stejný záznam (create se stejnou entitou
 * a názvem, nebo update stejného entityId) se spojí do jedné akce. Pole se doplní; rozdílné
 * texty téhož pole se spojí za sebe.
 * @param {Array<Array<Object>>} lists
 * @returns {Array<Object>}
 */
export function mergeActions(lists) {
  const out = []
  const index = new Map()
  const norm = (v) => String(v ?? '').trim().toLowerCase()
  for (const list of Array.isArray(lists) ? lists : []) {
    for (const a of Array.isArray(list) ? list : []) {
      if (!a || typeof a !== 'object') continue
      const name = norm(a.entityName || a.fields?.name)
      const key = a.type === 'update' && a.entityId
        ? `update:${a.entity}:${a.entityId}`
        : name ? `create:${a.entity}:${name}` : null
      const existing = key ? index.get(key) : null
      if (!existing) {
        const copy = { ...a, fields: { ...(a.fields || {}) } }
        out.push(copy)
        if (key) index.set(key, copy)
        continue
      }
      for (const [k, v] of Object.entries(a.fields || {})) {
        const prev = existing.fields[k]
        if (!prev) existing.fields[k] = v
        else if (v && norm(prev) !== norm(v) && !norm(prev).includes(norm(v))) existing.fields[k] = `${prev}\n\n${v}`
      }
      if (!existing.sourceText && a.sourceText) existing.sourceText = a.sourceText
    }
  }
  return out
}

/**
 * Zpracuje poznámky zápisníku pomocí AI – dlouhý text po částech, výsledky sloučí.
 * Neúspěšná část se jednou zopakuje; pokud selže i tak, zpracování pokračuje dalšími částmi
 * a výsledek nese počet nezpracovaných částí (UI na ně upozorní). Chyba se vyhodí, jen když
 * se nepodařilo získat žádnou akci.
 * @param {string} notebookText
 * @param {string} projectContext - výstup buildProjectContext
 * @param {(prompt: string) => Promise<string>} callModel - volání konkrétního LLM
 * @param {number} [maxChars]
 * @returns {Promise<{ actions: Array<Object>, residualText: string, failedParts: number, totalParts: number }>}
 */
export async function processNotebookInParts(notebookText, projectContext, callModel, maxChars = NOTEBOOK_CHUNK_CHARS) {
  const parts = splitNotebookText(notebookText, maxChars)
  const results = []
  let firstError = null
  let failedParts = 0
  for (let i = 0; i < parts.length; i++) {
    const prompt = buildNotebookPrompt(parts[i], projectContext, { index: i + 1, total: parts.length }, notebookText)
    let done = false
    for (let attempt = 0; attempt < 2 && !done; attempt++) {
      try {
        results.push(parseActions(await callModel(prompt)).actions)
        done = true
      } catch (e) {
        firstError = firstError || e
      }
    }
    if (!done) failedParts++
  }
  const actions = mergeActions(results)
  if (failedParts && !actions.length) throw firstError
  return { actions, residualText: '', failedParts, totalParts: parts.length }
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
    { key: 'risks', label: 'Rizika', fields: (r) => `ID:${r.id} Kód:${r.code || '—'} Název:${r.name}${desc(r.description)}` },
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
    tasks: 'Úkol', bugs: 'Chyba', risks: 'Riziko',
  }
  const typeLabel = TYPE_LABELS[entityType] || entityType
  const entityDesc = buildEntityDescription(entity)

  return `Jsi asistent pro UX design týmy. Hledáš smysluplné souvislosti mezi entitami projektu.

## Aktuální entita (${typeLabel}):
${entityDesc}

## Ostatní entity projektu:
${context}

## Tvůj úkol:
Navrhni seznam entit z projektu, které smysluplně souvisejí s aktuální entitou. Pro každou navrhovanou souvislost uveď stručný komentář, v čem tato souvislost spočívá.

Pravidla:
1. Navrhuj POUZE skutečně smysluplné souvislosti – jasná funkční, konceptuální nebo kontextová vazba.
2. Nenavrhuj triviální ani příliš obecné souvislosti.
3. Každá navrhovaná entita musí být ze seznamu výše (použij přesné ID).
4. Pokud nenajdeš žádné smysluplné souvislosti, vrať prázdný seznam.
5. ${buildLanguageRule(entityDesc, { source: 'texty aktuální entity', output: 'Komentáře v poli „note“', json: true })}

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

// ---------------------------------------------------------------------------
// Competition analysis
// ---------------------------------------------------------------------------

/**
 * Sestaví prompt pro AI analýzu konkurence.
 * @param {string} topic - popis tématu/oboru uživatele
 * @param {string} projectContext - existující entity projektu
 * @returns {string}
 */
export function buildCompetitionAnalysisPrompt(topic, projectContext) {
  return `Jsi asistent pro UX design týmy. Uživatel ti popíše téma nebo obor svého projektu a ty najdeš reálné konkurenty na trhu.

## Existující záznamy projektu:
${projectContext}

## Téma/obor projektu:
${topic}

## Tvůj úkol:
Najdi 3–6 reálných konkurentů pro zadané téma a prověř jejich weby. Nepodváděj, zadavatel URL bude prověřovat. Pro každého konkurenta uveď:
- name: název firmy/produktu
- url: URL webové stránky (musí být reálná, existující URL)
- description: stručný popis čím se zabývají
- strengths: silné stránky konkurenta (co dělají dobře nebo co mají lepší oproti konkurenci)
- weaknesses: slabé stránky konkurenta (kde mají nedostatky)
- inspiration: co se od nich můžeme naučit nebo inspirovat

Pravidla:
1. Uváděj POUZE reálné, existující firmy/produkty, které skutečně fungují na trhu. NEVYMÝŠLEJ si konkurenty — pokud si nejsi jistý, že firma/produkt existuje, NEUVÁDĚJ ji.
2. Do pole "url" uváděj POUZE URL, o kterých jsi si jistý, že skutečně existují a jsou funkční. Pokud si nejsi jistý, konkurenci neuváděj.
3. Silné a slabé stránky musí být konkrétní a relevantní, ne obecné fráze.
4. Nezahrnuj konkurenty, kteří už existují v přehledu projektu výše.
5. Raději uveď méně konkurentů, ale za to spolehlivých, než více s nejistými údaji.
6. ${buildLanguageRule(topic, { source: 'téma zadané uživatelem', output: 'Popisy, silné a slabé stránky a inspiraci', json: true })}

Vrať POUZE validní JSON objekt (bez markdown bloků, bez komentářů):
{
  "competitors": [
    {
      "name": "Název konkurenta",
      "url": "https://example.com",
      "description": "Stručný popis",
      "strengths": "Konkrétní silné stránky",
      "weaknesses": "Konkrétní slabé stránky",
      "inspiration": "Co se můžeme naučit"
    }
  ]
}

Pokud pro zadané téma nemůžeš najít žádné relevantní konkurenty, vrať: { "competitors": [] }`
}

/**
 * Parsuje JSON s výsledky analýzy konkurence z odpovědi LLM.
 * @param {string} text
 * @returns {{ actions: Array, residualText: string }}
 */
export function parseCompetitionAnalysis(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  const parsed = JSON.parse(cleaned)
  const competitors = Array.isArray(parsed?.competitors) ? parsed.competitors : []
  const actions = competitors
    .filter((c) => c && typeof c.name === 'string' && c.name.trim())
    .map((c) => ({
      type: 'create',
      entity: 'competition',
      entityId: null,
      entityName: c.name,
      fields: normalizeActionFields({
        name: c.name ?? '',
        url: c.url ?? '',
        description: c.description ?? '',
        strengths: c.strengths ?? '',
        weaknesses: c.weaknesses ?? '',
        inspiration: c.inspiration ?? '',
      }),
      sourceText: '',
    }))
  return { actions, residualText: '' }
}

// ---------------------------------------------------------------------------
// Zápisník – režim „Zeptat se“ (jen odpovídá, nic nezapisuje)
// ---------------------------------------------------------------------------

/** Sekce projektu pro kontext dotazu: klíč ve state (= entityType u souvislostí) → [nadpis sekce, označení jedné položky]. */
const ASK_SECTIONS = [
  ['goals', 'Cíle', 'Cíl'], ['stakeholders', 'Stakeholdeři', 'Stakeholder'], ['competitions', 'Konkurence', 'Konkurent'],
  ['hypotheses', 'Hypotézy', 'Hypotéza'], ['personas', 'Persony', 'Persona'], ['scenarios', 'Scénáře', 'Scénář'],
  ['requirements', 'Požadavky', 'Požadavek'], ['teamMembers', 'Tým', 'Člen týmu'], ['activities', 'Aktivity', 'Aktivita'],
  ['tasks', 'Úkoly', 'Úkol'], ['bugs', 'Chyby', 'Chyba'], ['risks', 'Rizika', 'Riziko'],
]

/**
 * Technická pole, která do kontextu dotazu nepatří. Vazby se vypisují zvlášť jako „souvislosti“ – jen ze
 * souvislostí (EntityConnections), které uživatel spravuje v UI. Starší pole ID v entitách (scenarioIds,
 * personaIds, …) UI nezobrazuje a addScenario je plní automaticky všemi scénáři – do kontextu nepatří.
 */
const ASK_SKIPPED_KEYS = new Set([
  'id', 'projectId', 'sortOrder', 'customFields', 'createdAt', 'updatedAt', 'lastWorkedAt',
  'checkedItems', 'baseChecklist', 'customChecklist', 'checklistItemTaskIds', 'dismissed', 'notebook', 'notebookHistory', 'canvas',
  'personaIds', 'scenarioIds', 'requirementIds', 'hypothesisIds', 'stakeholderIds', 'conflictingRequirementIds',
])
const ASK_MAX_FIELD_CHARS = 500
const ASK_MAX_CONTEXT_CHARS = 40000
const ASK_MAX_NOTES_CHARS = 12000
const ASK_MAX_METHODOLOGY_CHARS = 12000

/**
 * Zkrátí text na max. délku (s výpustkou).
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncateText(text, max) {
  const s = String(text ?? '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}

/**
 * Čitelné označení položky pro odkazy mezi záznamy, např. „Persona PER-001 „Jana““.
 * @param {string} typeLabel
 * @param {Object} item
 * @returns {string}
 */
function askItemRef(typeLabel, item) {
  const code = typeof item.code === 'string' && item.code.trim() ? `${item.code.trim()} ` : ''
  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : '—'
  return `${typeLabel} ${code}„${name}“`
}

/** Vyplněná textová / číselná hodnota (nebo null). */
function askScalar(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string' && v.trim()) return v.trim()
  return null
}

/**
 * Sestaví mapu souvislostí ze souvislostí projektu (projectData.connections), obousměrně a bez duplicit.
 * @param {Object} projectData
 * @returns {Map<string, Map<string, string>>} klíč položky → (klíč propojené položky → poznámka)
 */
function buildAskRelations(projectData) {
  const relations = new Map()
  const link = (a, b, note = '') => {
    if (a === b) return
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!relations.has(from)) relations.set(from, new Map())
      const m = relations.get(from)
      if (!m.has(to) || (note && !m.get(to))) m.set(to, note)
    }
  }
  for (const c of Array.isArray(projectData?.connections) ? projectData.connections : []) {
    if (!c?.entityType1 || !c?.entityId1 || !c?.entityType2 || !c?.entityId2) continue
    link(`${c.entityType1}:${c.entityId1}`, `${c.entityType2}:${c.entityId2}`, typeof c.note === 'string' ? c.note.trim() : '')
  }
  return relations
}

/**
 * Bohatší kontext projektu pro dotazy: u každé položky všechna vyplněná pole, vlastní atributy
 * a souvislosti s ostatními položkami.
 * Odkazy na smazané položky se vynechají.
 * @param {Object} projectData - { goals, personas, …, tasks, activities, bugs, connections }
 * @returns {string}
 */
export function buildAskContext(projectData) {
  // Označení všech existujících položek (pro překlad ID v souvislostech)
  const refs = new Map()
  for (const [type, , typeLabel] of ASK_SECTIONS) {
    for (const item of Array.isArray(projectData?.[type]) ? projectData[type] : []) {
      if (item && typeof item === 'object' && item.id) refs.set(`${type}:${item.id}`, askItemRef(typeLabel, item))
    }
  }
  const relations = buildAskRelations(projectData)

  const lines = []
  for (const [type, label, typeLabel] of ASK_SECTIONS) {
    const items = (Array.isArray(projectData?.[type]) ? projectData[type] : []).filter((i) => i && typeof i === 'object')
    if (!items.length) continue
    lines.push(`## ${label}`)
    for (const item of items) {
      const parts = [askItemRef(typeLabel, item)]
      for (const [k, v] of Object.entries(item)) {
        if (ASK_SKIPPED_KEYS.has(k) || k === 'code' || k === 'name') continue
        const val = askScalar(v)
        if (val !== null) parts.push(`${k}: ${truncateText(val, ASK_MAX_FIELD_CHARS)}`)
      }
      const custom = item.customFields && typeof item.customFields === 'object' ? item.customFields : {}
      for (const [k, v] of Object.entries(custom)) {
        const val = askScalar(v)
        if (val !== null) parts.push(`${k}: ${truncateText(val, ASK_MAX_FIELD_CHARS)}`)
      }
      const linked = [...(relations.get(`${type}:${item.id}`) ?? new Map())]
        .filter(([key]) => refs.has(key))
        .map(([key, note]) => (note ? `${refs.get(key)} (poznámka: ${truncateText(note, ASK_MAX_FIELD_CHARS)})` : refs.get(key)))
      parts.push(`souvislosti: ${linked.length ? linked.join('; ') : 'žádné'}`)
      lines.push(`- ${parts.join(' | ')}`)
    }
  }
  const text = lines.join('\n')
  return text ? truncateText(text, ASK_MAX_CONTEXT_CHARS) : '(projekt zatím neobsahuje žádné záznamy)'
}

/**
 * Předchozí zprávy zápisníku jako kontext (od nejnovějších, v limitu, vypsané chronologicky).
 * @param {Array<{ mode?: string, text?: string, answer?: string }>} history
 * @returns {string}
 */
export function buildAskNotes(history) {
  const list = Array.isArray(history) ? history : []
  const out = []
  let total = 0
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i]
    if (!e?.text?.trim()) continue
    const block = e.mode === 'ask'
      ? `Dotaz: ${e.text.trim()}${e.answer?.trim() ? `\nOdpověď: ${e.answer.trim()}` : ''}`
      : `Poznámka: ${e.text.trim()}`
    if (total + block.length > ASK_MAX_NOTES_CHARS) break
    out.unshift(block)
    total += block.length
  }
  return out.join('\n\n') || '(zatím žádné poznámky)'
}

/**
 * Metodika aktivit projektu jako kontext dotazu (postupy technik z katalogu aktivit).
 * @param {Array<{ name?: string, guide?: Object }>} methodology - aktivity projektu s metodikou typu
 * @returns {string}
 */
export function buildAskMethodology(methodology) {
  const list = Array.isArray(methodology) ? methodology : []
  const blocks = []
  const seen = new Set()
  for (const m of list) {
    const g = m?.guide
    const name = typeof m?.name === 'string' ? m.name.trim() : ''
    if (!name || !g || typeof g !== 'object' || seen.has(name)) continue
    seen.add(name)
    const lines = [`### ${name}`]
    const text = (label, v) => { if (typeof v === 'string' && v.trim()) lines.push(`${label}: ${v.trim()}`) }
    const items = (label, v) => {
      const arr = Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : []
      if (arr.length) lines.push(`${label}:\n${arr.map((x, i) => `${i + 1}. ${x.trim()}`).join('\n')}`)
    }
    text('Proč', g.why)
    text('Kdy', g.when)
    text('Jak dlouho', g.duration)
    text('Koho potřebuji', g.who)
    items('Postup', g.steps)
    items('Výstupy', g.outputs)
    if (lines.length > 1) blocks.push(lines.join('\n'))
  }
  const out = blocks.join('\n\n')
  return out ? truncateText(out, ASK_MAX_METHODOLOGY_CHARS) : '(projekt nemá aktivity s metodikou)'
}

/**
 * Prompt pro dotaz nad projektem. AI pouze odpovídá – nenavrhuje ani neprovádí změny.
 * @param {string} question
 * @param {string} projectContext - výstup buildAskContext
 * @param {string} notes - výstup buildAskNotes
 * @param {string} [methodology] - výstup buildAskMethodology
 * @returns {string}
 */
export function buildAskPrompt(question, projectContext, notes, methodology = '(projekt nemá aktivity s metodikou)') {
  return `Jsi asistent pro UX design týmy. Odpovídáš na dotazy k projektu na základě jeho dat a poznámek ze zápisníku.

## Data projektu:
${projectContext}

## Metodika aktivit projektu:
${methodology}

## Předchozí poznámky a dotazy v zápisníku:
${notes}

## Dotaz:
${question}

Pravidla:
1. Odpovídej stručně a věcně, jako prostý text (bez markdownu, bez HTML). ${buildLanguageRule(question, { source: 'dotaz uživatele', output: 'Odpověď' })}
2. Vycházej z dat projektu a poznámek výše; pokud odpověď nelze z dostupných informací zjistit, řekni to.
3. U každého záznamu je pole „souvislosti“ se všemi propojenými záznamy (souvislosti jsou obousměrné). Hodnota „žádné“ znamená, že záznam není propojen s ničím – i to je platná informace pro odpověď.
4. Na metodické otázky (jak postupovat, co připravit, kdo se má účastnit, co je výstupem) odpovídej podle sekce „Metodika aktivit projektu“; pokud tam technika není, odpověz podle obecné UX praxe a uveď, že nejde o postup z metodiky projektu.
5. Pouze odpovídej – nenavrhuj JSON, akce ani změny dat.`
}

/**
 * Normalizuje odpověď AI na dotaz (prostý text).
 * @param {*} text
 * @returns {{ answer: string }}
 */
export function parseAskAnswer(text) {
  return { answer: String(text ?? '').trim() }
}
