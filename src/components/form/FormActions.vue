<template>
  <div class="form-actions">
    <slot />
  </div>
</template>

<script setup>
/**
 * FormActions – řádek tlačítek pro akce formuláře (uložit, zrušit).
 * Zobrazuje tlačítka zarovnaná vpravo s mezerou mezi nimi (styl .form-actions je globální v style.css –
 * používají ho i formuláře, které třídu píšou přímo).
 */
</script>

<script>
export default {
  name: 'FormActions',
}
</script>
