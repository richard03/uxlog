/**
 * Zápis z meetingu u aktivity: text ze souboru (přepis), napsaný nebo nadiktovaný.
 * Uložení vytvoří zdroj typu „Zápis z meetingu“ propojený s aktivitou (je vidět v Souvislostech)
 * a hned ho pošle ke zpracování AI – stejná revize návrhů jako u zdrojů (`processSource`).
 */

import { ref, computed, toValue } from 'vue'
import { useStore } from './useStore.js'
import { useI18n } from './useI18n.js'
import { useAddSource } from './useAddSource.js'
import { useNotebookChat } from './useNotebookChat.js'
import { useEntityHelpers } from './useEntityHelpers.js'
import { normalizeSourceText } from '../lib/sourceFiles.js'
import { formatCalendarDate } from '../utils/formatDate.js'

/**
 * @param {import('vue').MaybeRefOrGetter<string>} projectIdRef
 * @param {import('vue').MaybeRefOrGetter<string>} activityIdRef
 */
export function useMeetingNotes(projectIdRef, activityIdRef) {
  const store = useStore()
  const { t } = useI18n()
  const { generateNextCode, getCodePrefix } = useEntityHelpers()
  const projectId = computed(() => toValue(projectIdRef))
  const activityId = computed(() => toValue(activityIdRef))

  const { draft, reset, readFile, accept } = useAddSource(() => projectId.value)
  const {
    aiAvailable, processSource, sourceStatus, currentReview, applyAction, finishReview, reviewHelpers,
  } = useNotebookChat(projectId)

  /** Naposledy uložený zápis (stav jeho zpracování se ukazuje pod polem). */
  const lastSourceId = ref(null)
  const lastSource = computed(() => (lastSourceId.value ? store.getSource(lastSourceId.value) : null))
  const status = computed(() => (lastSourceId.value ? sourceStatus(lastSourceId.value) : null))

  /** Revize návrhů k zápisu této aktivity (otevře se dialog). */
  const review = computed(() => {
    const r = currentReview.value
    return r?.origin?.kind === 'source' && r.origin.id === lastSourceId.value ? r : null
  })

  const canSave = computed(() => !draft.reading && !!normalizeSourceText(draft.content))

  /** Název zápisu: z názvu souboru, jinak „Zápis z meetingu – aktivita – datum“. */
  function defaultName() {
    const activity = store.getActivity(activityId.value)
    return t.activity.meeting.defaultName(activity?.name || t.activity.label, formatCalendarDate(new Date().toISOString().slice(0, 10)))
  }

  /** Uloží zápis, propojí ho s aktivitou a spustí zpracování. */
  function save() {
    const content = normalizeSourceText(draft.content)
    if (!content || draft.reading) {
      draft.error = t.sources.contentRequired
      return null
    }
    const pid = projectId.value
    const source = store.addSourceForEntity(pid, 'activities', activityId.value, {
      code: generateNextCode(getCodePrefix('source'), store.getSources(pid)),
      name: draft.name.trim() || defaultName(),
      kind: 'meeting',
      content,
      fileName: draft.fileName,
    })
    if (!source) return null
    lastSourceId.value = source.id
    reset()
    if (aiAvailable.value) processSource(source.id)
    return source
  }

  function clearFile() {
    draft.fileName = ''
    draft.name = ''
  }

  return {
    draft, accept, readFile, clearFile, canSave, save,
    aiAvailable, lastSource, status, review, applyAction, finishReview, reviewHelpers,
  }
}
