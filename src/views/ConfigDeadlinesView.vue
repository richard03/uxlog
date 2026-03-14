<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <h1>{{ t.config.deadlinesTitle }}</h1>
      <p class="page-hint">{{ t.config.deadlinesHint }}</p>
    </header>

    <section class="config-section" aria-labelledby="project-duration-heading">
      <h2 id="project-duration-heading">{{ t.project.label }}</h2>
      <div class="duration-grid">
        <div class="form-group">
          <label for="dur-small">{{ t.config.projectDurationSmall }}</label>
          <input
            id="dur-small"
            type="number"
            class="form-control"
            min="1"
            :value="durations.small"
            @change="updateDuration('small', $event)"
            @blur="updateDuration('small', $event)"
          />
          <p class="field-hint">{{ t.config.durationPreview(durations.small) }}</p>
        </div>
        <div class="form-group">
          <label for="dur-medium">{{ t.config.projectDurationMedium }}</label>
          <input
            id="dur-medium"
            type="number"
            class="form-control"
            min="1"
            :value="durations.medium"
            @change="updateDuration('medium', $event)"
            @blur="updateDuration('medium', $event)"
          />
          <p class="field-hint">{{ t.config.durationPreview(durations.medium) }}</p>
        </div>
        <div class="form-group">
          <label for="dur-large">{{ t.config.projectDurationLarge }}</label>
          <input
            id="dur-large"
            type="number"
            class="form-control"
            min="1"
            :value="durations.large"
            @change="updateDuration('large', $event)"
            @blur="updateDuration('large', $event)"
          />
          <p class="field-hint">{{ t.config.durationPreview(durations.large) }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import Breadcrumb from '../components/Breadcrumb.vue'

const config = useConfig()
const { t } = useI18n()

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.deadlines },
])

const durations = computed(() => config.getProjectDurationDays())

function updateDuration(scope, event) {
  const val = parseInt(event.target.value, 10)
  if (val > 0) {
    config.updateProjectDurationDays(scope, val)
  }
}
</script>

<style scoped>
.page-header h1 { margin: 0 0 var(--space-xs); font-size: 1.75rem; font-weight: 700; }
.page-hint { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.config-section h2 { margin: 0 0 var(--space-md); font-size: 1rem; font-weight: 600; }
.duration-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-md); }
.form-group { margin: 0; }
.form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: var(--space-xs); }
.field-hint { margin: var(--space-xs) 0 0; font-size: 0.8rem; color: var(--text-muted); }
</style>
