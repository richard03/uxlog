<template>
  <!-- Úvod metodiky: Proč, Kdy, Jak dlouho, Koho potřebuji – hned pod názvem aktivity -->
  <dl v-if="part === 'intro' && hasIntro" class="ag-list ag-intro">
    <template v-for="key in TEXT_KEYS" :key="key">
      <div v-if="guide[key]" class="ag-item">
        <dt>{{ t.activity.guide[key] }}</dt>
        <dd>{{ guide[key] }}</dd>
      </div>
    </template>
  </dl>

  <!-- Postup a výstupy – sbalitelná sekce „Jak na to“ -->
  <details v-else-if="part === 'steps' && hasSteps" class="activity-guide">
    <summary class="ag-summary">{{ t.activity.guide.title }}</summary>
    <dl class="ag-list">
      <div v-if="guide.steps?.length" class="ag-item">
        <dt>{{ t.activity.guide.steps }}</dt>
        <dd>
          <ol class="ag-steps">
            <li v-for="(step, i) in guide.steps" :key="i">{{ step }}</li>
          </ol>
        </dd>
      </div>
      <div v-if="guide.outputs?.length" class="ag-item">
        <dt>{{ t.activity.guide.outputs }}</dt>
        <dd>
          <ul class="ag-outputs">
            <li v-for="(output, i) in guide.outputs" :key="i">{{ output }}</li>
          </ul>
        </dd>
      </div>
    </dl>
  </details>
</template>

<script setup>
/**
 * ActivityGuide – metodika k typu aktivity.
 * @prop {Object|null} guide - { why, when, duration, who, steps[], outputs[] }
 * @prop {'intro'|'steps'} part - 'intro' = Proč/Kdy/Jak dlouho/Koho potřebuji; 'steps' = sbalitelné „Jak na to“ (postup a výstupy)
 */
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  guide: { type: Object, default: null },
  part: { type: String, default: 'steps', validator: (v) => ['intro', 'steps'].includes(v) },
})

const { t } = useI18n()

const TEXT_KEYS = ['why', 'when', 'duration', 'who']

const hasIntro = computed(() => !!props.guide && TEXT_KEYS.some((k) => props.guide[k]))
const hasSteps = computed(() => !!props.guide?.steps?.length || !!props.guide?.outputs?.length)
</script>

<style scoped>
.ag-summary {
  cursor: pointer;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 500;
}

.ag-summary:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.ag-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: var(--space-sm) 0 0;
}

.ag-intro {
  margin: 0;
}

.ag-item dt {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.ag-item dd {
  margin: 2px 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.ag-steps,
.ag-outputs {
  margin: 0;
  padding-left: var(--space-lg);
}

.ag-steps li + li,
.ag-outputs li + li {
  margin-top: 2px;
}
</style>
