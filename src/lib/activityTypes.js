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

/** @type {ActivityType[]} */
export const ACTIVITY_TYPES = [
  {
    key: 'kickoff',
    group: 'project',
    defaultName: 'Kick-off meeting',
    defaultDescription: 'Úvodní setkání týmu k nastavení záměrů, cílů a způsobu spolupráce na projektu.',
    sortOrder: 10,
  },
  {
    key: 'goals_metrics',
    group: 'project',
    defaultName: 'Definování cílů a metrik',
    defaultDescription: 'Stanovení měřitelných cílů projektu a KPI pro vyhodnocení úspěchu.',
    sortOrder: 20,
  },
  {
    key: 'stakeholder_analysis',
    group: 'research',
    defaultName: 'Analýza stakeholderů',
    defaultDescription: 'Identifikace a analýza klíčových zainteresovaných stran projektu.',
    sortOrder: 30,
  },
  {
    key: 'desk_research',
    group: 'research',
    defaultName: 'Desk research',
    defaultDescription: 'Shromažďování existujících informací z dostupných zdrojů (literatury, dat, studií).',
    sortOrder: 40,
  },
  {
    key: 'user_interviews',
    group: 'research',
    defaultName: 'Rozhovory s uživateli',
    defaultDescription: 'Kvalitativní výzkum formou polostrukturovaných rozhovorů s cílovými uživateli.',
    sortOrder: 50,
  },
  {
    key: 'competitive_analysis',
    group: 'research',
    defaultName: 'Analýza konkurence',
    defaultDescription: 'Zmapování konkurenčních řešení – silné stránky, slabiny a inspirace.',
    sortOrder: 60,
  },
  {
    key: 'personas',
    group: 'research',
    defaultName: 'Tvorba person',
    defaultDescription: 'Vytvoření reprezentativních profilů cílových uživatelů na základě výzkumu.',
    sortOrder: 70,
  },
  {
    key: 'scenarios',
    group: 'research',
    defaultName: 'Definování scénářů',
    defaultDescription: 'Popis typických situací, ve kterých uživatelé produkt nebo službu využívají.',
    sortOrder: 80,
  },
  {
    key: 'hypotheses',
    group: 'research',
    defaultName: 'Formulace hypotéz',
    defaultDescription: 'Formulování a prioritizace předpokladů, které je třeba ověřit výzkumem nebo testováním.',
    sortOrder: 90,
  },
  {
    key: 'requirements',
    group: 'research',
    defaultName: 'Definování požadavků',
    defaultDescription: 'Specifikace funkčních a nefunkčních požadavků na produkt či službu.',
    sortOrder: 100,
  },
  {
    key: 'information_architecture',
    group: 'design',
    defaultName: 'Informační architektura',
    defaultDescription: 'Návrh struktury obsahu, navigace a organizace informací.',
    sortOrder: 110,
  },
  {
    key: 'wireframing',
    group: 'design',
    defaultName: 'Wireframing',
    defaultDescription: 'Tvorba drátěných modelů obrazovek zachycujících rozvržení a funkce bez vizuálního designu.',
    sortOrder: 120,
  },
  {
    key: 'prototyping',
    group: 'design',
    defaultName: 'Prototypování',
    defaultDescription: 'Vytvoření interaktivního prototypu pro testování a prezentaci řešení.',
    sortOrder: 130,
  },
  {
    key: 'usability_testing',
    group: 'design',
    defaultName: 'Usability testing',
    defaultDescription: 'Testování použitelnosti s reálnými uživateli k odhalení problémů v rozhraní.',
    sortOrder: 140,
  },
  {
    key: 'design_handoff',
    group: 'design',
    defaultName: 'Předání výstupů',
    defaultDescription: 'Finalizace a předání podkladů vývojářskému týmu včetně specifikací a assetů.',
    sortOrder: 150,
  },
  {
    key: 'retrospective',
    group: 'project',
    defaultName: 'Retrospektiva',
    defaultDescription: 'Zpětné hodnocení průběhu projektu a identifikace příležitostí ke zlepšení.',
    sortOrder: 160,
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
