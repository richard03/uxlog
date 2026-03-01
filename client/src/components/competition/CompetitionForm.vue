<template>
  <form @submit.prevent="submit" class="competition-form">
    <div class="field">
      <label>Name *</label>
      <input v-model="form.name" type="text" required placeholder="Competitor or product name" />
    </div>
    <div class="field">
      <label>Description</label>
      <textarea v-model="form.description" rows="3" placeholder="Brief description of the competition..." />
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn-primary">{{ competition ? 'Save' : 'Add' }}</button>
    </div>
  </form>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const props = defineProps({ competition: { type: Object, default: null } })
const emit = defineEmits(['submit', 'cancel'])

const form = ref({
  name: '',
  description: '',
})

watchEffect(() => {
  if (props.competition) {
    form.value = {
      name:        props.competition.name || '',
      description: props.competition.description || '',
    }
  }
})

function submit() {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.competition-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-size: 0.875rem; font-weight: 600; color: #374151; }
input, textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}
input:focus, textarea:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; min-height: 60px; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-primary {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
}
.btn-secondary {
  padding: 0.5rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
</style>
