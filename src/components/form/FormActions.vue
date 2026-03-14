<template>
  <div class="form-actions">
    <slot />
  </div>
</template>

<script setup>
/**
 * FormActions – řádek tlačítek pro akce formuláře (uložit, zrušit).
 * Zobrazuje tlačítka zarovnaná vpravo s mezerou mezi nimi.
 */
</script>

<script>
export default {
  name: 'FormActions',
}
</script>

<style scoped>
.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}
</style>
