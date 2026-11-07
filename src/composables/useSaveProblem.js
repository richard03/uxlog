/**
 * Stav ukládání do databáze pro UI: lišta při selhání zápisu (nouzová záloha v localStorage,
 * opakované pokusy – `tauriBridge.js`), ruční „Zkusit znovu“, uložení dat do souboru
 * a hlídání zavření okna, když změny nejsou uložené ani v záloze.
 */

import { ref } from 'vue'
import {
  isTauri, getSaveProblem, onSaveProblemChange, retryFailedWrites, takeRestoredKeys, takeQuarantineReport,
} from '../lib/tauriBridge.js'
import { getDataLoadError, onDataLoadErrorChange } from '../lib/storage.js'
import { exportData } from '../lib/stores/index.js'
import { downloadText } from '../utils/exportHelper.js'
import { showToast } from './useToast.js'
import { useI18n } from './useI18n.js'

/** Sdílený stav (jedna lišta pro celou aplikaci). */
const problem = ref(getSaveProblem())
onSaveProblemChange((p) => { problem.value = p })
/** Data se nepodařilo načíst (ukládání je pozastavené). */
const loadError = ref(getDataLoadError())
onDataLoadErrorChange((e) => { loadError.value = e })
/** Záznamy odložené při startu kvůli poškození: [{ collection, id, reason, payload }]. */
const quarantined = ref([])
let quarantineLoaded = false

export function useSaveProblem() {
  const { t } = useI18n()
  const savingFile = ref(false)

  async function retry() {
    if (await retryFailedWrites()) showToast(t.saveProblem.saved)
  }

  /** Uloží všechna data jako YAML do Dokumenty/UXLog (jde načíst přes Import). */
  async function saveToFile() {
    if (savingFile.value) return
    savingFile.value = true
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
      await downloadText(exportData(), `uxlog-zaloha-${stamp}`, { extension: 'yaml', mimeType: 'text/yaml' })
      showToast(t.saveProblem.fileSaved, 5000)
    } catch (err) {
      console.error('[UXLog] uložení zálohy do souboru selhalo:', err)
      showToast(t.saveProblem.fileFailed, 6000)
    } finally {
      savingFile.value = false
    }
  }

  /** Oznámí, že se při startu obnovily neuložené změny z minula (volá se jednou po startu). */
  function announceRestored() {
    if (takeRestoredKeys().length) showToast(t.saveProblem.restored, 6000)
  }

  /** Vyzvedne záznamy odložené při startu kvůli poškození (jednou za běh aplikace). */
  async function loadQuarantine() {
    if (quarantineLoaded) return
    quarantineLoaded = true
    try {
      quarantined.value = await takeQuarantineReport()
    } catch (err) {
      console.error('[UXLog] seznam odložených záznamů nejde načíst:', err)
    }
  }

  /** Uloží původní obsah odložených záznamů do souboru (Dokumenty/UXLog) k ruční opravě. */
  async function saveQuarantineToFile() {
    if (savingFile.value || !quarantined.value.length) return
    savingFile.value = true
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
      await downloadText(JSON.stringify(quarantined.value, null, 2), 'uxlog-poskozene-zaznamy-' + stamp, { extension: 'json', mimeType: 'application/json' })
      showToast(t.saveProblem.quarantineSaved, 5000)
    } catch (err) {
      console.error('[UXLog] uložení odložených záznamů selhalo:', err)
      showToast(t.saveProblem.fileFailed, 6000)
    } finally {
      savingFile.value = false
    }
  }

  function dismissQuarantine() {
    quarantined.value = []
  }

  /**
   * Hlídá zavření okna: změny bez zálohy → zavolá `onBlocked` místo zavření.
   * @param {() => void} onBlocked
   * @returns {Promise<() => void>} zrušení hlídání
   */
  async function guardWindowClose(onBlocked) {
    if (!isTauri) return () => {}
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    return getCurrentWindow().onCloseRequested((event) => {
      if (problem.value && !problem.value.backedUp) {
        event.preventDefault()
        onBlocked()
      }
    })
  }

  /** Zavře okno i s neuloženými změnami (po potvrzení). */
  async function closeAnyway() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().destroy()
  }

  return {
    problem, loadError, quarantined, savingFile,
    retry, saveToFile, announceRestored, guardWindowClose, closeAnyway,
    loadQuarantine, saveQuarantineToFile, dismissQuarantine,
  }
}
