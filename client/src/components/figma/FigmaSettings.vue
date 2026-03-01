<template>
  <div class="figma-settings">
    <h3>Figma Connection</h3>
    <p class="help">Connect a Figma file to sync stakeholders, personas, goals, scenarios, and requirements.</p>

    <form @submit.prevent="save" class="settings-form">
      <div class="field">
        <label>Figma Access Token</label>
        <input v-model="form.access_token" type="password" placeholder="figd_..." required />
        <small>Personal access token from Figma → Settings → Security</small>
      </div>
      <div class="field">
        <label>File ID</label>
        <input v-model="form.file_id" type="text" placeholder="aBcDeFgHiJkL" required />
        <small>Found in the Figma file URL: figma.com/file/<strong>FILE_ID</strong>/...</small>
      </div>
      <button type="submit" class="btn-primary" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save Connection' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useFigmaStore } from '@/stores/figma'

const props  = defineProps({ projectId: { type: [Number, String], required: true } })
const figma  = useFigmaStore()
const saving = ref(false)

const form = ref({ access_token: '', file_id: '' })

watchEffect(() => {
  if (figma.connection) {
    form.value.file_id = figma.connection.file_id || ''
    // access_token is not returned by the API – user must re-enter to change
  }
})

async function save() {
  saving.value = true
  try {
    await figma.saveConnection(props.projectId, form.value)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.figma-settings { max-width: 480px; }
h3 { margin: 0 0 0.5rem; }
.help { color: #6b7280; font-size: 0.9rem; margin: 0 0 1.5rem; }
.settings-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
label { font-size: 0.875rem; font-weight: 600; color: #374151; }
small { font-size: 0.78rem; color: #9ca3af; }
input {
  padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 0.9rem;
}
input:focus { outline: none; border-color: #4f46e5; }
.btn-primary {
  width: fit-content; padding: 0.5rem 1.25rem;
  border: none; border-radius: 6px;
  background: #4f46e5; color: #fff; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: default; }
</style>
