<template>
  <form @submit.prevent="submit" class="project-form">
    <div class="field">
      <label>Name *</label>
      <input v-model="form.name" type="text" required placeholder="Project name" />
    </div>
    <div class="row">
      <div class="field">
        <label>Scope</label>
        <select v-model="form.scope">
          <option value="small">Small (days–weeks)</option>
          <option value="medium">Medium (1–3 months)</option>
          <option value="large">Large (3+ months)</option>
        </select>
      </div>
      <div class="field">
        <label>Priority</label>
        <select v-model="form.priority">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Phase</label>
      <select v-model="form.status">
        <option value="research">Research</option>
        <option value="design">Design</option>
        <option value="development">Development</option>
      </select>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn-primary" :disabled="saving">
        {{ saving ? 'Saving…' : (project ? 'Save' : 'Create') }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const props = defineProps({
  project: { type: Object, default: null },
  saving:  { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'cancel'])

const form = ref({
  name:     '',
  scope:    'small',
  priority: 'medium',
  status:   'research',
})

watchEffect(() => {
  if (props.project) {
    form.value = {
      name:     props.project.name,
      scope:    props.project.scope,
      priority: props.project.priority,
      status:   props.project.status,
    }
  }
})

function submit() {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.project-form { display: flex; flex-direction: column; gap: 1rem; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-size: 0.875rem; font-weight: 600; color: #374151; }
input, select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: #fff;
}
input:focus, select:focus { outline: none; border-color: #4f46e5; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
.btn-primary {
  padding: 0.5rem 1.25rem; border: none; border-radius: 6px;
  background: #4f46e5; color: #fff; cursor: pointer; font-size: 0.9rem;
}
.btn-primary:disabled { opacity: 0.6; cursor: default; }
.btn-secondary {
  padding: 0.5rem 1.25rem; border: 1px solid #d1d5db; border-radius: 6px;
  background: #fff; cursor: pointer; font-size: 0.9rem;
}
</style>
