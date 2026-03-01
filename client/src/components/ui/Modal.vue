<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="modal" role="dialog" :aria-label="title">
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button class="close-btn" @click="$emit('close')" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ open: Boolean, title: String })
defineEmits(['close'])
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  border-radius: 12px;
  width: min(480px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
h2 { margin: 0; font-size: 1.1rem; }
.close-btn {
  background: none; border: none; cursor: pointer;
  font-size: 1.1rem; color: #6b7280; line-height: 1;
}
.modal-body { padding: 1.5rem; }
</style>
