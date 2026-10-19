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
    // Všechny obrazovky projektu sdílí layout se Zápisníkem (chat) vpravo
    path: '/project/:id',
    component: () => import('../views/ProjectLayout.vue'),
    children: [
      {
        path: '',
        name: 'project',
        component: () => import('../views/ProjectDetailView.vue'),
        meta: { title: 'Projekt' },
      },
      {
        path: 'goals',
        name: 'goals',
        component: () => import('../views/GoalsView.vue'),
        meta: { title: 'Cíle' },
      },
      {
        path: 'goals/:goalId',
        name: 'goalDetail',
        component: () => import('../views/GoalDetailView.vue'),
        meta: { title: 'Cíl' },
      },
      {
        path: 'team',
        name: 'team',
        component: () => import('../views/TeamView.vue'),
        meta: { title: 'Tým' },
      },
      {
        path: 'team/:memberId',
        name: 'teamMemberDetail',
        component: () => import('../views/TeamMemberDetailView.vue'),
        meta: { title: 'Člen týmu' },
      },
      {
        path: 'stakeholders',
        name: 'stakeholders',
        component: () => import('../views/StakeholdersView.vue'),
        meta: { title: 'Stakeholdeři' },
      },
      {
        path: 'stakeholders/:stakeholderId',
        name: 'stakeholderDetail',
        component: () => import('../views/StakeholderDetailView.vue'),
        meta: { title: 'Stakeholder' },
      },
      {
        path: 'competition',
        name: 'competition',
        component: () => import('../views/CompetitionView.vue'),
        meta: { title: 'Konkurence' },
      },
      {
        path: 'competition/:competitionId',
        name: 'competitionDetail',
        component: () => import('../views/CompetitionDetailView.vue'),
        meta: { title: 'Konkurence' },
      },
      {
        path: 'hypothesis',
        name: 'hypothesis',
        component: () => import('../views/HypothesisView.vue'),
        meta: { title: 'Hypotézy' },
      },
      {
        path: 'hypothesis/:hypothesisId',
        name: 'hypothesisDetail',
        component: () => import('../views/HypothesisDetailView.vue'),
        meta: { title: 'Hypotéza' },
      },
      {
        path: 'risks',
        name: 'risks',
        component: () => import('../views/RisksView.vue'),
        meta: { title: 'Rizika' },
      },
      {
        path: 'risks/:riskId',
        name: 'riskDetail',
        component: () => import('../views/RiskDetailView.vue'),
        meta: { title: 'Riziko' },
      },
      {
        path: 'personas',
        name: 'personas',
        component: () => import('../views/PersonasView.vue'),
        meta: { title: 'Persony' },
      },
      {
        path: 'personas/:personaId',
        name: 'personaDetail',
        component: () => import('../views/PersonaDetailView.vue'),
        meta: { title: 'Persona' },
      },
      {
        path: 'requirements',
        name: 'requirements',
        component: () => import('../views/RequirementsView.vue'),
        meta: { title: 'Požadavky' },
      },
      {
        path: 'requirements/:requirementId',
        name: 'requirementDetail',
        component: () => import('../views/RequirementDetailView.vue'),
        meta: { title: 'Požadavek' },
      },
      {
        path: 'scenarios',
        name: 'scenarios',
        component: () => import('../views/ScenariosView.vue'),
        meta: { title: 'Scénáře' },
      },
      {
        path: 'scenarios/:scenarioId',
        name: 'scenarioDetail',
        component: () => import('../views/ScenarioDetailView.vue'),
        meta: { title: 'Scénář' },
      },
      {
        path: 'activities/:activityId',
        name: 'activityDetail',
        component: () => import('../views/ActivityDetailView.vue'),
        meta: { title: 'Aktivita' },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('../views/TasksView.vue'),
        meta: { title: 'Úkoly' },
      },
      {
        path: 'tasks/:taskId',
        name: 'taskDetail',
        component: () => import('../views/TaskDetailView.vue'),
        meta: { title: 'Úkol' },
      },
      {
        path: 'canvas',
        name: 'projectCanvas',
        component: () => import('../views/CanvasView.vue'),
        // Přes celé okno – bez hlavičky obrazovky a bez Zápisníku
        meta: { title: 'Canvas', fullScreen: true },
      },
      {
        path: 'history',
        name: 'projectHistory',
        component: () => import('../views/ProjectHistoryView.vue'),
        meta: { title: 'Historie změn' },
      },
      {
        path: 'bugs',
        name: 'bugs',
        component: () => import('../views/BugsView.vue'),
        meta: { title: 'Chyby' },
      },
      {
        path: 'bugs/:bugId',
        name: 'bugDetail',
        component: () => import('../views/BugDetailView.vue'),
        meta: { title: 'Chyba' },
      },
    ],
  },
  {
    path: '/config',
    name: 'config',
    component: () => import('../views/ConfigView.vue'),
    meta: { title: 'Konfigurace' },
  },
  {
    path: '/config/entities',
    name: 'configEntities',
    component: () => import('../views/ConfigEntitiesView.vue'),
    meta: { title: 'Entity' },
  },
  {
    path: '/config/entities/:entityType',
    name: 'configEntityAttrs',
    component: () => import('../views/ConfigEntityAttrsView.vue'),
    meta: { title: 'Atributy entity' },
  },
  {
    path: '/config/activities',
    name: 'configActivities',
    component: () => import('../views/ConfigActivitiesView.vue'),
    meta: { title: 'Šablony aktivit' },
  },
  {
    path: '/config/activities/:templateKey',
    name: 'configActivityTemplate',
    component: () => import('../views/ConfigActivityTemplateView.vue'),
    meta: { title: 'Šablona aktivity' },
  },
  {
    path: '/config/deadlines',
    name: 'configDeadlines',
    component: () => import('../views/ConfigDeadlinesView.vue'),
    meta: { title: 'Termíny' },
  },
  {
    path: '/config/api-keys',
    name: 'configApiKeys',
    component: () => import('../views/ConfigApiKeysView.vue'),
    meta: { title: 'API klíče' },
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
