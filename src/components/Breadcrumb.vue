<template>
  <nav :aria-label="t.nav.breadcrumb" class="breadcrumb">
    <ol>
      <li v-for="(crumb, i) in items" :key="i">
        <router-link v-if="crumb.to" :to="crumb.to">{{ crumb.label }}</router-link>
        <button
          v-else-if="crumb.onClick"
          type="button"
          class="breadcrumb-edit"
          aria-current="page"
          :aria-label="crumb.ariaLabel || crumb.label"
          @click="crumb.onClick"
        >
          <span>{{ crumb.label }}</span>
          <svg class="pencil" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <span v-else aria-current="page">{{ crumb.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { useI18n } from '../composables/useI18n.js'

const { t } = useI18n()

/**
 * Položka: { label, to? } – odkaz; { label, onClick, ariaLabel? } – klikatelná (např. přejmenování); jinak aktuální stránka.
 */
defineProps({
  items: {
    type: Array,
    required: true,
  },
})
</script>

<style scoped>
.breadcrumb {
  margin-bottom: var(--space-md);
}

.breadcrumb ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.85rem;
}

.breadcrumb li + li::before {
  content: '/';
  margin: 0 0.4em;
  color: var(--text-muted);
}

.breadcrumb a {
  color: var(--text-muted);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--text);
  text-decoration: underline;
}

.breadcrumb [aria-current="page"] {
  color: var(--text);
  font-weight: 500;
}

.breadcrumb-edit {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  background: none;
  border: none;
  font: inherit;
  cursor: pointer;
}

.breadcrumb-edit .pencil {
  opacity: 0;
  color: var(--text-muted);
  transition: opacity 0.15s;
}

.breadcrumb-edit:hover .pencil,
.breadcrumb-edit:focus-visible .pencil {
  opacity: 1;
}
</style>
