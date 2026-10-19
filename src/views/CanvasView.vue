<template>
  <!-- Canvas přes celé okno (meta.fullScreen): bez hlavičky obrazovky a Zápisníku, ovládání plave nad plátnem -->
  <div
    v-if="project"
    ref="pageEl"
    class="canvas-page"
    :class="activeGesture && `canvas-page--${activeGesture}`"
    @pointermove="onGesturePointerMove"
    @pointerup="onGesturePointerUp"
    @pointercancel="onGesturePointerUp"
  >
    <h1 class="visually-hidden">{{ t.canvas.title }} – {{ project.name }}</h1>
    <p id="canvas-hint" class="visually-hidden">{{ t.canvas.hint }}</p>

    <div
      ref="surfaceEl"
      class="canvas-surface"
      :class="{ 'canvas-surface--panning': isPanning, 'canvas-surface--pan-ready': spaceHeld }"
      :style="surfaceStyle"
      role="region"
      :aria-label="t.canvas.surface"
      aria-describedby="canvas-hint"
      @pointerdown="onSurfacePointerDown"
      @pointermove="onSurfacePointerMove"
      @pointerup="onSurfacePointerUp"
      @pointercancel="onSurfacePointerUp"
      @contextmenu="onSurfaceContextMenu"
      @wheel.prevent="onWheel"
    >
      <p v-if="cards.length === 0" class="canvas-empty">{{ t.canvas.empty }}</p>
      <div class="canvas-world" :style="worldStyle">
        <button
          v-for="card in cards"
          :key="card.key"
          type="button"
          class="canvas-card"
          :aria-pressed="isSelected(card.key)"
          :class="{
            'canvas-card--selected': isSelected(card.key),
            'canvas-card--dragging': draggingKeys.has(card.key),
            'canvas-card--dimmed': isFilteredOut(card),
          }"
          :style="[{ left: `${card.x}px`, top: `${card.y}px`, width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }, cardColorStyle(card)]"
          :aria-label="t.canvas.cardAria(typeLabel(card.type), card.name || t.canvas.untitled)"
          @pointerdown="onCardPointerDown($event, card)"
          @pointermove="onCardPointerMove"
          @pointerup="onCardPointerUp"
          @pointercancel="onCardPointerCancel"
          @dblclick="onCardDblClick(card)"
          @keydown="onCardKeydown($event, card)"
        >
          <span class="canvas-card-meta">
            <span class="canvas-card-type">{{ typeLabel(card.type) }}</span>
            <span v-if="card.code" class="canvas-card-code">{{ card.code }}</span>
            <AppBadge
              v-if="card.priority"
              class="canvas-card-priority"
              :variant="`priority-${card.priority.level}`"
              :title="`${t.canvas.priority}: ${priorityLabel(card.priority)}`"
            >{{ priorityLabel(card.priority, true) }}</AppBadge>
          </span>
          <span class="canvas-card-name">{{ card.name || t.canvas.untitled }}</span>
          <span v-if="card.description" class="canvas-card-desc">{{ card.description }}</span>
        </button>
      </div>

      <!-- Kontextová lišta výběru: barva kartiček a menu „…“ -->
      <CanvasSelectionToolbar
        v-if="toolbarStyle"
        :style="toolbarStyle"
        :align="toolbarAlign"
        :colors="selectionColors"
        :current-color="currentColor"
        :menu-items="menuItems"
        @color="setColor"
        @action="onMenuAction"
      />

      <!-- Výběrový obdélník (tažení prázdného místa) -->
      <div v-if="marqueeStyle" class="canvas-marquee" :style="marqueeStyle" aria-hidden="true"></div>

      <!-- Filtr typů na horní hraně: zvýrazní kartičky vybraného typu, ostatní zprůhlední -->
      <div class="canvas-overlay canvas-filter" data-canvas-keys="off" @pointerdown.stop @dblclick.stop @wheel.stop>
        <label for="canvas-type-filter" class="canvas-filter-label">{{ t.canvas.typeFilter }}</label>
        <select id="canvas-type-filter" v-model="typeFilter" class="form-control canvas-filter-select">
          <option value="">{{ t.canvas.allTypes }}</option>
          <option v-for="o in typeCounts" :key="o.type" :value="o.type" :disabled="!o.count">
            {{ t.canvas.typeOption(t.canvas.types[o.type] ?? typeLabel(o.type), o.count) }}
          </option>
        </select>
      </div>

      <!-- Stručná nápověda ovládání -->
      <p class="canvas-overlay canvas-legend" aria-hidden="true">{{ t.canvas.legend }}</p>

      <!-- Zoom a „Zobrazit vše“ -->
      <div class="canvas-overlay canvas-controls" role="group" :aria-label="t.canvas.zoomLevel" @pointerdown.stop>
        <template v-if="selectedCount">
          <span class="canvas-selected-count" aria-live="polite">{{ t.canvas.selected(selectedCount) }}</span>
          <span class="canvas-controls-sep" aria-hidden="true"></span>
        </template>
        <AppButton variant="tertiary" size="sm" :aria-label="t.canvas.zoomOut" :title="t.canvas.zoomOut" @click="zoomOut">−</AppButton>
        <span class="canvas-zoom-value" aria-live="polite">{{ zoomPercent }} %</span>
        <AppButton variant="tertiary" size="sm" :aria-label="t.canvas.zoomIn" :title="t.canvas.zoomIn" @click="zoomIn">+</AppButton>
        <span class="canvas-controls-sep" aria-hidden="true"></span>
        <AppButton variant="tertiary" size="sm" @click="fitAll">{{ t.canvas.fit }}</AppButton>
      </div>
    </div>

    <!-- Detaily entit v plovoucích oknech nad plátnem (každá otevřená entita ve vlastním okně) -->
    <CanvasEntityWindow
      v-for="win in windows"
      :key="win.key"
      :win="win"
      :type-label="typeLabel(win.type)"
      :top="win.key === topKey"
      @focus="focusWindow(win.key)"
      @close="closeWindow(win.key)"
      @open="openWindow"
      @bar-pointerdown="onBarPointerDown($event, win.key)"
      @resize-pointerdown="onResizePointerDown($event, win.key)"
    />

    <!-- Dialogy akcí výběru (klávesy v nich plátno neovládají) -->
    <div data-canvas-keys="off">
      <MoveToProjectModal
        v-if="dialog?.action === 'move' || dialog?.action === 'copy'"
        :mode="dialog.action"
        :entities="dialogEntities"
        :current-project-id="projectId"
        @close="closeDialog"
        @moved="onMoved"
        @copied="onCopied"
      />
      <ConfirmDialog
        v-if="deleteDialog"
        :title="deleteDialog.label"
        :message="deleteDialog.confirm"
        @confirm="confirmDelete"
        @cancel="closeDialog"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { useProjectCanvas, CARD_WIDTH, CARD_HEIGHT } from '../composables/useProjectCanvas.js'
import { useCanvasWindows } from '../composables/useCanvasWindows.js'
import { useCanvasSelectionActions } from '../composables/useCanvasSelectionActions.js'
import AppButton from '../components/AppButton.vue'
import CanvasEntityWindow from '../components/CanvasEntityWindow.vue'
import CanvasSelectionToolbar from '../components/CanvasSelectionToolbar.vue'
import AppBadge from '../components/AppBadge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'

const { t } = useI18n()
const route = useRoute()
const store = useStore()

const projectId = computed(() => String(route.params.id || ''))
const project = computed(() => store.getProject(projectId.value))

const surfaceEl = ref(null)

const {
  cards, worldStyle, surfaceStyle, marqueeStyle, zoomPercent, isPanning, spaceHeld, selectedCount, isSelected, draggingKeys,
  selectedKeys, toolbarStyle, toolbarAlign, cardColorStyle, typeFilter, typeCounts, isFilteredOut,
  onSurfacePointerDown, onSurfacePointerMove, onSurfacePointerUp, onSurfaceContextMenu, onWheel,
  zoomIn, zoomOut, fitAll,
  onCardPointerDown, onCardPointerMove, onCardPointerUp, onCardPointerCancel, onCardDblClick, onCardKeydown,
} = useProjectCanvas(projectId, surfaceEl, {
  onOpen: (card) => openWindow(card.type, card.id),
})

// --- Kontextová lišta výběru ---
const {
  colors: selectionColors, currentColor, setColor, menuItems, onMenuAction,
  dialog, dialogEntities, deleteDialog, closeDialog, confirmDelete, onMoved, onCopied,
} = useCanvasSelectionActions(projectId, selectedKeys, cards)

// --- Okna s detaily entit nad plátnem ---
const pageEl = ref(null)
const {
  windows, topKey, activeGesture,
  open: openWindow, close: closeWindow, focus: focusWindow,
  onBarPointerDown, onResizePointerDown, onGesturePointerMove, onGesturePointerUp,
} = useCanvasWindows(projectId, pageEl, cards)

/** Text tagu priority: MoSCoW u scénářů a požadavků (na kartičce zkráceně), vypočtená priorita u chyb. */
function priorityLabel(priority, short = false) {
  if (priority.scale === 'moscow') return (short ? t.canvas.moscowShort : t.moscow)[priority.value]
  return t.bug.priorityOptions[priority.value]
}

function typeLabel(type) {
  return t.connection.entityTypes[type] ?? type
}
</script>

<style scoped>
.canvas-page {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* „Nekonečné“ plátno přes celé okno: tečkovaná mřížka, obsah se posouvá a zvětšuje transformací */
.canvas-surface {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: var(--bg);
  background-image: radial-gradient(circle, var(--border) 1px, transparent 1.2px);
  cursor: default;
  touch-action: none;
  user-select: none;
}

.canvas-surface--pan-ready,
.canvas-surface--pan-ready .canvas-card {
  cursor: grab;
}

.canvas-surface--panning,
.canvas-surface--panning .canvas-card {
  cursor: grabbing;
}

.canvas-world {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
}

.canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: var(--space-lg);
  text-align: center;
  color: var(--text-muted);
  pointer-events: none;
}

/* Plovoucí ovládání nad plátnem */
.canvas-overlay {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: default;
}

.canvas-legend {
  left: var(--space-md);
  bottom: var(--space-md);
  margin: 0;
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.75rem;
  color: var(--text-muted);
  box-shadow: none;
  pointer-events: none;
}

.canvas-marquee {
  position: absolute;
  z-index: 1;
  border: 1px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  pointer-events: none;
}

.canvas-selected-count {
  padding: 0 var(--space-xs);
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.canvas-controls {
  right: var(--space-md);
  bottom: var(--space-md);
}

/* Filtr typů uprostřed horní hrany (výška se vejde do CANVAS_TOP_INSET) */
.canvas-filter {
  top: var(--space-sm);
  left: 50%;
  transform: translateX(-50%);
  gap: var(--space-sm);
  padding: 4px 4px 4px var(--space-sm);
}

.canvas-filter-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.canvas-filter-select {
  width: auto;
  min-width: 11rem;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 0.875rem;
}

/* Během přesunu nebo změny velikosti okna drží kurzor tvar a text se nevybírá */
.canvas-page--move {
  cursor: move;
  user-select: none;
}

.canvas-page--resize {
  cursor: nwse-resize;
  user-select: none;
}

.canvas-controls-sep {
  width: 1px;
  align-self: stretch;
  margin: 2px var(--space-xs);
  background: var(--border);
}

.canvas-zoom-value {
  min-width: 3.25rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.canvas-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  overflow: hidden;
  text-align: left;
  font: inherit;
  /* Vlastní barva kartičky přichází v proměnných --card-* (písmo dopočítané podle kontrastu) */
  color: var(--card-fg, var(--text));
  background: var(--card-bg, var(--bg-elevated));
  border: 1px solid var(--card-border, var(--border));
  border-radius: var(--radius-md);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  cursor: grab;
  touch-action: none;
  transition: box-shadow var(--transition), border-color var(--transition), opacity var(--transition);
}

.canvas-card:hover {
  border-color: var(--accent);
}

.canvas-card:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.canvas-card--dimmed {
  opacity: 0.15;
}

.canvas-card--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
}

.canvas-card--dragging {
  z-index: 1;
  cursor: grabbing;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.canvas-card-meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  font-size: 0.75rem;
  color: var(--card-muted, var(--text-muted));
}

.canvas-card-type {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.canvas-card-code {
  flex-shrink: 0;
  white-space: nowrap;
  font-family: var(--font-mono);
}

/* Tag priority na konci řádku vpravo */
.canvas-card-priority {
  flex-shrink: 0;
  margin-left: auto;
  align-self: center;
  padding: 1px 6px;
  white-space: nowrap;
}

.canvas-card-meta,
.canvas-card-name {
  flex-shrink: 0;
}

/* Dlouhý název se zalamuje na více řádků (nezkracuje se) */
.canvas-card-name {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.canvas-card-desc {
  /* Popis vyplní zbytek čtverce; co se nevejde, plynule zmizí */
  flex: 1;
  min-height: 0;
  margin-top: var(--space-xs);
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--card-muted, var(--text-muted));
  overflow-wrap: anywhere;
  -webkit-mask-image: linear-gradient(to bottom, #000 75%, transparent);
  mask-image: linear-gradient(to bottom, #000 75%, transparent);
}
</style>
