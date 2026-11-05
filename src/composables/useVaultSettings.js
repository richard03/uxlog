/**
 * Composable pro Složku dat (vault) – zápis dat aplikace do složky souborů pro Claude Code,
 * načtení změn ze složky zpět do aplikace (automaticky nebo s náhledem) a řešení konfliktů.
 * Používá VaultSettingsSection (obrazovka Konektory), VaultImportModal, ConfigView a App (upozornění).
 */

import { computed, reactive, ref, watch } from 'vue'
import {
  vaultSettings, vaultStatus, updateVaultSettings, exportVaultNow, getDefaultVaultRoot,
  collectVaultChanges, acceptVaultPaths,
} from '../lib/plugins/vault/index.js'
import { applyVaultChanges } from '../lib/stores/vaultImport.js'
import { getData } from '../lib/stores/state.js'
import { pickDirectory, vaultOpenRoot } from '../lib/tauriBridge.js'
import { collectionInfo, PROJECTS_DIR } from '../lib/vault/paths.js'
import { createHeadingResolver } from '../lib/vault/format.js'
import { formatIssue } from '../lib/vault/validate.js'
import { showToast } from './useToast.js'
import { useI18n } from './useI18n.js'

/** Stav náhledu změn (sdílený mezi obrazovkou a dialogem); mode 'review' = změny, 'conflicts' = konflikty. */
const review = reactive({ open: false, mode: 'review', loading: false, changes: [], invalid: [], error: '' })

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

/** Připraví změny pro dialog: u konfliktů prázdná volba verze pro každé pole. */
function withResolution(changes) {
  return (changes ?? []).map((c) => ({ ...clone(c), resolution: {} }))
}

export function useVaultSettings() {
  const { t } = useI18n()
  const actionError = ref('')
  const headingFor = createHeadingResolver(t)

  /** Vault funguje jen v desktopové aplikaci. */
  const available = computed(() => vaultStatus.available)
  const settings = computed(() => vaultSettings)
  const status = computed(() => vaultStatus)
  const conflictCount = computed(() => vaultStatus.conflicts.length)
  /** Změny v datech projektů (lze je načíst do aplikace). */
  const dataChangeCount = computed(() => vaultStatus.conflicts.filter((c) => c.path.startsWith(`${PROJECTS_DIR}/`)).length)
  /** Konflikty čekající na rozhodnutí. */
  const pendingConflictCount = computed(() => vaultStatus.pendingConflicts.length)

  async function run(action) {
    actionError.value = ''
    try {
      return await action()
    } catch (err) {
      actionError.value = String(err?.message ?? err)
      return undefined
    }
  }

  /** Zapne/vypne zápis; při zapnutí bez zvolené složky použije výchozí. */
  async function setEnabled(enabled) {
    await run(async () => {
      let root = vaultSettings.root
      if (enabled && !root) root = await getDefaultVaultRoot()
      updateVaultSettings({ enabled, root })
    })
  }

  /** Vybere složku systémovým dialogem. */
  async function chooseFolder() {
    await run(async () => {
      const selected = await pickDirectory(vaultSettings.root || (await getDefaultVaultRoot()))
      if (selected) updateVaultSettings({ root: selected })
    })
  }

  /** Nastaví výchozí složku (Dokumenty/UXLog/Data). */
  async function useDefaultFolder() {
    await run(async () => updateVaultSettings({ root: await getDefaultVaultRoot() }))
  }

  /**
   * Přepíše soubory změněné mimo aplikaci verzí z aplikace (změny v nich se ztratí).
   * @param {Array<{ root: string, path: string }>} items
   */
  async function overwriteConflicts(items) {
    await run(async () => {
      await exportVaultNow({ force: items.map(({ root, path }) => ({ root, path })) })
      if (!vaultStatus.lastError) showToast(t.vault.overwriteDone(items.length))
    })
  }

  /**
   * Popisek souboru pro seznamy: cesta na disku, u vlastní složky projektu s názvem složky.
   * @param {{ root?: string, layout?: string, path: string, displayPath?: string }} item
   * @returns {string}
   */
  function fileLabel(item) {
    const shown = item.displayPath ?? item.path
    if (item.layout !== 'project') return shown
    const folder = String(item.root ?? '').replace(/[\\/]+$/, '').split(/[\\/]/).pop()
    return folder ? `${folder}/${shown}` : shown
  }

  /** Projekty s vlastní složkou nebo vyřazené ze zápisu (pro přehled v Konektorech). */
  const projectFolders = computed(() => {
    const projects = getData().projects ?? []
    return Object.entries(vaultSettings.projects ?? {})
      .map(([id, setting]) => {
        const project = projects.find((p) => p?.id === id)
        if (!project) return null
        const issue = vaultStatus.folderIssues.find((i) => i.projectId === id)
        return {
          id,
          name: project.name || id,
          folder: setting.off ? t.vault.projectFolderOffLabel : setting.root,
          issue: issue ? t.vault.folderIssue[issue.code] ?? issue.code : '',
        }
      })
      .filter(Boolean)
  })

  /** Otevře složku ve správci souborů. */
  async function openFolder() {
    await run(() => vaultOpenRoot(vaultSettings.root))
  }

  /** Otevře náhled změn ze složky; soubory jen přeformátované rovnou přijme. */
  async function openReview() {
    Object.assign(review, { open: true, mode: 'review', loading: true, changes: [], invalid: [], error: '' })
    try {
      const result = await collectVaultChanges()
      review.changes = withResolution(result.changes)
      review.invalid = result.invalid
      if (result.unchanged.length) {
        await acceptVaultPaths(result.unchanged)
        showToast(t.vault.importUnchanged(result.unchanged.length))
      }
    } catch (err) {
      review.error = String(err?.message ?? err)
    } finally {
      review.loading = false
    }
  }

  /** Otevře řešení konfliktů z automatického načítání. */
  function openConflicts() {
    Object.assign(review, {
      open: true, mode: 'conflicts', loading: false, invalid: [], error: '',
      changes: withResolution(vaultStatus.pendingConflicts),
    })
  }

  /**
   * Zvolí verzi konfliktního pole.
   * @param {Object} change
   * @param {string} field
   * @param {'app'|'file'} choice
   */
  function chooseVersion(change, field, choice) {
    change.resolution = { ...change.resolution, [field]: choice }
  }

  /** Má změna rozhodnuté všechny konflikty? */
  function isResolved(change) {
    return (change.conflicts ?? []).every((c) => change.resolution?.[c.field])
  }

  function closeReview() {
    review.open = false
    review.changes = []
    review.invalid = []
  }

  /**
   * Načte vybrané změny do aplikace a soubory přijme.
   * @param {Array<Object>} changes
   */
  async function confirmChanges(changes) {
    const selected = changes.filter((c) => c.kind !== 'unsupported')
    if (!selected.length) return
    if (!selected.every(isResolved)) {
      review.error = t.vault.resolveChooseAll
      return
    }
    review.error = ''
    // Konflikty: pole „ze souboru“ přidat do patche, „z aplikace“ ponechat (soubor se pak přepíše)
    const list = selected.map((c) => {
      if (!c.conflicts?.length) return c
      const patch = { ...(c.patch ?? {}) }
      for (const conflict of c.conflicts) if (c.resolution[conflict.field] === 'file') patch[conflict.field] = clone(conflict.file)
      return { ...c, patch, conflicts: [] }
    })
    try {
      const { applied } = applyVaultChanges(list)
      const done = new Set(applied.map((c) => c.id))
      review.changes = review.changes.filter((c) => !done.has(c.id))
      await acceptVaultPaths(applied.map((c) => ({ root: c.root, path: c.path })))
      showToast(review.mode === 'conflicts' ? t.vault.resolveDone(applied.length) : t.vault.importDone(applied.length))
    } catch (err) {
      review.error = String(err?.message ?? err)
    }
  }

  /** Přeskočí změnu (soubor zůstane změněný, do aplikace se nenačte). */
  function skipChange(change) {
    review.changes = review.changes.filter((c) => c.id !== change.id)
  }

  /** Typ záznamu pro náhled („Persona“, „Projekt“, „Souvislosti“). */
  function changeTypeLabel(change) {
    if (change.kind === 'connections') return t.vault.changeKind.connections
    if (change.collection === 'projects') return t.project.label
    const info = collectionInfo(change.collection)
    return t[info?.entityType]?.label ?? change.collection
  }

  /** Popisek pole záznamu (z i18n podle konfigurace entit, jinak klíč). */
  function fieldLabel(change, field) {
    const entityType = change.collection === 'projects' ? 'project' : collectionInfo(change.collection)?.entityType
    return entityType ? headingFor(entityType, field) : field
  }

  /** Hodnota pole pro náhled. */
  function formatValue(value) {
    if (value === undefined || value === null || value === '') return t.vault.emptyValue
    if (Array.isArray(value)) return value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ') : t.vault.emptyValue
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  /** Text problému souboru. */
  function issueText(issue) {
    return formatIssue(issue, t)
  }

  return {
    available, settings, status, conflictCount, dataChangeCount, pendingConflictCount, actionError, review,
    setEnabled, chooseFolder, useDefaultFolder, overwriteConflicts, openFolder,
    openReview, openConflicts, closeReview, confirmChanges, skipChange, chooseVersion, isResolved,
    changeTypeLabel, fieldLabel, formatValue, issueText, fileLabel, projectFolders,
  }
}

/**
 * Upozornění na automaticky načtené změny, nové konflikty a hromadnou změnu ve složce dat.
 * Volá se jednou v App.vue.
 */
export function useVaultNotifications() {
  const { t } = useI18n()
  watch(() => vaultStatus.lastImport, (value) => {
    if (value?.count) showToast(t.vault.autoImported(value.count, value.labels ?? []), 5000)
  })
  watch(() => vaultStatus.pendingConflicts.map((c) => c.id).join('|'), (now, before) => {
    const added = now.split('|').filter((id) => id && !String(before ?? '').split('|').includes(id))
    if (added.length) showToast(t.vault.newConflicts(vaultStatus.pendingConflicts.length), 6000)
  })
  watch(() => vaultStatus.lastRebuild, (value) => {
    if (value?.count) showToast(t.vault.rebuilt(value.count), 6000)
  })
  watch(() => vaultStatus.massChange, (value) => {
    if (value) showToast(t.vault.massChangeTitle, 6000)
  })
}
