<template>
  <component
    :is="tag"
    :class="sectionClass"
    :aria-labelledby="variant === 'config' && labelledBy ? labelledBy : undefined"
    :aria-label="variant === 'detail' && ariaLabel ? ariaLabel : undefined"
  >
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Container – obal stránky nebo sekce s variantami.
 * @prop {string} variant - 'page' | 'config' | 'detail'
 *   - page: centrovný obal stránky (max-width, padding)
 *   - config: sekce v konfiguračních stránkách (elevated bg, border)
 *   - detail: sekce v detailních pohledech (margin-top)
 * @prop {string} labelledBy - pro variant="config", ID nadpisu (aria-labelledby)
 * @prop {string} ariaLabel - pro variant="detail", popisek pro přístupnost
 */
const props = defineProps({
  variant: {
    type: String,
    default: 'page',
    validator: (v) => ['page', 'config', 'detail'].includes(v),
  },
  labelledBy: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
})

const tag = computed(() => (props.variant === 'page' ? 'div' : 'section'))

const sectionClass = computed(() => `container container--${props.variant}`)
</script>

<script>
export default {
  name: 'Container',
}
</script>

<style scoped>
.container--page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-md);
}

.container--config {
  margin-bottom: var(--space-xl);
  padding: var(--space-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.container--detail {
  margin-top: var(--space-lg);
}

@media (max-width: 480px) {
  .container--page {
    padding: var(--space-sm);
  }
}
</style>
