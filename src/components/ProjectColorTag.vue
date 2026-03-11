<template>
  <span v-if="color" class="project-color-tag" :style="{ background: color }" aria-hidden="true"></span>
</template>

<script setup>
defineProps({
  color: { type: String, default: '' },
})
</script>

<style scoped>
.project-color-tag {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 10%;
  margin-right: 8px;
  vertical-align: middle;
  position: relative;
  top: -2px;
  flex-shrink: 0;
}
</style>
