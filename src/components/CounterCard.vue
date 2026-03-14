<template>
  <router-link
    :to="to"
    class="counter-card"
    :class="[variant, { 'count-as-icon': countAsIcon }]"
    :aria-label="ariaLabel"
  >
    <span class="counter-card-label"><slot name="label">{{ label }}</slot></span>
    <span class="counter-card-count"><slot name="count">{{ count }}</slot></span>
  </router-link>
</template>

<script setup>
/**
 * Karta s názvem a počtem/ikonou pro navigaci v sekcích (např. projekty, konfigurace).
 * @param {Object} to - route objekt pro router-link
 * @param {string} label - popisek karty (lze přepsat slotem #label)
 * @param {number|string} count - číslo nebo text v badge (lze přepsat slotem #count)
 * @param {'section'|'config'} variant - section: kompaktní pro sekce projektu, config: větší pro konfiguraci
 * @param {boolean} countAsIcon - když true, count má větší velikost pro emoji/ikony
 * @param {string} ariaLabel - volitelný aria-label pro přístupnost
 */
defineProps({
  to: { type: Object, required: true },
  label: { type: String, default: '' },
  count: { type: [Number, String], default: '' },
  variant: { type: String, default: 'section', validator: (v) => ['section', 'config'].includes(v) },
  countAsIcon: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
})
</script>

<style scoped>
.counter-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  text-align: center;
  text-decoration: none;
  font-weight: 600;
  transition: border-color var(--transition), background var(--transition);
}

.counter-card:hover,
.counter-card.router-link-active {
  border-color: var(--accent);
  background: var(--accent-muted);
  color: var(--text);
  text-decoration: none;
}

/* section: kompaktní varianta pro sekce projektu */
.counter-card.section {
  padding: var(--space-md);
  font-weight: 400;
}

.counter-card.section .counter-card-count {
  font-size: 1.5rem;
}

/* config: větší varianta pro konfiguraci */
.counter-card.config {
  padding: var(--space-lg);
}

.counter-card.config .counter-card-count {
  font-size: 2rem;
}

.counter-card.config.count-as-icon .counter-card-count {
  font-size: 1.8rem;
}

.counter-card-label {
  display: block;
}

.counter-card-count {
  display: block;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
  margin-top: var(--space-xs);
}
</style>
