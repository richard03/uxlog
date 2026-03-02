/**
 * Vue Router konfigurace pro UXLog.
 */

import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'projects',
    component: () => import('../views/ProjectListView.vue'),
    meta: { title: 'Projekty' },
  },
  {
    path: '/project/:id',
    name: 'project',
    component: () => import('../views/ProjectDetailView.vue'),
    meta: { title: 'Projekt' },
  },
  {
    path: '/project/:id/goals',
    name: 'goals',
    component: () => import('../views/GoalsView.vue'),
    meta: { title: 'Cíle' },
  },
  {
    path: '/project/:id/stakeholders',
    name: 'stakeholders',
    component: () => import('../views/StakeholdersView.vue'),
    meta: { title: 'Stakeholdeři' },
  },
  {
    path: '/project/:id/competition',
    name: 'competition',
    component: () => import('../views/CompetitionView.vue'),
    meta: { title: 'Konkurence' },
  },
  {
    path: '/project/:id/hypothesis',
    name: 'hypothesis',
    component: () => import('../views/HypothesisView.vue'),
    meta: { title: 'Hypotézy' },
  },
  {
    path: '/project/:id/personas',
    name: 'personas',
    component: () => import('../views/PersonasView.vue'),
    meta: { title: 'Persony' },
  },
  {
    path: '/project/:id/requirements',
    name: 'requirements',
    component: () => import('../views/RequirementsView.vue'),
    meta: { title: 'Požadavky' },
  },
  {
    path: '/project/:id/scenarios',
    name: 'scenarios',
    component: () => import('../views/ScenariosView.vue'),
    meta: { title: 'Scénáře' },
  },
  {
    path: '/project/:id/scenarios/:scenarioId',
    name: 'scenarioDetail',
    component: () => import('../views/ScenarioDetailView.vue'),
    meta: { title: 'Scénář' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | UXLog` : 'UXLog'
})

export default router
