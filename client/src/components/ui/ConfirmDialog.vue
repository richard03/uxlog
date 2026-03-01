<template>
  <Modal :open="visible" title="Confirm" @close="cancel">
    <p>{{ message }}</p>
    <div class="actions">
      <button class="btn-secondary" @click="cancel">Cancel</button>
      <button class="btn-danger"    @click="accept">Delete</button>
    </div>
  </Modal>
</template>

<script setup>
import Modal from './Modal.vue'
import { useConfirm } from '@/composables/useConfirm'
const { visible, message, accept, cancel } = useConfirm()
</script>

<style scoped>
p { margin: 0 0 1.5rem; color: #374151; }
.actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-secondary { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.btn-danger    { padding: 0.5rem 1rem; border: none; border-radius: 6px; background: #dc2626; color: #fff; cursor: pointer; }
</style>
