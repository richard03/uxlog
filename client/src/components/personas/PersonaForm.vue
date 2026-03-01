<template>
  <form @submit.prevent="submit" class="persona-form">
    <div class="field">
      <label>Jméno *</label>
      <input v-model="form.name" type="text" required placeholder="např. Petr Novák" />
    </div>
    <div class="field">
      <label>Portrét (URL)</label>
      <input v-model="form.portrait_url" type="url" placeholder="https://..." />
    </div>
    <div class="field">
      <label>Typ</label>
      <select v-model="form.type">
        <option value="prototype">Prototype</option>
        <option value="persona">Persona</option>
      </select>
    </div>
    <div class="field">
      <label>Popis</label>
      <textarea v-model="form.description" rows="3" placeholder="Krátký popis persony..." />
    </div>
    <div class="field">
      <label>Motivace</label>
      <textarea v-model="form.motivation" rows="2" placeholder="Co personu motivuje?" />
    </div>
    <div class="field">
      <label>Potřeby</label>
      <textarea v-model="form.needs" rows="2" placeholder="Jaké má potřeby?" />
    </div>
    <div class="field">
      <label>Problémy</label>
      <textarea v-model="form.problems" rows="2" placeholder="S jakými problémy se potýká?" />
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">Zrušit</button>
      <button type="submit" class="btn-primary">{{ persona ? 'Uložit' : 'Přidat' }}</button>
    </div>
  </form>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const props = defineProps({ persona: { type: Object, default: null } })
const emit  = defineEmits(['submit', 'cancel'])

const form = ref({
  name: '',
  type: 'prototype',
  portrait_url: '',
  description: '',
  motivation: '',
  needs: '',
  problems: '',
})

watchEffect(() => {
  if (props.persona) {
    form.value = {
      name:         props.persona.name || '',
      type:         props.persona.type || 'prototype',
      portrait_url: props.persona.portrait_url || '',
      description:  props.persona.description || '',
      motivation:   props.persona.motivation || '',
      needs:        props.persona.needs || '',
      problems:     props.persona.problems || '',
    }
  }
})

function submit() { emit('submit', { ...form.value }) }
</script>

<style scoped>
.persona-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-size: 0.875rem; font-weight: 600; color: #374151; }
input, select, textarea {
  padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 0.9rem; font-family: inherit;
}
input:focus, select:focus, textarea:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; min-height: 60px; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-primary { padding: 0.5rem 1.25rem; border: none; border-radius: 6px; background: #4f46e5; color: #fff; cursor: pointer; }
.btn-secondary { padding: 0.5rem 1.25rem; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
</style>
