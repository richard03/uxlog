/**
 * Vue Router konfigurace pro UXLog.
 */

import EntityMasterDetail from '../views/EntityMasterDetail.vue'
import EntityDetailPlaceholder from '../views/EntityDetailPlaceholder.vue'
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
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'goals',
        component: EntityMasterDetail,
        props: { list: () => import('../views/GoalsView.vue') },
        children: [
          {
            path: '',
            name: 'goals',
            component: EntityDetailPlaceholder,
            meta: { title: 'Cíle' },
          },
          {
            path: ':goalId',
            name: 'goalDetail',
            component: () => import('../views/GoalDetailView.vue'),
            meta: { title: 'Cíl', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'team',
        component: EntityMasterDetail,
        props: { list: () => import('../views/TeamView.vue') },
        children: [
          {
            path: '',
            name: 'team',
            component: EntityDetailPlaceholder,
            meta: { title: 'Tým' },
          },
          {
            path: ':memberId',
            name: 'teamMemberDetail',
            component: () => import('../views/TeamMemberDetailView.vue'),
            meta: { title: 'Člen týmu', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'stakeholders',
        component: EntityMasterDetail,
        props: { list: () => import('../views/StakeholdersView.vue') },
        children: [
          {
            path: '',
            name: 'stakeholders',
            component: EntityDetailPlaceholder,
            meta: { title: 'Stakeholdeři' },
          },
          {
            path: ':stakeholderId',
            name: 'stakeholderDetail',
            component: () => import('../views/StakeholderDetailView.vue'),
            meta: { title: 'Stakeholder', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'competition',
        component: EntityMasterDetail,
        props: { list: () => import('../views/CompetitionView.vue') },
        children: [
          {
            path: '',
            name: 'competition',
            component: EntityDetailPlaceholder,
            meta: { title: 'Konkurence' },
          },
          {
            path: ':competitionId',
            name: 'competitionDetail',
            component: () => import('../views/CompetitionDetailView.vue'),
            meta: { title: 'Konkurence', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'hypothesis',
        component: EntityMasterDetail,
        props: { list: () => import('../views/HypothesisView.vue') },
        children: [
          {
            path: '',
            name: 'hypothesis',
            component: EntityDetailPlaceholder,
            meta: { title: 'Hypotézy' },
          },
          {
            path: ':hypothesisId',
            name: 'hypothesisDetail',
            component: () => import('../views/HypothesisDetailView.vue'),
            meta: { title: 'Hypotéza', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'risks',
        component: EntityMasterDetail,
        props: { list: () => import('../views/RisksView.vue') },
        children: [
          {
            path: '',
            name: 'risks',
            component: EntityDetailPlaceholder,
            meta: { title: 'Rizika' },
          },
          {
            path: ':riskId',
            name: 'riskDetail',
            component: () => import('../views/RiskDetailView.vue'),
            meta: { title: 'Riziko', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'sources',
        component: EntityMasterDetail,
        props: { list: () => import('../views/SourcesView.vue') },
        children: [
          {
            path: '',
            name: 'sources',
            component: EntityDetailPlaceholder,
            meta: { title: 'Zdroje' },
          },
          {
            path: ':sourceId',
            name: 'sourceDetail',
            component: () => import('../views/SourceDetailView.vue'),
            meta: { title: 'Zdroj', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'personas',
        component: EntityMasterDetail,
        props: { list: () => import('../views/PersonasView.vue') },
        children: [
          {
            path: '',
            name: 'personas',
            component: EntityDetailPlaceholder,
            meta: { title: 'Persony' },
          },
          {
            path: ':personaId',
            name: 'personaDetail',
            component: () => import('../views/PersonaDetailView.vue'),
            meta: { title: 'Persona', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'requirements',
        component: EntityMasterDetail,
        props: { list: () => import('../views/RequirementsView.vue') },
        children: [
          {
            path: '',
            name: 'requirements',
            component: EntityDetailPlaceholder,
            meta: { title: 'Požadavky' },
          },
          {
            path: ':requirementId',
            name: 'requirementDetail',
            component: () => import('../views/RequirementDetailView.vue'),
            meta: { title: 'Požadavek', entityDetail: true },
          },
        ],
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'scenarios',
        component: EntityMasterDetail,
        props: { list: () => import('../views/ScenariosView.vue') },
        children: [
          {
            path: '',
            name: 'scenarios',
            component: EntityDetailPlaceholder,
            meta: { title: 'Scénáře' },
          },
          {
            path: ':scenarioId',
            name: 'scenarioDetail',
            component: () => import('../views/ScenarioDetailView.vue'),
            meta: { title: 'Scénář', entityDetail: true },
          },
        ],
      },
      {
        path: 'activities/:activityId',
        name: 'activityDetail',
        component: () => import('../views/ActivityDetailView.vue'),
        meta: { title: 'Aktivita' },
      },
      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'tasks',
        component: EntityMasterDetail,
        props: { list: () => import('../views/TasksView.vue') },
        children: [
          {
            path: '',
            name: 'tasks',
            component: EntityDetailPlaceholder,
            meta: { title: 'Úkoly' },
          },
          {
            path: ':taskId',
            name: 'taskDetail',
            component: () => import('../views/TaskDetailView.vue'),
            meta: { title: 'Úkol', entityDetail: true },
          },
        ],
      },
      {
        path: 'canvas',
        name: 'projectCanvas',
        component: () => import('../views/CanvasView.vue'),
        // Přes celé okno – bez hlavičky obrazovky a bez Zápisníku
        meta: { title: 'Canvas', fullScreen: true },
      },
      {
        path: 'document',
        name: 'projectDocument',
        component: () => import('../views/DocumentView.vue'),
        // Přes celé okno – bez hlavičky obrazovky a bez Zápisníku, vlastní lišta s hledáním a exportem
        meta: { title: 'Dokument', fullScreen: true },
      },
      {
        path: 'history',
        name: 'projectHistory',
        component: () => import('../views/ProjectHistoryView.vue'),
        meta: { title: 'Historie změn' },
      },
      // Konfigurace projektu – stejné obrazovky jako výchozí konfigurace (/config), rozsah určuje useConfigScope
      {
        path: 'config',
        name: 'projectConfig',
        component: () => import('../views/ConfigView.vue'),
        meta: { title: 'Konfigurace projektu' },
      },
      {
        path: 'config/entities',
        name: 'projectConfigEntities',
        component: () => import('../views/ConfigEntitiesView.vue'),
        meta: { title: 'Entity' },
      },
      {
        path: 'config/entities/:entityType',
        name: 'projectConfigEntityAttrs',
        component: () => import('../views/ConfigEntityAttrsView.vue'),
        meta: { title: 'Atributy entity' },
      },
      {
        path: 'config/activities',
        name: 'projectConfigActivities',
        component: () => import('../views/ConfigActivitiesView.vue'),
        meta: { title: 'Aktivity' },
      },
      {
        path: 'config/activities/:templateKey',
        name: 'projectConfigActivityTemplate',
        component: () => import('../views/ConfigActivityTemplateView.vue'),
        meta: { title: 'Šablona aktivity' },
      },

      {
        // Seznam vlevo, detail vybrané položky vpravo (EntityMasterDetail)
        path: 'bugs',
        component: EntityMasterDetail,
        props: { list: () => import('../views/BugsView.vue') },
        children: [
          {
            path: '',
            name: 'bugs',
            component: EntityDetailPlaceholder,
            meta: { title: 'Chyby' },
          },
          {
            path: ':bugId',
            name: 'bugDetail',
            component: () => import('../views/BugDetailView.vue'),
            meta: { title: 'Chyba', entityDetail: true },
          },
        ],
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
