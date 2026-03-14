<template>
  <section class="section-card" :aria-label="ariaLabel">
    <h2 v-if="title" class="section-card-title">{{ title }}</h2>
    <slot />
  </section>
</template>

<script setup>
/**
 * SectionCard – obal pro sekci s vyvýšeným pozadím a ohraničením.
 * Používá se pro informační bloky (např. popis typu aktivity).
 * @prop {string} title - volitelný nadpis (malý, uppercase, muted)
 * @prop {string} ariaLabel - aria-label pro přístupnost
 */
defineProps({
  title: { type: String, default: '' },
  ariaLabel: { type: String, default: undefined },
})
</script>

<script>
export default {
  name: 'SectionCard',
}
</script>

<style scoped>
.section-card {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.section-card-title {
  margin: 0 0 var(--space-xs);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:slotted(.section-card-desc) {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text);
}
</style>
