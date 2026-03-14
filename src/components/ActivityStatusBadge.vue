<template>
  <span
    class="activity-status-badge"
    :class="`status-${status}`"
    :aria-label="label"
  >
    <span class="status-dot" aria-hidden="true"></span>
    <span class="status-label">{{ label }}</span>
  </span>
</template>

<script setup>
/**
 * Badge zobrazující stav aktivity (čeká, rozpracováno, dokončeno) s barevnou tečkou uvnitř.
 * @param {string} status - stav: pending, in_progress, done
 * @param {string} label - přeložený text stavu
 */
defineProps({
  status: { type: String, required: true },
  label: { type: String, required: true },
})
</script>

<style scoped>
.activity-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-label {
  line-height: 1;
}

/* pending */
.activity-status-badge.status-pending {
  background: var(--bg-muted);
  color: var(--text-muted);
}
.activity-status-badge.status-pending .status-dot {
  background: var(--text-muted);
}

/* in_progress */
.activity-status-badge.status-in_progress {
  background: color-mix(in srgb, #f59e0b 18%, transparent);
  color: #92400e;
}
.activity-status-badge.status-in_progress .status-dot {
  background: #b45309;
}

/* done */
.activity-status-badge.status-done {
  background: color-mix(in srgb, #4caf50 18%, transparent);
  color: #065f46;
}
.activity-status-badge.status-done .status-dot {
  background: #059669;
}

@media (prefers-color-scheme: dark) {
  .activity-status-badge.status-in_progress { color: #fcd34d; }
  .activity-status-badge.status-in_progress .status-dot { background: #f59e0b; }
  .activity-status-badge.status-done { color: #6ee7b7; }
  .activity-status-badge.status-done .status-dot { background: #34d399; }
}
</style>
