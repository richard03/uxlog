<template>
  <div class="pr-layout">
    <div class="pr-toolbar">
      <div class="pr-toolbar-left">
        <slot name="toolbar-left" />
      </div>
      <div class="pr-toolbar-right">
        <slot name="toolbar-right" />
      </div>
    </div>
    <div class="pr-list" role="list">
      <slot />
    </div>
  </div>
</template>

<script setup>
/**
 * Obal náhledu čekajících změn: horní lišta (zpět / hromadné akce) + scrollovatelný seznam řádků.
 * Styly: `pending-review.css` (globálně v main.js).
 */
</script>
