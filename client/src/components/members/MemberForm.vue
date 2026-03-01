<template>
  <form @submit.prevent="submit" class="member-form">
    <div class="field">
      <label>Name *</label>
      <input v-model="form.name" type="text" required />
    </div>
    <div class="field">
      <label>Role</label>
      <input v-model="form.role" type="text" placeholder="e.g. Product Owner" />
    </div>
    <div class="field">
      <label>Contact</label>
      <input v-model="form.contact" type="text" placeholder="email or phone" />
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn-primary">{{ member ? 'Save' : 'Add' }}</button>
    </div>
  </form>
</template>

<script setup>
import { ref, watchEffect } from 'vue'

const props = defineProps({ member: { type: Object, default: null } })
const emit  = defineEmits(['submit', 'cancel'])

const form = ref({ name: '', role: '', contact: '' })

watchEffect(() => {
  if (props.member) {
    form.value = { name: props.member.name, role: props.member.role || '', contact: props.member.contact || '' }
  }
})

function submit() { emit('submit', { ...form.value }) }
</script>

<style scoped>
.member-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-size: 0.875rem; font-weight: 600; color: #374151; }
input {
  padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 0.9rem;
}
input:focus { outline: none; border-color: #4f46e5; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-primary { padding: 0.5rem 1.25rem; border: none; border-radius: 6px; background: #4f46e5; color: #fff; cursor: pointer; }
.btn-secondary { padding: 0.5rem 1.25rem; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
</style>
