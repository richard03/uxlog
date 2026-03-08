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
    key: 'user_interviews',
    group: 'research',
    defaultName: 'Rozhovory s uživateli',
    defaultDescription: 'Kvalitativní výzkum formou polostrukturovaných rozhovorů s cílovými uživateli.',
    sortOrder: 70,
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
    sortOrder: 40,
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
    sortOrder: 60,
    checklist: [
      { id: 'proto_personas', label: 'Vytvořili jsme protopersony podle cílových skupin' },
      { id: 'goals_needs', label: 'Zdokumentovali jsme cíle, potřeby a frustrace protoperson' },
      { id: 'recruitment', label: 'Definovali jsme rekrutační kriteria a odsouhlasili se stakeholdery' },
      { id: 'updated', label: 'Aktualizovali jsme persony podle výsledků výzkumu' },
    ],
  },
  {
    key: 'scenarios',
    group: 'research',
    defaultName: 'Definování scénářů',
    defaultDescription: 'Popis typických situací, ve kterých uživatelé produkt nebo službu využívají.',
    sortOrder: 100,
    checklist: [
      { id: 'main_scenarios', label: 'definovali jsme všechny hlavní scénáře' },
      { id: 'secondary_scenarios', label: 'Definovali jsme všechny vedlejší scénáře, které chceme implementovat' },
      { id: 'error_scenarios', label: 'Zmapovali jsme všechny chybové scénáře' },
      { id: 'quantitative', label: 'Doplnili jsme kvantitativní data scénářů (počet uživatelů, četnost spuštění, hodnotu)' },
      { id: 'stakeholders_review', label: 'Představili jsme scénáře stakeholderům' },
    ],
  },
  {
    key: 'requirements',
    group: 'research',
    defaultName: 'Sběr požadavků',
    defaultDescription: 'Specifikace funkčních a nefunkčních požadavků na produkt či službu.',
    sortOrder: 90,
    checklist: [
      { id: 'business', label: 'Zmapovali jsme požadavky byznysu' },
      { id: 'legal', label: 'Zmapovali jsme právní požadavky' },
      { id: 'security', label: 'Zmapovali jsme bezpečnostní požadavky' },
      { id: 'technical', label: 'Zmapovali jsme technické požadavky' },
      { id: 'nonfunctional', label: 'Zmapovali jsme nefunkcionální požadavky' },
      { id: 'motivation', label: 'Každý požadavek má zdůvodnění (co se stane když nebude splněn)' },
      { id: 'priority', label: 'Každý požadavek má určenou prioritu' },
      { id: 'conflicts', label: 'Vyřešili jsme konflikty požadavků' },
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
      { id: 'data_model', label: 'Zmapovali jsme pojmy a entity (datový model)' },
      { id: 'card_sorting', label: 'Provedli jsme výzkum IA (cardsorting apod.) s uživateli' },
      { id: 'navigation', label: 'Navrhli jsme IA (struktura aplikace, navigace)' },
      { id: 'tested', label: 'Otestovali jsme informační architekturu s uživateli (usability testing, tree testing)' },
    ],
  },
  {
    key: 'wireframing',
    group: 'design',
    defaultName: 'Wireframing',
    defaultDescription: 'Tvorba drátěných modelů obrazovek zachycujících rozvržení a funkce bez vizuálního designu.',
    sortOrder: 120,
    checklist: [
      { id: 'main_flows', label: 'Navrhli jsme všechny obrazovky hlavních flows' },
      { id: 'secondary_flows', label: 'Navrhli jsme všechny obrazovky vedlejších flows' },
      { id: 'error_flows', label: 'Navrhli jsme všechny potřebné obrazovky chybových flows' },
      { id: 'variants', label: 'Navrhli jsme všechny potřebné varianty (prázdné seznamy, nastavené filtry atd.)' },
      { id: 'iterated', label: 'Aktualizovali jsme WF podle připomínek a zjištění z výzkumu a testů' },
      { id: 'approved', label: 'Odsouhlasili jsem WF se stakeholdery' },
    ],
  },
  {
    key: 'usability_testing',
    group: 'design',
    defaultName: 'Usability testing',
    defaultDescription: 'Testování použitelnosti s reálnými uživateli k odhalení problémů v rozhraní.',
    sortOrder: 140,
    checklist: [
      { id: 'hypotheses', label: 'Formulovali jsme hypotézy' },
      { id: 'tasks', label: 'Definovali jsme testovací scénáře a úkoly' },
      { id: 'prototype', label: 'Připravili jsme prototyp' },
      { id: 'recruitment_criteria', label: 'Sepsali jsme rekrutační kriteria' },
      { id: 'stakeholder_approval', label: 'Odsouhlasili jsme zadání testu se stakeholdery' },
      { id: 'recruited', label: 'Provedli jsme rekrutaci a domluvili místo a termíny testů' },
      { id: 'conducted', label: 'Provedli jsme testy' },
      { id: 'insights', label: 'Sepsali jsme insighty z uživatelských testů' },
      { id: 'issues', label: 'Identifikovali jsme problémy a navrhli řešení' },
      { id: 'iterated', label: 'Zanesli jsme dohodnutá řešení do návrhu (wireframe)' },
      { id: 'shared', label: 'Seznámili jsme stakeholdery s provedenými změnami' },
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
