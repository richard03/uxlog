<template>
  <div class="persona-list-root">
    <SyncStatusBanner v-if="figma.connection" :projectId="projectId" @sync="handleSync" />
    <div v-else class="figma-hint">
      <p>Pro synchronizaci a export person do Figma připojte soubor v záložce <strong>Nastavení</strong>.</p>
    </div>
    <div class="persona-list-wrap">
      <div class="list-header">
        <h3>Persony</h3>
        <div class="header-actions">
          <button v-if="figma.personas.length && figma.connection" class="btn-export" @click="showExportHint = !showExportHint" title="Export do Figma">
            📤 Export do Figma
          </button>
          <button class="btn-add" @click="openAdd">+ Přidat personu</button>
        </div>
      </div>
      <div v-if="showExportHint && figma.connection" class="export-hint">
        <p>Pro propagaci person do Figma souboru:</p>
        <ol>
          <li>Spusťte v Figma plugin <strong>UXLog - Import Personas</strong> (Plugins → Development → Import plugin from manifest → vyberte složku <code>figma-plugin</code>).</li>
          <li>Zadejte API URL: <code>{{ apiBase }}</code></li>
          <li>ID projektu: <strong>{{ props.projectId }}</strong>
            <button type="button" class="btn-copy" @click="copyToClipboard(props.projectId)">Kopírovat</button>
          </li>
          <li>Token: zkopírujte ze záložky Nastavení (Figma) nebo z DevTools → Application → Local Storage → <code>uxlog_token</code>.
            <button type="button" class="btn-copy" @click="copyToken">Kopírovat token</button>
          </li>
        </ol>
      </div>

      <ErrorBanner :message="error" @dismiss="error = null" />

      <div class="list">
        <PersonaCard
          v-for="p in figma.personas"
          :key="p.id"
          :persona="p"
          @edit="openEdit"
          @delete="handleDelete"
        />
        <EmptyState v-if="!figma.personas.length" icon="🙍" title="Zatím žádné persony" subtitle="Přidejte první personu nebo synchronizujte z Figma (pokud je připojeno)." />
      </div>

      <Modal :open="showForm" :title="editing ? 'Upravit personu' : 'Nová persona'" @close="closeForm">
        <PersonaForm :persona="editing" @submit="handleSubmit" @cancel="closeForm" />
      </Modal>
      <ConfirmDialog />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFigmaStore } from '@/stores/figma'
import { useConfirm }   from '@/composables/useConfirm'
import { personasApi }   from '@/api/personas'
import PersonaCard       from './PersonaCard.vue'
import PersonaForm       from './PersonaForm.vue'
import SyncStatusBanner  from '@/components/figma/SyncStatusBanner.vue'
import EmptyState        from '@/components/ui/EmptyState.vue'
import Modal             from '@/components/ui/Modal.vue'
import ErrorBanner       from '@/components/ui/ErrorBanner.vue'
import ConfirmDialog     from '@/components/ui/ConfirmDialog.vue'

const props = defineProps({ projectId: { type: [Number, String], required: true } })
const figma = useFigmaStore()
const { confirm } = useConfirm()

const showForm     = ref(false)
const editing      = ref(null)
const error        = ref(null)
const showExportHint = ref(false)
const apiBase      = import.meta.env.VITE_API_BASE || window.location.origin + '/api'

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text))
  } catch (_) {}
}

async function copyToken() {
  const token = localStorage.getItem('uxlog_token')
  if (token) {
    await copyToClipboard(token)
  }
}

function openAdd()  { editing.value = null; showForm.value = true }
function openEdit(p){ editing.value = p;    showForm.value = true }
function closeForm() { showForm.value = false; editing.value = null }

async function handleSync() {
  await figma.sync(props.projectId)
}

async function handleSubmit(data) {
  error.value = null
  try {
    if (editing.value) {
      await personasApi.update(props.projectId, editing.value.id, data)
    } else {
      await personasApi.create(props.projectId, data)
    }
    await figma.fetchAll(props.projectId)
    closeForm()
  } catch (e) {
    error.value = e.response?.data?.error || 'Operace selhala'
  }
}

async function handleDelete(id) {
  const ok = await confirm('Opravdu smazat tuto personu?')
  if (!ok) return
  error.value = null
  try {
    await personasApi.delete(props.projectId, id)
    figma.personas = figma.personas.filter(p => p.id !== id)
  } catch (e) {
    error.value = e.response?.data?.error || 'Smazání selhalo'
  }
}
</script>

<style scoped>
.persona-list-root { display: flex; flex-direction: column; gap: 1rem; }
.figma-hint { padding: 0.75rem 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; color: #64748b; }
.list-header { display: flex; align-items: center; justify-content: space-between; }
.header-actions { display: flex; align-items: center; gap: 0.5rem; }
.btn-export { padding: 0.4rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.8rem; color: #64748b; }
.btn-export:hover { background: #f8fafc; }
.export-hint { padding: 1rem; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; font-size: 0.8rem; }
.export-hint p { margin: 0 0 0.5rem; }
.export-hint ol { margin: 0; padding-left: 1.25rem; }
.export-hint li { margin-bottom: 0.35rem; }
.export-hint code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; }
.btn-copy { margin-left: 0.5rem; padding: 0.2rem 0.5rem; font-size: 0.75rem; border: 1px solid #94a3b8; border-radius: 4px; background: #fff; cursor: pointer; }
h3 { margin: 0; font-size: 1rem; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.btn-add { padding: 0.4rem 0.875rem; border: none; border-radius: 6px; background: #4f46e5; color: #fff; cursor: pointer; font-size: 0.875rem; }
</style>
