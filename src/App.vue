<template>
  <div class="app">
    <a href="#main" class="skip-link">{{ t.common.skipToContent }}</a>
    <AppHeader />
    <main id="main" class="main" role="main">
      <router-view v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="container">
              <p>{{ t.common.loading }}</p>
            </div>
          </template>
        </Suspense>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import AppHeader from './components/AppHeader.vue'
import { useI18n } from './composables/useI18n.js'

const { t } = useI18n()
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding-top: var(--space-md);
}
</style>
