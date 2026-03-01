<template>
  <form @submit.prevent="submit" class="task-add-bar">
    <input
      v-model="title"
      type="text"
      placeholder="Add a task…"
      :disabled="adding"
    />
    <button type="submit" :disabled="!title.trim() || adding">
      {{ adding ? '…' : '+ Add' }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue'

const emit  = defineEmits(['add'])
const title = ref('')
const adding = ref(false)

async function submit() {
  if (!title.value.trim()) return
  adding.value = true
  try {
    await emit('add', title.value.trim())
    title.value = ''
  } finally {
    adding.value = false
  }
}
</script>

<style scoped>
.task-add-bar { display: flex; gap: 0.5rem; margin-top: 1rem; }
input {
  flex: 1; padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem;
}
input:focus { outline: none; border-color: #4f46e5; }
button {
  padding: 0.5rem 1rem; border: none; border-radius: 6px;
  background: #4f46e5; color: #fff; cursor: pointer; font-size: 0.9rem;
}
button:disabled { opacity: 0.5; cursor: default; }
</style>
