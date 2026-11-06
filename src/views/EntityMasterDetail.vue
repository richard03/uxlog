<template>
  <div class="master-detail" :class="{ 'master-detail--open': detailOpen }">
    <div class="master-detail-list">
      <ListScope>
        <component :is="listComponent" />
      </ListScope>
    </div>
    <div class="master-detail-detail">
      <router-view />
    </div>
  </div>
</template>

<script>
/** Načtené komponenty seznamů (podle funkce importu z routy). */
const listCache = new Map()
</script>

<script setup>
/**
 * Obrazovka seznamu entit sloučená s detailem: vlevo seznam (komponenta seznamu z props `list`),
 * vpravo detail vybrané položky (podřízená routa; bez výběru zástupný text).
 * Šířky sloupců v gridu: --grid-master-list / --grid-master-detail (style.css).
 * Úzké okno: bez výběru jen seznam, s výběrem jen detail (zpět přes drobky).
 */
import { computed, defineAsyncComponent, defineComponent, provide } from 'vue'
import { useRoute } from 'vue-router'
import { MASTER_LIST_KEY } from '../composables/useMasterDetail.js'

const props = defineProps({
  /** Načtení komponenty seznamu: () => import('…View.vue') */
  list: { type: Function, required: true },
})

const route = useRoute()

/** Router obal mezi různými seznamy znovu použije – komponenta seznamu se proto řídí aktuální props. */
const listComponent = computed(() => {
  if (!listCache.has(props.list)) listCache.set(props.list, defineAsyncComponent(props.list))
  return listCache.get(props.list)
})

/** Vpravo je otevřený detail (ne zástupný text). */
const detailOpen = computed(() => route.matched[route.matched.length - 1]?.meta?.entityDetail === true)

/** Kontext jen pro seznam (detail ho nedostane – jeho hlavička se vykresluje normálně). */
const ListScope = defineComponent({
  name: 'MasterListScope',
  setup(_, { slots }) {
    provide(MASTER_LIST_KEY, { detailOpen })
    return () => slots.default?.()
  },
})
</script>

<style scoped>
.master-detail {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
  gap: var(--grid-gap);
  align-items: start;
}

.master-detail-list {
  grid-column: span var(--grid-master-list);
  min-width: 0;
  /* Dlouhý seznam se posouvá sám, detail zůstává na očích */
  position: sticky;
  top: var(--space-md);
  max-height: calc(100vh - 9rem - var(--project-header-height, 0px) - var(--space-lg));
  overflow-y: auto;
  padding-right: var(--space-xs);
}

.master-detail-detail {
  grid-column: span var(--grid-master-detail);
  min-width: 0;
}

/* Vnořené obrazovky nemají vlastní šířku ani odsazení – určuje je tento layout */
.master-detail :deep(.container) {
  max-width: none;
  margin: 0;
  padding: 0;
}

/* Seznam v úzkém sloupci: karty pod sebou */
.master-detail-list :deep(.entity-list) {
  gap: var(--space-sm);
}

/* Seznam vedle detailu: jen nadpis a štítky, bez textu */
.master-detail-list :deep(.entity-card .card-desc) {
  display: none;
}

@media (max-width: 900px) {
  .master-detail-list,
  .master-detail-detail {
    grid-column: 1 / -1;
    position: static;
    max-height: none;
    overflow: visible;
  }

  .master-detail--open .master-detail-list,
  .master-detail:not(.master-detail--open) .master-detail-detail {
    display: none;
  }
}
</style>
