<template>
  <div class="column-heading">
    <div class="column-heading-row">
      <h2 :id="id || undefined" class="column-heading-title">
        <slot>{{ title }}</slot>
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
 */
defineProps({
  title: { type: String, default: '' },
  id: { type: String, default: '' },
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

.column-heading-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-xs);
}
</style>
