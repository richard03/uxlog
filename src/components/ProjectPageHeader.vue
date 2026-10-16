<template>
  <!-- Hlavička obrazovky projektu – vykreslí se přes celou šířku nad Zápisníkem (cíl v ProjectLayout) -->
  <Teleport :to="`#${PROJECT_HEADER_TARGET_ID}`" defer>
    <header class="page-header project-page-header">
      <h1 class="visually-hidden">{{ title }}</h1>
      <div class="pph-row">
        <div class="pph-crumbs">
          <ProjectColorTag :color="color" />
          <Breadcrumb :items="crumbs" />
        </div>
        <div v-if="$slots.actions" class="pph-actions">
          <slot name="actions" />
        </div>
      </div>
    </header>
  </Teleport>
</template>

<script>
/** Id elementu v ProjectLayout, do kterého se hlavička teleportuje. */
export const PROJECT_HEADER_TARGET_ID = 'project-header'
</script>

<script setup>
import { computed } from 'vue'
import Breadcrumb from './Breadcrumb.vue'
import ProjectColorTag from './ProjectColorTag.vue'

/**
 * Jednotná hlavička obrazovek projektu: barva projektu + drobková navigace a akce vpravo (slot #actions).
 * Velký nadpis nahrazuje drobková navigace;
 * h1 zůstává jen pro čtečky obrazovky.
 * @prop {Array} breadcrumbs - položky drobkové navigace
 * @prop {string} color - barva projektu
 * @prop {string} title - text skrytého h1 (název obrazovky / entity)
 * @prop {Function} onEditTitle - je-li zadán, poslední položka navigace je klikatelná (přejmenování)
 * @prop {string} editTitleLabel - aria-label pro přejmenování
 */
const props = defineProps({
  breadcrumbs: { type: Array, required: true },
  color: { type: String, default: '' },
  title: { type: String, default: '' },
  onEditTitle: { type: Function, default: null },
  editTitleLabel: { type: String, default: '' },
})

const crumbs = computed(() => {
  if (!props.onEditTitle || !props.breadcrumbs.length) return props.breadcrumbs
  const last = props.breadcrumbs[props.breadcrumbs.length - 1]
  return [
    ...props.breadcrumbs.slice(0, -1),
    { ...last, onClick: props.onEditTitle, ariaLabel: props.editTitleLabel || last.label },
  ]
})
</script>

<style scoped>
.project-page-header {
  gap: var(--space-sm);
}

.pph-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  min-height: 2.5rem;
}

.pph-crumbs {
  display: flex;
  align-items: center;
  min-width: 0;
}

.pph-crumbs :deep(.project-color-tag) {
  top: 0;
}

.pph-crumbs :deep(.breadcrumb) {
  margin: 0;
}

/* Stejná velikost jako text tlačítek (AppButton: 0.9375rem) */
.pph-crumbs :deep(.breadcrumb ol) {
  font-size: 0.9375rem;
}

.pph-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-xs);
}
</style>
