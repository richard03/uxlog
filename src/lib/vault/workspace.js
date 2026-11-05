/**
 * Vault (data jako soubory) – převod celého stavu aplikace ↔ seznam souborů.
 *
 * buildVaultFiles(data)  → [{ path, content }]   (co zapsat na disk)
 * parseVaultFiles(files) → { data, index, errors, warnings }
 *
 * Soubory se předávají jako relativní cesty v rámci vaultu (lomítka „/“), samotné čtení
 * a zápis na disk dělá volající (Tauri). Čisté funkce bez side effects.
 */

import {
  VAULT_COLLECTIONS, PROJECTS_DIR, PROJECT_FILE, CONNECTIONS_FILE, INDEX_FILE, WORKSPACE_FILE, CANVAS_DIR, NOTEBOOK_DIR, CONFIG_DIR,
  VAULT_LAYOUT, PROJECT_LAYOUT_FOLDER, normalizeLayout,
  assignProjectFolders, assignEntityFileNames, canvasFilePath, notebookFilePath, configFilePath, collectionByDir, normalizeVaultPath,
} from './paths.js'
import {
  VAULT_FORMAT_VERSION, entityToMarkdown, markdownToEntity, projectToMarkdown, markdownToProject,
  connectionsToYaml, yamlToConnections, dataToYaml, yamlToData,
} from './format.js'

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Popisek entity do komentáře u odkazu: „PER-001 Anna“.
 * @param {Object} entity
 * @returns {string}
 */
function entityRefLabel(entity) {
  return [entity?.code, entity?.name].filter((x) => typeof x === 'string' && x.trim()).join(' ')
}

/** Buňka tabulky Markdown (bez svislítek a nových řádků). */
function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}

/**
 * Rejstřík projektu (INDEX.md): tabulka kód | název | soubor | id pro každý typ záznamu.
 * Generuje ho aplikace, při čtení vaultu se ignoruje.
 * @param {Object} project
 * @param {Array<{ dir: string, rows: Array<{ code: string, name: string, file: string, id: string }> }>} sections
 * @param {{ columns?: string[], note?: string }} [labels]
 * @returns {string}
 */
export function buildProjectIndex(project, sections, labels = {}) {
  const columns = labels.columns ?? ['code', 'name', 'file', 'id']
  const lines = [`# ${cell(project?.name) || project?.id}`]
  if (labels.note) lines.push('', labels.note)
  for (const { dir, rows } of sections) {
    if (!rows.length) continue
    lines.push('', `## ${dir}`, '', `| ${columns.join(' | ')} |`, `|${columns.map(() => '---').join('|')}|`)
    for (const r of rows) lines.push(`| ${cell(r.code)} | ${cell(r.name)} | ${dir}/${cell(r.file)} | ${cell(r.id)} |`)
  }
  return `${lines.join('\n')}\n`
}

/**
 * Sestaví soubory vaultu ze stavu aplikace.
 * Entity bez existujícího projektu (sirotci) se nezapíší a vrátí se jako varování.
 * @param {Object} data - stav aplikace (projects + kolekce entit + connections)
 * @param {{ headingFor?: Function, appVersion?: string, entityConfig?: Object, indexLabels?: Object, layout?: string }} [options]
 *   layout 'project' = vlastní složka jednoho projektu: logická složka projektu je PROJECT_LAYOUT_FOLDER
 *   (na disk ji převádí Rust/CLI) a workspace.yaml nese `layout: project`
 * @returns {{
 *   files: Array<{ path: string, content: string }>,
 *   index: Object.<string, { collection: string, id: string|null, projectId: string }>,
 *   warnings: Array<Object>,
 * }} index: cesta → co soubor obsahuje (jen projekty, entity a souvislosti)
 */
export function buildVaultFiles(data, options = {}) {
  const { headingFor, appVersion = '', entityConfig, indexLabels } = options
  const layout = normalizeLayout(options.layout)
  const formatOptions = entityConfig ? { headingFor, entityConfig } : { headingFor }
  const files = []
  const index = {}
  const warnings = []
  const projects = (Array.isArray(data?.projects) ? data.projects : []).filter((p) => isObject(p) && p.id)
  const folders = layout === VAULT_LAYOUT.PROJECT
    ? new Map(projects.map((p) => [p.id, PROJECT_LAYOUT_FOLDER]))
    : assignProjectFolders(projects)

  const workspace = { formatVersion: VAULT_FORMAT_VERSION, appVersion }
  if (layout === VAULT_LAYOUT.PROJECT) workspace.layout = VAULT_LAYOUT.PROJECT
  files.push({ path: WORKSPACE_FILE, content: dataToYaml(workspace) })

  for (const project of projects) {
    const base = `${PROJECTS_DIR}/${folders.get(project.id)}`
    const byCollection = {}
    const labels = new Map()
    for (const { collection } of VAULT_COLLECTIONS) {
      const list = (Array.isArray(data?.[collection]) ? data[collection] : [])
        .filter((e) => isObject(e) && e.id && e.projectId === project.id)
      byCollection[collection] = list
      for (const e of list) labels.set(e.id, entityRefLabel(e))
    }
    const refLabel = (id) => labels.get(id) || null

    files.push({ path: `${base}/${PROJECT_FILE}`, content: projectToMarkdown(project, formatOptions) })
    index[`${base}/${PROJECT_FILE}`] = { collection: 'projects', id: project.id, projectId: project.id }
    const indexSections = []
    for (const { collection, entityType, dir } of VAULT_COLLECTIONS) {
      const names = assignEntityFileNames(byCollection[collection])
      const rows = []
      for (const entity of byCollection[collection]) {
        const path = `${base}/${dir}/${names.get(entity.id)}`
        files.push({ path, content: entityToMarkdown(entityType, entity, { ...formatOptions, refLabel }) })
        index[path] = { collection, id: entity.id, projectId: project.id }
        rows.push({ code: entity.code ?? '', name: entity.name ?? '', file: names.get(entity.id), id: entity.id })
      }
      indexSections.push({ dir, rows })
    }
    files.push({ path: `${base}/${INDEX_FILE}`, content: buildProjectIndex(project, indexSections, indexLabels) })
    const connections = (Array.isArray(data?.connections) ? data.connections : [])
      .filter((c) => isObject(c) && c.projectId === project.id)
    if (connections.length) {
      files.push({ path: `${base}/${CONNECTIONS_FILE}`, content: connectionsToYaml(connections, { refLabel }) })
      index[`${base}/${CONNECTIONS_FILE}`] = { collection: 'connections', id: null, projectId: project.id }
    }
    if (isObject(project.canvas)) {
      files.push({ path: canvasFilePath(project.id), content: dataToYaml(project.canvas) })
    }
    if (Array.isArray(project.notebookHistory) && project.notebookHistory.length) {
      files.push({ path: notebookFilePath(project.id), content: dataToYaml({ notebookHistory: project.notebookHistory }) })
    }
    if (isObject(project.config)) {
      files.push({ path: configFilePath(project.id), content: dataToYaml(project.config) })
    }
  }

  const projectIds = new Set(projects.map((p) => p.id))
  for (const collection of [...VAULT_COLLECTIONS.map((c) => c.collection), 'connections']) {
    const orphans = (Array.isArray(data?.[collection]) ? data[collection] : [])
      .filter((e) => isObject(e) && !projectIds.has(e.projectId))
    if (orphans.length) warnings.push({ code: 'orphanEntities', collection, count: orphans.length })
  }
  return { files, index, warnings }
}

/** Prázdný stav ve tvaru aplikace (stejné klíče jako storage.getEmptyData). */
function emptyData() {
  const data = { projects: [] }
  for (const { collection } of VAULT_COLLECTIONS) data[collection] = []
  data.connections = []
  return data
}

/**
 * Načte stav aplikace ze souborů vaultu.
 * - Soubor s chybou se přeskočí (chyba s cestou v `errors`), ostatní se načtou.
 * - Složka projektu bez project.md → chyba a její entity se přeskočí.
 * - Entita/projekt bez id se načte (varování missingId) – id doplní volající.
 * - Duplicitní id v kolekci → chyba, načte se jen první soubor (podle cesty).
 * - Neznámé soubory se ignorují s varováním.
 * @param {Array<{ path: string, content: string }>} files
 * @param {{ headingFor?: Function, entityConfig?: Object }} [options]
 * @returns {{
 *   data: Object,
 *   index: Array<{ path: string, collection: string, id: string|null, projectFolder?: string }>,
 *   records: Object.<string, Object>,
 *   errors: Array<Object>,
 *   warnings: Array<Object>,
 *   formatVersion: number|null,
 * }}
 */
export function parseVaultFiles(files, options = {}) {
  const { headingFor, entityConfig } = options
  const formatOptions = entityConfig ? { headingFor, entityConfig } : { headingFor }
  const data = emptyData()
  const index = []
  const records = {}
  const errors = []
  const warnings = []
  let formatVersion = null

  const normalized = (Array.isArray(files) ? files : [])
    .filter((f) => isObject(f) && typeof f.path === 'string')
    .map((f) => ({ path: normalizeVaultPath(f.path), content: String(f.content ?? '') }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

  const report = (list, path, items) => {
    for (const item of items) list.push({ path, ...item })
  }

  // 1. Projekty (project.md) – určí projectId pro entity ve složce
  const projectByFolder = new Map()
  const projectFolders = new Set()
  for (const file of normalized) {
    const parts = file.path.split('/')
    if (parts[0] !== PROJECTS_DIR || parts.length < 3) continue
    projectFolders.add(parts[1])
    if (parts.length !== 3 || parts[2] !== PROJECT_FILE) continue
    const result = markdownToProject(file.content, formatOptions)
    report(warnings, file.path, result.warnings)
    if (!result.ok) {
      report(errors, file.path, result.errors)
      continue
    }
    const id = result.project.id || null
    if (id && data.projects.some((p) => p.id === id)) {
      errors.push({ path: file.path, code: 'duplicateId', collection: 'projects', id })
      continue
    }
    data.projects.push(result.project)
    records[file.path] = result.project
    projectByFolder.set(parts[1], result.project)
    index.push({ path: file.path, collection: 'projects', id, projectFolder: parts[1] })
  }
  for (const folder of projectFolders) {
    if (!projectByFolder.has(folder)) {
      errors.push({ path: `${PROJECTS_DIR}/${folder}/${PROJECT_FILE}`, code: 'missingProjectFile' })
    }
  }

  // 2. Entity, souvislosti, plátno, metadata
  const seenIds = new Map()
  for (const file of normalized) {
    const parts = file.path.split('/')

    if (file.path === WORKSPACE_FILE) {
      const result = yamlToData(file.content)
      if (!result.ok) report(errors, file.path, result.errors)
      else if (typeof result.data?.formatVersion === 'number') formatVersion = result.data.formatVersion
      continue
    }

    if (file.path.startsWith(`${CANVAS_DIR}/`)) {
      const project = data.projects.find((p) => p.id && canvasFilePath(p.id) === file.path)
      if (!project) {
        warnings.push({ path: file.path, code: 'unknownFile' })
        continue
      }
      const result = yamlToData(file.content)
      if (!result.ok) report(errors, file.path, result.errors)
      else if (isObject(result.data)) project.canvas = result.data
      continue
    }

    if (file.path.startsWith(`${CONFIG_DIR}/`)) {
      const project = data.projects.find((p) => p.id && configFilePath(p.id) === file.path)
      if (!project) {
        warnings.push({ path: file.path, code: 'unknownFile' })
        continue
      }
      const result = yamlToData(file.content)
      if (!result.ok) report(errors, file.path, result.errors)
      else if (isObject(result.data)) project.config = result.data
      continue
    }

    if (file.path.startsWith(`${NOTEBOOK_DIR}/`)) {
      const project = data.projects.find((p) => p.id && notebookFilePath(p.id) === file.path)
      if (!project) {
        warnings.push({ path: file.path, code: 'unknownFile' })
        continue
      }
      const result = yamlToData(file.content)
      if (!result.ok) report(errors, file.path, result.errors)
      else if (Array.isArray(result.data?.notebookHistory)) project.notebookHistory = result.data.notebookHistory
      continue
    }

    if (parts[0] !== PROJECTS_DIR || parts.length < 3) {
      if (!file.path.startsWith('.') && !parts.some((p) => p.startsWith('.'))) {
        warnings.push({ path: file.path, code: 'unknownFile' })
      }
      continue
    }
    const project = projectByFolder.get(parts[1])
    if (parts.length === 3 && (parts[2] === PROJECT_FILE || parts[2] === INDEX_FILE)) continue
    if (!project) continue // chyba missingProjectFile už je hlášená

    if (parts.length === 3 && parts[2] === CONNECTIONS_FILE) {
      const result = yamlToConnections(file.content)
      report(warnings, file.path, result.warnings)
      if (!result.ok) {
        report(errors, file.path, result.errors)
        continue
      }
      for (const c of result.connections) data.connections.push({ ...c, projectId: project.id })
      index.push({ path: file.path, collection: 'connections', id: null, projectFolder: parts[1] })
      continue
    }

    const info = parts.length === 4 ? collectionByDir(parts[2]) : null
    if (!info || !parts[3].toLowerCase().endsWith('.md')) {
      if (!parts.some((p) => p.startsWith('.'))) warnings.push({ path: file.path, code: 'unknownFile' })
      continue
    }
    const result = markdownToEntity(info.entityType, file.content, formatOptions)
    report(warnings, file.path, result.warnings)
    if (!result.ok) {
      report(errors, file.path, result.errors)
      continue
    }
    const entity = { ...result.entity, projectId: project.id }
    const id = entity.id || null
    if (id) {
      const key = `${info.collection}:${id}`
      if (seenIds.has(key)) {
        errors.push({ path: file.path, code: 'duplicateId', collection: info.collection, id, firstPath: seenIds.get(key) })
        continue
      }
      seenIds.set(key, file.path)
    }
    data[info.collection].push(entity)
    records[file.path] = entity
    index.push({ path: file.path, collection: info.collection, id, projectFolder: parts[1] })
  }

  if (formatVersion !== null && formatVersion > VAULT_FORMAT_VERSION) {
    warnings.push({ path: WORKSPACE_FILE, code: 'newerFormatVersion', formatVersion })
  }
  return { data, index, records, errors, warnings, formatVersion }
}
