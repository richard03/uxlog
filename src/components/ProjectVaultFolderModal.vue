<template>
  <Modal :title="t.vault.projectFolderTitle" @close="emit('close')">
    <form @submit.prevent="onSave">
      <p class="folder-hint">{{ t.vault.projectFolderHint }}</p>
      <FormSelect
        v-model="draft.mode"
        :label="t.vault.projectFolderMode"
        control-id="project-vault-mode"
        :options="[
          { value: 'default', label: t.vault.projectFolderDefault },
          { value: 'custom', label: t.vault.projectFolderCustom },
          { value: 'off', label: t.vault.projectFolderOff },
        ]"
      />
      <p v-if="draft.mode === 'default'" class="folder-hint">
        <span class="folder-path">{{ defaultProjectPath }}</span>
      </p>
      <template v-if="draft.mode === 'custom'">
        <p class="folder-path" :class="{ 'value-empty': !draft.root }">{{ draft.root || t.vault.projectFolderNotChosen }}</p>
        <AppButton variant="secondary" size="sm" @click="chooseFolder">{{ t.vault.chooseFolder }}</AppButton>
        <p class="folder-hint">{{ t.vault.projectFolderCustomHint }}</p>
      </template>
      <p v-if="draft.mode === 'off'" class="folder-hint">{{ t.vault.projectFolderOffHint }}</p>
      <p v-if="draft.mode !== current.mode || draft.root !== current.root" class="folder-hint">{{ t.vault.projectFolderMoveHint }}</p>
      <p v-if="draft.error || issue" class="folder-error" role="alert">{{ draft.error || issue }}</p>
      <FormActions>
        <AppButton variant="secondary" @click="emit('close')">{{ t.common.cancel }}</AppButton>
        <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
      </FormActions>
    </form>
  </Modal>
</template>

<script setup>
/**
 * Dialog nastavení složky dat projektu: výchozí složka, vlastní složka (projekt přímo v kořeni
 * zvolené složky) nebo nezapisovat. Otevírá se z menu v hlavičce detailu projektu.
 */
import { useI18n } from '../composables/useI18n.js'
import { useProjectVaultFolder } from '../composables/useProjectVaultFolder.js'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import { FormSelect, FormActions } from './form'

const props = defineProps({
  projectId: { type: String, required: true },
})
const emit = defineEmits(['close'])

const { t } = useI18n()
const { defaultProjectPath, current, issue, draft, resetDraft, chooseFolder, save } = useProjectVaultFolder(() => props.projectId)
resetDraft()

function onSave() {
  if (save()) emit('close')
}
</script>

<style scoped>
.folder-hint { margin: var(--space-sm) 0; color: var(--text-muted); font-size: 0.85rem; }
.folder-path { font-family: var(--font-mono); word-break: break-all; margin: var(--space-sm) 0; }
.value-empty { color: var(--text-muted); }
.folder-error { margin: var(--space-sm) 0; color: var(--error); }
</style>
