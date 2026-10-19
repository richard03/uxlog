<template>
  <!-- Detail v okně nad plátnem: jen akce do lišty okna (bez drobkové navigace a odkazu na historii) -->
  <Teleport v-if="canvasWindow" :to="`#${canvasWindow.actionsTargetId}`" defer>
    <h1 class="visually-hidden">{{ title }}</h1>
    <div class="pph-actions">
      <slot name="actions" />
    </div>
  </Teleport>
  <!-- Hlavička obrazovky projektu – vykreslí se přes celou šířku nad Zápisníkem (cíl v ProjectLayout) -->
  <Teleport v-else :to="`#${PROJECT_HEADER_TARGET_ID}`" defer>
    <header class="page-header project-page-header">
      <h1 class="visually-hidden">{{ title }}</h1>
      <div class="pph-row">
        <div class="pph-crumbs">
          <ProjectColorTag :color="color" />
          <Breadcrumb :items="breadcrumbs" />
        </div>
        <div class="pph-actions">
          <!-- Historie změn projektu je dostupná z každé obrazovky projektu (před akcemi, menu „…“ zůstává poslední) -->
          <router-link
            v-if="projectId && route.name !== 'projectHistory'"
            class="btn btn-ghost"
            :to="{ name: 'projectHistory', params: { id: projectId } }"
          >{{ t.history.open }}</router-link>
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
import { useRoute } from 'vue-router'
import Breadcrumb from './Breadcrumb.vue'
import ProjectColorTag from './ProjectColorTag.vue'
import { useI18n } from '../composables/useI18n.js'
import { useEntityNavigation } from '../composables/useEntityNavigation.js'

const route = useRoute()
const { t } = useI18n()
const { canvasWindow } = useEntityNavigation()
const projectId = computed(() => route.params.id)

/**
 * Jednotná hlavička obrazovek projektu: barva projektu + drobková navigace a akce vpravo (slot #actions).
 * Velký nadpis nahrazuje drobková navigace;
 * h1 zůstává jen pro čtečky obrazovky.
 * @prop {Array} breadcrumbs - položky drobkové navigace
 * @prop {string} color - barva projektu
 * @prop {string} title - text skrytého h1 (název obrazovky / entity)
 * Vpravo před akcemi je vždy odkaz na historii změn projektu.
 * V okně detailu nad plátnem (CanvasEntityWindow) vykreslí jen akce do lišty okna.
 * Přejmenování entity je v nadpisu sloupce (ColumnHeading, prop onEdit), ne v drobkové navigaci.
 */
defineProps({
  breadcrumbs: { type: Array, required: true },
  color: { type: String, default: '' },
  title: { type: String, default: '' },
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
