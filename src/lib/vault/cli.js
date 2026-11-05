/**
 * Vault – příkazy CLI pro Claude Code (`node .uxlog/bin/uxlog.mjs <příkaz>`).
 *
 * Příkazy pracují nad seznamem souborů v paměti a vracejí, co zapsat/smazat a co vypsat;
 * čtení a zápis na disk dělá tenký obal src/cli/uxlog.js. Díky tomu jsou testovatelné.
 *
 *   validate [cesty…] [--json]      kontrola souborů (exit 1 při chybě)
 *   schema [typ]                     pole, povolené hodnoty, sekce a vazby typu
 *   list [typ] [--project P]         přehled záznamů (kód, název, soubor, id)
 *   new <typ> --project P --name N [--set pole=hodnota …]   nový záznam se správným id a kódem
 *   link <záznam> <pole> <cíl…> / unlink …                   vazby (*Ids) v rámci projektu
 *   delete <záznam>                  smaže soubor a odstraní odkazy na záznam
 *   hook                             kontrola pro hooky Claude Code (vstup JSON na stdin)
 *
 * Záznam lze zadat cestou k souboru, id, nebo kódem (PER-001; při shodě ve více projektech s --project).
 * Čisté funkce (id a čas se předávají parametrem).
 */

import { ENTITY_CONFIG } from '../dataConfig.js'
import { generateNextCode } from '../code.js'
import {
  VAULT_COLLECTIONS, PROJECTS_DIR, PROJECT_FILE, CONNECTIONS_FILE, META_DIR, VAULT_LAYOUT,
  entityFileBase, sanitizeFolderName, normalizeVaultPath,
} from './paths.js'
import {
  entityToMarkdown, projectToMarkdown, connectionsToYaml, applyDefaults, getBodyFields, createHeadingResolver,
} from './format.js'
import { validateVault, formatIssue, getSelectOptions, resolveEntityType, REF_FIELDS } from './validate.js'

/** Soubory a složky, které Claude nesmí měnit přímo (spravuje je aplikace). */
export const PROTECTED_PATHS = Object.freeze([`${META_DIR}/`, '.claude/settings.json', '.claude/skills/uxlog-'])

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Rozdělí argumenty na poziční a přepínače (--project X, --set a=b opakovaně, --json).
 * @param {string[]} argv
 * @returns {{ positional: string[], flags: Object }}
 */
export function parseArgs(argv) {
  const positional = []
  const flags = { set: [] }
  const list = Array.isArray(argv) ? argv.map(String) : []
  for (let i = 0; i < list.length; i++) {
    const arg = list[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const eq = arg.indexOf('=')
    const name = arg.slice(2, eq > 0 ? eq : undefined)
    const inline = eq > 0 ? arg.slice(eq + 1) : undefined
    if (name === 'json') {
      flags.json = true
      continue
    }
    const value = inline ?? list[++i]
    if (name === 'set') flags.set.push(value)
    else flags[name] = value
  }
  return { positional, flags }
}

/** Výstup příkazu. */
function result() {
  return { stdout: [], stderr: [], exitCode: 0, writes: [], deletes: [] }
}

function fail(out, message, code = 1) {
  out.stderr.push(message)
  out.exitCode = code
  return out
}

/** Kontext nad naparsovaným vaultem: hledání projektů a záznamů, serializace. */
function createContext(files, { messages, entityConfig = ENTITY_CONFIG }) {
  const headingFor = createHeadingResolver(messages, entityConfig)
  const { parsed, issues } = validateVault(files, { headingFor, entityConfig })
  const pathOf = new Map()
  const folderOf = new Map()
  for (const entry of parsed.index) {
    if (entry.id) pathOf.set(`${entry.collection}:${entry.id}`, entry.path)
    if (entry.collection === 'projects' && entry.id) folderOf.set(entry.id, entry.projectFolder)
  }

  const allEntities = () => VAULT_COLLECTIONS.flatMap(({ collection }) =>
    (parsed.data[collection] ?? []).filter((e) => e.id).map((entity) => ({ collection, entity })))

  function labelsFor(projectId) {
    const map = new Map()
    for (const { entity } of allEntities()) {
      if (entity.projectId === projectId) map.set(entity.id, [entity.code, entity.name].filter(Boolean).join(' '))
    }
    return (id) => map.get(id) || null
  }

  function findProject(ref) {
    const r = String(ref ?? '').trim()
    if (!r) {
      // Jediný projekt ve složce (vlastní složka projektu) se nemusí zadávat
      const only = parsed.data.projects.filter((p) => p.id)
      return only.length === 1 ? { project: only[0], folder: folderOf.get(only[0].id) } : { error: 'projectRequired' }
    }
    const norm = r.normalize('NFC').toLowerCase()
    const matches = parsed.data.projects.filter((p) => p.id && (
      p.id === r || folderOf.get(p.id)?.toLowerCase() === norm || String(p.name ?? '').normalize('NFC').toLowerCase() === norm))
    if (!matches.length) return { error: 'projectNotFound' }
    if (matches.length > 1) return { error: 'projectAmbiguous' }
    return { project: matches[0], folder: folderOf.get(matches[0].id) }
  }

  function findEntity(ref, projectRef) {
    const r = String(ref ?? '').trim()
    if (!r) return { error: 'entityRequired' }
    let projectId = null
    if (projectRef) {
      const p = findProject(projectRef)
      if (p.error) return p
      projectId = p.project.id
    }
    const candidates = allEntities().filter(({ entity }) => !projectId || entity.projectId === projectId)
    let matches
    if (r.includes('/') || r.toLowerCase().endsWith('.md')) {
      const path = normalizeVaultPath(r)
      matches = candidates.filter(({ collection, entity }) => {
        const p = pathOf.get(`${collection}:${entity.id}`)
        return p === path || p?.endsWith(`/${path}`)
      })
    } else {
      matches = candidates.filter(({ entity }) => entity.id === r)
      if (!matches.length) matches = candidates.filter(({ entity }) => String(entity.code ?? '').toUpperCase() === r.toUpperCase())
    }
    if (!matches.length) return { error: 'entityNotFound' }
    if (matches.length > 1) return { error: 'entityAmbiguous' }
    const { collection, entity } = matches[0]
    return { collection, entity, path: pathOf.get(`${collection}:${entity.id}`), info: resolveEntityType(collection) }
  }

  function serializeEntity(collection, entity) {
    const { entityType } = resolveEntityType(collection)
    return entityToMarkdown(entityType, entity, { headingFor, refLabel: labelsFor(entity.projectId), entityConfig })
  }

  return { parsed, issues, headingFor, pathOf, folderOf, allEntities, findProject, findEntity, serializeEntity, labelsFor }
}

/** Převede hodnotu z --set podle výchozí hodnoty pole (seznam z čárek, číslo, boolean). */
function coerceSetValue(raw, def) {
  if (Array.isArray(def)) return String(raw).split(',').map((s) => s.trim()).filter(Boolean)
  if (typeof def === 'number') return Number.isFinite(Number(raw)) ? Number(raw) : raw
  if (typeof def === 'boolean') return raw === 'true'
  return String(raw).replace(/\\n/g, '\n')
}

/** Problém, kvůli kterému CLI změnu nezapíše: chyba, nebo nový odkaz na neexistující záznam. */
const isBlocking = (i) => i.level === 'error' || i.code === 'danglingRef'

/** Problémy, které změna nově přinesla (porovnání kontroly před a po). */
function newErrors(before, after) {
  const key = (i) => JSON.stringify([i.path, i.code, i.field ?? null, i.value ?? null])
  const old = new Set(before.filter(isBlocking).map(key))
  return after.filter((i) => isBlocking(i) && !old.has(key(i)))
}

/** Použije zápisy na seznam souborů (pro kontrolu výsledku před zápisem na disk). */
function applyToFiles(files, writes, deletes) {
  const map = new Map(files.map((f) => [normalizeVaultPath(f.path), f.content]))
  for (const d of deletes) map.delete(d)
  for (const w of writes) map.set(w.path, w.content)
  return [...map.entries()].map(([path, content]) => ({ path, content }))
}

function issueLine(issue, messages) {
  const where = issue.path ? `${issue.path}${issue.line ? `:${issue.line}` : ''}` : '—'
  const level = issue.level === 'error' ? messages.vaultCli.error : messages.vaultCli.warning
  return `${where}: ${level}: ${formatIssue(issue, messages)}`
}

/**
 * Zkontroluje výsledek změny a buď ji potvrdí (zapíše), nebo odmítne s novými chybami.
 */
function commitChange(out, ctx, files, writes, deletes, messages, entityConfig) {
  const after = validateVault(applyToFiles(files, writes, deletes), { headingFor: ctx.headingFor, entityConfig }).issues
  const introduced = newErrors(ctx.issues, after)
  if (introduced.length) {
    out.stderr.push(messages.vaultCli.rejected)
    for (const issue of introduced) out.stderr.push(`  ${issueLine(issue, messages)}`)
    out.exitCode = 1
    return out
  }
  out.writes.push(...writes)
  out.deletes.push(...deletes)
  return out
}

function cmdValidate(ctx, { positional, flags }, messages) {
  const out = result()
  const filter = positional.map(normalizeVaultPath)
  const issues = filter.length
    ? ctx.issues.filter((i) => i.path && filter.some((p) => i.path === p || i.path.startsWith(`${p.replace(/\/$/, '')}/`)))
    : ctx.issues
  const errors = issues.filter((i) => i.level === 'error').length
  if (flags.json) {
    out.stdout.push(JSON.stringify({ errors, warnings: issues.length - errors, issues: issues.map((i) => ({ ...i, text: formatIssue(i, messages) })) }, null, 2))
  } else {
    for (const issue of issues) out.stdout.push(issueLine(issue, messages))
    out.stdout.push(messages.vaultCli.summary(errors, issues.length - errors))
  }
  out.exitCode = errors ? 1 : 0
  return out
}

function describeDefault(value) {
  if (Array.isArray(value)) return 'list'
  if (isObject(value)) return 'map'
  if (value === null) return 'null'
  return typeof value
}

function cmdSchema(ctx, { positional }, messages, entityConfig) {
  const out = result()
  const L = messages.vaultCli
  if (!positional[0]) {
    out.stdout.push(L.schemaTypes)
    out.stdout.push(`  project – ${PROJECTS_DIR}/<…>/${PROJECT_FILE}`)
    for (const { collection, entityType, dir } of VAULT_COLLECTIONS) {
      const prefix = entityConfig?.[entityType]?.codePrefix
      out.stdout.push(`  ${entityType} (${collection}) – ${dir}/${prefix ? ` ${L.codePrefix}: ${prefix}` : ''}`)
    }
    out.stdout.push(L.schemaHint)
    return out
  }
  const info = positional[0] === 'project' ? { entityType: 'project', collection: 'projects', dir: '' } : resolveEntityType(positional[0])
  if (!info) return fail(out, L.unknownType(positional[0]))
  const def = entityConfig?.[info.entityType] ?? {}
  const body = info.entityType === 'project' ? [] : getBodyFields(info.entityType, entityConfig)
  const options = getSelectOptions(info.entityType, entityConfig)
  out.stdout.push(`${info.entityType}${info.dir ? ` (${info.dir}/)` : ''}`)
  if (def.codePrefix) out.stdout.push(`${L.codePrefix}: ${def.codePrefix}-NNN`)
  out.stdout.push(L.schemaName)
  if (body.length) {
    out.stdout.push(L.schemaSections)
    for (const key of body) out.stdout.push(`  ## ${ctx.headingFor(info.entityType, key)}   (${key})`)
  }
  if (info.entityType === 'project') out.stdout.push(L.schemaNotebook)
  if (Array.isArray(def.completeness) && def.completeness.length) {
    const items = def.completeness.map((c) => (c.when ? `${c.field} (${c.when.field} = ${c.when.value})` : c.field))
    out.stdout.push(`${L.schemaCompleteness}: ${items.join(', ')}`)
  }
  out.stdout.push(L.schemaFrontmatter)
  out.stdout.push('  id: string   code: string')
  for (const [key, value] of Object.entries(def.defaults ?? {})) {
    if (key === 'name' || key === 'code' || body.includes(key) || (info.entityType === 'project' && key === 'notebook')) continue
    let line = `  ${key}: ${describeDefault(value)}`
    if (options[key]) line += `  ${L.allowed}: ${options[key].map((v) => (v === '' ? "''" : v)).join(' | ')}`
    if (REF_FIELDS[key]) line += `  → ${REF_FIELDS[key]}`
    out.stdout.push(line)
  }
  return out
}

function cmdList(ctx, { positional, flags }, messages) {
  const out = result()
  let projectId = null
  if (flags.project) {
    const p = ctx.findProject(flags.project)
    if (p.error) return fail(out, messages.vaultCli[p.error])
    projectId = p.project.id
  }
  const info = positional[0] ? resolveEntityType(positional[0]) : null
  if (positional[0] && !info) return fail(out, messages.vaultCli.unknownType(positional[0]))
  const rows = ctx.allEntities()
    .filter(({ collection, entity }) => (!info || info.collection === collection) && (!projectId || entity.projectId === projectId))
    .map(({ collection, entity }) => [entity.code || '—', entity.name || '—', ctx.pathOf.get(`${collection}:${entity.id}`), entity.id])
    .sort((a, b) => String(a[2]).localeCompare(String(b[2])))
  for (const row of rows) out.stdout.push(row.join('\t'))
  if (!rows.length) out.stdout.push(messages.vaultCli.nothingFound)
  return out
}

function uniquePath(dirPath, base, existing) {
  let name = `${dirPath}/${base}.md`
  for (let n = 2; existing.has(name.toLowerCase()); n++) name = `${dirPath}/${base}-${n}.md`
  return name
}

function cmdNew(ctx, files, { positional, flags }, messages, entityConfig, env) {
  const out = result()
  const L = messages.vaultCli
  const type = positional[0]
  if (!type) return fail(out, L.usageNew)
  const name = typeof flags.name === 'string' ? flags.name.trim() : ''
  const existing = new Set(files.map((f) => normalizeVaultPath(f.path).toLowerCase()))
  const now = env.now()

  if (type === 'project') {
    if (env.layout === VAULT_LAYOUT.PROJECT) return fail(out, L.projectLayoutSingle)
    if (!name) return fail(out, L.nameRequired)
    const folder = sanitizeFolderName(name)
    if (!folder) return fail(out, L.nameRequired)
    let path = `${PROJECTS_DIR}/${folder}/${PROJECT_FILE}`
    for (let n = 2; existing.has(path.toLowerCase()); n++) path = `${PROJECTS_DIR}/${folder} (${n})/${PROJECT_FILE}`
    const project = applyDefaults({ id: env.generateId(), name, createdAt: now, lastWorkedAt: now }, entityConfig?.project?.defaults ?? {})
    delete project.notebookHistory
    for (const pair of flags.set) {
      const eq = String(pair).indexOf('=')
      if (eq > 0) project[pair.slice(0, eq)] = coerceSetValue(pair.slice(eq + 1), entityConfig?.project?.defaults?.[pair.slice(0, eq)])
    }
    commitChange(out, ctx, files, [{ path, content: projectToMarkdown(project, { entityConfig }) }], [], messages, entityConfig)
    if (!out.exitCode) out.stdout.push(L.created(path, project.id))
    return out
  }

  const info = resolveEntityType(type)
  if (!info) return fail(out, L.unknownType(type))
  const p = ctx.findProject(flags.project)
  if (p.error) return fail(out, L[p.error])
  if (!name) return fail(out, L.nameRequired)

  const defaults = entityConfig?.[info.entityType]?.defaults ?? {}
  const entity = applyDefaults({ id: env.generateId(), name, createdAt: now, updatedAt: now }, defaults)
  for (const pair of flags.set) {
    const eq = String(pair ?? '').indexOf('=')
    if (eq <= 0) return fail(out, L.badSet(pair))
    const key = pair.slice(0, eq)
    if (['id', 'projectId', 'createdAt'].includes(key)) return fail(out, L.badSet(pair))
    entity[key] = coerceSetValue(pair.slice(eq + 1), defaults[key])
  }
  const prefix = entityConfig?.[info.entityType]?.codePrefix
  if (prefix && !entity.code) {
    const siblings = (ctx.parsed.data[info.collection] ?? []).filter((e) => e.projectId === p.project.id)
    entity.code = generateNextCode(prefix, siblings)
  }
  entity.projectId = p.project.id
  const path = uniquePath(`${PROJECTS_DIR}/${p.folder}/${info.dir}`, entityFileBase(entity), existing)
  const content = ctx.serializeEntity(info.collection, entity)
  commitChange(out, ctx, files, [{ path, content }], [], messages, entityConfig)
  if (!out.exitCode) out.stdout.push(L.created(path, entity.id, entity.code))
  return out
}

function cmdLink(ctx, files, { positional, flags }, messages, entityConfig, remove) {
  const out = result()
  const L = messages.vaultCli
  const [ref, field, ...targets] = positional
  if (!ref || !field || !targets.length) return fail(out, remove ? L.usageUnlink : L.usageLink)
  const found = ctx.findEntity(ref, flags.project)
  if (found.error) return fail(out, L[found.error])
  const targetCollection = REF_FIELDS[field]
  const defaults = entityConfig?.[found.info.entityType]?.defaults ?? {}
  if (!targetCollection || !(field in defaults)) {
    const allowed = Object.keys(defaults).filter((k) => REF_FIELDS[k])
    return fail(out, L.badField(field, found.info.entityType, allowed))
  }
  const entity = { ...found.entity, [field]: [...(found.entity[field] ?? [])] }
  for (const t of targets) {
    if (remove) {
      const target = ctx.findEntity(t, found.entity.projectId)
      const id = target.error ? t : target.entity.id
      entity[field] = entity[field].filter((x) => x !== id)
      continue
    }
    const target = ctx.findEntity(t, found.entity.projectId)
    if (target.error) return fail(out, `${t}: ${L[target.error]}`)
    if (target.collection !== targetCollection) return fail(out, L.wrongTarget(t, field, targetCollection))
    if (!entity[field].includes(target.entity.id)) entity[field].push(target.entity.id)
  }
  commitChange(out, ctx, files, [{ path: found.path, content: ctx.serializeEntity(found.collection, entity) }], [], messages, entityConfig)
  if (!out.exitCode) out.stdout.push(L.updated(found.path))
  return out
}

function cmdDelete(ctx, files, { positional, flags }, messages, entityConfig) {
  const out = result()
  const L = messages.vaultCli
  if (!positional[0]) return fail(out, L.usageDelete)
  const found = ctx.findEntity(positional[0], flags.project)
  if (found.error) return fail(out, L[found.error])
  const { id, projectId } = found.entity
  const writes = []
  for (const { collection, entity } of ctx.allEntities()) {
    if (entity.projectId !== projectId || entity.id === id) continue
    let changed = false
    const next = { ...entity }
    for (const field of Object.keys(REF_FIELDS)) {
      if (Array.isArray(next[field]) && next[field].includes(id)) {
        next[field] = next[field].filter((x) => x !== id)
        changed = true
      }
    }
    if (changed) writes.push({ path: ctx.pathOf.get(`${collection}:${entity.id}`), content: ctx.serializeEntity(collection, next) })
  }
  const folder = ctx.folderOf.get(projectId)
  const connections = ctx.parsed.data.connections.filter((c) => c.projectId === projectId)
  const kept = connections.filter((c) => c.entityId1 !== id && c.entityId2 !== id)
  if (kept.length !== connections.length) {
    writes.push({ path: `${PROJECTS_DIR}/${folder}/${CONNECTIONS_FILE}`, content: connectionsToYaml(kept, { refLabel: ctx.labelsFor(projectId) }) })
  }
  out.writes.push(...writes)
  out.deletes.push(found.path)
  out.stdout.push(L.deleted(found.path, writes.length))
  return out
}

/**
 * Vyhodnotí vstup hooku Claude Code.
 * PreToolUse: zakáže úpravy souborů spravovaných aplikací.
 * PostToolUse: po úpravě souboru v projects/ zkontroluje vault a vrátí chyby týkající se souboru.
 * @param {{ event: string, relPath: string|null }} hook - relPath relativně ke kořeni vaultu (null = mimo vault)
 */
function cmdHook(ctx, hook, messages) {
  const out = result()
  const path = hook?.relPath ? normalizeVaultPath(hook.relPath) : null
  if (!path) return out
  if (hook.event === 'PreToolUse') {
    if (PROTECTED_PATHS.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p))) {
      return fail(out, messages.vaultCli.protected(path), 2)
    }
    return out
  }
  if (hook.event !== 'PostToolUse' || !path.startsWith(`${PROJECTS_DIR}/`)) return out
  const own = ctx.issues.filter((i) => i.path === path || i.firstPath === path)
  const errors = own.filter((i) => i.level === 'error')
  if (errors.length) {
    // exit 2: Claude Code předá stderr Claudovi jako zpětnou vazbu k úpravě
    out.stderr.push(messages.vaultCli.hookErrors(path))
    for (const issue of errors) out.stderr.push(`  ${issueLine(issue, messages)}`)
    out.stderr.push(messages.vaultCli.hookHint)
    out.exitCode = 2
    return out
  }
  const warnings = own.filter((i) => i.level === 'warning')
  if (warnings.length) {
    // Varování neblokují – předají se Claudovi jako doplňující kontext
    const text = [messages.vaultCli.hookWarnings(path), ...warnings.map((i) => `  ${issueLine(i, messages)}`)].join('\n')
    out.stdout.push(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } }))
  }
  return out
}

/**
 * Spustí příkaz CLI.
 * @param {string[]} argv - argumenty bez „node uxlog.mjs“
 * @param {{
 *   files: Array<{ path: string, content: string }>,
 *   messages: Object,
 *   entityConfig?: Object,
 *   now?: () => string,
 *   generateId?: () => string,
 *   hook?: { event: string, relPath: string|null },  relPath = logická cesta (u vlastní složky projektu převedená)
 *   layout?: string,                                  rozložení složky ('shared' | 'project')
 * }} env
 * @returns {{ stdout: string[], stderr: string[], exitCode: number, writes: Array<{ path: string, content: string }>, deletes: string[] }}
 */
export function runCliCommand(argv, env) {
  const { files = [], messages, entityConfig = ENTITY_CONFIG } = env
  const fullEnv = { now: () => new Date().toISOString(), generateId: () => '', ...env }
  const args = parseArgs(argv)
  const command = args.positional.shift()
  const L = messages.vaultCli
  if (!command || command === 'help' || args.flags.help !== undefined) {
    const out = result()
    out.stdout.push(L.help)
    return out
  }
  const ctx = createContext(files, { messages, entityConfig })
  switch (command) {
    case 'validate': return cmdValidate(ctx, args, messages)
    case 'schema': return cmdSchema(ctx, args, messages, entityConfig)
    case 'list': return cmdList(ctx, args, messages)
    case 'new': return cmdNew(ctx, files, args, messages, entityConfig, fullEnv)
    case 'link': return cmdLink(ctx, files, args, messages, entityConfig, false)
    case 'unlink': return cmdLink(ctx, files, args, messages, entityConfig, true)
    case 'delete': return cmdDelete(ctx, files, args, messages, entityConfig)
    case 'hook': return cmdHook(ctx, env.hook, messages)
    default: return fail(result(), L.unknownCommand(command))
  }
}
