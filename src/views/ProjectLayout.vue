<template>
  <div
    class="project-layout"
    :class="fullScreen ? 'project-layout--full' : 'container'"
    :style="{ '--project-header-height': `${headerHeight}px` }"
  >
    <!-- Hlavička aktuální obrazovky (ProjectPageHeader ji sem teleportuje) – přes celou šířku -->
    <div v-show="!fullScreen" :id="PROJECT_HEADER_TARGET_ID" ref="headerEl" class="project-layout-header"></div>
    <!-- Obsah obrazovky vlevo -->
    <div class="project-layout-content">
      <router-view />
    </div>
    <!-- Zápisník (chat) vpravo – stejný na všech obrazovkách projektu; jedna instance, přežije navigaci.
         Na celoobrazovkové obrazovce (Canvas) je jen skrytý, aby neodeslaný koncept zůstal zachovaný. -->
    <aside v-if="project" v-show="!fullScreen" class="project-layout-chat">
      <NotebookChat :project-id="projectId" />
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import NotebookChat from '../components/NotebookChat.vue'
import { PROJECT_HEADER_TARGET_ID } from '../components/ProjectPageHeader.vue'

const route = useRoute()
const store = useStore()

const projectId = computed(() => String(route.params.id || ''))
const project = computed(() => store.getProject(projectId.value))
/** Obrazovka přes celé okno (meta.fullScreen, např. Canvas) – bez hlavičky a Zápisníku. */
const fullScreen = computed(() => route.meta.fullScreen === true)

/** Výška hlavičky – chat pod ní musí se vstupním polem zůstat celý na obrazovce. */
const headerEl = ref(null)
const headerHeight = ref(0)
let resizeObserver = null

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !headerEl.value) return
  resizeObserver = new ResizeObserver(([entry]) => {
    headerHeight.value = Math.round(entry.target.getBoundingClientRect().height)
  })
  resizeObserver.observe(headerEl.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<style scoped>
.project-layout {
  display: grid;
  /* Obrazovka vlevo, Zápisník vpravo – každý polovinu šířky */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: var(--space-lg);
  align-items: start;
}

.project-layout-header {
  grid-column: 1 / -1;
}

/* Celoobrazovkový režim: obrazovka vyplní celou šířku i zbylou výšku okna */
.project-layout--full {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.project-layout--full > .project-layout-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.project-layout-header:empty {
  display: none;
}

/* Chat zůstává na očích i při scrollování dlouhého obsahu vlevo */
.project-layout-chat {
  position: sticky;
  top: var(--space-md);
  display: flex;
  flex-direction: column;
  /* Celý chat (i pole pro zprávu) musí být vidět bez scrollování stránky:
     AppHeader (~71px) + odsazení main a .container (2 × 16px) + StatusBar (24px) + rezerva dole
     + hlavička obrazovky projektu (měřeno v JS) */
  max-height: calc(100vh - 9rem - var(--project-header-height, 0px) - var(--space-lg)); /* + okraj pod hlavičkou */
  min-height: 0;
}

.project-layout-chat > * {
  flex: 1;
  min-height: 0;
}

/* Vnořená obrazovka už nemá vlastní šířku ani odsazení – určuje je layout */
.project-layout-content > :deep(.container) {
  max-width: none;
  margin: 0;
  padding: 0;
}

/* Úzká okna: obsah nahoře, chat pod ním */
@media (max-width: 800px) {
  .project-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .project-layout-chat {
    position: static;
    max-height: none;
  }
}
</style>
