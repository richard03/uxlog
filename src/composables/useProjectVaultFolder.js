/**
 * Composable pro nastavení složky dat jednoho projektu (dialog z detailu projektu):
 * výchozí složka, vlastní složka (projekt přímo v kořeni složky) nebo nezapisovat.
 * Nastavení platí jen na tomto počítači (uložené v nastavení Složky dat, ne v projektu).
 */

import { computed, reactive, ref } from 'vue'
import {
  vaultSettings, vaultStatus, setProjectVaultFolder, getDefaultVaultRoot,
} from '../lib/plugins/vault/index.js'
import { pickDirectory, vaultOpenRoot } from '../lib/tauriBridge.js'
import { checkProjectRoot, defaultProjectFolderPath } from '../lib/vault/targets.js'
import { getData } from '../lib/stores/state.js'
import { useI18n } from './useI18n.js'

/** Režimy složky projektu. */
export const PROJECT_FOLDER_MODE = Object.freeze({ DEFAULT: 'default', CUSTOM: 'custom', OFF: 'off' })

/**
 * @param {() => string} getProjectId
 */
export function useProjectVaultFolder(getProjectId) {
  const { t } = useI18n()

  /** Nastavení lze měnit jen v desktopové aplikaci se zapnutou Složkou dat. */
  const available = computed(() => vaultStatus.available && vaultSettings.enabled && Boolean(vaultSettings.root))
  const defaultRoot = computed(() => vaultSettings.root)
  /** Složka projektu ve výchozí složce dat (…\\projects\\<Název projektu>). */
  const defaultProjectPath = computed(() => defaultProjectFolderPath(vaultSettings, getData(), getProjectId()))

  /** Současné nastavení projektu: { mode, root }. */
  const current = computed(() => {
    const setting = vaultSettings.projects?.[getProjectId()]
    if (setting?.off) return { mode: PROJECT_FOLDER_MODE.OFF, root: '' }
    if (setting?.root) return { mode: PROJECT_FOLDER_MODE.CUSTOM, root: setting.root }
    return { mode: PROJECT_FOLDER_MODE.DEFAULT, root: '' }
  })

  /** Problém zjištěný při zápisu (např. složka obsahuje jiný projekt). */
  const issue = computed(() => {
    const found = vaultStatus.folderIssues.find((i) => i.projectId === getProjectId())
    return found ? t.vault.folderIssue[found.code] ?? found.code : ''
  })

  /** Rozpracovaná volba v dialogu. */
  const draft = reactive({ mode: PROJECT_FOLDER_MODE.DEFAULT, root: '', error: '' })

  function resetDraft() {
    Object.assign(draft, { ...current.value, error: '' })
  }

  /** Složky ostatních projektů (pro kontrolu kolize). */
  function otherRoots() {
    return Object.entries(vaultSettings.projects ?? {})
      .filter(([id, s]) => id !== getProjectId() && s?.root)
      .map(([, s]) => s.root)
  }

  /** Vybere vlastní složku systémovým dialogem. */
  async function chooseFolder() {
    const selected = await pickDirectory(draft.root || (await getDefaultVaultRoot()))
    if (selected) {
      draft.root = selected
      draft.mode = PROJECT_FOLDER_MODE.CUSTOM
      draft.error = ''
    }
  }

  /**
   * Uloží volbu. Neplatná vlastní složka se neuloží.
   * @returns {boolean} true = uloženo
   */
  function save() {
    draft.error = ''
    if (draft.mode === PROJECT_FOLDER_MODE.CUSTOM) {
      if (!draft.root) {
        draft.error = t.vault.projectFolderNotChosen
        return false
      }
      const code = checkProjectRoot(draft.root, vaultSettings.root, otherRoots())
      if (code) {
        draft.error = t.vault.folderIssue[code] ?? code
        return false
      }
      setProjectVaultFolder(getProjectId(), { root: draft.root })
    } else if (draft.mode === PROJECT_FOLDER_MODE.OFF) {
      setProjectVaultFolder(getProjectId(), { off: true })
    } else {
      setProjectVaultFolder(getProjectId(), null)
    }
    return true
  }

  /** Složka, kam se projekt právě zapisuje ('' = nezapisuje se). */
  const currentPath = computed(() => {
    if (current.value.mode === PROJECT_FOLDER_MODE.OFF) return ''
    return current.value.mode === PROJECT_FOLDER_MODE.CUSTOM ? current.value.root : defaultProjectPath.value
  })

  /** Chyba při otevírání složky. */
  const openError = ref('')

  /** Otevře složku projektu ve správci souborů (neexistující složku vytvoří). */
  async function openFolder() {
    openError.value = ''
    if (!currentPath.value) return
    try {
      await vaultOpenRoot(currentPath.value)
    } catch (err) {
      openError.value = String(err?.message ?? err)
    }
  }

  /** Popis současného nastavení (do přehledu). */
  const summary = computed(() => {
    if (current.value.mode === PROJECT_FOLDER_MODE.OFF) return t.vault.projectFolderOffLabel
    if (current.value.mode === PROJECT_FOLDER_MODE.CUSTOM) return current.value.root
    return t.vault.projectFolderDefaultLabel(defaultProjectPath.value)
  })

  return {
    available, defaultRoot, defaultProjectPath, current, currentPath, issue, draft, summary, openError,
    resetDraft, chooseFolder, save, openFolder,
  }
}
