<template>
  <!-- Plovoucí okno s detailem entity nad plátnem; klávesy plátna tu neplatí -->
  <section
    ref="windowEl"
    class="canvas-window"
    :class="{ 'canvas-window--top': top }"
    :style="{ left: `${win.x}px`, top: `${win.y}px`, width: `${win.width}px`, height: `${win.height}px`, zIndex: 10 + win.z }"
    :aria-label="title"
    tabindex="-1"
    data-canvas-keys="off"
    @pointerdown.capture="emit('focus')"
    @focusin="emit('focus')"
    @keydown.esc="onEscape"
  >
    <div class="canvas-window-bar" @pointerdown="emit('bar-pointerdown', $event)">
      <span class="canvas-window-title" :title="title">{{ title }}</span>
      <!-- Sem teleportuje akce detailu ProjectPageHeader -->
      <div :id="actionsTargetId" class="canvas-window-actions"></div>
      <AppButton variant="tertiary" size="sm" icon-only :aria-label="t.canvas.closeWindow" :title="t.canvas.closeWindow" @click="emit('close')">×</AppButton>
    </div>
    <div class="canvas-window-body">
      <component :is="win.component" />
    </div>
    <span
      class="canvas-window-resize"
      :title="t.canvas.resizeWindow"
      aria-hidden="true"
      @pointerdown.stop="emit('resize-pointerdown', $event)"
    ></span>
  </section>
</template>

<script setup>
import { ref, computed, provide, onMounted } from 'vue'
import { routeLocationKey } from 'vue-router'
import { useI18n } from '../composables/useI18n.js'
import { CANVAS_WINDOW_KEY } from '../composables/useEntityNavigation.js'
import AppButton from './AppButton.vue'

/**
 * Okno detailu entity nad plátnem projektu.
 * Detail (stejná komponenta jako obrazovka v pohledu Data) dostane vlastní routu s parametry své entity
 * (provide routeLocationKey), takže v jednom okamžiku může být otevřeno více detailů.
 * Navigaci uvnitř detailu přesměrovává kontext CANVAS_WINDOW_KEY (useEntityNavigation):
 * odkaz na jinou entitu otevře další okno, smazání nebo přesun entity okno zavře.
 * @prop {Object} win - okno z useCanvasWindows ({ key, x, y, width, height, z, route, component, card })
 * @prop {string} typeLabel - název typu entity
 * @prop {boolean} top - okno je navrchu
 */
const props = defineProps({
  win: { type: Object, required: true },
  typeLabel: { type: String, default: '' },
  top: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'focus', 'open', 'bar-pointerdown', 'resize-pointerdown'])

const { t } = useI18n()
const windowEl = ref(null)

const actionsTargetId = `canvas-window-actions-${Math.random().toString(36).slice(2)}`

const title = computed(() => {
  const card = props.win.card
  return [props.typeLabel, card?.code, card?.name || t.canvas.untitled].filter(Boolean).join(' · ')
})

provide(routeLocationKey, props.win.route)
provide(CANVAS_WINDOW_KEY, {
  actionsTargetId,
  open: (type, id) => emit('open', type, id),
  close: () => emit('close'),
})

/** Esc zavře okno – ne při psaní do pole ani v dialogu otevřeném z detailu (ten se zavírá sám). */
function onEscape(event) {
  const target = event.target
  const tag = target?.tagName
  if (event.defaultPrevented || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
  if (target?.closest?.('[role="dialog"]')) return
  emit('close')
}

// Nově otevřené okno dostane fokus, aby šlo hned ovládat klávesnicí
onMounted(() => windowEl.value?.focus({ preventScroll: true }))
</script>

<style scoped>
/* Bez transformace, aby dialogy detailu s position: fixed kryly celé okno aplikace */
.canvas-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.canvas-window--top {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.canvas-window:focus {
  outline: none;
}

.canvas-window:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* Lišta = úchyt pro přesun okna */
.canvas-window-bar {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-xs) var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--border);
  cursor: move;
  user-select: none;
  touch-action: none;
}

.canvas-window-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.canvas-window-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  cursor: default;
}

.canvas-window-bar :deep(button) {
  cursor: pointer;
}

.canvas-window-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-md) var(--space-lg) var(--space-lg);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

/* Detail v okně nemá vlastní šířku ani odsazení obrazovky */
.canvas-window-body > :deep(.container) {
  max-width: none;
  margin: 0;
  padding: 0;
}

/* Úchyt pro změnu velikosti v pravém dolním rohu */
.canvas-window-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  touch-action: none;
  background:
    linear-gradient(135deg, transparent 50%, var(--text-muted) 50%, var(--text-muted) 58%, transparent 58%,
      transparent 70%, var(--text-muted) 70%, var(--text-muted) 78%, transparent 78%);
  opacity: 0.6;
}

.canvas-window-resize:hover {
  opacity: 1;
}
</style>
