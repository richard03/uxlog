<template>
  <div>
    <AppHeader />
    <PageWrapper>
      <div class="page-header">
        <h2>Projects</h2>
        <button class="btn-primary" @click="showCreate = true">+ New Project</button>
      </div>

      <ErrorBanner :message="projects.error" @dismiss="projects.error = null" />
      <LoadingSpinner v-if="projects.loading" />

      <div v-if="projects.list.length" class="grid">
        <ProjectCard v-for="p in projects.list" :key="p.id" :project="p" />
      </div>
      <EmptyState
        v-else-if="!projects.loading"
        icon="📁"
        title="No projects yet"
        subtitle="Create your first UX project to get started."
      />

      <Modal :open="showCreate" title="New Project" @close="showCreate = false">
        <ProjectForm :saving="saving" @submit="handleCreate" @cancel="showCreate = false" />
      </Modal>
    </PageWrapper>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import AppHeader     from '@/components/layout/AppHeader.vue'
import PageWrapper   from '@/components/layout/PageWrapper.vue'
import ProjectCard   from '@/components/projects/ProjectCard.vue'
import ProjectForm   from '@/components/projects/ProjectForm.vue'
import Modal         from '@/components/ui/Modal.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner   from '@/components/ui/ErrorBanner.vue'
import EmptyState    from '@/components/ui/EmptyState.vue'

const projects   = useProjectsStore()
const showCreate = ref(false)
const saving     = ref(false)

onMounted(() => projects.fetchAll())

async function handleCreate(data) {
  saving.value = true
  try {
    await projects.create(data)
    showCreate.value = false
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
h2 { margin: 0; font-size: 1.5rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.btn-primary { padding: 0.5rem 1.25rem; border: none; border-radius: 6px; background: #4f46e5; color: #fff; cursor: pointer; font-size: 0.9rem; }
</style>
