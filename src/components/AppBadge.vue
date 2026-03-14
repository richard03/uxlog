<template>
  <span class="badge" :class="[variant]"><slot /></span>
</template>

<script setup>
defineProps({
  variant: { type: String, default: '' },
})
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
  background: var(--bg-muted);
  color: var(--text-muted);
}

/* Accent / semantic variants */
.badge-accent { background: var(--accent-muted); color: var(--accent); }
.badge-warning { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); font-weight: 600; }
.badge-danger  { background: color-mix(in srgb, var(--error)   15%, transparent); color: var(--error);   font-weight: 600; }
.badge-info    { background: color-mix(in srgb, var(--accent)  12%, transparent); color: var(--accent); }

/* Completeness */
.completeness      { font-variant-numeric: tabular-nums; background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }
.completeness-done { font-variant-numeric: tabular-nums; background: var(--bg-elevated); color: var(--success);    border: 1px solid var(--success); }

/* Activity groups */
.group-project  { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.group-research { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
.group-design   { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }

@media (prefers-color-scheme: dark) {
  .group-project  { background: #0c4a6e; color: #bae6fd; border-color: transparent; }
  .group-research { background: #451a03; color: #fef08a; border-color: transparent; }
  .group-design   { background: #3b0764; color: #e9d5ff; border-color: transparent; }
}

/* Severity / priority (bugs) */
.severity-critical, .priority-critical { background: #fee2e2; color: #991b1b; }
.severity-high,     .priority-high     { background: #ffedd5; color: #9a3412; }
.severity-medium,   .priority-medium   { background: #fef3c7; color: #92400e; }
.severity-low,      .priority-low      { background: #ecfdf5; color: #065f46; }

/* Bug statuses */
.status-opraveno   { background: #d1fae5; color: #065f46; }
.status-neopravime { background: var(--bg-elevated); color: var(--text-muted); }
.status-zadano     { background: #fef3c7; color: #92400e; }

/* Task statuses */
.status-done       { background: #d1fae5; color: #065f46; }
.status-in_progress { background: #fef3c7; color: #92400e; }
.status-cancelled  { background: var(--bg-elevated); color: var(--text-muted); text-decoration: line-through; }

/* Stakeholder strategy – zbarvení podle významu (Mendelovova matice) */
.strategy-key_player    { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); font-weight: 600; }
.strategy-keep_satisfied { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); font-weight: 500; }
.strategy-keep_informed { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); font-weight: 400; }
.strategy-monitor       { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }
</style>
