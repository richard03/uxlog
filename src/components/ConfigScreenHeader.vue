<template>
  <template v-if="isProject">
    <ProjectPageHeader :breadcrumbs="breadcrumbs" :color="project?.color" :title="title" />
    <ColumnHeading :title="title">
      <template #actions><slot name="actions" /></template>
    </ColumnHeading>
    <p v-if="hint" class="page-hint">{{ hint }}</p>
  </template>
  <header v-else class="page-header">
    <Breadcrumb :items="breadcrumbs" />
    <div class="header-row">
      <h1>{{ title }}</h1>
      <div class="header-actions"><slot name="actions" /></div>
    </div>
    <p v-if="hint" class="page-hint">{{ hint }}</p>
  </header>
</template>

<script setup>
/**
 * Hlavička obrazovky konfigurace pro oba rozsahy: výchozí konfigurace (vlastní hlavička stránky)
 * a konfigurace projektu (ProjectPageHeader + ColumnHeading podle pravidel obrazovek projektu).
 */
import { useConfigScope } from '../composables/useConfigScope.js'
import Breadcrumb from './Breadcrumb.vue'
import ProjectPageHeader from './ProjectPageHeader.vue'
import ColumnHeading from './ColumnHeading.vue'

defineProps({
  title: { type: String, default: '' },
  hint: { type: String, default: '' },
  breadcrumbs: { type: Array, required: true },
})

const { isProject, project } = useConfigScope()
</script>

<style scoped>
.page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
.header-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); flex-wrap: wrap; }
.header-actions { display: flex; gap: var(--space-sm); align-items: center; }
.header-actions:empty { display: none; }
.page-hint { margin: var(--space-xs) 0 var(--space-md); color: var(--text-muted); font-size: 0.9rem; max-width: 70ch; }
</style>
