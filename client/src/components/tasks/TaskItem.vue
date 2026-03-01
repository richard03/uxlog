<template>
  <li class="task-item" :class="{ completed: task.completed }">
    <input
      type="checkbox"
      :checked="task.completed"
      @change="toggleComplete"
      class="check"
    />
    <span
      v-if="!editing"
      class="title"
      @dblclick="startEdit"
    >{{ task.title }}</span>
    <input
      v-else
      ref="editInput"
      v-model="editTitle"
      class="edit-input"
      @blur="saveEdit"
      @keyup.enter="saveEdit"
      @keyup.escape="cancelEdit"
    />
    <button class="delete-btn" @click="$emit('delete', task.id)" aria-label="Delete task">✕</button>
  </li>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({ task: { type: Object, required: true } })
const emit  = defineEmits(['update', 'delete'])

const editing   = ref(false)
const editTitle = ref('')
const editInput = ref(null)

function toggleComplete() {
  emit('update', props.task.id, { completed: props.task.completed ? 0 : 1 })
}

async function startEdit() {
  editTitle.value = props.task.title
  editing.value   = true
  await nextTick()
  editInput.value?.focus()
}

function saveEdit() {
  if (editTitle.value.trim() && editTitle.value.trim() !== props.task.title) {
    emit('update', props.task.id, { title: editTitle.value.trim() })
  }
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}
</script>

<style scoped>
.task-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  list-style: none;
}
.task-item:hover { background: #f9fafb; }
.check { width: 1rem; height: 1rem; accent-color: #4f46e5; flex-shrink: 0; cursor: pointer; }
.title {
  flex: 1; font-size: 0.9rem; color: #111827;
  cursor: text; user-select: none;
}
.completed .title { text-decoration: line-through; color: #9ca3af; }
.edit-input {
  flex: 1; border: 1px solid #4f46e5; border-radius: 4px;
  padding: 0.2rem 0.4rem; font-size: 0.9rem;
}
.delete-btn {
  background: none; border: none; cursor: pointer;
  color: #9ca3af; font-size: 0.8rem; line-height: 1;
  opacity: 0; transition: opacity 0.1s;
}
.task-item:hover .delete-btn { opacity: 1; }
</style>
