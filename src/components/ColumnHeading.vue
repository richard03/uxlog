<template>
  <div class="column-heading">
    <div class="column-heading-row">
      <h2 :id="id || undefined" class="column-heading-title">
        <button
          v-if="onEdit"
          type="button"
          class="column-heading-edit"
          :aria-label="editLabel || title"
          @click="onEdit"
        >
          <span><slot>{{ title }}</slot></span>
          <svg class="pencil" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <slot v-else>{{ title }}</slot>
      </h2>
      <div v-if="$slots.actions" class="column-heading-actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.sub" class="column-heading-sub">
      <slot name="sub" />
    </div>
  </div>
</template>

<script setup>
/**
 * Nadpis sloupce (např. „Zápisník“, „Persony“, „Persona Jana“) s volitelnými akcemi zarovnanými doprava
 * a volitelným řádkem pod nadpisem (slot #sub, např. kód entity).
 * Jednotná výška zarovná obsah sloupců vedle sebe.
 * @prop {string} title - text nadpisu (lze nahradit výchozím slotem)
 * @prop {string} id - id nadpisu (pro aria-labelledby)
 * @prop {Function} onEdit - je-li zadán, nadpis je klikatelný s ikonou tužky (přejmenování entity)
 * @prop {string} editLabel - aria-label tlačítka pro přejmenování
 */
defineProps({
  title: { type: String, default: '' },
  id: { type: String, default: '' },
  onEdit: { type: Function, default: null },
  editLabel: { type: String, default: '' },
})
</script>

<style scoped>
.column-heading {
  margin-bottom: var(--space-md);
}

.column-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  min-height: 2rem;
}

.column-heading-sub {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.column-heading-title {
  margin: 0;
  min-width: 0;
  font-size: 1rem;
  font-weight: 600;
}

.column-heading-edit {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  max-width: 100%;
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.column-heading-edit .pencil {
  flex-shrink: 0;
  opacity: 0;
  color: var(--text-muted);
  transition: opacity 0.15s;
}

.column-heading-edit:hover .pencil,
.column-heading-edit:focus-visible .pencil {
  opacity: 1;
}

.column-heading-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-xs);
}
</style>
