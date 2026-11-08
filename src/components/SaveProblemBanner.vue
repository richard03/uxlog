<template>
  <!-- Data se nepodařilo načíst: ukládání je pozastavené, aby se nepřepsala -->
  <div v-if="loadError" class="save-problem save-problem--danger" role="alert">
    <div class="save-problem-text">
      <strong>{{ t.saveProblem.loadErrorTitle }}</strong>
      <span>{{ t.saveProblem.loadError }}</span>
      <span class="save-problem-detail">{{ t.saveProblem.detail(loadError) }}</span>
    </div>
  </div>

  <!-- Poškozené záznamy odložené při startu -->
  <div v-if="quarantined.length" class="save-problem" role="status">
    <div class="save-problem-text">
      <strong>{{ t.saveProblem.quarantineTitle(quarantined.length) }}</strong>
      <span>{{ t.saveProblem.quarantine }}</span>
      <span class="save-problem-detail">{{ quarantineSummary }}</span>
    </div>
    <div class="save-problem-actions">
      <AppButton variant="secondary" size="sm" :disabled="savingFile" @click="saveQuarantineToFile">
        {{ t.saveProblem.quarantineSave }}
      </AppButton>
      <AppButton variant="tertiary" size="sm" @click="dismissQuarantine">{{ t.saveProblem.dismiss }}</AppButton>
    </div>
  </div>

  <div
    v-if="problem || confirmClose"
    class="save-problem"
    :class="{ 'save-problem--danger': !problem?.backedUp }"
    role="alert"
  >
    <div v-if="problem" class="save-problem-text">
      <strong>{{ problem.backedUp ? t.saveProblem.title : t.saveProblem.titleNoBackup }}</strong>
      <span>{{ problem.backedUp ? t.saveProblem.backedUp : t.saveProblem.noBackup }}</span>
      <span v-if="problem.error" class="save-problem-detail">{{ t.saveProblem.detail(problem.error) }}</span>
    </div>
    <div v-if="problem" class="save-problem-actions">
      <AppButton variant="primary" size="sm" :disabled="problem.retrying" @click="retry">
        {{ problem.retrying ? t.saveProblem.retrying : t.saveProblem.retry }}
      </AppButton>
      <AppButton variant="secondary" size="sm" :disabled="savingFile" @click="saveToFile">
        {{ t.saveProblem.saveToFile }}
      </AppButton>
    </div>

    <ConfirmDialog
      v-if="confirmClose"
      :title="t.saveProblem.closeTitle"
      :message="t.saveProblem.closeMessage"
      :confirm-label="t.saveProblem.closeAnyway"
      @confirm="closeAnyway"
      @cancel="confirmClose = false"
    />
  </div>
</template>

<script setup>
/**
 * Lišta nahoře při selhání ukládání do databáze (logika v useSaveProblem).
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useSaveProblem } from '../composables/useSaveProblem.js'
import AppButton from './AppButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const { t } = useI18n()
const {
  problem, loadError, quarantined, savingFile,
  retry, saveToFile, announceRestored, guardWindowClose, closeAnyway,
  loadQuarantine, saveQuarantineToFile, dismissQuarantine,
} = useSaveProblem()

/** Které záznamy se odložily (kolekce/id, nejvýš 5). */
const quarantineSummary = computed(() => {
  const list = quarantined.value.map((r) => (r.collection || '?') + '/' + (r.id || '?'))
  return list.length > 5 ? list.slice(0, 5).join(', ') + ' … (+' + (list.length - 5) + ')' : list.join(', ')
})

const confirmClose = ref(false)
let stopGuard = null

onMounted(async () => {
  announceRestored()
  loadQuarantine()
  try {
    stopGuard = await guardWindowClose(() => { confirmClose.value = true })
  } catch (err) {
    console.error('[UXLog] hlídání zavření okna nejde zapnout:', err)
  }
})

onUnmounted(() => stopGuard?.())
</script>

<style scoped>
.save-problem {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface-2);
  border-bottom: 2px solid var(--warning, var(--accent));
}

.save-problem--danger {
  border-bottom-color: var(--error);
}

.save-problem-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 0.875rem;
}

.save-problem-detail {
  color: var(--text-muted);
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}

.save-problem-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}
</style>
