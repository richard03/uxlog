/**
 * CLI UXLog pro Claude Code – vstupní bod pro Node.js.
 *
 * Sestavuje se (vite.cli.config.js) do jednoho souboru bez závislostí, který aplikace zapíše
 * do složky dat jako .uxlog/bin/uxlog.mjs. Logika příkazů je v src/lib/vault/cli.js,
 * tady je jen čtení/zápis souborů, hledání kořene složky dat a vstup hooků.
 */

import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import cs from '../i18n/cs.js'
import { runCliCommand } from '../lib/vault/cli.js'
import {
  WORKSPACE_FILE, PROJECTS_DIR, META_DIR, VAULT_LAYOUT, VAULT_COLLECTIONS, PROJECT_LAYOUT_ROOT_FILES, PROJECT_LAYOUT_PREFIX,
  toLogicalPath, toPhysicalPath,
} from '../lib/vault/paths.js'

const READ_EXTENSIONS = new Set(['.md', '.yaml', '.json'])

/** Najde kořen složky dat: --root, jinak nejbližší nadřazená složka s .uxlog/workspace.yaml. */
function findRoot(argv) {
  const i = argv.indexOf('--root')
  if (i >= 0 && argv[i + 1]) {
    const root = path.resolve(argv[i + 1])
    argv.splice(i, 2)
    return root
  }
  const start = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  let dir = path.resolve(start)
  for (;;) {
    if (fs.existsSync(path.join(dir, WORKSPACE_FILE))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/** Rozložení složky z .uxlog/workspace.yaml (layout: project = vlastní složka projektu). */
function readLayout(root) {
  try {
    const text = fs.readFileSync(path.join(root, WORKSPACE_FILE), 'utf8')
    return /^layout:\s*project\s*$/m.test(text) ? VAULT_LAYOUT.PROJECT : VAULT_LAYOUT.SHARED
  } catch {
    return VAULT_LAYOUT.SHARED
  }
}

/** Přečte soubory projektů a metadata (logické cesty s „/“, NFC). */
function readVault(root, layout) {
  const files = []
  const add = (full) => {
    const rel = path.relative(root, full).split(path.sep).join('/').normalize('NFC')
    const logical = toLogicalPath(rel, layout)
    if (logical) files.push({ path: logical, content: fs.readFileSync(full, 'utf8') })
  }
  const walk = (dir) => {
    let entries = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) walk(full)
      else if (READ_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) add(full)
    }
  }
  if (layout === VAULT_LAYOUT.PROJECT) {
    for (const { dir } of VAULT_COLLECTIONS) walk(path.join(root, dir))
    for (const name of PROJECT_LAYOUT_ROOT_FILES) if (fs.existsSync(path.join(root, name))) add(path.join(root, name))
  } else {
    walk(path.join(root, PROJECTS_DIR))
  }
  const workspace = path.join(root, WORKSPACE_FILE)
  if (fs.existsSync(workspace)) files.push({ path: WORKSPACE_FILE, content: fs.readFileSync(workspace, 'utf8') })
  return files
}

/** Bezpečně převede logickou cestu na plnou cestu (jen soubory dat projektů). */
function resolveInside(root, rel, layout) {
  const physical = rel.startsWith(`${PROJECTS_DIR}/`) ? toPhysicalPath(rel, layout) : null
  if (!physical) throw new Error(`Nepovolená cesta: ${rel}`)
  const full = path.resolve(root, ...physical.split('/'))
  if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error(`Nepovolená cesta: ${rel}`)
  return full
}

/** Ve výpisu nahradí logické cesty vlastní složky projektu cestami na disku. */
function showPaths(text, layout) {
  return layout === VAULT_LAYOUT.PROJECT ? text.split(PROJECT_LAYOUT_PREFIX).join('') : text
}

function writeAtomic(full, content) {
  fs.mkdirSync(path.dirname(full), { recursive: true })
  const temp = `${full}.uxlog-tmp`
  fs.writeFileSync(temp, content, 'utf8')
  fs.renameSync(temp, full)
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

/** Vstup hooku Claude Code (JSON na stdin) → událost a cesta souboru relativně ke kořeni. */
function hookInput(root) {
  let data = {}
  try {
    data = JSON.parse(readStdin() || '{}')
  } catch {
    return { event: '', relPath: null }
  }
  const filePath = data?.tool_input?.file_path || data?.tool_input?.notebook_path || ''
  if (!filePath) return { event: data?.hook_event_name ?? '', relPath: null }
  const base = data?.cwd || process.cwd()
  const rel = path.relative(root, path.resolve(base, filePath))
  const inside = rel && !rel.startsWith('..') && !path.isAbsolute(rel)
  return { event: data?.hook_event_name ?? '', relPath: inside ? rel.split(path.sep).join('/').normalize('NFC') : null }
}

function main() {
  const argv = process.argv.slice(2)
  const root = findRoot(argv)
  if (!root) {
    // Hook mimo složku dat nesmí blokovat práci
    if (argv[0] === 'hook') return 0
    process.stderr.write('Složka dat UXLog nenalezena (chybí .uxlog/workspace.yaml). Spusťte příkaz v ní, nebo použijte --root <cesta>.\n')
    return 1
  }
  const layout = readLayout(root)
  const files = readVault(root, layout)
  let hook
  if (argv[0] === 'hook') {
    hook = hookInput(root)
    // Soubor mimo data projektu (např. kód v repozitáři) hook nekontroluje
    if (hook.relPath) hook.relPath = toLogicalPath(hook.relPath, layout)
  }
  const out = runCliCommand(argv, {
    files,
    messages: cs,
    generateId: () => randomUUID(),
    now: () => new Date().toISOString(),
    hook,
    layout,
  })
  for (const w of out.writes) writeAtomic(resolveInside(root, w.path, layout), w.content)
  for (const d of out.deletes) {
    const full = resolveInside(root, d, layout)
    if (fs.existsSync(full)) fs.unlinkSync(full)
  }
  if (out.stdout.length) process.stdout.write(`${showPaths(out.stdout.join('\n'), layout)}\n`)
  if (out.stderr.length) process.stderr.write(`${showPaths(out.stderr.join('\n'), layout)}\n`)
  return out.exitCode
}

try {
  process.exitCode = main()
} catch (err) {
  process.stderr.write(`UXLog CLI: ${err?.message ?? err}\n`)
  process.exitCode = 1
}

export { META_DIR }
