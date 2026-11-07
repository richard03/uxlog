<template>
  <SectionCard :title="t.activity.meeting.title" :aria-label="t.activity.meeting.title">
    <form class="meeting" @submit.prevent="onSave">
      <p class="meeting-hint">{{ t.activity.meeting.hint }}</p>

      <div
        class="meeting-file"
        :class="{ 'meeting-file--over': dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <label class="meeting-pick">
          <AppButton tag="span" variant="secondary" size="sm">{{ t.activity.meeting.uploadFile }}</AppButton>
          <input type="file" class="visually-hidden" :accept="accept" @change="onPick" />
        </label>
        <span v-if="draft.fileName" class="meeting-file-name">
          {{ draft.fileName }}
          <button type="button" class="meeting-file-clear" :aria-label="t.activity.meeting.clearFile" @click="clearFile">×</button>
        </span>
        <span v-else class="meeting-formats">{{ t.sources.formats }}</span>
      </div>
      <p v-if="draft.reading" class="meeting-status" role="status">{{ t.sources.reading }}</p>

      <FormTextarea
        v-model="draft.content"
        control-id="meeting-notes"
        :rows="6"
        :placeholder="t.activity.meeting.placeholder"
        :aria-label="t.activity.meeting.title"
      />
      <p v-if="draft.error" class="meeting-error" role="alert">{{ draft.error }}</p>

      <div class="meeting-actions">
        <AppButton variant="primary" size="sm" native-type="submit" :disabled="!canSave">
          {{ aiAvailable ? t.activity.meeting.saveAndProcess : t.activity.meeting.save }}
        </AppButton>
      </div>
      <p v-if="!aiAvailable" class="meeting-note">{{ t.activity.meeting.aiUnavailable }}</p>

      <div v-if="lastSource" class="meeting-result" role="status">
        <span v-if="status?.processing">{{ t.activity.meeting.processing }}<AiCancelButton /></span>
        <span v-else-if="status?.review">{{ t.activity.meeting.reviewing }}</span>
        <span v-else-if="status?.error" class="meeting-error">{{ status.error }}</span>
        <span v-else-if="status?.notice">{{ status.notice }}</span>
        <span v-else-if="lastSource.processedAt">{{ t.activity.meeting.processed }}</span>
        <span v-else>{{ t.activity.meeting.saved }}</span>
        <a :href="sourceHref" class="meeting-link" @click.prevent="openDetail('sources', projectId, lastSource.id)">{{ t.activity.meeting.openSource(lastSource.code || lastSource.name) }}</a>
      </div>
    </form>

    <NotebookModal
      v-if="review"
      :key="review.entryId"
      :actions="review.actions"
      :helpers="reviewHelpers"
      @confirm-action="applyAction"
      @close="finishReview"
    />
  </SectionCard>
</template>

<script setup>
/**
 * Blok „Zápis z meetingu“ v pravém sloupci detailu aktivity (pod „Jak na to“).
 * Přepis ze souboru nebo text napsaný / nadiktovaný do pole; uložení vytvoří zdroj propojený
 * s aktivitou a hned ho zpracuje (revize návrhů AI v dialogu).
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n.js'
import { useMeetingNotes } from '../composables/useMeetingNotes.js'
import { useEntityNavigation } from '../composables/useEntityNavigation.js'
import SectionCard from './SectionCard.vue'
import AppButton from './AppButton.vue'
import AiCancelButton from './AiCancelButton.vue'
import FormTextarea from './form/FormTextarea.vue'
import NotebookModal from './NotebookModal.vue'

const props = defineProps({
  projectId: { type: String, required: true },
  activityId: { type: String, required: true },
})

const { t } = useI18n()
const router = useRouter()
const { detailRoute, openDetail } = useEntityNavigation()
const {
  draft, accept, readFile, clearFile, canSave, save,
  aiAvailable, lastSource, status, review, applyAction, finishReview, reviewHelpers,
} = useMeetingNotes(() => props.projectId, () => props.activityId)

const dragOver = ref(false)

const sourceRoute = computed(() => (lastSource.value ? detailRoute('sources', props.projectId, lastSource.value.id) : null))
const sourceHref = computed(() => (sourceRoute.value ? router.resolve(sourceRoute.value).href : '#'))

function onPick(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) readFile(file)
}

function onDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) readFile(file)
}

function onSave() {
  save()
}
</script>

<style scoped>
.meeting {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.meeting-hint,
.meeting-note,
.meeting-formats {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.meeting-file {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  padding: var(--space-sm);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
}

.meeting-file--over {
  border-color: var(--accent);
  background: var(--bg-muted);
}

.meeting-pick {
  cursor: pointer;
}

.meeting-file-name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

.meeting-file-clear {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.meeting-file-clear:hover {
  color: var(--error);
}

.meeting-status,
.meeting-result {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-sm);
}

.meeting-error {
  margin: 0;
  color: var(--error);
  font-size: 0.85rem;
}

.meeting-actions {
  display: flex;
  justify-content: flex-end;
}

.meeting-link {
  color: var(--accent);
}
</style>
