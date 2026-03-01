<template>
  <div>
    <AppHeader />
    <LoadingSpinner v-if="projects.loading" />
    <template v-else-if="projects.currentProject">
      <ErrorBanner v-if="deleteError" :message="deleteError" @dismiss="deleteError = null" />
      <div class="detail-header">
        <div class="breadcrumb">
          <RouterLink to="/">Projects</RouterLink> › {{ projects.currentProject.name }}
        </div>
        <div class="header-actions">
          <button class="btn-edit" @click="showEdit = true">Edit</button>
          <button class="btn-danger" @click="handleDelete">Delete</button>
        </div>
      </div>

      <div class="project-meta">
        <StatusBadge   :status="projects.currentProject.status" />
        <PriorityBadge :priority="projects.currentProject.priority" />
        <span class="scope-label">{{ scopeLabels[projects.currentProject.scope] }}</span>
      </div>

      <TabBar :tabs="tabs" v-model="activeTab" />

      <PageWrapper>
        <TaskList         v-if="activeTab === 'tasks'"        :project-id="projectId" />
        <MemberList       v-if="activeTab === 'team'"         :project-id="projectId" />
        <StakeholderGrid  v-if="activeTab === 'stakeholders'" :project-id="projectId" />
        <CompetitionList  v-if="activeTab === 'competition'"  :project-id="projectId" />
        <PersonaList      v-if="activeTab === 'personas'"     :project-id="projectId" />
        <GoalList         v-if="activeTab === 'goals'"        :project-id="projectId" />
        <ScenarioList     v-if="activeTab === 'scenarios'"    :project-id="projectId" />
        <RequirementList  v-if="activeTab === 'requirements'" :project-id="projectId" />
        <FigmaSettings    v-if="activeTab === 'settings'"     :project-id="projectId" />
      </PageWrapper>
    </template>
    <ErrorBanner v-else :message="projects.error || 'Project not found'" />

    <!-- Edit modal -->
    <Modal :open="showEdit" title="Edit Project" @close="showEdit = false">
      <ProjectForm
        :project="projects.currentProject"
        :saving="saving"
        @submit="handleUpdate"
        @cancel="showEdit = false"
      />
    </Modal>
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useFigmaStore }    from '@/stores/figma'
import { useConfirm }       from '@/composables/useConfirm'
import { scopeLabels }      from '@/utils/scopeLabels'

import AppHeader       from '@/components/layout/AppHeader.vue'
import PageWrapper     from '@/components/layout/PageWrapper.vue'
import TabBar          from '@/components/layout/TabBar.vue'
import StatusBadge     from '@/components/projects/StatusBadge.vue'
import PriorityBadge   from '@/components/projects/PriorityBadge.vue'
import ProjectForm     from '@/components/projects/ProjectForm.vue'
import TaskList        from '@/components/tasks/TaskList.vue'
import MemberList      from '@/components/members/MemberList.vue'
import StakeholderGrid from '@/components/stakeholders/StakeholderGrid.vue'
import CompetitionList from '@/components/competition/CompetitionList.vue'
import PersonaList     from '@/components/personas/PersonaList.vue'
import GoalList        from '@/components/goals/GoalList.vue'
import ScenarioList    from '@/components/scenarios/ScenarioList.vue'
import RequirementList from '@/components/requirements/RequirementList.vue'
import FigmaSettings   from '@/components/figma/FigmaSettings.vue'
import Modal           from '@/components/ui/Modal.vue'
import LoadingSpinner  from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner     from '@/components/ui/ErrorBanner.vue'
import ConfirmDialog   from '@/components/ui/ConfirmDialog.vue'

const route    = useRoute()
const router   = useRouter()
const projects = useProjectsStore()
const figma    = useFigmaStore()
const { confirm } = useConfirm()

const projectId  = computed(() => route.params.id)
const showEdit   = ref(false)
const saving     = ref(false)
const activeTab  = ref('tasks')
const deleteError = ref(null)

const tabs = [
  { key: 'tasks',        label: 'Tasks' },
  { key: 'team',         label: 'Team' },
  { key: 'stakeholders', label: 'Stakeholders' },
  { key: 'competition',  label: 'Competition' },
  { key: 'personas',     label: 'Personas' },
  { key: 'goals',        label: 'Goals' },
  { key: 'scenarios',    label: 'Scenarios' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'settings',     label: 'Figma Settings' },
]

onMounted(async () => {
  await projects.fetchOne(projectId.value)
  await figma.fetchAll(projectId.value)
})

watch(projectId, async (id) => {
  await projects.fetchOne(id)
  figma.$reset()
  await figma.fetchAll(id)
})

async function handleUpdate(data) {
  saving.value = true
  try {
    await projects.update(projectId.value, data)
    showEdit.value = false
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  const ok = await confirm(`Delete project "${projects.currentProject?.name}"? This cannot be undone.`)
  if (!ok) return
  deleteError.value = null
  try {
    await projects.remove(projectId.value)
    router.push('/')
  } catch (e) {
    deleteError.value = e.response?.data?.error || 'Failed to delete project'
  }
}
</script>

<style scoped>
.detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  background: #fff;
}
.breadcrumb { font-size: 0.875rem; color: #6b7280; }
.breadcrumb a { color: #4f46e5; text-decoration: none; }
.header-actions { display: flex; gap: 0.5rem; }
.btn-edit, .btn-danger {
  padding: 0.375rem 0.875rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;
}
.btn-edit   { border: 1px solid #d1d5db; background: #fff; }
.btn-danger { border: none; background: #fef2f2; color: #dc2626; }
.project-meta {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.75rem 1.5rem; background: #fff;
}
.scope-label { font-size: 0.8rem; color: #6b7280; }
</style>
