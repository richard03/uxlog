<template>
  <div
    v-if="$slots.default"
    class="status-banner"
    :class="[`status-banner-${variant}`]"
    role="status"
  >
    <slot />
  </div>
</template>

<script setup>
/**
 * StatusBanner – zobrazuje stavovou zprávu s barevným odlišením podle varianty.
 * Používá se pro upozornění na prioritu, stav nebo jiné důležité informace.
 * @prop {string} variant - vizuální varianta: 'critical' | 'high' | 'medium' | 'low' | 'info'
 */
defineProps({
  variant: {
    type: String,
    required: true,
    validator: (v) => ['critical', 'high', 'medium', 'low', 'info'].includes(v),
  },
})
</script>

<script>
export default {
  name: 'StatusBanner',
}
</script>

<style scoped>
.status-banner {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
  font-size: 0.9rem;
}

.status-banner-critical {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.status-banner-high {
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fed7aa;
}

.status-banner-medium {
  background: #fefce8;
  color: #854d0e;
  border: 1px solid #fef08a;
}

.status-banner-low {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.status-banner-info {
  background: var(--bg-muted);
  color: var(--text);
  border: 1px solid var(--border);
}

[data-theme="dark"] .status-banner-critical {
  background: #450a0a;
  color: #fecaca;
  border-color: #991b1b;
}

[data-theme="dark"] .status-banner-high {
  background: #431407;
  color: #fed7aa;
  border-color: #9a3412;
}

[data-theme="dark"] .status-banner-medium {
  background: #422006;
  color: #fef08a;
  border-color: #854d0e;
}

[data-theme="dark"] .status-banner-low {
  background: #052e16;
  color: #bbf7d0;
  border-color: #166534;
}
</style>
