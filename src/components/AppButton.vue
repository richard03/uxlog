<template>
  <component
    :is="tag"
    :type="tag === 'button' ? nativeType : undefined"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :class="buttonClasses"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue'

/**
 * AppButton – sjednocené tlačítko s variantami primary, secondary, tertiary (ghost), danger.
 * @prop {string} variant - 'primary' | 'secondary' | 'tertiary' | 'danger' | 'dangerTertiary'
 * @prop {string} size - 'default' | 'sm'
 * @prop {boolean} iconOnly - kompaktní padding pro ikonová tlačítka
 * @prop {string} tag - 'button' | 'span' - element (span pro file-input trigger apod.)
 * @prop {string} nativeType - 'button' | 'submit' | 'reset' - typ při tag="button"
 * @prop {boolean} disabled - zakázané
 * @prop {string} ariaLabel - popisek pro přístupnost (u icon-only tlačítek)
 */
const props = defineProps({
  variant: {
    type: String,
    default: 'secondary',
    validator: (v) => ['primary', 'secondary', 'tertiary', 'danger', 'dangerTertiary'].includes(v),
  },
  size: { type: String, default: 'default', validator: (v) => ['default', 'sm'].includes(v) },
  iconOnly: { type: Boolean, default: false },
  tag: { type: String, default: 'button', validator: (v) => ['button', 'span'].includes(v) },
  nativeType: { type: String, default: 'button', validator: (v) => ['button', 'submit', 'reset'].includes(v) },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
})

defineEmits(['click'])

const variantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  tertiary: 'btn-ghost',
  danger: 'btn-danger',
  dangerTertiary: 'btn-ghost danger-btn',
}

const buttonClasses = computed(() => [
  'btn',
  variantClass[props.variant],
  props.size === 'sm' && 'btn-sm',
  props.iconOnly && 'icon-btn',
].filter(Boolean))
</script>

<script>
export default {
  name: 'AppButton',
  inheritAttrs: false,
}
</script>
