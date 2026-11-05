<template>
  <Modal :title="review.mode === 'conflicts' ? t.vault.resolveTitle : t.vault.importTitle" size="large" @close="closeReview">
    <p v-if="review.loading" role="status">{{ t.vault.checking }}</p>
    <template v-else>
      <p v-if="review.error" class="vi-error" role="alert">{{ t.vault.error }}: {{ review.error }}</p>

      <section v-if="review.invalid.length" class="vi-invalid" :aria-label="t.vault.importInvalidTitle">
        <h3>{{ t.vault.importInvalidTitle }}</h3>
        <ul>
          <li v-for="item in review.invalid" :key="item.root + item.path">
            <code>{{ fileLabel(item) }}</code>
            <ul>
              <li v-for="(issue, i) in item.issues" :key="i">{{ issueText(issue) }}</li>
            </ul>
          </li>
        </ul>
      </section>

      <p v-if="!review.changes.length && !review.invalid.length" role="status">{{ t.vault.importEmpty }}</p>

      <PendingReviewLayout v-if="review.changes.length">
        <template #toolbar-left>
          <span class="vi-count">{{ review.mode === 'conflicts' ? t.vault.conflictsTitle(review.changes.length) : t.vault.changesTitle(review.changes.length) }}</span>
        </template>
        <template #toolbar-right>
          <AppButton variant="primary" size="sm" @click="confirmChanges(review.changes)">
            {{ review.mode === 'conflicts' ? t.vault.resolveAll : t.vault.importConfirmAll }}
          </AppButton>
        </template>

        <PendingReviewRow
          v-for="change in review.changes"
          :key="change.id"
          :expanded="!!expanded[change.id]"
          :confirm-label="change.conflicts?.length ? t.vault.resolve : t.vault.importConfirm"
          :skip-label="t.vault.importSkip"
          @toggle="expanded[change.id] = !expanded[change.id]"
          @confirm="confirmChanges([change])"
          @skip="skipChange(change)"
        >
          <template #summary>
            <span v-if="change.conflicts?.length" class="vi-kind vi-kind-conflict">{{ t.vault.conflictStatus(change.conflicts.length) }}</span>
            <span v-else class="vi-kind" :class="`vi-kind-${change.kind}`">{{ t.vault.changeKind[change.kind] }}</span>
            <span class="vi-type">{{ changeTypeLabel(change) }}</span>
            <strong v-if="change.label" class="vi-label">{{ change.label }}</strong>
            <code class="vi-path">{{ fileLabel(change) }}</code>
          </template>
          <template v-if="change.kind === 'unsupported'" #actions>
            <AppButton variant="tertiary" size="sm" @click="skipChange(change)">{{ t.vault.importSkip }}</AppButton>
          </template>
          <template #body>
            <p v-if="change.kind === 'unsupported'">{{ t.vault.unsupportedReason[change.reason] }}</p>
            <p v-else-if="change.kind === 'delete'">{{ t.vault.deleteSummary }}</p>
            <p v-else-if="change.kind === 'connections'">
              {{ t.vault.connectionsSummary(change.added.length, change.removed.length, change.updated.length) }}
            </p>
            <template v-else-if="change.kind === 'create'">
              <p>{{ t.vault.createSummary }}</p>
              <dl class="vi-fields">
                <template v-for="(value, key) in visibleRecordFields(change.record)" :key="key">
                  <dt>{{ fieldLabel(change, key) }}</dt>
                  <dd>{{ formatValue(value) }}</dd>
                </template>
              </dl>
            </template>
            <template v-if="change.conflicts?.length">
              <p class="vi-conflict-hint">{{ t.vault.conflictsHint }}</p>
              <table class="vi-diff vi-conflicts">
                <thead>
                  <tr>
                    <th scope="col"></th>
                    <th scope="col">{{ t.vault.conflictApp }}</th>
                    <th scope="col">{{ t.vault.conflictBase }}</th>
                    <th scope="col">{{ t.vault.conflictFile }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in change.conflicts" :key="c.field">
                    <th scope="row">{{ fieldLabel(change, c.field) }}</th>
                    <td :class="{ 'vi-chosen': change.resolution?.[c.field] === 'app' }">
                      <div class="vi-value">{{ formatValue(c.app) }}</div>
                      <AppButton
                        :variant="change.resolution?.[c.field] === 'app' ? 'primary' : 'secondary'"
                        size="sm"
                        :aria-pressed="change.resolution?.[c.field] === 'app'"
                        @click="chooseVersion(change, c.field, 'app')"
                      >{{ t.vault.keepApp }}</AppButton>
                    </td>
                    <td class="vi-base"><div class="vi-value">{{ formatValue(c.base) }}</div></td>
                    <td :class="{ 'vi-chosen': change.resolution?.[c.field] === 'file' }">
                      <div class="vi-value">{{ formatValue(c.file) }}</div>
                      <AppButton
                        :variant="change.resolution?.[c.field] === 'file' ? 'primary' : 'secondary'"
                        size="sm"
                        :aria-pressed="change.resolution?.[c.field] === 'file'"
                        @click="chooseVersion(change, c.field, 'file')"
                      >{{ t.vault.takeFile }}</AppButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <table v-if="change.kind === 'update' && change.fields?.length" class="vi-diff">
              <thead>
                <tr><th scope="col"></th><th scope="col">{{ t.vault.fieldBefore }}</th><th scope="col">{{ t.vault.fieldAfter }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="f in change.fields" :key="f.field">
                  <th scope="row">{{ fieldLabel(change, f.field) }}</th>
                  <td class="vi-before">{{ formatValue(f.before) }}</td>
                  <td class="vi-after">{{ formatValue(f.after) }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </PendingReviewRow>
      </PendingReviewLayout>

      <FormActions>
        <AppButton variant="secondary" @click="closeReview">{{ t.vault.importClose }}</AppButton>
      </FormActions>
    </template>
  </Modal>
</template>

<script setup>
/**
 * Náhled změn ze složky dat: každá změna (nový záznam, úprava polí, smazání, souvislosti)
 * se potvrdí nebo přeskočí; soubory s chybou se jen vypíšou.
 */
import { reactive } from 'vue'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import PendingReviewLayout from './PendingReviewLayout.vue'
import PendingReviewRow from './PendingReviewRow.vue'
import { FormActions } from './form'
import { useI18n } from '../composables/useI18n.js'
import { useVaultSettings } from '../composables/useVaultSettings.js'

const { t } = useI18n()
const {
  review, closeReview, confirmChanges, skipChange, chooseVersion, changeTypeLabel, fieldLabel, formatValue, issueText, fileLabel,
} = useVaultSettings()

/** Konflikty se rovnou rozbalí (bez rozhodnutí nejdou potvrdit). */
const expanded = reactive(Object.fromEntries(review.changes.filter((c) => c.conflicts?.length).map((c) => [c.id, true])))

/** Pole nového záznamu k zobrazení (bez technických a prázdných). */
function visibleRecordFields(record) {
  const hidden = new Set(['id', 'projectId', 'createdAt', 'updatedAt', 'lastWorkedAt', 'sortOrder'])
  return Object.fromEntries(Object.entries(record ?? {}).filter(([key, value]) =>
    !hidden.has(key) && value !== '' && value != null && !(Array.isArray(value) && !value.length)
    && !(typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length)))
}
</script>

<style scoped>
.vi-error { color: var(--error); }
.vi-invalid { margin-bottom: var(--space-md); padding: var(--space-sm) var(--space-md); border: 1px solid var(--error); border-radius: var(--radius-sm); }
.vi-invalid h3 { margin: 0 0 var(--space-xs); font-size: 0.95rem; }
.vi-invalid ul { margin: 0; padding-left: var(--space-md); font-size: 0.85rem; }
.vi-invalid code, .vi-path { word-break: break-all; }
.vi-count { font-weight: 600; }
.vi-kind { display: inline-block; min-width: 5.5em; padding: 0 var(--space-xs); border-radius: var(--radius-sm); background: var(--bg-muted); font-size: 0.75rem; text-align: center; }
.vi-kind-create { background: var(--success); color: #fff; }
.vi-kind-delete, .vi-kind-unsupported { background: var(--error); color: #fff; }
.vi-type { margin-left: var(--space-sm); color: var(--text-muted); font-size: 0.85rem; }
.vi-label { margin-left: var(--space-sm); }
.vi-path { margin-left: var(--space-sm); color: var(--text-muted); font-size: 0.75rem; font-family: var(--font-mono); }
.vi-fields { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-xs) var(--space-md); margin: var(--space-sm) 0 0; }
.vi-fields dt { color: var(--text-muted); }
.vi-fields dd { margin: 0; white-space: pre-wrap; }
.vi-diff { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.vi-diff th, .vi-diff td { padding: var(--space-xs); border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; white-space: pre-wrap; }
.vi-diff thead th { color: var(--text-muted); font-weight: 600; }
.vi-before { color: var(--text-muted); text-decoration: line-through; }
.vi-kind-conflict { background: var(--warning); color: #fff; }
.vi-conflict-hint { margin: 0 0 var(--space-sm); color: var(--text-muted); font-size: 0.85rem; }
.vi-conflicts { margin-bottom: var(--space-md); }
.vi-conflicts td { width: 30%; }
.vi-value { margin-bottom: var(--space-xs); }
.vi-base { color: var(--text-muted); }
.vi-chosen { background: var(--accent-muted); }
</style>
