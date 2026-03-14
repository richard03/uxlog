<template>
  <li
    class="entity-card"
    :class="{ 'drag-over': dnd?.isDragOver(entityId), dragging: dnd?.isDragging(entityId), 'accent-left': !!leftBorderColor }"
    :style="leftBorderColor ? { borderLeftColor: leftBorderColor, borderLeftWidth: '4px' } : {}"
    :draggable="!!dnd"
    @dragstart="dnd?.onDragStart($event, entityId)"
    @dragover.prevent="dnd?.onDragOver($event, entityId)"
    @drop="dnd?.onDrop($event, entityId)"
    @dragend="dnd?.onDragEnd()"
  >
    <router-link :to="to" class="ec-link" draggable="false">
      <slot />
    </router-link>
    <KebabMenu v-if="kebabItems?.length" :items="kebabItems" @action="$emit('action', $event)" />
  </li>
</template>

<script setup>
import KebabMenu from './KebabMenu.vue'

/**
 * Karta entity (projekt, aktivita, cíl, stakeholder atd.) s odkazem, volitelným drag&drop a kebab menu.
 * @param {string|Object} to - cílový route pro router-link
 * @param {string} entityId - ID entity pro DnD
 * @param {Object} dnd - objekt useDraggableList pro drag&drop
 * @param {Array} kebabItems - položky kebab menu
 * @param {string} leftBorderColor - volitelná barva levé hranice (např. barva projektu)
 */
defineProps({
  to: { type: [String, Object], required: true },
  entityId: { type: String, default: '' },
  dnd: { type: Object, default: null },
  kebabItems: { type: Array, default: null },
  leftBorderColor: { type: String, default: '' },
})
defineEmits(['action'])
</script>

<style scoped>
.entity-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  transition: border-color var(--transition);
}

.entity-card:hover { border-color: var(--accent); }

.drag-over { border-color: var(--accent) !important; background: var(--bg-elevated); }
.dragging  { opacity: 0.4; }

.entity-card[draggable="true"] { cursor: grab; }
.entity-card[draggable="true"]:active { cursor: grabbing; }

.ec-link {
  flex: 1;
  text-decoration: none;
  color: inherit;
  display: block;
}

.entity-card :deep(.card-header) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}

.entity-card :deep(.card-badges) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.entity-card :deep(.card-title) {
  margin: var(--space-xs) 0;
  font-size: 1rem;
}

.entity-card :deep(.card-desc) {
  margin: var(--space-xs) 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.entity-card :deep(.card-meta) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}
</style>
