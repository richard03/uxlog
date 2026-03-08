/**
 * Předdefinované typy UX aktivit seřazené v typickém pořadí UX procesu.
 */

/** @typedef {'project'|'research'|'design'} ActivityGroup */

/**
 * @typedef {Object} ActivityType
 * @property {string} key - Unikátní klíč typu
 * @property {ActivityGroup} group - Skupina aktivit
 * @property {string} defaultName - Výchozí název
 * @property {string} defaultDescription - Výchozí popis (jen pro čtení)
 * @property {number} sortOrder - Pořadí v UX procesu
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {string} id - Unikátní klíč položky v rámci typu aktivity
 * @property {string} label - Text položky checklistu
 */

/** @type {ActivityType[]} */
export const ACTIVITY_TYPES = [
  {
    key: 'kickoff',
    group: 'project',
    defaultName: 'Kick-off meeting',
    defaultDescription: 'Úvodní setkání týmu k nastavení záměrů, cílů a způsobu spolupráce na projektu.',
    sortOrder: 10,
    checklist: [
      { id: 'scope', label: 'Odsouhlasili jsme záměr a rozsah projektu' },
      { id: 'collaboration', label: 'Nastavili jsme způsob spolupráce a komunikace' },
      { id: 'timeline', label: 'Odsouhlasili jsme harmonogram a milníky' },
      { id: 'stakeholders', label: 'Identifikovali jsme klíčové stakeholdery' },
      { id: 'roles', label: 'Rozdělili jsme role a odpovědnosti v týmu' },
    ],
  },
  {
    key: 'goals_metrics',
    group: 'project',
    defaultName: 'Definování cílů a metrik',
    defaultDescription: 'Stanovení měřitelných cílů projektu a KPI pro vyhodnocení úspěchu.',
    sortOrder: 20,
    checklist: [
      { id: 'smart', label: 'Definovali jsme měřitelné cíle (SMART)' },
      { id: 'kpi', label: 'Stanovili jsme KPI pro každý cíl' },
      { id: 'baseline', label: 'Zdokumentovali jsme výchozí hodnoty metrik (baseline)' },
      { id: 'stakeholder_approval', label: 'Odsouhlasili jsme cíle se stakeholdery' },
    ],
  },
  {
    key: 'stakeholder_analysis',
    group: 'research',
    defaultName: 'Analýza stakeholderů',
    defaultDescription: 'Identifikace a analýza klíčových zainteresovaných stran projektu.',
    sortOrder: 30,
    checklist: [
      { id: 'identified', label: 'Identifikovali jsme všechny relevantní stakeholdery' },
      { id: 'matrix', label: 'Známe úroveň vlivu a zájmu každého stakeholdera' },
      { id: 'needs', label: 'Zmapovali jsme potřeby a očekávání stakeholderů' },
      { id: 'comm_plan', label: 'Máme komunikační plán pro každou skupinu stakeholderů' },
    ],
  },
  {
    key: 'desk_research',
    group: 'research',
    defaultName: 'Desk research',
    defaultDescription: 'Shromažďování existujících informací z dostupných zdrojů (literatury, dat, studií).',
    sortOrder: 40,
    checklist: [
      { id: 'sources', label: 'Prošli jsme existující studie, analytiky a reporty' },
      { id: 'constraints', label: 'Zmapovali jsme legislativní a technická omezení' },
      { id: 'summary', label: 'Shrnuli jsme klíčové poznatky z dostupných zdrojů' },
      { id: 'gaps', label: 'Identifikovali jsme mezery ve znalostech' },
    ],
  },
  {
    key: 'user_interviews',
    group: 'research',
    defaultName: 'Rozhovory s uživateli',
    defaultDescription: 'Kvalitativní výzkum formou polostrukturovaných rozhovorů s cílovými uživateli.',
    sortOrder: 50,
    checklist: [
      { id: 'guide', label: 'Připravili jsme diskuzní scénář (discussion guide)' },
      { id: 'conducted', label: 'Provedli jsme alespoň 5 rozhovorů s uživateli' },
      { id: 'analyzed', label: 'Analyzovali jsme záznamy a přepisy rozhovorů' },
      { id: 'patterns', label: 'Identifikovali jsme opakující se vzorce a témata' },
      { id: 'shared', label: 'Sdíleli jsme výstupy s týmem' },
    ],
  },
  {
    key: 'competitive_analysis',
    group: 'research',
    defaultName: 'Analýza konkurence',
    defaultDescription: 'Zmapování konkurenčních řešení – silné stránky, slabiny a inspirace.',
    sortOrder: 60,
    checklist: [
      { id: 'identified', label: 'Identifikovali jsme přímé i nepřímé konkurenty' },
      { id: 'strengths', label: 'Zmapovali jsme silné a slabé stránky konkurence' },
      { id: 'inspiration', label: 'Zaznamenali jsme inspiraci pro náš projekt' },
      { id: 'advantage', label: 'Identifikovali jsme naši konkurenční výhodu' },
    ],
  },
  {
    key: 'personas',
    group: 'research',
    defaultName: 'Tvorba person',
    defaultDescription: 'Vytvoření reprezentativních profilů cílových uživatelů na základě výzkumu.',
    sortOrder: 70,
    checklist: [
      { id: 'research_based', label: 'Persony jsou postaveny na výzkumných datech (ne na domněnkách)' },
      { id: 'profiles', label: 'Každá persona má jméno a klíčové charakteristiky' },
      { id: 'goals_needs', label: 'Zdokumentovali jsme cíle, potřeby a frustrace person' },
      { id: 'approved', label: 'Odsouhlasili jsme persony se stakeholdery' },
    ],
  },
  {
    key: 'scenarios',
    group: 'research',
    defaultName: 'Definování scénářů',
    defaultDescription: 'Popis typických situací, ve kterých uživatelé produkt nebo službu využívají.',
    sortOrder: 80,
    checklist: [
      { id: 'per_persona', label: 'Definovali jsme scénáře pro každou personu' },
      { id: 'context', label: 'Každý scénář popisuje konkrétní situaci a cíl uživatele' },
      { id: 'frequency', label: 'Ohodnotili jsme frekvenci a hodnotu každého scénáře' },
      { id: 'prioritized', label: 'Prioritizovali jsme scénáře (MoSCoW)' },
    ],
  },
  {
    key: 'hypotheses',
    group: 'research',
    defaultName: 'Formulace hypotéz',
    defaultDescription: 'Formulování a prioritizace předpokladů, které je třeba ověřit výzkumem nebo testováním.',
    sortOrder: 90,
    checklist: [
      { id: 'testable', label: 'Formulovali jsme hypotézy jako testovatelná tvrzení' },
      { id: 'criteria', label: 'Každá hypotéza má jasné kritérium ověření' },
      { id: 'prioritized', label: 'Prioritizovali jsme hypotézy dle míry rizika' },
      { id: 'plan', label: 'Naplánovali jsme způsob ověření každé hypotézy' },
    ],
  },
  {
    key: 'requirements',
    group: 'research',
    defaultName: 'Definování požadavků',
    defaultDescription: 'Specifikace funkčních a nefunkčních požadavků na produkt či službu.',
    sortOrder: 100,
    checklist: [
      { id: 'functional', label: 'Definovali jsme funkční požadavky' },
      { id: 'nonfunctional', label: 'Definovali jsme nefunkční požadavky' },
      { id: 'moscow', label: 'Přiřadili jsme MoSCoW prioritu každému požadavku' },
      { id: 'conflicts', label: 'Identifikovali jsme konflikty mezi požadavky' },
      { id: 'approved', label: 'Odsouhlasili jsme požadavky se stakeholdery' },
    ],
  },
  {
    key: 'information_architecture',
    group: 'design',
    defaultName: 'Informační architektura',
    defaultDescription: 'Návrh struktury obsahu, navigace a organizace informací.',
    sortOrder: 110,
    checklist: [
      { id: 'card_sorting', label: 'Provedli jsme card sorting nebo tree testing' },
      { id: 'navigation', label: 'Navrhli jsme strukturu navigace a obsahu' },
      { id: 'sitemap', label: 'Zdokumentovali jsme sitemapu' },
      { id: 'tested', label: 'Otestovali jsme IA s uživateli' },
    ],
  },
  {
    key: 'wireframing',
    group: 'design',
    defaultName: 'Wireframing',
    defaultDescription: 'Tvorba drátěných modelů obrazovek zachycujících rozvržení a funkce bez vizuálního designu.',
    sortOrder: 120,
    checklist: [
      { id: 'key_screens', label: 'Navrhli jsme drátěné modely klíčových obrazovek' },
      { id: 'coverage', label: 'Wireframy pokrývají všechny definované scénáře' },
      { id: 'reviewed', label: 'Revidovali jsme wireframy s týmem' },
      { id: 'iterated', label: 'Zapracovali jsme zpětnou vazbu' },
    ],
  },
  {
    key: 'prototyping',
    group: 'design',
    defaultName: 'Prototypování',
    defaultDescription: 'Vytvoření interaktivního prototypu pro testování a prezentaci řešení.',
    sortOrder: 130,
    checklist: [
      { id: 'prototype', label: 'Vytvořili jsme interaktivní prototyp' },
      { id: 'flows', label: 'Prototyp pokrývá klíčové user flows' },
      { id: 'stakeholders', label: 'Sdíleli jsme prototyp se stakeholdery' },
      { id: 'ready', label: 'Prototyp je připraven pro usability testing' },
    ],
  },
  {
    key: 'usability_testing',
    group: 'design',
    defaultName: 'Usability testing',
    defaultDescription: 'Testování použitelnosti s reálnými uživateli k odhalení problémů v rozhraní.',
    sortOrder: 140,
    checklist: [
      { id: 'tasks', label: 'Definovali jsme testovací scénáře a úkoly' },
      { id: 'conducted', label: 'Provedli jsme testy s minimálně 5 účastníky' },
      { id: 'recorded', label: 'Zaznamenali jsme a analyzovali průběh testů' },
      { id: 'issues', label: 'Identifikovali jsme kritické usability problémy' },
      { id: 'iterated', label: 'Zapracovali jsme výstupy do dalšího designu' },
    ],
  },
  {
    key: 'design_handoff',
    group: 'design',
    defaultName: 'Předání výstupů',
    defaultDescription: 'Finalizace a předání podkladů vývojářskému týmu včetně specifikací a assetů.',
    sortOrder: 150,
    checklist: [
      { id: 'specs', label: 'Finalizovali jsme designové specifikace' },
      { id: 'assets', label: 'Připravili jsme assety pro vývojáře' },
      { id: 'interactions', label: 'Zdokumentovali jsme interakce a animace' },
      { id: 'review', label: 'Provedli jsme design review s vývojáři' },
    ],
  },
  {
    key: 'retrospective',
    group: 'project',
    defaultName: 'Retrospektiva',
    defaultDescription: 'Zpětné hodnocení průběhu projektu a identifikace příležitostí ke zlepšení.',
    sortOrder: 160,
    checklist: [
      { id: 'positives', label: 'Zhodnotili jsme, co fungovalo dobře' },
      { id: 'improvements', label: 'Identifikovali jsme oblasti ke zlepšení' },
      { id: 'actions', label: 'Navrhli jsme konkrétní akční kroky' },
      { id: 'documented', label: 'Zdokumentovali jsme poznatky pro příští projekty' },
    ],
  },
]

/**
 * Vrátí typ aktivity podle klíče.
 * @param {string} key
 * @returns {ActivityType|undefined}
 */
export function getActivityType(key) {
  return ACTIVITY_TYPES.find((t) => t.key === key)
}
