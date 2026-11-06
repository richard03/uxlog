<template>
  <div class="detail-placeholder" role="note">
    <p>{{ t.common.selectFromList }}</p>
  </div>
</template>

<script setup>
/** Pravý sloupec obrazovky seznam + detail, když není vybraná žádná položka. */
import { useI18n } from '../composables/useI18n.js'

const { t } = useI18n()
</script>

<style scoped>
.detail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 12rem;
  padding: var(--space-lg);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-align: center;
}

.detail-placeholder p {
  margin: 0;
}
</style>
