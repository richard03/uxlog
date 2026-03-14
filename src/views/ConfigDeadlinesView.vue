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
        <FormInput
          :label="t.config.projectDurationSmall"
          :hint="t.config.durationPreview(durations.small)"
          control-id="dur-small"
          type="number"
          min="1"
          :model-value="durations.small"
          @update:model-value="(v) => updateDurationVal('small', v)"
        />
        <FormInput
          :label="t.config.projectDurationMedium"
          :hint="t.config.durationPreview(durations.medium)"
          control-id="dur-medium"
          type="number"
          min="1"
          :model-value="durations.medium"
          @update:model-value="(v) => updateDurationVal('medium', v)"
        />
        <FormInput
          :label="t.config.projectDurationLarge"
          :hint="t.config.durationPreview(durations.large)"
          control-id="dur-large"
          type="number"
          min="1"
          :model-value="durations.large"
          @update:model-value="(v) => updateDurationVal('large', v)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import { FormInput } from '../components/form'

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

function updateDurationVal(scope, value) {
  const val = typeof value === 'string' ? parseInt(value, 10) : value
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
.duration-grid :deep(.form-group) { margin: 0; }
</style>
