/**
 * Composable pro drag-and-drop řazení seznamů.
 * Používá nativní HTML5 Drag and Drop API – bez externích závislostí.
 *
 * @param {Function} getItems - Getter vracející aktuální pole položek (každá musí mít .id)
 * @param {Function} onReorder - Callback volaný po přeřazení; dostane pole id v novém pořadí
 */
import { ref } from 'vue'

export function useDraggableList(getItems, onReorder) {
  const draggingId = ref(null)
  const dragOverId = ref(null)

  function onDragStart(event, id) {
    draggingId.value = id
    event.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(event, id) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverId.value !== id) dragOverId.value = id
  }

  function onDrop(event, id) {
    event.preventDefault()
    if (!draggingId.value || draggingId.value === id) {
      dragOverId.value = null
      return
    }
    const items = getItems()
    const fromIdx = items.findIndex((i) => i.id === draggingId.value)
    const toIdx = items.findIndex((i) => i.id === id)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...items]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    onReorder(reordered.map((i) => i.id))
    draggingId.value = null
    dragOverId.value = null
  }

  function onDragEnd() {
    draggingId.value = null
    dragOverId.value = null
  }

  function isDragOver(id) {
    return dragOverId.value === id && draggingId.value !== id
  }

  function isDragging(id) {
    return draggingId.value === id
  }

  return { onDragStart, onDragOver, onDrop, onDragEnd, isDragOver, isDragging }
}
