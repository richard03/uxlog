<template>
  <div class="pr-row" :class="{ 'pr-row-open': expanded }" role="listitem">
    <div class="pr-row-head">
      <button
        type="button"
        class="pr-row-toggle"
        :aria-expanded="expanded"
        @click="$emit('toggle')"
      >
        <span class="pr-chevron" aria-hidden="true">{{ expanded ? '▼' : '▶' }}</span>
        <div class="pr-row-summary">
          <slot name="summary" />
        </div>
      </button>
      <div class="pr-row-actions" @click.stop>
        <slot name="actions">
          <AppButton variant="primary" size="sm" @click="$emit('confirm')">
            {{ confirmLabel }}
          </AppButton>
          <AppButton variant="tertiary" size="sm" @click="$emit('skip')">
            {{ skipLabel }}
          </AppButton>
        </slot>
      </div>
    </div>
    <div v-show="expanded" class="pr-row-body">
      <slot name="body" />
    </div>
  </div>
</template>

<script setup>
import AppButton from './AppButton.vue'

/**
 * Jeden sbalitelný řádek: shrnutí, primární / sekundární akce vždy viditelné, tělo po rozbalení.
 */
defineProps({
  /** Zda je řádek rozbalený. */
  expanded: { type: Boolean, default: false },
  /** Text primárního tlačítka (slot #actions ho ignoruje). */
  confirmLabel: { type: String, default: '' },
  /** Text sekundárního tlačítka. */
  skipLabel: { type: String, default: '' },
})

defineEmits(['toggle', 'confirm', 'skip'])
</script>
