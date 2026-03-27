/**
 * UXLog — Figma plugin (všechny entity)
 *
 * Podporované typy karet:
 *   persona, hypothesis, scenario, stakeholder, goal, competition, requirement
 */

// ---------------------------------------------------------------------------
// Textové konstanty
// ---------------------------------------------------------------------------

/** Název pluginu v UI */
const TITLE_PLUGIN = 'UXLog';

/** Názvy typů entit */
const TYPE_HYPOTHESIS = 'HYPOTÉZA';
const TYPE_SCENARIO = 'SCÉNÁŘ';
const TYPE_STAKEHOLDER = 'STAKEHOLDER';
const TYPE_GOAL = 'CÍL';
const TYPE_COMPETITION = 'KONKURENT';
const TYPE_REQUIREMENT = 'POŽADAVEK';
const TYPE_PERSONA = 'PERSONA';
const TYPE_PROTOPERSONA = 'PROTOPERSONA';

/** Názvy bloků karet */
const BLOCK_POPIS = 'POPIS';
const BLOCK_VYSLEDEK = 'VÝSLEDEK';
const BLOCK_METRIKY = 'METRIKY';
const BLOCK_MOTIVACE = 'MOTIVACE';
const BLOCK_POTREBY = 'POTŘEBY';
const BLOCK_PROBLEMY = 'PROBLÉMY';
const BLOCK_PROCNE = 'PROČ NE';
const BLOCK_SILNE_STRANKY = 'SILNÉ STRÁNKY';
const BLOCK_SLABE_STRANKY = 'SLABÉ STRÁNKY';
const BLOCK_INSPIRACE = 'INSPIRACE';

/** Placeholder texty (hinty) pro bloky */
const HINT_HYPOTHESIS_DESC = 'Co by mohlo selhat?';
const HINT_HYPOTHESIS_EXPL = 'Výsledek testování. Podařilo se hypotézu vyvrátit?';
const HINT_SCENARIO = 'Popište scénář…';
const HINT_STAKEHOLDER = 'Kdo to je?';
const HINT_GOAL_DESC = 'Popište cíl…';
const HINT_GOAL_METRICS = 'Jak a kdy poznáme, že jsme cíle dosáhli?';
const HINT_COMPETITION_DESC = 'Kdo to je?';
const HINT_COMPETITION_STRENGTHS = 'Co dělá dobře?';
const HINT_COMPETITION_WEAKNESSES = 'Co dělá špatně?';
const HINT_COMPETITION_INSPIRATION = 'V čem se od něj můžeme poučit?';
const HINT_REQUIREMENT_DESC = 'Popište požadavek, případně i svou představu řešení.';
const HINT_REQUIREMENT_MOTIVATION = 'K jakým problémům dojde, pokud požadavek nebude splněn?';
const HINT_REQUIREMENT_WONT = 'Proč tento požadavek nebudeme implementovat?';
const HINT_PERSONA_DESC = 'Kdo to je, čím se liší od ostatních?';
const HINT_PERSONA_MOTIVATION = 'O co jí jde?';
const HINT_PERSONA_NEEDS = 'Co potřebuje a co chce?';
const HINT_PERSONA_PROBLEMS = 'Jaké má problémy a co ji frustruje?';

/** Texty pro badges (statusy) */
const BADGE_UNTESTED = 'Neověřená';
const BADGE_TESTED = 'Ověřená';
const BADGE_REFUTED = 'Vyvrácená';
const BADGE_MAIN = 'Hlavní';
const BADGE_ALTERNATIVE = 'Alternativní';
const BADGE_MUST_HAVE = 'Must have';
const BADGE_SHOULD_HAVE = 'Should have';
const BADGE_COULD_HAVE = 'Could have';
const BADGE_WONT_HAVE = "Won't have";
const BADGE_INFLUENCE_HIGH = 'Vliv: Vysoký';
const BADGE_INFLUENCE_MEDIUM = 'Vliv: Střední';
const BADGE_INFLUENCE_LOW = 'Vliv: Nízký';
const BADGE_INTEREST_HIGH = 'Zájem: Vysoký';
const BADGE_INTEREST_MEDIUM = 'Zájem: Střední';
const BADGE_INTEREST_LOW = 'Zájem: Nízký';
const BADGE_PROTOPERSONA = 'Protopersona';
const BADGE_PERSONA = 'Persona';

/** Popisky statistik */
const STAT_FREKVENCE = 'Frekvence';
const STAT_HODNOTA = 'Hodnota';
const STAT_UZIVATELU = 'Uživatelů';
const STAT_VELIKOST = 'Velikost';
const STAT_CILOVA_SKUPINA = 'CÍLOVÁ SKUPINA';

/** Výchozí hodnoty při prázdných datech */
const FALLBACK_NO_NAME = 'Bez jména';
const FALLBACK_NO_TITLE = 'Bez názvu';
const FALLBACK_EMPTY = '—';
const FALLBACK_PERSONA = 'Persona';

/** Názvy uzlů Figma (pro findChild / findDescendant) */
const NODE_HORNI_SEKCE = 'Horní sekce';
const NODE_INFO = 'Info';
const NODE_META = 'Meta';
const NODE_HODNOTY = 'Hodnoty';
const NODE_BLOKY = 'Bloky';
const NODE_RADA_1 = 'Řada 1';
const NODE_RADA_2 = 'Řada 2';
const NODE_TEXT = 'Text';
const NODE_ODDELOVAC = 'Oddělovač';
const NODE_HEADER = 'Hlavička';
const NODE_NAZEV = 'Název';
const NODE_STATISTIKY = 'Statistiky';
const NODE_ACCENT_BAR = 'AccentBar';
const NODE_FOTO = 'Foto';
const NODE_SPACER = 'Spacer';
const NODE_BADGE = 'Badge';
const NODE_URL = 'URL';

/** Chybové zprávy */
const ERR_FONT_LOAD = 'Nepodařilo se načíst žádný font. Ujistěte se, že máte v dokumentu dostupný font Inter, Roboto nebo Open Sans.';
const ERR_UNKNOWN_ENTITY = 'Neznámý typ entity: ';

// ---------------------------------------------------------------------------
// Definice barev pro Figma objekty
// ---------------------------------------------------------------------------

figma.showUI(__html__, { width: 380, height: 300, title: TITLE_PLUGIN });
const COLOR_BLACK = '#1E293B';
const COLOR_WHITE = '#f0f0f0';
const COLOR_GREY = '#94A3B8';
const COLOR_RED = '#EF4444';
const COLOR_ORANGE = '#F97316';
const COLOR_GREEN = '#10B981';
const COLOR_BLUE = '#3B82F6';
const COLOR_VIOLET = '#7C3AED';
const COLOR_TEAL = '#06B6D4';
const COLOR_GREY_3 = '#64748B';

const COLOR_LT_GREY = '#E2E8F0';
const COLOR_LT_BLUE = '#d9edf8';
const COLOR_LT_YELLOW = '#fdffb6';
const COLOR_LT_GREEN = '#d4f1de';
const COLOR_LT_ORANGE = '#ffd6a5';
const COLOR_LT_PINK = '#fde8ef';
const COLOR_LT_VIOLET = '#B8B6FF';
const COLOR_LT_MINT = '#caffbf'; 
const COLOR_LT_TEAL = '#9cf6fb'; 
const COLOR_LT_EMERALD = '#d1f2eb'; 
const COLOR_LT_SKY = '#a0c4ff'; 
const COLOR_LT_ICE = '#e1f5fe'; 
const COLOR_LT_NAVY = '#dbeafe'; 
const COLOR_LT_LAVENDER = '#e2d1f9'; 
const COLOR_LT_MAUVE = '#f3e5f5'; 
const COLOR_LT_LILAC = '#dfccf1'; 
const COLOR_LT_ROSE = '#ffc8dd'; 
const COLOR_LT_SALMON = '#ffcad4'; 
const COLOR_LT_PEACH = '#ffd8be'; 
const COLOR_LT_APRICOT = '#ffe5d9'; 
const COLOR_LT_LEMON = '#ffffd1'; 
const COLOR_LT_SAND = '#fdfd96'; 
const COLOR_LT_BEIGE = '#f5f5dc'; 
const COLOR_LT_MIST = '#f0f4f8'; 
const COLOR_LT_CLAY = '#e8e8e8';

const COLOR_DK_BLUE = '#1e3a8a';
const COLOR_DK_GREEN = '#065f46';
const COLOR_DK_ORANGE = '#9a3412';
const COLOR_DK_VIOLET = '#4c1d95';
const COLOR_DK_RED = '#991b1b';
const COLOR_DK_TEAL = '#155e75';
const COLOR_DK_BROWN = '#412601';

const COLOR_ACCENT_HYPOTHESIS = COLOR_GREEN;
const COLOR_ACCENT_SCENARIO = COLOR_BLUE;
const COLOR_ACCENT_STAKEHOLDER = COLOR_ORANGE;
const COLOR_ACCENT_GOAL = COLOR_VIOLET;
const COLOR_ACCENT_COMPETITION = COLOR_RED;
const COLOR_ACCENT_REQUIREMENT = COLOR_TEAL;

/** Syté tmavé barvy pro pozadí záhlaví karet (jedna pro každou entitu) */
const COLOR_HEADER_HYPOTHESIS = COLOR_DK_BLUE;
const COLOR_HEADER_SCENARIO = COLOR_DK_GREEN;
const COLOR_HEADER_STAKEHOLDER = COLOR_DK_ORANGE;
const COLOR_HEADER_GOAL = COLOR_DK_VIOLET;
const COLOR_HEADER_COMPETITION = COLOR_DK_RED;
const COLOR_HEADER_REQUIREMENT = COLOR_DK_BROWN;
const COLOR_HEADER_PERSONA = COLOR_DK_TEAL;
const COLOR_HEADER_PROTOPERSONA = COLOR_DK_TEAL;

/** Hex barvy pro badges (statusy) */
const COLOR_BADGE_UNTESTED = COLOR_GREY;
const COLOR_BADGE_TESTED = COLOR_GREEN;
const COLOR_BADGE_REFUTED = COLOR_RED;
const COLOR_BADGE_MUST = COLOR_RED;
const COLOR_BADGE_SHOULD = COLOR_ORANGE;
const COLOR_BADGE_COULD = COLOR_BLUE;
const COLOR_BADGE_WONT = COLOR_GREY;

/** Hex barvy pro persony */
const COLOR_PERSONA = COLOR_BLUE;
const COLOR_PROTOPERSONA = COLOR_VIOLET;

/** Hex barvy pro pastelové pozadí bloků — podle entity a typu bloku */
const COLOR_BLOCK_PERSONA_DESCRIPTION = COLOR_LT_BLUE;
const COLOR_BLOCK_PERSONA_MOTIVATION = COLOR_LT_YELLOW;
const COLOR_BLOCK_PERSONA_NEEDS = COLOR_LT_GREEN;
const COLOR_BLOCK_PERSONA_PROBLEMS = COLOR_LT_ORANGE;

const COLOR_BLOCK_HYPOTHESIS_DESCRIPTION = COLOR_LT_ORANGE;
const COLOR_BLOCK_HYPOTHESIS_EXPLANATION = COLOR_LT_BLUE;

const COLOR_BLOCK_SCENARIO_DESCRIPTION = COLOR_LT_BLUE;

const COLOR_BLOCK_STAKEHOLDER_DESCRIPTION = COLOR_LT_BLUE;

const COLOR_BLOCK_GOAL_DESCRIPTION = COLOR_LT_BLUE;
const COLOR_BLOCK_GOAL_METRICS = COLOR_LT_LILAC;

const COLOR_BLOCK_COMPETITION_DESCRIPTION = COLOR_LT_BLUE;
const COLOR_BLOCK_COMPETITION_STRENGTHS = COLOR_LT_SALMON;
const COLOR_BLOCK_COMPETITION_WEAKNESSES = COLOR_LT_APRICOT;
const COLOR_BLOCK_COMPETITION_INSPIRATION = COLOR_LT_LEMON;

const COLOR_BLOCK_REQUIREMENT_DESCRIPTION = COLOR_LT_BLUE;
const COLOR_BLOCK_REQUIREMENT_MOTIVATION = COLOR_LT_ORANGE;
const COLOR_BLOCK_REQUIREMENT_WONT_HAVE = COLOR_LT_LILAC;

/** Hex barvy pro UI prvky */
const COLOR_BORDER = COLOR_GREY;
const COLOR_TEXT = COLOR_BLACK;
const COLOR_MUTED = COLOR_GREY_3;
const COLOR_HEADER_TEXT = COLOR_WHITE;
const COLOR_HEADER_MUTED = COLOR_LT_GREY;
 

/** Barva stínu karet (RGBA 0–1) */
const COLOR_SHADOW = { r: 0.06, g: 0.09, b: 0.16, a: 0.12 };

/** Převede hex řetězec na Figma RGB objekt (0–1). */
function hex(h) {
  return {
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  };
}


/** Stín karet. */
const DROP_SHADOW = {
  type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
  color: COLOR_SHADOW,
  offset: { x: 0, y: 8 }, radius: 32, spread: -4,
};

// ---------------------------------------------------------------------------
// Konfigurace typů entit
// ---------------------------------------------------------------------------

const ENTITY_CONFIGS = {
  hypothesis: {
    yamlKey:     'hypotheses',
    typeName:    TYPE_HYPOTHESIS,
    accentHex:   COLOR_ACCENT_HYPOTHESIS,
    headerBgHex: COLOR_HEADER_HYPOTHESIS,
    cardW: 1000, cardH: 700,
    blockLayout: '2col',
    blocks: [
      { name: BLOCK_POPIS,    field: 'description', hint: HINT_HYPOTHESIS_DESC, colorHex: COLOR_BLOCK_HYPOTHESIS_DESCRIPTION },
      { name: BLOCK_VYSLEDEK, field: 'explanation',  hint: HINT_HYPOTHESIS_EXPL, colorHex: COLOR_BLOCK_HYPOTHESIS_EXPLANATION },
    ],
    badges: [
      {
        field: 'status',
        map:      { untested: BADGE_UNTESTED, tested: BADGE_TESTED, refuted: BADGE_REFUTED },
        colorMap: { untested: COLOR_BADGE_UNTESTED, tested: COLOR_BADGE_TESTED, refuted: COLOR_BADGE_REFUTED },
      },
    ],
  },
  scenario: {
    yamlKey:     'scenarios',
    typeName:    TYPE_SCENARIO,
    accentHex:   COLOR_ACCENT_SCENARIO,
    headerBgHex: COLOR_HEADER_SCENARIO,
    cardW: 1000, cardH: 780,
    blockLayout: '1col',
    blocks: [
      { name: BLOCK_POPIS, field: 'description', hint: HINT_SCENARIO, colorHex: COLOR_BLOCK_SCENARIO_DESCRIPTION },
    ],
    badges: [
      { field: 'type',
        map: { main: BADGE_MAIN, alternative: BADGE_ALTERNATIVE } },
      { field: 'priority',
        map:      { must: BADGE_MUST_HAVE, should: BADGE_SHOULD_HAVE, could: BADGE_COULD_HAVE, wont: BADGE_WONT_HAVE },
        colorMap: { must: COLOR_BADGE_MUST, should: COLOR_BADGE_SHOULD, could: COLOR_BADGE_COULD, wont: COLOR_BADGE_WONT } },
    ],
    stats: [
      { label: STAT_FREKVENCE, fieldA: 'frequencyValue', fieldB: 'frequencyUnit' },
      { label: STAT_HODNOTA,   fieldA: 'valueAmount',    fieldB: 'valueUnit'     },
      { label: STAT_UZIVATELU, fieldA: 'userCount',      fieldB: 'userCountUnit' },
    ],
  },
  stakeholder: {
    yamlKey:     'stakeholders',
    typeName:    TYPE_STAKEHOLDER,
    accentHex:   COLOR_ACCENT_STAKEHOLDER,
    headerBgHex: COLOR_HEADER_STAKEHOLDER,
    cardW: 1000, cardH: 600,
    blockLayout: '1col',
    blocks: [
      { name: BLOCK_POPIS, field: 'description', hint: HINT_STAKEHOLDER, colorHex: COLOR_BLOCK_STAKEHOLDER_DESCRIPTION },
    ],
    badges: [
      { field: 'influenceLevel',
        map: { high: BADGE_INFLUENCE_HIGH, medium: BADGE_INFLUENCE_MEDIUM, low: BADGE_INFLUENCE_LOW } },
      { field: 'interestLevel',
        map: { high: BADGE_INTEREST_HIGH, medium: BADGE_INTEREST_MEDIUM, low: BADGE_INTEREST_LOW } },
    ],
  },
  goal: {
    yamlKey:     'goals',
    typeName:    TYPE_GOAL,
    accentHex:   COLOR_ACCENT_GOAL,
    headerBgHex: COLOR_HEADER_GOAL,
    cardW: 1000, cardH: 650,
    blockLayout: '2col',
    blocks: [
      { name: BLOCK_POPIS,   field: 'description', hint: HINT_GOAL_DESC, colorHex: COLOR_BLOCK_GOAL_DESCRIPTION },
      { name: BLOCK_METRIKY, field: 'metrics',      hint: HINT_GOAL_METRICS, colorHex: COLOR_BLOCK_GOAL_METRICS },
    ],
  },
  competition: {
    yamlKey:     'competitions',
    typeName:    TYPE_COMPETITION,
    accentHex:   COLOR_ACCENT_COMPETITION,
    headerBgHex: COLOR_HEADER_COMPETITION,
    cardW: 1200, cardH: 860,
    blockLayout: '1+3',
    blocks: [
      { name: BLOCK_POPIS,         field: 'description', hint: HINT_COMPETITION_DESC, colorHex: COLOR_BLOCK_COMPETITION_DESCRIPTION },
      { name: BLOCK_SILNE_STRANKY, field: 'strengths',   hint: HINT_COMPETITION_STRENGTHS, colorHex: COLOR_BLOCK_COMPETITION_STRENGTHS },
      { name: BLOCK_SLABE_STRANKY, field: 'weaknesses',  hint: HINT_COMPETITION_WEAKNESSES, colorHex: COLOR_BLOCK_COMPETITION_WEAKNESSES },
      { name: BLOCK_INSPIRACE,     field: 'inspiration', hint: HINT_COMPETITION_INSPIRATION, colorHex: COLOR_BLOCK_COMPETITION_INSPIRATION },
    ],
  },
  requirement: {
    yamlKey:     'requirements',
    typeName:    TYPE_REQUIREMENT,
    accentHex:   COLOR_ACCENT_REQUIREMENT,
    headerBgHex: COLOR_HEADER_REQUIREMENT,
    cardW: 1000, cardH: 700,
    blockLayout: '3col',
    blocks: [
      { name: BLOCK_POPIS,    field: 'description',         hint: HINT_REQUIREMENT_DESC, colorHex: COLOR_BLOCK_REQUIREMENT_DESCRIPTION },
      { name: BLOCK_MOTIVACE, field: 'motivation',           hint: HINT_REQUIREMENT_MOTIVATION, colorHex: COLOR_BLOCK_REQUIREMENT_MOTIVATION },
      { name: BLOCK_PROCNE,  field: 'wontHaveExplanation', hint: HINT_REQUIREMENT_WONT, colorHex: COLOR_BLOCK_REQUIREMENT_WONT_HAVE },
    ],
    badges: [
      { field: 'priority',
        map:      { must: BADGE_MUST_HAVE, should: BADGE_SHOULD_HAVE, could: BADGE_COULD_HAVE, wont: BADGE_WONT_HAVE },
        colorMap: { must: COLOR_BADGE_MUST, should: COLOR_BADGE_SHOULD, could: COLOR_BADGE_COULD, wont: COLOR_BADGE_WONT } },
    ],
  },
};

/** Mapování typu entity v pluginu na název kolekce v Flexi API (prefix uxlog_). */
const PLUGIN_TO_API_ENTITY = {
  persona: 'personas',
  hypothesis: 'hypotheses',
  scenario: 'scenarios',
  stakeholder: 'stakeholders',
  goal: 'goals',
  competition: 'competitions',
  requirement: 'requirements',
};

/** Klíč pro persistenci nastavení pluginu (Flexi URL, klíč) v clientStorage. */
const PLUGIN_CONFIG_STORAGE_KEY = 'uxlog_figma_plugin_config';

/** Klíč pro persistenci sync timestampů (lastPullTs, lastPushTs) v clientStorage. */
const SYNC_TIMESTAMPS_STORAGE_KEY = 'uxlog_figma_sync_timestamps';

/** ID textových uzlů, u kterých právě aplikujeme změnu z API (ochrana před smyčkou). */
const suppressTextChangeIds = new Set();

/**
 * Stav víceřádkového importu z API (sessionId → poslední spodní hrana řádku).
 * Po dokončení série se záznam maže (layout.endSession).
 */
const flexiImportLayoutSessions = new Map();

/** Po kolika navštívených uzlech při průchodu stránkou předat řízení (odlehčení UI Figmy). */
const YIELD_NODE_VISIT_INTERVAL = 120;

/** Po kolika aktualizacích textu při sync z API krátce předat řízení. */
const YIELD_TEXT_APPLY_INTERVAL = 4;

/**
 * Krátká pauza přes frontu časovače — Figma stihne vykreslit a zpracovat vstupy.
 * @returns {Promise<void>}
 */
function yieldToMain() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0);
  });
}

// ---------------------------------------------------------------------------
// Sdílená data a YAML pro UI (logika běží v main threadu, UI jen posílá zprávy)
// ---------------------------------------------------------------------------

/**
 * Konfigurace typů entit pro UI (YAML klíče, skloňování) — odpovídá UXLog exportu.
 */
const ENTITY_TYPE_CONFIG_UI = {
  persona:     { yamlKey: 'personas',     sg: 'personu',      few: 'persony',       many: 'person',        label: 'Persona'     },
  hypothesis:  { yamlKey: 'hypotheses',   sg: 'hypotézu',     few: 'hypotézy',      many: 'hypotéz',       label: 'Hypotéza'    },
  scenario:    { yamlKey: 'scenarios',    sg: 'scénář',       few: 'scénáře',       many: 'scénářů',       label: 'Scénář'      },
  stakeholder: { yamlKey: 'stakeholders', sg: 'stakeholdera', few: 'stakeholdery',  many: 'stakeholderů',  label: 'Stakeholder' },
  goal:        { yamlKey: 'goals',        sg: 'cíl',          few: 'cíle',          many: 'cílů',          label: 'Cíl'         },
  competition: { yamlKey: 'competitions', sg: 'konkurenta',   few: 'konkurenty',    many: 'konkurentů',    label: 'Konkurent'   },
  requirement: { yamlKey: 'requirements', sg: 'požadavek',    few: 'požadavky',     many: 'požadavků',     label: 'Požadavek'   },
};

/** Typy karet v pořadí pro synchronizaci s API. */
const FIGMA_PLUGIN_CARD_TYPES = [
  'persona', 'hypothesis', 'scenario', 'stakeholder', 'goal', 'competition', 'requirement',
];

/**
 * Zajistí absolutní URL se schématem pro Flexi / proxy.
 * @param {string} raw
 * @returns {string}
 */
function normalizeFlexiBaseUrl(raw) {
  var s = (raw || '').trim();
  if (s === '') return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) return s;
  return 'http://' + s;
}

/**
 * @param {string} baseUrl
 * @returns {boolean}
 */
function isFlexiProxyScriptUrl(baseUrl) {
  return /flexi-proxy[^?&]*\.php/i.test((baseUrl || '').trim());
}

/**
 * @param {string} baseUrl
 * @returns {boolean}
 */
function isDirectLocalFlexiWithoutProxy(baseUrl) {
  var trimmed = normalizeFlexiBaseUrl(baseUrl || '');
  if (trimmed === '') return false;
  if (isFlexiProxyScriptUrl(trimmed)) return false;
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(trimmed);
}

/**
 * @returns {string}
 */
function getLocalFlexiCorsHintMessage() {
  return (
    'Z Figmy nelze volat přímo http://127.0.0.1 nebo localhost (CORS). ' +
    'Spusťte PHP z kořene projektu: php -S localhost:8787 -t public ' +
    'a v nastavení zadejte http://localhost:8787/flexi-proxy-windows.php (lokální Windows API) ' +
    'nebo https://uxlog.prokoho.cz/flexi-proxy-php.php (hostované API).'
  );
}

/** Po kolika krocích YAML parseru uvolnit smyčku. */
const YIELD_YAML_STEP_INTERVAL = 72;

/**
 * Normalizuje speciální znaky Figmy před serializací do YAML.
 * @param {string} s
 * @returns {string}
 */
function normalizeFigmaText(s) {
  return s
    .replace(/[\u2028\u2029\u000B]/g, '\n')
    .replace(/[\u2022\u2023\u25CF\u25E6\u25AA\u00B7]\s*/g, '- ');
}

/**
 * @param {string} str
 * @returns {string}
 */
function yamlEscape(str) {
  if (str === '') return "''";
  str = normalizeFigmaText(str);
  if (str.includes('\n')) return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, '\\n') + '"';
  const specialStart = /^[\-?:,\[\]{}#&*!|>'"%@`~]/.test(str);
  const hasSpecial   = /[:#,\[\]{}]/.test(str);
  const isReserved   = ['true','false','null','yes','no','on','off'].includes(str.toLowerCase());
  if (specialStart || hasSpecial || isReserved) return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  return str;
}

/**
 * @param {string} key
 * @param {*} value
 * @param {number} depth
 * @returns {string}
 */
function serializeKV(key, value, depth) {
  const indent = '  '.repeat(depth);
  if (value === null || value === undefined) return `${indent}${key}: null`;
  if (typeof value === 'boolean' || typeof value === 'number') return `${indent}${key}: ${value}`;
  if (typeof value === 'string') return `${indent}${key}: ${yamlEscape(value)}`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}${key}: []`;
    return `${indent}${key}:\n${toYamlText(value, depth + 1)}`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return `${indent}${key}: {}`;
  return `${indent}${key}:\n${toYamlText(value, depth + 1)}`;
}

/**
 * @param {*} item
 * @param {number} depth
 * @returns {string}
 */
function serializeArrayItem(item, depth) {
  const indent = '  '.repeat(depth);
  if (item === null || item === undefined) return `${indent}- null`;
  if (typeof item === 'boolean' || typeof item === 'number') return `${indent}- ${item}`;
  if (typeof item === 'string') return `${indent}- ${yamlEscape(item)}`;
  if (Array.isArray(item)) {
    if (item.length === 0) return `${indent}- []`;
    return `${indent}-\n${toYamlText(item, depth + 1)}`;
  }
  const entries = Object.entries(item);
  if (entries.length === 0) return `${indent}- {}`;
  const lines = [];
  entries.forEach(function (kv, i) {
    const k = kv[0];
    const v = kv[1];
    const prefix = i === 0 ? `${indent}- ` : `${indent}  `;
    if (v === null || v === undefined) { lines.push(`${prefix}${k}: null`); }
    else if (typeof v === 'boolean' || typeof v === 'number') { lines.push(`${prefix}${k}: ${v}`); }
    else if (typeof v === 'string') { lines.push(`${prefix}${k}: ${yamlEscape(v)}`); }
    else if (Array.isArray(v)) {
      if (v.length === 0) { lines.push(`${prefix}${k}: []`); }
      else { lines.push(`${prefix}${k}:`); lines.push(toYamlText(v, depth + 2)); }
    } else {
      const sub = Object.entries(v);
      if (sub.length === 0) { lines.push(`${prefix}${k}: {}`); }
      else { lines.push(`${prefix}${k}:`); lines.push(toYamlText(v, depth + 2)); }
    }
  });
  return lines.join('\n');
}

/**
 * Serializuje hodnotu do YAML (stejná podmnožina jako v UXLog webu).
 * @param {*} value
 * @param {number} [depth]
 * @returns {string}
 */
function toYamlText(value, depth) {
  depth = depth || 0;
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return yamlEscape(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map(function (item) { return serializeArrayItem(item, depth); }).join('\n');
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  return entries.map(function (kv) { return serializeKV(kv[0], kv[1], depth); }).join('\n');
}

/**
 * Parsuje YAML export UXLog; průběžně předává řízení.
 * @param {string} text
 * @returns {Promise<Object>}
 */
async function parseYamlText(text) {
  await yieldToMain();
  const lines = text.split('\n');
  let pos = 0;
  let stepCounter = 0;
  async function tick() {
    stepCounter++;
    if (stepCounter % YIELD_YAML_STEP_INTERVAL === 0) await yieldToMain();
  }

  function skipBlank() {
    while (pos < lines.length && /^\s*$/.test(lines[pos])) pos++;
  }
  function countIndent(s) { var n = 0; while (n < s.length && s[n] === ' ') n++; return n; }
  function parseScalar(s) {
    s = s.trim();
    if (s === 'null' || s === '~') return null;
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === "''") return '';
    if (s === '[]') return [];
    if (s === '{}') return {};
    if (s.startsWith('"') && s.endsWith('"')) { try { return JSON.parse(s); } catch (_) { return s.slice(1, -1); } }
    return s;
  }
  async function parseMapping(baseIndent) {
    const obj = {};
    while (pos < lines.length) {
      await tick();
      skipBlank(); if (pos >= lines.length) break;
      const line = lines[pos]; const ind = countIndent(line);
      if (ind < baseIndent) break;
      const trimmed = line.trim();
      const m = trimmed.match(/^([^:]+?):\s*(.*)/);
      if (!m) { pos++; continue; }
      const key = m[1]; const rest = m[2];
      pos++;
      if (rest === '') {
        skipBlank();
        if (pos < lines.length) {
          const nt = lines[pos].trim();
          obj[key] = (nt.startsWith('- ') || nt === '-') ? await parseArray(ind + 2) : await parseMapping(ind + 2);
        } else { obj[key] = null; }
      } else { obj[key] = parseScalar(rest); }
    }
    return obj;
  }
  async function parseArray(baseIndent) {
    const arr = [];
    while (pos < lines.length) {
      await tick();
      skipBlank(); if (pos >= lines.length) break;
      const line = lines[pos]; const ind = countIndent(line);
      if (ind < baseIndent) break;
      const trimmed = line.trim();
      if (!trimmed.startsWith('- ') && trimmed !== '-') break;
      pos++;
      if (trimmed === '-') { skipBlank(); arr.push(await parseBlock(ind + 2)); continue; }
      const content = trimmed.slice(2);
      const ci = content.indexOf(': ');
      if (ci !== -1) {
        const k = content.slice(0, ci); const v = content.slice(ci + 2);
        const o = {};
        o[k] = v === '' ? (skipBlank(), await parseBlock(ind + 2)) : parseScalar(v);
        await parseObjCont(o, ind + 2);
        arr.push(o);
      } else if (content.endsWith(':')) {
        const o = {}; const k = content.slice(0, -1);
        skipBlank(); o[k] = await parseBlock(ind + 2);
        await parseObjCont(o, ind + 2);
        arr.push(o);
      } else { arr.push(parseScalar(content)); }
    }
    return arr;
  }
  async function parseObjCont(obj, baseIndent) {
    while (pos < lines.length) {
      await tick();
      skipBlank(); if (pos >= lines.length) break;
      const line = lines[pos]; const ind = countIndent(line);
      if (ind < baseIndent) break;
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) break;
      const ci = trimmed.indexOf(': ');
      if (ci !== -1) {
        const k = trimmed.slice(0, ci); const v = trimmed.slice(ci + 2);
        pos++; obj[k] = v === '' ? (skipBlank(), await parseBlock(ind + 2)) : parseScalar(v);
      } else if (trimmed.endsWith(':')) {
        const k = trimmed.slice(0, -1); pos++; skipBlank(); obj[k] = await parseBlock(ind + 2);
      } else { pos++; }
    }
  }
  async function parseBlock(baseIndent) {
    skipBlank(); if (pos >= lines.length) return null;
    const t = lines[pos].trim();
    return (t.startsWith('- ') || t === '-') ? await parseArray(baseIndent) : await parseMapping(baseIndent);
  }
  return parseMapping(0);
}

/**
 * Odešle do UI konstanty a mapování (po uiReady).
 */
function sendUiBootstrap() {
  figma.ui.postMessage({
    type: 'uiBootstrap',
    entityTypeConfig: ENTITY_TYPE_CONFIG_UI,
    pluginToApiEntity: PLUGIN_TO_API_ENTITY,
    pluginCardTypes: FIGMA_PLUGIN_CARD_TYPES.slice(),
  });
}

// ---------------------------------------------------------------------------
// Notifikace o výběru
// ---------------------------------------------------------------------------

/**
 * Odešle do UI stav výběru. Odeslání je odložené, aby handler selectionchange co nejdříve skončil.
 */
function notifySelection() {
  const sel = figma.currentPage.selection;
  const total = sel.length;
  const counts = {};
  let uxlog = 0;
  for (const node of sel) {
    try {
      const type = node.getPluginData('uxlogEntityType') ||
                   (node.getPluginData('uxlogPersona') ? 'persona' : null);
      if (type) { counts[type] = (counts[type] || 0) + 1; uxlog++; }
    } catch (_) {}
  }
  setTimeout(function () {
    figma.ui.postMessage({ type: 'selectionChanged', total, uxlog, counts });
  }, 0);
}

notifySelection();
figma.on('selectionchange', notifySelection);

// ---------------------------------------------------------------------------
// Extrakce entit z karet
// ---------------------------------------------------------------------------

function findDescendant(node, pred) {
  if (pred(node)) return node;
  for (const child of (node.children || [])) {
    const found = findDescendant(child, pred);
    if (found) return found;
  }
  return null;
}

function findChild(parent, pred) {
  return (parent && parent.children ? parent.children.find(pred) : null) || null;
}

/**
 * Označí textový uzel pro párování pole entity (pluginData uxlogField).
 * @param {TextNode} textNode
 * @param {string} fieldName
 */
function setTextUxlogField(textNode, fieldName) {
  if (textNode && textNode.type === 'TEXT' && fieldName) {
    textNode.setPluginData('uxlogField', fieldName);
  }
}

/**
 * Uloží na kartu metadata pro synchronizaci s Flexi API.
 * @param {FrameNode} card
 * @param {string} entityType
 * @param {Object} entity
 * @param {Object|null} project
 * @param {{ source: string, apiId?: string, lastSyncTs?: number }} meta
 */
function applyCardSyncMetadata(card, entityType, entity, project, meta) {
  const id = entity && entity.id;
  if (!id) return;
  card.setPluginData('uxlogEntityType', entityType);
  card.setPluginData('uxlogEntityId', String(id));
  card.setPluginData('uxlogSource', meta.source || 'yaml');
  if (project && project.id) {
    card.setPluginData('uxlogProjectId', String(project.id));
  } else if (entity.projectId) {
    card.setPluginData('uxlogProjectId', String(entity.projectId));
  }
  if (meta.apiId !== undefined && meta.apiId !== null && String(meta.apiId) !== String(id)) {
    card.setPluginData('uxlogApiId', String(meta.apiId));
  }
  if (meta.lastSyncTs != null) {
    card.setPluginData('uxlogLastSyncTs', String(meta.lastSyncTs));
  }
  // Dirty tracking: karta právě přišla z API → žádné lokální změny
  card.setPluginData('uxlogLastDbSyncTs', String(Date.now()));
  card.setPluginData('uxlogLocalEditTs', '0');
}

/**
 * Najde všechny karty dané entity na aktuální stránce (včetně vnořených skupin).
 * @param {string} entityType
 * @param {string} uxlogEntityId
 * @returns {FrameNode[]}
 */
function findCardsForEntityOnPage(entityType, uxlogEntityId) {
  const out = [];
  function walk(node) {
    if (node.type === 'FRAME') {
      const t = node.getPluginData('uxlogEntityType');
      const legacy = node.getPluginData('uxlogPersona');
      const effectiveType = t || (legacy ? 'persona' : null);
      const id = node.getPluginData('uxlogEntityId');
      if (effectiveType === entityType && id === String(uxlogEntityId)) out.push(node);
    }
    for (const c of node.children || []) walk(c);
  }
  for (const c of figma.currentPage.children) walk(c);
  return out;
}

/**
 * Přečte textový obsah generické karty; preferuje pluginData uxlogField na textu.
 * @param {FrameNode} card
 * @param {string} entityType
 * @param {Object} base
 * @returns {Object}
 */
function extractGenericFromCard(card, entityType, base) {
  const config = ENTITY_CONFIGS[entityType];
  if (!config) return base;
  const HINTS = new Set((config.blocks || []).map(b => b.hint));
  const extracted = {};

  var nameNode = findDescendant(card, function(n) { return n.type === 'TEXT' && n.getPluginData('uxlogField') === 'name'; });
  if (nameNode) {
    var nameVal = nameNode.characters || '';
    if (nameVal !== FALLBACK_NO_TITLE && nameVal !== FALLBACK_NO_NAME && nameVal.trim() !== '') {
      extracted.name = nameVal;
    }
  }
  var codeNode = findDescendant(card, function(n) { return n.type === 'TEXT' && n.getPluginData('uxlogField') === 'code'; });
  if (codeNode) {
    extracted.code = codeNode.characters || '';
  }

  for (const { name, field } of (config.blocks || [])) {
    let textNode = findDescendant(card, n => n.type === 'TEXT' && n.getPluginData('uxlogField') === field);
    if (!textNode) textNode = findDescendant(card, n => n.name === field && n.type === 'TEXT');
    if (!textNode) {
      const block = findDescendant(card, n => n.name === name && n.type === 'FRAME');
      if (block) textNode = findDescendant(block, n => n.name === NODE_TEXT && n.type === 'TEXT');
    }
    if (!textNode) continue;
    const chars = textNode.characters || '';
    extracted[field] = HINTS.has(chars) ? '' : chars;
  }

  if (entityType === 'scenario' && config.stats) {
    for (const s of config.stats) {
      const statFrame = findDescendant(card, n => n.name === s.label && n.type === 'FRAME');
      if (!statFrame) continue;
      let ta = findDescendant(statFrame, n => n.type === 'TEXT' && n.getPluginData('uxlogField') === s.fieldA);
      let tb = findDescendant(statFrame, n => n.type === 'TEXT' && n.getPluginData('uxlogField') === s.fieldB);
      if (!ta || !tb) {
        const texts = [];
        for (const ch of statFrame.children || []) {
          if (ch.type === 'TEXT' && ch.fontSize === 30) texts.push(ch);
        }
        if (texts.length >= 2) {
          if (!ta) ta = texts[0];
          if (!tb) tb = texts[1];
        } else if (texts.length === 1 && !ta) {
          const raw = (texts[0].characters || '').trim();
          if (raw !== FALLBACK_EMPTY) {
            const parts = raw.split(/\s+/).filter(Boolean);
            extracted[s.fieldA] = parts[0] || '';
            extracted[s.fieldB] = parts.slice(1).join(' ') || '';
            continue;
          }
        }
      }
      if (ta) {
        const v = (ta.characters || '').trim();
        extracted[s.fieldA] = v === FALLBACK_EMPTY ? '' : v;
      }
      if (tb) {
        const v = (tb.characters || '').trim();
        extracted[s.fieldB] = v === FALLBACK_EMPTY ? '' : v;
      }
    }
  }

  return Object.assign({}, base, extracted);
}

/** Extrakce persony z karty (původní logika) */
function extractPersonaFromCard(card) {
  let base = {};
  try {
    const d = card.getPluginData('uxlogEntity') || card.getPluginData('uxlogPersona');
    if (d) base = JSON.parse(d);
  } catch (_) {}

  const HINTS = new Set([
    HINT_PERSONA_DESC, HINT_PERSONA_MOTIVATION,
    HINT_PERSONA_NEEDS, HINT_PERSONA_PROBLEMS,
  ]);

  function readText(node) {
    if (!node || node.type !== 'TEXT') return null;
    const chars = node.characters || '';
    return HINTS.has(chars) ? '' : chars;
  }

  /**
   * Najde textovou vrstvu podle uxlogField nebo jména datového pole kdekoliv v kartě.
   * Pokud neexistuje, vrátí null (extraktor pak použije fallback z plugin dat).
   */
  function findField(fieldName) {
    const tagged = findDescendant(card, n => n.type === 'TEXT' && n.getPluginData('uxlogField') === fieldName);
    if (tagged) return readText(tagged);
    return readText(findDescendant(card, n => n.name === fieldName && n.type === 'TEXT'));
  }

  // Jméno: vrstva 'name' kdekoliv v kartě; fallback: stará vrstva NODE_NAZEV ('Název')
  const nameByField = findField('name');
  const nameByOld   = readText(findDescendant(card, n => n.name === NODE_NAZEV && n.type === 'TEXT'));
  const rawName     = nameByField !== null ? nameByField : nameByOld;
  const name        = (rawName !== null && rawName !== FALLBACK_NO_NAME) ? rawName : (base.name || '');

  // Kód: vrstva 'code' kdekoliv v kartě; fallback: strukturní navigace
  const codeByField = findField('code');
  const codeByOld   = (() => {
    const metaFrame = findDescendant(card, n => n.name === NODE_META);
    const node = findChild(metaFrame, n => n.type === 'TEXT');
    return node ? node.characters : null;
  })();
  const code = codeByField !== null ? codeByField : (codeByOld !== null ? codeByOld : (base.code || ''));

  // Status (badge): hledá podle textu badge kdekoliv v kartě
  const badgeNode = findDescendant(card, n => n.name === NODE_BADGE);
  const badgeText = findChild(badgeNode, n => n.type === 'TEXT');
  const status    = badgeText
    ? (badgeText.characters === BADGE_PROTOPERSONA ? 'protopersona' : 'persona')
    : (base.status || 'protopersona');

  // Statistiky cílové skupiny: hledá stat rámce kdekoliv v kartě (uxlogField nebo velký text)
  function getStatValue(statName, fieldKey) {
    const statFrame = findDescendant(card, n => n.name === statName);
    if (!statFrame) return null;
    const tagged = findDescendant(statFrame, n => n.type === 'TEXT' && n.getPluginData('uxlogField') === fieldKey);
    const valNode = tagged || (statFrame.children || []).find(n => n.type === 'TEXT' && n.fontSize === 30);
    if (!valNode) return null;
    return valNode.characters === FALLBACK_EMPTY ? '' : valNode.characters;
  }

  const _tgs = getStatValue(STAT_VELIKOST, 'targetGroupSize'); const targetGroupSize  = _tgs !== null ? _tgs : (base.targetGroupSize  || '');
  const _tgv = getStatValue(STAT_HODNOTA, 'targetGroupValue');  const targetGroupValue = _tgv !== null ? _tgv : (base.targetGroupValue || '');

  // Textové bloky: hledá vrstvu podle jména datového pole kdekoliv v kartě;
  // fallback: strukturní navigace pro staré karty (vrstva se jmenuje NODE_TEXT)
  function getBlockText(fieldName, blockName) {
    const byField = findField(fieldName);
    if (byField !== null) return byField;
    const block = findDescendant(card, n => n.name === blockName && n.type === 'FRAME');
    if (!block) return null;
    return readText(findChild(block, n => n.name === NODE_TEXT && n.type === 'TEXT'));
  }

  return Object.assign({}, base, {
    name, code, status,
    description: (function(v){ return v !== null ? v : (base.description || ''); })(getBlockText('description', BLOCK_POPIS)),
    motivation:  (function(v){ return v !== null ? v : (base.motivation  || ''); })(getBlockText('motivation',  BLOCK_MOTIVACE)),
    needs:       (function(v){ return v !== null ? v : (base.needs       || ''); })(getBlockText('needs',       BLOCK_POTREBY)),
    problems:    (function(v){ return v !== null ? v : (base.problems    || ''); })(getBlockText('problems',    BLOCK_PROBLEMY)),
    targetGroupSize,
    targetGroupValue,
  });
}

/** Jednotný vstupní bod pro extrakci — vrátí { type, entity } nebo null */
function extractEntityFromCard(node) {
  const entityType    = node.getPluginData('uxlogEntityType');
  const legacyPersona = node.getPluginData('uxlogPersona');

  if (!entityType && !legacyPersona) return null;

  if (entityType && entityType !== 'persona') {
    let base = {};
    try { base = JSON.parse(node.getPluginData('uxlogEntity') || '{}'); } catch (_) {}
    return { type: entityType, entity: extractGenericFromCard(node, entityType, base) };
  }

  return { type: 'persona', entity: extractPersonaFromCard(node) };
}

/**
 * Sloučí uložené JSON entity s textem načteným z karty (základ pro PUT do API).
 * @param {FrameNode} card
 * @returns {Object|null}
 */
function mergeEntityForPayload(card) {
  const r = extractEntityFromCard(card);
  if (!r) return null;
  let base = {};
  try {
    base = JSON.parse(card.getPluginData('uxlogEntity') || '{}');
  } catch (_) {}
  const merged = Object.assign({}, base, r.entity);
  const eid = card.getPluginData('uxlogEntityId');
  if (eid && !merged.id) merged.id = eid;
  const apiId = card.getPluginData('uxlogApiId');
  if (apiId) merged._apiId = apiId;
  return merged;
}

/**
 * Nastaví uxlogAppliedValue na všechny textové uzly s uxlogField v kartě.
 * Volá se po vytvoření karty, aby se uložil výchozí stav pro detekci lokálních změn.
 * @param {FrameNode} card
 */
function initAppliedValuesOnCard(card) {
  function walk(node) {
    if (node.type === 'TEXT') {
      var field = node.getPluginData('uxlogField');
      if (field) {
        try { node.setPluginData('uxlogAppliedValue', 'v:' + node.characters); } catch (_) {}
      }
    }
    for (var i = 0; i < (node.children || []).length; i++) walk(node.children[i]);
  }
  walk(card);
}

/**
 * Přečte aktuální text ze všech uxlogField uzlů karty a uloží ho jako uxlogAppliedValue.
 * Volá se těsně před odesláním entity do API, aby se zachytil referenční stav.
 * @param {FrameNode} card
 */
function updateAppliedValuesFromCard(card) {
  function walk(node) {
    if (node.type === 'TEXT') {
      var field = node.getPluginData('uxlogField');
      if (field) {
        try { node.setPluginData('uxlogAppliedValue', 'v:' + node.characters); } catch (_) {}
      }
    }
    for (var i = 0; i < (node.children || []).length; i++) walk(node.children[i]);
  }
  walk(card);
}

/**
 * Zjistí, zda některý textový uzel karty s uxlogField má odlišný text než naposledy
 * aplikovanou hodnotu. Vrací true při lokálních změnách, false při shodě, nebo null
 * pokud karta nemá žádné uxlogAppliedValue (starší karta — volající musí použít fallback).
 * @param {FrameNode} card
 * @returns {boolean|null}
 */
function hasAnyLocalTextChange(card) {
  var foundAppliedValue = false;
  var hasChange = false;
  function walk(node) {
    if (hasChange) return;
    if (node.type === 'TEXT') {
      var field = node.getPluginData('uxlogField');
      if (field) {
        var raw = node.getPluginData('uxlogAppliedValue');
        if (raw && raw.indexOf('v:') === 0) {
          foundAppliedValue = true;
          var appliedValue = raw.slice(2);
          if (node.characters !== appliedValue) {
            hasChange = true;
          }
        }
      }
    }
    for (var i = 0; i < (node.children || []).length; i++) walk(node.children[i]);
  }
  walk(card);
  if (!foundAppliedValue) return null;
  return hasChange;
}

/**
 * Nastaví text uzlu po načtení fontu; při aktualizaci z API potlačí detekci změny (smyčka).
 * Pokud je obsah už stejný jako cílový řetězec, nic nemění (kurzor v editoru zůstane na místě).
 * @param {TextNode} node
 * @param {string} chars
 */
async function setTextSafeAsync(node, chars) {
  if (node.type !== 'TEXT') return;
  var next = chars != null ? String(chars) : '';
  var hasField = !!node.getPluginData('uxlogField');
  if (node.characters === next) {
    if (hasField) {
      try { node.setPluginData('uxlogAppliedValue', 'v:' + next); } catch (_) {}
    }
    return;
  }
  suppressTextChangeIds.add(node.id);
  try {
    await figma.loadFontAsync(node.fontName);
    if (node.characters === next) {
      if (hasField) {
        try { node.setPluginData('uxlogAppliedValue', 'v:' + next); } catch (_) {}
      }
      return;
    }
    node.characters = next;
    if (hasField) {
      try { node.setPluginData('uxlogAppliedValue', 'v:' + next); } catch (_) {}
    }
  } finally {
    setTimeout(function () { suppressTextChangeIds.delete(node.id); }, 0);
  }
}

/**
 * Aktualizuje textové vrstvy generické karty podle entity (bez změny layoutu).
 * @param {FrameNode} card
 * @param {string} entityType
 * @param {Object} entity
 * @param {Set<string>|null} [changedFields]
 */
async function applyGenericEntityText(card, entityType, entity, changedFields) {
  const config = ENTITY_CONFIGS[entityType];
  if (!config) return;

  var textApplyCount = 0;
  async function walk(node) {
    if (node.type === 'TEXT') {
      const fk = node.getPluginData('uxlogField') || (node.name && node.name !== NODE_URL ? node.name : null);
      if (
        fk && fk !== NODE_URL &&
        Object.prototype.hasOwnProperty.call(entity, fk) &&
        (!changedFields || changedFields.has(fk))
      ) {
        let val = entity[fk];
        const badgeConf = (config.badges || []).find((b) => b.field === fk);
        if (badgeConf && badgeConf.map && typeof val === 'string') {
          val = badgeConf.map[val] || String(val);
        } else if (fk === 'name') {
          val = entity.name != null && String(entity.name).trim() !== '' ? String(entity.name) : FALLBACK_NO_TITLE;
        } else {
          val = val != null ? String(val) : '';
        }
        await setTextSafeAsync(node, val);
        textApplyCount++;
        if (textApplyCount % YIELD_TEXT_APPLY_INTERVAL === 0) await yieldToMain();
      }
    }
    for (const c of node.children || []) await walk(c);
  }
  await walk(card);
}

/**
 * Aktualizuje textové vrstvy karty persony podle entity.
 * @param {FrameNode} card
 * @param {Object} entity
 * @param {Set<string>|null} [changedFields]
 */
async function applyPersonaEntityText(card, entity, changedFields) {
  var textApplyCount = 0;
  async function walk(node) {
    if (node.type === 'TEXT') {
      const fk = node.getPluginData('uxlogField') || (node.name && node.name !== NODE_URL ? node.name : null);
      if (
        fk && fk !== NODE_URL &&
        Object.prototype.hasOwnProperty.call(entity, fk) &&
        (!changedFields || changedFields.has(fk))
      ) {
        let val = entity[fk];
        if (fk === 'status') {
          val = entity.status === 'protopersona' ? BADGE_PROTOPERSONA : BADGE_PERSONA;
        } else if (fk === 'name') {
          val = entity.name != null && String(entity.name).trim() !== '' ? String(entity.name) : FALLBACK_NO_NAME;
        } else {
          val = val != null ? String(val) : '';
        }
        await setTextSafeAsync(node, val);
        textApplyCount++;
        if (textApplyCount % YIELD_TEXT_APPLY_INTERVAL === 0) await yieldToMain();
      }
    }
    for (const c of node.children || []) await walk(c);
  }
  await walk(card);
}

/**
 * Vrací true, pokud uživatel právě v této kartě inline upravuje text (kurzor v textové vrstvě).
 * V tom případě neaplikujeme obsah z API na vrstvy, aby Figma nezavřela editor a neztratil kurzor.
 * @param {FrameNode} card
 * @returns {boolean}
 */
function isUserEditingTextInsideUxlogCard(card) {
  try {
    var rng = figma.currentPage.selectedTextRange;
    if (!rng || !rng.node || rng.node.type !== 'TEXT') return false;
    var n = rng.node;
    while (n) {
      if (n.type === 'PAGE') return false;
      if (n.id === card.id) return true;
      n = n.parent;
    }
  } catch (_) {}
  return false;
}

/**
 * Vrátí seznam textových polí, která plugin pro daný typ entity synchronizuje.
 * @param {string} entityType
 * @returns {string[]}
 */
function getTrackedFieldsForEntityType(entityType) {
  const config = ENTITY_CONFIGS[entityType];
  if (entityType === 'persona') {
    return ['name', 'code', 'status', 'description', 'motivation', 'needs', 'problems', 'targetGroupSize', 'targetGroupValue'];
  } else if (config) {
    const fields = ['name', 'code', ...config.blocks.map(function(b) { return b.field; })];
    for (var bi = 0; bi < (config.badges || []).length; bi++) {
      fields.push(config.badges[bi].field);
    }
    if (config.stats) {
      for (var si = 0; si < config.stats.length; si++) {
        fields.push(config.stats[si].fieldA, config.stats[si].fieldB);
      }
    }
    return fields;
  }
  return [];
}

/**
 * Vrátí množinu polí, která se v API skutečně změnila oproti poslednímu sync stavu karty.
 * Pokud metadata chybí, vrací prázdnou sadu nebo všechny změněné syncované atributy.
 * @param {Object} stored
 * @param {Object} incoming
 * @param {string} entityType
 * @returns {Set<string>}
 */
function getChangedRemoteFields(stored, incoming, entityType) {
  const fields = getTrackedFieldsForEntityType(entityType);
  if (!stored || Object.keys(stored).length === 0) {
    return new Set(fields);
  }
  const changed = new Set();
  for (var fi = 0; fi < fields.length; fi++) {
    var f = fields[fi];
    var sv = stored && stored[f] != null ? String(stored[f]) : '';
    var iv = incoming && incoming[f] != null ? String(incoming[f]) : '';
    if (sv !== iv) changed.add(f);
  }
  return changed;
}

/**
 * Porovná naposledy synchronizovaná data entity s aktuálním textem karty.
 * Vrátí true, pokud karta obsahuje lokální změny, které ještě nebyly odeslány do API.
 * @param {Object} stored - poslední synchronizovaná data (z pluginData uxlogEntity)
 * @param {Object} current - aktuálně extrahovaná data z karty
 * @param {string} entityType
 * @returns {boolean}
 */
function isCardDirty(stored, current, entityType) {
  return getChangedRemoteFields(stored, current, entityType).size > 0;
}

/**
 * Propíše data entity do všech karet stejné entity na aktuální stránce.
 *
 * Vícevrstvá ochrana proti přepsání lokálních změn:
 *   1) Timestamp uxlogLocalEditTs > uxlogLastDbSyncTs — jen pro poll (ne save response,
 *      protože timestamp nebyl resetován a vždy by blokoval aktualizaci)
 * Při manuálním pullu vždy přepíše kartu daty z API (bez detekce konfliktů).
 *
 * @param {string}  entityType
 * @param {Object}  entity
 */
async function applyEntityToAllMatchingCards(entityType, entity) {
  const id = entity && entity.id;
  if (!id) return;
  const cards = findCardsForEntityOnPage(entityType, id);
  for (const card of cards) {
    await yieldToMain();
    let storedEntity = {};
    try { storedEntity = JSON.parse(card.getPluginData('uxlogEntity') || '{}'); } catch (_) {}
    const changedFields = getChangedRemoteFields(storedEntity, entity, entityType);
    try {
      card.setPluginData('uxlogEntity', JSON.stringify(entity));
      if (entity._ts != null)    card.setPluginData('uxlogLastSyncTs', String(entity._ts));
      if (entity._apiId != null) card.setPluginData('uxlogApiId', String(entity._apiId));
      card.setPluginData('uxlogLastDbSyncTs', String(Date.now()));
      card.setPluginData('uxlogLocalEditTs', '0');
    } catch (_) {}

    if (isUserEditingTextInsideUxlogCard(card)) {
      continue;
    }

    if (changedFields.size === 0) {
      continue;
    }

    if (entityType === 'persona') {
      await applyPersonaEntityText(card, entity, changedFields);
    } else {
      await applyGenericEntityText(card, entityType, entity, changedFields);
    }
  }
}

/** Debounce timer pro notifikaci UI o lokálních změnách. */
let localChangeNotifyTimer = null;
const LOCAL_CHANGE_NOTIFY_DEBOUNCE_MS = 1500;

/**
 * Při documentAccess: dynamic-page je nutné nejdřív načíst všechny stránky,
 * jinak figma.on('documentchange') vyhodí chybu.
 */
function registerDocumentChangeHandler() {
  figma.loadAllPagesAsync()
    .then(function () {
      figma.on('documentchange', function (event) {
        // Odložit zpracování — documentchange se vrátí hned, Figma nečeká na náš průchod změnami.
        setTimeout(function () {
          const changes = event && event.documentChanges;
          if (!changes) return;
          let anyDirty = false;
          for (let i = 0; i < changes.length; i++) {
            const ch = changes[i];
            if (ch.type !== undefined && ch.type !== 'PROPERTY_CHANGE') continue;
            const node = ch.node;
            if (!node || node.type !== 'TEXT') continue;
            if (suppressTextChangeIds.has(node.id)) continue;
            let p = node.parent;
            while (p && p.type !== 'PAGE') {
              if (p.type === 'FRAME') {
                const et = p.getPluginData('uxlogEntityType') ||
                  (p.getPluginData('uxlogPersona') ? 'persona' : null);
                const eid = p.getPluginData('uxlogEntityId');
                if (et && eid) {
                  try { p.setPluginData('uxlogLocalEditTs', String(Date.now())); } catch (_) {}
                  anyDirty = true;
                  break;
                }
              }
              p = p.parent;
            }
          }
          if (anyDirty) {
            if (localChangeNotifyTimer) clearTimeout(localChangeNotifyTimer);
            localChangeNotifyTimer = setTimeout(function () {
              localChangeNotifyTimer = null;
              figma.ui.postMessage({ type: 'localChangeDetected' });
            }, LOCAL_CHANGE_NOTIFY_DEBOUNCE_MS);
          }
        }, 0);
      });
    })
    .catch(function (err) {
      console.error('[UXLog] loadAllPagesAsync:', err);
    });
}

registerDocumentChangeHandler();

// ---------------------------------------------------------------------------
// Zprávy z UI
// ---------------------------------------------------------------------------

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'uiReady') {
    sendUiBootstrap();
  } else if (msg.type === 'parseYaml') {
    const requestId = msg.requestId;
    try {
      const data = await parseYamlText(msg.text || '');
      figma.ui.postMessage({ type: 'parseYamlResult', requestId: requestId, ok: true, data: data });
    } catch (e) {
      figma.ui.postMessage({
        type: 'parseYamlResult',
        requestId: requestId,
        ok: false,
        error: String(e && e.message ? e.message : e),
      });
    }
  } else if (msg.type === 'serializeYaml') {
    const requestId = msg.requestId;
    try {
      await yieldToMain();
      const text = toYamlText(msg.value);
      await yieldToMain();
      figma.ui.postMessage({ type: 'serializeYamlResult', requestId: requestId, ok: true, text: text });
    } catch (e) {
      figma.ui.postMessage({
        type: 'serializeYamlResult',
        requestId: requestId,
        ok: false,
        error: String(e && e.message ? e.message : e),
      });
    }
  } else if (msg.type === 'validateFlexiConnect') {
    var rawU = String(msg.url || '').trim();
    var normalizedUrl = normalizeFlexiBaseUrl(rawU);
    var blocked = isDirectLocalFlexiWithoutProxy(rawU);
    figma.ui.postMessage({
      type: 'validateFlexiConnectResult',
      requestId: msg.requestId,
      normalizedUrl: normalizedUrl,
      blocked: blocked,
      hint: blocked ? getLocalFlexiCorsHintMessage() : undefined,
    });
  } else if (msg.type === 'loadPluginConfig') {
    const raw = await figma.clientStorage.getAsync(PLUGIN_CONFIG_STORAGE_KEY);
    var config = raw || null;
    if (config && config.url != null) {
      config = Object.assign({}, config, { url: normalizeFlexiBaseUrl(String(config.url).trim()) });
    }
    figma.ui.postMessage({ type: 'pluginConfigLoaded', config: config });
  } else if (msg.type === 'savePluginConfig') {
    var toSave = msg.config;
    if (toSave && typeof toSave === 'object' && toSave.url != null) {
      toSave = Object.assign({}, toSave, { url: normalizeFlexiBaseUrl(String(toSave.url).trim()) });
    }
    await figma.clientStorage.setAsync(PLUGIN_CONFIG_STORAGE_KEY, toSave);
    figma.ui.postMessage({ type: 'pluginConfigSaved', ok: true });
  } else if (msg.type === 'applyRemoteEntity') {
    try {
      await applyEntityToAllMatchingCards(msg.entityType, msg.entity);
      figma.ui.postMessage({ type: 'applyRemoteEntityDone', ok: true });
    } catch (err) {
      figma.ui.postMessage({ type: 'applyRemoteEntityDone', ok: false, message: String(err) });
    }
  } else if (msg.type === 'generate') {
    try {
      if (msg.entityType === 'persona') {
        await generatePersonaCards(msg.entities, msg.projects || [], msg);
      } else {
        await generateGenericCards(msg.entities, msg.entityType, msg.projects || [], msg);
      }
      figma.ui.postMessage({
        type: 'success',
        count: msg.entities.length,
        entityType: msg.entityType,
        silent: !!msg.silent,
      });
    } catch (err) {
      console.error(err);
      figma.ui.postMessage({ type: 'error', message: String(err) });
    }

  } else if (msg.type === 'readSelection') {
    const byType = {};
    const projectsMap = {};
    const sel = figma.currentPage.selection;
    let readSelStep = 0;
    for (let si = 0; si < sel.length; si++) {
      const node = sel[si];
      try {
        const result = extractEntityFromCard(node);
        if (!result) continue;
        const { type, entity } = result;
        if (!byType[type]) byType[type] = [];
        byType[type].push(entity);
        const prData = node.getPluginData('uxlogProject');
        if (prData) {
          const proj = JSON.parse(prData);
          if (proj && proj.id) projectsMap[proj.id] = proj;
        }
      } catch (_) {}
      readSelStep++;
      if (readSelStep % 20 === 0) await yieldToMain();
    }
    figma.ui.postMessage({ type: 'selectionData', byType, projects: Object.values(projectsMap) });

  } else if (msg.type === 'countLocalChanges') {
    // Spočítá změněné atributy (fields) na UXLog kartách na aktuální stránce
    const projectId = msg.projectId;
    let total = 0;
    function countFieldChanges(card) {
      let storedEntity = {};
      try { storedEntity = JSON.parse(card.getPluginData('uxlogEntity') || '{}'); } catch (_) {}
      let fieldCount = 0;
      function walkFields(n) {
        if (n.type === 'TEXT') {
          const field = n.getPluginData('uxlogField');
          if (field) {
            const raw = n.getPluginData('uxlogAppliedValue');
            const oldVal = (raw && raw.indexOf('v:') === 0) ? raw.slice(2) : (storedEntity[field] != null ? String(storedEntity[field]) : '');
            if (n.characters !== oldVal) fieldCount++;
          }
        }
        for (let ci = 0; ci < (n.children || []).length; ci++) walkFields(n.children[ci]);
      }
      walkFields(card);
      return fieldCount;
    }
    let visitCount = 0;
    async function walkCount(node) {
      visitCount++;
      if (visitCount % YIELD_NODE_VISIT_INTERVAL === 0) await yieldToMain();
      if (node.type === 'FRAME') {
        const et = node.getPluginData('uxlogEntityType') ||
          (node.getPluginData('uxlogPersona') ? 'persona' : null);
        const eid = node.getPluginData('uxlogEntityId');
        if (et && eid) {
          if (projectId) {
            const cardPid = node.getPluginData('uxlogProjectId');
            if (cardPid && cardPid !== String(projectId)) return;
          }
          total += countFieldChanges(node);
          return;
        }
      }
      if ('children' in node) {
        const ch = node.children;
        for (let i = 0; i < ch.length; i++) await walkCount(ch[i]);
      }
    }
    const pageChildren = figma.currentPage.children;
    for (let pi = 0; pi < pageChildren.length; pi++) await walkCount(pageChildren[pi]);
    figma.ui.postMessage({ type: 'localChangesCount', total });

  } else if (msg.type === 'collectDirtyEntities') {
    // Extrahuje entity se změněnými field-level atributy z aktuální stránky
    const projectId = msg.projectId;
    const results = [];
    const seen = new Set();
    function hasFieldLevelChange(card) {
      let storedEntity = {};
      try { storedEntity = JSON.parse(card.getPluginData('uxlogEntity') || '{}'); } catch (_) {}
      let found = false;
      function wf(n) {
        if (found) return;
        if (n.type === 'TEXT') {
          const field = n.getPluginData('uxlogField');
          if (field) {
            const raw = n.getPluginData('uxlogAppliedValue');
            const oldVal = (raw && raw.indexOf('v:') === 0) ? raw.slice(2) : (storedEntity[field] != null ? String(storedEntity[field]) : '');
            if (n.characters !== oldVal) found = true;
          }
        }
        for (let ci = 0; ci < (n.children || []).length; ci++) wf(n.children[ci]);
      }
      wf(card);
      return found;
    }
    let collectVisitCount = 0;
    async function walkCollect(node) {
      collectVisitCount++;
      if (collectVisitCount % YIELD_NODE_VISIT_INTERVAL === 0) await yieldToMain();
      if (node.type === 'FRAME') {
        const et = node.getPluginData('uxlogEntityType') ||
          (node.getPluginData('uxlogPersona') ? 'persona' : null);
        const eid = node.getPluginData('uxlogEntityId');
        if (et && eid) {
          const key = et + ':' + eid;
          if (seen.has(key)) return;
          if (projectId) {
            const cardPid = node.getPluginData('uxlogProjectId');
            if (cardPid && cardPid !== String(projectId)) return;
          }
          if (hasFieldLevelChange(node)) {
            seen.add(key);
            const merged = mergeEntityForPayload(node);
            if (merged && merged.id) {
              results.push({ entityType: et, entityId: eid, entity: merged });
            }
          }
          return;
        }
      }
      if ('children' in node) {
        const ch = node.children;
        for (let i = 0; i < ch.length; i++) await walkCollect(ch[i]);
      }
    }
    const collectRoots = figma.currentPage.children;
    for (let ri = 0; ri < collectRoots.length; ri++) await walkCollect(collectRoots[ri]);
    figma.ui.postMessage({ type: 'dirtyEntitiesCollected', entities: results });

  } else if (msg.type === 'markSavedEntitiesClean' || msg.type === 'markAllCardsClean') {
    // Označí jen úspěšně uložené entity jako čisté a posune jejich applied values.
    const projectId = msg.projectId;
    const entityKeys = new Set((msg.entities || []).map(function (e) {
      return String(e.entityType || '') + ':' + String(e.entityId || '');
    }));
    const hasEntityFilter = entityKeys.size > 0;
    const now = String(Date.now());
    let cleanVisitCount = 0;
    async function walkClean(node) {
      cleanVisitCount++;
      if (cleanVisitCount % YIELD_NODE_VISIT_INTERVAL === 0) await yieldToMain();
      if (node.type === 'FRAME') {
        const et = node.getPluginData('uxlogEntityType') ||
          (node.getPluginData('uxlogPersona') ? 'persona' : null);
        const eid = node.getPluginData('uxlogEntityId');
        if (et) {
          if (projectId) {
            const cardPid = node.getPluginData('uxlogProjectId');
            if (cardPid && cardPid !== String(projectId)) return;
          }
          if (hasEntityFilter && !entityKeys.has(String(et) + ':' + String(eid || ''))) return;
          try {
            updateAppliedValuesFromCard(node);
            node.setPluginData('uxlogLastDbSyncTs', now);
            node.setPluginData('uxlogLocalEditTs', '0');
          } catch (_) {}
          return;
        }
      }
      if ('children' in node) {
        const ch = node.children;
        for (let i = 0; i < ch.length; i++) await walkClean(ch[i]);
      }
    }
    const cleanRoots = figma.currentPage.children;
    for (let ci = 0; ci < cleanRoots.length; ci++) await walkClean(cleanRoots[ci]);
    figma.ui.postMessage({ type: 'cardsMarkedClean', ok: true });

  } else if (msg.type === 'getLocalChangesDetail') {
    // Vrátí seznam konkrétních změn (pole → staré vs nové) pro dirty karty
    const projectId = msg.projectId;
    const details = [];
    let detailVisitCount = 0;
    async function walkDetail(node) {
      detailVisitCount++;
      if (detailVisitCount % YIELD_NODE_VISIT_INTERVAL === 0) await yieldToMain();
      if (node.type === 'FRAME') {
        const et = node.getPluginData('uxlogEntityType') ||
          (node.getPluginData('uxlogPersona') ? 'persona' : null);
        const eid = node.getPluginData('uxlogEntityId');
        if (et && eid) {
          if (projectId) {
            const cardPid = node.getPluginData('uxlogProjectId');
            if (cardPid && cardPid !== String(projectId)) return;
          }
          const localEditTs = parseInt(node.getPluginData('uxlogLocalEditTs') || '0', 10) || 0;
          const lastDbSyncTs = parseInt(node.getPluginData('uxlogLastDbSyncTs') || '0', 10) || 0;
          let isDirty = localEditTs > lastDbSyncTs;
          if (!isDirty) {
            const perNode = hasAnyLocalTextChange(node);
            isDirty = perNode === true;
          }
          if (!isDirty) return;

          let storedEntity = {};
          try { storedEntity = JSON.parse(node.getPluginData('uxlogEntity') || '{}'); } catch (_) {}
          const cardName = storedEntity.code
            ? (storedEntity.code + ' ' + (storedEntity.name || ''))
            : (storedEntity.name || eid);
          const fieldChanges = [];
          function walkFields(n) {
            if (n.type === 'TEXT') {
              const field = n.getPluginData('uxlogField');
              if (field) {
                const raw = n.getPluginData('uxlogAppliedValue');
                const oldVal = (raw && raw.indexOf('v:') === 0) ? raw.slice(2) : (storedEntity[field] != null ? String(storedEntity[field]) : '');
                const newVal = n.characters || '';
                if (oldVal !== newVal) {
                  fieldChanges.push({ field: field, old: oldVal, new: newVal });
                }
              }
            }
            for (let ci = 0; ci < (n.children || []).length; ci++) walkFields(n.children[ci]);
          }
          walkFields(node);
          if (fieldChanges.length > 0) {
            details.push({ entityType: et, name: cardName.trim(), changes: fieldChanges });
          }
          return;
        }
      }
      if ('children' in node) {
        const ch = node.children;
        for (let i = 0; i < ch.length; i++) await walkDetail(ch[i]);
      }
    }
    const detailRoots = figma.currentPage.children;
    for (let di = 0; di < detailRoots.length; di++) await walkDetail(detailRoots[di]);
    figma.ui.postMessage({ type: 'localChangesDetail', details: details });

  } else if (msg.type === 'loadSyncTimestamps') {
    const raw = await figma.clientStorage.getAsync(SYNC_TIMESTAMPS_STORAGE_KEY);
    figma.ui.postMessage({ type: 'syncTimestampsLoaded', data: raw || {} });

  } else if (msg.type === 'saveSyncTimestamps') {
    await figma.clientStorage.setAsync(SYNC_TIMESTAMPS_STORAGE_KEY, msg.data);

  } else if (msg.type === 'resize') {
    const w = Math.max(280, Math.min(800, Math.round(msg.width)));
    const h = Math.max(60, Math.min(1200, Math.round(msg.height)));
    figma.ui.resize(w, h);
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// ---------------------------------------------------------------------------
// Fonty — detekce a fallback
// ---------------------------------------------------------------------------

let FONTS = {
  family:   'Inter',
  regular:  'Regular',
  medium:   'Medium',
  semibold: 'Semi Bold',
  bold:     'Bold',
};

/**
 * Načte fonty pro karty. Prioritně používá pouze Inter (vestavěný font Figma),
 * aby se vyhnula chybám "[Local fonts] using agent" — lokální fonty procházejí
 * agentem, který může selhat. Fallback na další fonty pouze pokud Inter není dostupný.
 * Mezi načteními krátce předává řízení (`yieldToMain`).
 */
async function loadFonts() {
  // Pouze Inter — vestavěný font Figma, neprochází Local Fonts agentem.
  // Ostatní fonty (Roboto, Open Sans…) mohou být lokální a způsobovat chybu "[Local fonts] using agent".
  const candidates = [
    { family: 'Inter', regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' },
    { family: 'Inter', regular: 'Regular', medium: 'Medium', semibold: 'SemiBold', bold: 'Bold' },
  ];

  for (const c of candidates) {
    try {
      // Sekvenční načítání — paralelní Promise.all může u Local Fonts agenta selhat
      await figma.loadFontAsync({ family: c.family, style: c.regular });
      await yieldToMain();
      await figma.loadFontAsync({ family: c.family, style: c.medium });
      await yieldToMain();
      await figma.loadFontAsync({ family: c.family, style: c.semibold });
      await yieldToMain();
      await figma.loadFontAsync({ family: c.family, style: c.bold });
      await yieldToMain();
      FONTS.family   = c.family;
      FONTS.regular  = c.regular;
      FONTS.medium   = c.medium;
      FONTS.semibold = c.semibold;
      FONTS.bold     = c.bold;
      return;
    } catch (_) {}
  }
  throw new Error(ERR_FONT_LOAD);
}

// ---------------------------------------------------------------------------
// Pomocné funkce
// ---------------------------------------------------------------------------

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Vytvoří Figma SOLID fill. Barva musí být objekt {r,g,b} (0–1).
 * Pokud je předán hex string (např. "#1E293B"), automaticky se převede.
 * @param {Object|string} color - RGB objekt nebo hex řetězec
 * @param {number} [opacity] - průhlednost 0–1
 * @returns {SolidPaint}
 */
function solid(color, opacity) {
  const c = typeof color === 'string' ? hex(color) : color;
  const p = { type: 'SOLID', color: c };
  if (opacity !== undefined) p.opacity = opacity;
  return p;
}

/** Přidá uzel do AL rodiče a nastaví sizing. */
function fl(parent, child, h, v, grow) {
  parent.appendChild(child);
  if (h    !== undefined) child.layoutSizingHorizontal = h;
  if (v    !== undefined) child.layoutSizingVertical   = v;
  if (grow !== undefined) child.layoutGrow             = grow;
  return child;
}

// ---------------------------------------------------------------------------
// Rozměry (persona)
// ---------------------------------------------------------------------------

const CARD_W   = 1200;
const CARD_H   = 1600;
const BLOCK_W  = 600;
const BLOCK_H  = 600;
const PHOTO_SZ = 300;
const PAD      = 28;

// ---------------------------------------------------------------------------
// Sdílené komponenty karet
// ---------------------------------------------------------------------------

function buildDivider() {
  const div = figma.createRectangle();
  div.name  = NODE_ODDELOVAC;
  div.resize(1, 1);
  div.fills = [solid(hex(COLOR_BORDER))];
  return div;
}

/**
 * Vytvoří textový uzel s klikatelným URL odkazem.
 * Text je podtržený a modrý; odkaz je nastaven jako Figma hyperlink.
 * @param {string} url - URL adresa
 * @param {boolean} [inverted] - true = světlý text (tmavé pozadí)
 * @returns {TextNode}
 */
function buildUrlText(url, inverted) {
  const urlText = figma.createText();
  urlText.name        = NODE_URL;
  urlText.fontName    = { family: FONTS.family, style: FONTS.regular };
  urlText.characters  = url;
  urlText.fontSize    = 22;
  urlText.fills       = [solid(hex(inverted ? COLOR_LT_SKY : COLOR_BLUE))];
  urlText.textDecoration = 'UNDERLINE';
  try {
    urlText.setRangeHyperlink(0, url.length, { type: 'URL', value: url });
  } catch (_) {}
  return urlText;
}

/**
 * Vytvoří statistikový blok (popisek + hodnota).
 * @param {string} label - Popisek statistiky
 * @param {string} value - Hodnota
 */
/**
 * Statistický blok (jedna hodnota); volitelně označí pole pro sync (uxlogField).
 * @param {string} label
 * @param {string} value
 * @param {string} [fieldKey] - název pole entity pro sync
 * @returns {FrameNode}
 */
function buildStat(label, value, fieldKey) {
  const stat = figma.createFrame();
  stat.name                  = label;
  stat.layoutMode            = 'VERTICAL';
  stat.primaryAxisSizingMode = 'AUTO';
  stat.counterAxisSizingMode = 'AUTO';
  stat.itemSpacing           = 2;
  stat.fills                 = [];

  const labelT = figma.createText();
  labelT.fontName   = { family: FONTS.family, style: FONTS.regular };
  labelT.characters = label;
  labelT.fontSize   = 22;
  labelT.fills      = [solid(hex(COLOR_HEADER_MUTED))];
  stat.appendChild(labelT);

  const valT = figma.createText();
  valT.fontName   = { family: FONTS.family, style: FONTS.semibold };
  valT.characters = String(value || FALLBACK_EMPTY);
  valT.fontSize   = 30;
  valT.fills      = [solid(hex(COLOR_HEADER_TEXT))];
  if (fieldKey) setTextUxlogField(valT, fieldKey);
  stat.appendChild(valT);

  return stat;
}

/**
 * Statistický blok se dvěma editovatelnými hodnotami (např. scénář: částka + jednotka).
 * @param {string} label
 * @param {string} fieldA
 * @param {string} fieldB
 * @param {string} valA
 * @param {string} valB
 * @returns {FrameNode}
 */
function buildStatSplit(label, fieldA, fieldB, valA, valB) {
  const stat = figma.createFrame();
  stat.name                  = label;
  stat.layoutMode            = 'VERTICAL';
  stat.primaryAxisSizingMode = 'AUTO';
  stat.counterAxisSizingMode = 'AUTO';
  stat.itemSpacing           = 2;
  stat.fills                 = [];

  const labelT = figma.createText();
  labelT.fontName   = { family: FONTS.family, style: FONTS.regular };
  labelT.characters = label;
  labelT.fontSize   = 22;
  labelT.fills      = [solid(hex(COLOR_HEADER_MUTED))];
  stat.appendChild(labelT);

  const row = figma.createFrame();
  row.name                  = 'StatValues';
  row.layoutMode            = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.itemSpacing           = 4;
  row.fills                 = [];

  const a = figma.createText();
  a.fontName   = { family: FONTS.family, style: FONTS.semibold };
  const sa = String((valA || '').trim() || FALLBACK_EMPTY);
  a.characters = sa;
  a.fontSize   = 30;
  a.fills      = [solid(hex(COLOR_HEADER_TEXT))];
  setTextUxlogField(a, fieldA);
  row.appendChild(a);

  const b = figma.createText();
  b.fontName   = { family: FONTS.family, style: FONTS.semibold };
  const sb = String((valB || '').trim() || FALLBACK_EMPTY);
  b.characters = sb === FALLBACK_EMPTY ? '' : sb;
  b.fontSize   = 30;
  b.fills      = [solid(hex(COLOR_HEADER_TEXT))];
  setTextUxlogField(b, fieldB);
  row.appendChild(b);

  stat.appendChild(row);
  return stat;
}

/** Barevný blok s nadpisem a editovatelným textem */
function buildColorBlock(label, value, hint, bgColor, fieldName) {
  const block = figma.createFrame();
  block.name                  = label;
  block.layoutMode            = 'VERTICAL';
  block.primaryAxisSizingMode = 'FIXED';
  block.counterAxisSizingMode = 'FIXED';
  block.resize(BLOCK_W, BLOCK_H);
  block.paddingLeft           = 28;
  block.paddingRight          = 28;
  block.paddingTop            = 24;
  block.paddingBottom         = 24;
  block.itemSpacing           = 12;
  block.fills                 = [solid(bgColor)];

  const labelText = figma.createText();
  labelText.fontName      = { family: FONTS.family, style: FONTS.semibold };
  labelText.characters    = label;
  labelText.fontSize      = 22;
  labelText.fills         = [solid(hex(COLOR_TEXT))];
  labelText.letterSpacing = { value: 1.5, unit: 'PIXELS' };
  fl(block, labelText, 'FILL');

  const isEmpty = !value || !value.trim();
  const textNode = figma.createText();
  textNode.name       = fieldName || NODE_TEXT;
  textNode.fontName   = { family: FONTS.family, style: FONTS.regular };
  textNode.characters = isEmpty ? hint : value.trim();
  textNode.fontSize   = 28;
  textNode.fills      = [solid(hex(COLOR_TEXT))];
  textNode.lineHeight = { value: 155, unit: 'PERCENT' };
  if (fieldName) setTextUxlogField(textNode, fieldName);
  fl(block, textNode, 'FILL', 'FILL', 1);

  return block;
}

/**
 * Badge s textem a barevným pozadím.
 * @param {string} label - Text badge
 * @param {string} [fieldKey] - název pole entity pro sync (uxlogField na textu)
 */
function buildBadge(label, fieldKey) {
  const opacity = 0.14;
  const badge = figma.createFrame();
  badge.name                  = NODE_BADGE;
  badge.layoutMode            = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.paddingLeft           = 10;
  badge.paddingRight          = 10;
  badge.paddingTop            = 3;
  badge.paddingBottom         = 3;
  badge.cornerRadius          = 20;
  badge.fills                 = [solid(hex(COLOR_WHITE), opacity)];

  const text = figma.createText();
  text.fontName   = { family: FONTS.family, style: FONTS.medium };
  text.characters = label;
  text.fontSize   = 20;
  text.fills     = [solid(hex(COLOR_HEADER_TEXT))];
  if (fieldKey) setTextUxlogField(text, fieldKey);
  badge.appendChild(text);

  return badge;
}

// ---------------------------------------------------------------------------
// Generická karta (pro všechny entity kromě persony)
// ---------------------------------------------------------------------------

/**
 * Vytvoří hlavičku generické karty s tmavým pozadím a inverzním textem.
 * @param {Object} entity - data entity
 * @param {Object} config - konfigurace typu entity (typeName, headerBgHex, badges, stats)
 * @returns {FrameNode} hlavička karty
 */
function buildGenericHeader(entity, config) {
  const headerBg = config.headerBgHex ? hex(config.headerBgHex) : hex(COLOR_HEADER_HYPOTHESIS);
  const header = figma.createFrame();
  header.name                  = NODE_HEADER;
  header.layoutMode            = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'FIXED';
  header.paddingLeft           = PAD;
  header.paddingRight          = PAD;
  header.paddingTop            = PAD;
  header.paddingBottom         = PAD;
  header.itemSpacing           = 8;
  header.fills                 = [solid(headerBg)];

  // Typ entity (zvětšený pro lepší čitelnost)
  const typeLabel = figma.createText();
  typeLabel.fontName      = { family: FONTS.family, style: FONTS.semibold };
  typeLabel.characters    = config.typeName;
  typeLabel.fontSize      = 26;
  typeLabel.fills         = [solid(hex(COLOR_HEADER_TEXT))];
  typeLabel.letterSpacing = { value: 1.5, unit: 'PIXELS' };
  fl(header, typeLabel, 'FILL');

  // Jméno
  const nameText = figma.createText();
  nameText.name       = 'name';
  nameText.fontName   = { family: FONTS.family, style: FONTS.bold };
  nameText.characters = entity.name || FALLBACK_NO_TITLE;
  nameText.fontSize   = 44;
  nameText.fills      = [solid(hex(COLOR_HEADER_TEXT))];
  setTextUxlogField(nameText, 'name');
  fl(header, nameText, 'FILL');

  // Meta řádek: kód + badges
  const hasCode   = !!entity.code;
  const hasBadges = (config.badges || []).some(b => !!entity[b.field]);

  if (hasCode || hasBadges) {
    const metaRow = figma.createFrame();
    metaRow.name                  = NODE_META;
    metaRow.layoutMode            = 'HORIZONTAL';
    metaRow.primaryAxisSizingMode = 'AUTO';
    metaRow.counterAxisSizingMode = 'AUTO';
    metaRow.itemSpacing           = 8;
    metaRow.counterAxisAlignItems = 'CENTER';
    metaRow.fills                 = [];

    if (hasCode) {
      const codeText = figma.createText();
      codeText.name       = 'code';
      codeText.fontName   = { family: FONTS.family, style: FONTS.medium };
      codeText.characters = entity.code;
      codeText.fontSize   = 22;
      codeText.fills      = [solid(hex(COLOR_HEADER_MUTED))];
      setTextUxlogField(codeText, 'code');
      metaRow.appendChild(codeText);
    }

    for (const badgeConf of (config.badges || [])) {
      const val = entity[badgeConf.field];
      if (!val) continue;
      const label      = (badgeConf.map && badgeConf.map[val]) || val;
      metaRow.appendChild(buildBadge(label, badgeConf.field));
    }

    fl(header, metaRow, 'HUG', 'HUG');
  }

  // Statistiky (scénář: frekvence, hodnota, uživatelé)
  if (config.stats && config.stats.length > 0) {
    const statsRow = figma.createFrame();
    statsRow.name                  = NODE_STATISTIKY;
    statsRow.layoutMode            = 'HORIZONTAL';
    statsRow.primaryAxisSizingMode = 'AUTO';
    statsRow.counterAxisSizingMode = 'AUTO';
    statsRow.itemSpacing           = 40;
    statsRow.fills                 = [];

    for (const s of config.stats) {
      statsRow.appendChild(buildStatSplit(
        s.label,
        s.fieldA,
        s.fieldB,
        entity[s.fieldA] || '',
        entity[s.fieldB] || '',
      ));
    }

    fl(header, statsRow, 'HUG', 'HUG');
  }

  // URL odkaz (pokud entita má vyplněné URL)
  if (entity.url && entity.url.trim()) {
    fl(header, buildUrlText(entity.url.trim(), true), 'HUG');
  }

  return header;
}

/**
 * Vrátí barvu bloku z konfigurace (hex → RGB).
 * Každý blok má definovanou barvu v ENTITY_CONFIGS nebo u persony v konstantách.
 */
function getBlockBgColor(block) {
  return block.colorHex ? hex(block.colorHex) : hex(COLOR_LT_GREY);
}

function buildBlocksArea(entity, config, CWIDTH) {
  const container = figma.createFrame();
  container.name                  = NODE_BLOKY;
  container.layoutMode            = 'VERTICAL';
  container.primaryAxisSizingMode = 'FIXED';
  container.counterAxisSizingMode = 'FIXED';
  container.itemSpacing           = 0;
  container.fills                 = [];

  const blocks = config.blocks || [];
  const layout = config.blockLayout || '1col';

  if (layout === '1col') {
    const b = blocks[0];
    fl(container, buildColorBlock(b.name, entity[b.field] || '', b.hint, getBlockBgColor(b), b.field), 'FILL', 'FILL');

  } else if (layout === '2col') {
    const row = figma.createFrame();
    row.name                  = NODE_RADA_1;
    row.layoutMode            = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'FIXED';
    row.itemSpacing           = 0;
    row.fills                 = [];
    fl(container, row, 'FILL', 'FILL', 1);
    for (let i = 0; i < Math.min(blocks.length, 2); i++) {
      const b = blocks[i];
      fl(row, buildColorBlock(b.name, entity[b.field] || '', b.hint, getBlockBgColor(b), b.field), 'FILL', 'FILL');
    }

  } else if (layout === '3col') {
    const row = figma.createFrame();
    row.name                  = NODE_RADA_1;
    row.layoutMode            = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'FIXED';
    row.itemSpacing           = 0;
    row.fills                 = [];
    fl(container, row, 'FILL', 'FILL', 1);
    const visibleBlocks = blocks.filter(b =>
      b.field !== 'wontHaveExplanation' || entity.priority === 'wont'
    );
    for (let i = 0; i < Math.min(visibleBlocks.length, 3); i++) {
      const b = visibleBlocks[i];
      fl(row, buildColorBlock(b.name, entity[b.field] || '', b.hint, getBlockBgColor(b), b.field), 'FILL', 'FILL');
    }

  } else if (layout === '1+3') {
    // První blok: celá šířka, pevná výška
    const b0   = blocks[0];
    const topB = buildColorBlock(b0.name, entity[b0.field] || '', b0.hint, getBlockBgColor(b0), b0.field);
    fl(container, topB, 'FILL', 'FIXED');
    topB.resize(CWIDTH, 280);

    // Tři bloky pod ním
    const row = figma.createFrame();
    row.name                  = NODE_RADA_2;
    row.layoutMode            = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'FIXED';
    row.itemSpacing           = 0;
    row.fills                 = [];
    fl(container, row, 'FILL', 'FILL', 1);
    for (let i = 1; i < Math.min(blocks.length, 4); i++) {
      const b = blocks[i];
      fl(row, buildColorBlock(b.name, entity[b.field] || '', b.hint, getBlockBgColor(b), b.field), 'FILL', 'FILL');
    }
  }

  return container;
}

function buildGenericCard(entity, entityType, config) {
  const accent = hex(config.accentHex);
  const CWIDTH = config.cardW || 1000;
  const CHEIGHT = config.cardH || 700;

  const card = figma.createFrame();
  card.name                  = [entity.code, entity.name].filter(Boolean).join(' — ') || config.typeName;
  card.layoutMode            = 'VERTICAL';
  card.primaryAxisSizingMode = 'FIXED';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(CWIDTH, CHEIGHT);
  card.itemSpacing           = 0;
  card.fills                 = [solid(hex(COLOR_WHITE))];
  card.cornerRadius          = 16;
  card.clipsContent          = true;
  card.strokes               = [solid(hex(COLOR_BORDER))];
  card.strokeWeight          = 1;
  card.strokeAlign           = 'INSIDE';
  card.effects               = [DROP_SHADOW];

  // Barevný pruh
  const bar = figma.createRectangle();
  bar.name  = NODE_ACCENT_BAR;
  bar.resize(CWIDTH, 6);
  bar.fills = [solid(hex(COLOR_TEXT))];
  fl(card, bar, 'FILL', 'FIXED');

  // Hlavička
  fl(card, buildGenericHeader(entity, config, accent), 'FILL', 'HUG');

  // Oddělovač
  fl(card, buildDivider(), 'FILL', 'FIXED');

  // Bloky
  fl(card, buildBlocksArea(entity, config, CWIDTH), 'FILL', 'FILL', 1);

  return card;
}

// ---------------------------------------------------------------------------
// Generátor generických karet
// ---------------------------------------------------------------------------

/**
 * Výchozí rozložení: jeden vodorovný řádek karet vycentrovaný kolem středu viewportu (YAML / jeden typ z API).
 * @param {FrameNode[]} cards
 * @param {string} entityType
 */
function layoutCardsDefaultViewportRow(cards, entityType) {
  if (!cards.length) return;
  const GAP = 48;
  var CWIDTH;
  if (entityType === 'persona') {
    CWIDTH = CARD_W;
  } else {
    var cfg = ENTITY_CONFIGS[entityType];
    CWIDTH = cfg ? (cfg.cardW || 1000) : 1000;
  }
  var totalW = cards.length * CWIDTH + (cards.length - 1) * GAP;
  var startX = figma.viewport.center.x - totalW / 2;
  var startY = figma.viewport.center.y - (cards[0] ? cards[0].height / 2 : 0);
  for (var i = 0; i < cards.length; i++) {
    cards[i].x = startX + i * (CWIDTH + GAP);
    cards[i].y = startY;
  }
}

/**
 * Při importu „všechny typy“ z API: každý typ na vlastní řádek, horizontální a vertikální mezery z layout.gapX / gapY.
 * @param {FrameNode[]} cards
 * @param {{ sessionId?: string, gapX?: number, gapY?: number, endSession?: boolean }} layout
 */
function placeCardsFlexiImportRow(cards, layout) {
  if (!cards.length || !layout) return;
  var gapX = typeof layout.gapX === 'number' ? layout.gapX : 300;
  var gapY = typeof layout.gapY === 'number' ? layout.gapY : 300;
  var sid = layout.sessionId != null ? String(layout.sessionId) : 'default';
  var session = flexiImportLayoutSessions.get(sid);
  if (!session) {
    session = { lastRowBottom: null, gapX: gapX, gapY: gapY };
    flexiImportLayoutSessions.set(sid, session);
  }
  session.gapX = gapX;
  session.gapY = gapY;

  var n = cards.length;
  var widths = [];
  var heights = [];
  for (var j = 0; j < n; j++) {
    widths.push(cards[j].width);
    heights.push(cards[j].height);
  }
  var rowH = heights[0];
  for (var h = 1; h < n; h++) {
    if (heights[h] > rowH) rowH = heights[h];
  }
  var rowW = 0;
  for (var w = 0; w < n; w++) {
    rowW += widths[w];
    if (w < n - 1) rowW += gapX;
  }
  var startX = figma.viewport.center.x - rowW / 2;
  var rowTop = session.lastRowBottom == null
    ? figma.viewport.center.y - rowH / 2
    : session.lastRowBottom + gapY;
  var x = startX;
  for (var k = 0; k < n; k++) {
    cards[k].x = x;
    cards[k].y = rowTop;
    x += widths[k] + gapX;
  }
  var rowBottom = rowTop;
  for (var b = 0; b < n; b++) {
    var bottom = cards[b].y + cards[b].height;
    if (bottom > rowBottom) rowBottom = bottom;
  }
  session.lastRowBottom = rowBottom;
  if (layout.endSession) {
    flexiImportLayoutSessions.delete(sid);
  }
}

/**
 * Umístí nově vytvořené karty na plátno.
 * @param {FrameNode[]} cards
 * @param {string} entityType
 * @param {{ cardSource?: string, layout?: { mode?: string, sessionId?: string, gapX?: number, gapY?: number, endSession?: boolean } }} [genMsg]
 */
function layoutCardsAfterGenerate(cards, entityType, genMsg) {
  var layout = genMsg && genMsg.layout;
  if (layout && layout.mode === 'flexi-import') {
    placeCardsFlexiImportRow(cards, layout);
  } else {
    layoutCardsDefaultViewportRow(cards, entityType);
  }
}

/**
 * @param {Object[]} entities
 * @param {string} entityType
 * @param {Object[]} projects
 * @param {{ cardSource?: string, layout?: object }} [genMsg]
 */
async function generateGenericCards(entities, entityType, projects, genMsg) {
  await loadFonts();
  const config = ENTITY_CONFIGS[entityType];
  if (!config) throw new Error(ERR_UNKNOWN_ENTITY + entityType);

  const projectMap = {};
  for (const p of (projects || [])) {
    if (p && p.id) projectMap[p.id] = p;
  }

  const cardSource = genMsg && genMsg.cardSource === 'flexi' ? 'flexi' : 'yaml';

  const cards  = [];

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const card = buildGenericCard(entity, entityType, config);
    card.setPluginData('uxlogEntityType', entityType);
    card.setPluginData('uxlogEntity',     JSON.stringify(entity));
    const proj = entity.projectId ? projectMap[entity.projectId] : null;
    if (proj) card.setPluginData('uxlogProject', JSON.stringify(proj));
    applyCardSyncMetadata(card, entityType, entity, proj, {
      source: cardSource,
      apiId: entity._apiId != null ? String(entity._apiId) : undefined,
      lastSyncTs: typeof entity._ts === 'number' ? entity._ts : undefined,
    });
    initAppliedValuesOnCard(card);
    figma.currentPage.appendChild(card);
    cards.push(card);
    await yieldToMain();
  }

  layoutCardsAfterGenerate(cards, entityType, genMsg);

  // Výběr neprovádíme — Figma by jinak posunula výhled na nové karty
}

// ---------------------------------------------------------------------------
// Persony — původní implementace
// ---------------------------------------------------------------------------

/**
 * @param {Object[]} personas
 * @param {Object[]} projects
 * @param {{ cardSource?: string, layout?: object }} [genMsg]
 */
async function generatePersonaCards(personas, projects, genMsg) {
  await loadFonts();

  const projectMap = {};
  for (const p of projects) {
    if (p && p.id) projectMap[p.id] = p;
  }

  const cardSource = genMsg && genMsg.cardSource === 'flexi' ? 'flexi' : 'yaml';

  const cards = [];

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const card = buildCard(persona);
    // Nové klíče pro jednotnou extrakci
    card.setPluginData('uxlogEntityType', 'persona');
    card.setPluginData('uxlogEntity',     JSON.stringify(persona));
    // Zpětná kompatibilita
    card.setPluginData('uxlogPersona',    JSON.stringify(persona));
    const proj = persona.projectId ? projectMap[persona.projectId] : null;
    if (proj) card.setPluginData('uxlogProject', JSON.stringify(proj));
    applyCardSyncMetadata(card, 'persona', persona, proj, {
      source: cardSource,
      apiId: persona._apiId != null ? String(persona._apiId) : undefined,
      lastSyncTs: typeof persona._ts === 'number' ? persona._ts : undefined,
    });
    initAppliedValuesOnCard(card);
    figma.currentPage.appendChild(card);
    cards.push(card);
    await yieldToMain();
  }

  layoutCardsAfterGenerate(cards, 'persona', genMsg);

  // Výběr neprovádíme — Figma by jinak posunula výhled na nové karty
}

// ---------------------------------------------------------------------------
// Karta persony
// ---------------------------------------------------------------------------

function buildCard(persona) {

  const card = figma.createFrame();
  card.name                  = [persona.code, persona.name].filter(Boolean).join(' — ') || FALLBACK_PERSONA;
  card.layoutMode            = 'VERTICAL';
  card.primaryAxisSizingMode = 'FIXED';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(CARD_W, CARD_H);
  card.itemSpacing           = 0;
  card.fills                 = [solid(hex(COLOR_WHITE))];
  card.cornerRadius          = 16;
  card.clipsContent          = true;
  card.strokes               = [solid(hex(COLOR_BORDER))];
  card.strokeWeight          = 1;
  card.strokeAlign           = 'INSIDE';
  card.effects               = [DROP_SHADOW];

  const bar = figma.createRectangle();
  bar.name  = NODE_ACCENT_BAR;
  bar.resize(CARD_W, 6);
  bar.fills = [solid(hex(COLOR_TEXT))];
  fl(card, bar, 'FILL', 'FIXED');

  fl(card, buildTopSection(persona), 'FILL', 'HUG');
  fl(card, buildDivider(), 'FILL', 'FIXED');
  fl(card, buildBlockGrid(persona), 'FILL', 'FILL', 1);

  return card;
}

/**
 * Vytvoří horní sekci karty persony s tmavým pozadím a inverzním textem.
 * @param {Object} persona - data persony
 * @returns {FrameNode} horní sekce
 */
function buildTopSection(persona) {
  const top = figma.createFrame();
  top.name                  = NODE_HORNI_SEKCE;
  top.layoutMode            = 'HORIZONTAL';
  top.primaryAxisSizingMode = 'FIXED';
  top.counterAxisSizingMode = 'AUTO';
  top.paddingLeft           = PAD;
  top.paddingRight          = PAD;
  top.paddingTop            = PAD;
  top.paddingBottom         = PAD;
  top.itemSpacing           = PAD;
  top.fills                 = [solid(hex(COLOR_TEXT))];

  fl(top, buildPhoto(persona), 'FIXED', 'FIXED');
  fl(top, buildInfoColumn(persona, true), 'FILL', 'FILL', 1);

  return top;
}

function buildPhoto(persona) {
  const img = figma.createFrame();
  img.name                  = NODE_FOTO;
  img.resize(PHOTO_SZ, PHOTO_SZ);
  img.cornerRadius          = 12;
  img.fills                 = [solid(hex(COLOR_WHITE), 0.10)];
  img.strokes               = [solid(hex(COLOR_WHITE), 0.20)];
  img.strokeWeight          = 2;
  img.strokeAlign           = 'INSIDE';
  img.layoutMode            = 'HORIZONTAL';
  img.primaryAxisSizingMode = 'FIXED';
  img.counterAxisSizingMode = 'FIXED';
  img.primaryAxisAlignItems = 'CENTER';
  img.counterAxisAlignItems = 'CENTER';

  const initText = figma.createText();
  initText.fontName   = { family: FONTS.family, style: FONTS.bold };
  initText.characters = getInitials(persona.name);
  initText.fontSize   = 176;
  initText.fills      = [solid(hex(COLOR_WHITE), 0.45)];
  img.appendChild(initText);

  return img;
}

/**
 * Vytvoří sloupec s informacemi o personě (jméno, kód, badge, cílovou skupinu).
 * @param {Object} persona - data persony
 * @param {boolean} [inverted] - true = tmavé pozadí (světlý text), false = světlé pozadí
 */
function buildInfoColumn(persona, inverted) {
  const textColor   = inverted ? COLOR_WHITE : COLOR_TEXT;
  const mutedColor  = inverted ? COLOR_GREY : COLOR_MUTED;
  const borderColor = mutedColor;

  const col = figma.createFrame();
  col.name                  = NODE_INFO;
  col.layoutMode            = 'VERTICAL';
  col.primaryAxisSizingMode = 'FIXED';
  col.counterAxisSizingMode = 'FIXED';
  col.paddingTop            = 4;
  col.paddingBottom         = 4;
  col.itemSpacing           = 10;
  col.fills                 = [];

  // Typ entity (zvětšený pro lepší čitelnost, jako u generických karet)
  const typeLabel = figma.createText();
  typeLabel.fontName      = { family: FONTS.family, style: FONTS.semibold };
  typeLabel.characters    = persona.status === 'protopersona' ? TYPE_PROTOPERSONA : TYPE_PERSONA;
  typeLabel.fontSize      = 26;
  typeLabel.fills         = [solid(textColor)];
  typeLabel.letterSpacing = { value: 1.2, unit: 'PIXELS' };
  fl(col, typeLabel, 'FILL');

  const nameText = figma.createText();
  nameText.name       = 'name';
  nameText.fontName   = { family: FONTS.family, style: FONTS.bold };
  nameText.characters = persona.name || FALLBACK_NO_NAME;
  nameText.fontSize   = 52;
  nameText.fills      = [solid(textColor)];
  setTextUxlogField(nameText, 'name');
  fl(col, nameText, 'FILL');

  const meta = figma.createFrame();
  meta.name                  = NODE_META;
  meta.layoutMode            = 'HORIZONTAL';
  meta.primaryAxisSizingMode = 'AUTO';
  meta.counterAxisSizingMode = 'AUTO';
  meta.itemSpacing           = 8;
  meta.counterAxisAlignItems = 'CENTER';
  meta.fills                 = [];
  fl(col, meta, 'HUG', 'HUG');

  if (persona.code) {
    const codeText = figma.createText();
    codeText.name       = 'code';
    codeText.fontName   = { family: FONTS.family, style: FONTS.medium };
    codeText.characters = persona.code;
    codeText.fontSize   = 28;
    codeText.fills      = [solid(mutedColor)];
    setTextUxlogField(codeText, 'code');
    fl(meta, codeText, 'HUG', 'HUG');
  }

  const badgeLabel = persona.status === 'protopersona' ? BADGE_PROTOPERSONA : BADGE_PERSONA;
  meta.appendChild(buildBadge(badgeLabel, 'status'));

  // URL odkaz (pokud persona má vyplněné URL)
  if (persona.url && persona.url.trim()) {
    fl(col, buildUrlText(persona.url.trim(), inverted), 'HUG');
  }

  // Spacer
  const spacer = figma.createFrame();
  spacer.name   = NODE_SPACER;
  spacer.fills  = [];
  spacer.resize(1, 1);
  spacer.layoutMode            = 'HORIZONTAL';
  spacer.primaryAxisSizingMode = 'AUTO';
  spacer.counterAxisSizingMode = 'AUTO';
  fl(col, spacer, 'FILL', undefined, 1);

  const divLine = figma.createRectangle();
  divLine.name   = NODE_ODDELOVAC;
  divLine.resize(1, 1);
  divLine.fills  = [solid(borderColor)];
  fl(col, divLine, 'FILL', 'FIXED');

  const tgLabel = figma.createText();
  tgLabel.fontName      = { family: FONTS.family, style: FONTS.semibold };
  tgLabel.characters    = STAT_CILOVA_SKUPINA;
  tgLabel.fontSize      = 20;
  tgLabel.fills         = [solid(textColor)];
  tgLabel.letterSpacing = { value: 1.2, unit: 'PIXELS' };
  fl(col, tgLabel, 'FILL');

  const statsRow = figma.createFrame();
  statsRow.name                  = NODE_HODNOTY;
  statsRow.layoutMode            = 'HORIZONTAL';
  statsRow.primaryAxisSizingMode = 'AUTO';
  statsRow.counterAxisSizingMode = 'AUTO';
  statsRow.itemSpacing           = 40;
  statsRow.fills                 = [];
  fl(col, statsRow, 'HUG', 'HUG');

  statsRow.appendChild(buildStat(STAT_VELIKOST, persona.targetGroupSize  || FALLBACK_EMPTY, 'targetGroupSize'));
  statsRow.appendChild(buildStat(STAT_HODNOTA,  persona.targetGroupValue || FALLBACK_EMPTY, 'targetGroupValue'));

  return col;
}

/** Mřížka barevných bloků persony — barvy z konstant COLOR_BLOCK_PERSONA_* */
function buildBlockGrid(persona) {
  const sections = [
    { label: BLOCK_POPIS,    field: 'description', value: persona.description, hint: HINT_PERSONA_DESC,       color: hex(COLOR_BLOCK_PERSONA_DESCRIPTION) },
    { label: BLOCK_MOTIVACE, field: 'motivation',  value: persona.motivation,  hint: HINT_PERSONA_MOTIVATION, color: hex(COLOR_BLOCK_PERSONA_MOTIVATION) },
    { label: BLOCK_POTREBY,  field: 'needs',       value: persona.needs,       hint: HINT_PERSONA_NEEDS,       color: hex(COLOR_BLOCK_PERSONA_NEEDS) },
    { label: BLOCK_PROBLEMY, field: 'problems',    value: persona.problems,    hint: HINT_PERSONA_PROBLEMS,    color: hex(COLOR_BLOCK_PERSONA_PROBLEMS) },
  ];

  const grid = figma.createFrame();
  grid.name                  = NODE_BLOKY;
  grid.layoutMode            = 'VERTICAL';
  grid.primaryAxisSizingMode = 'FIXED';
  grid.counterAxisSizingMode = 'FIXED';
  grid.itemSpacing           = 0;
  grid.fills                 = [];

  for (let row = 0; row < 2; row++) {
    const rowFrame = figma.createFrame();
    rowFrame.name                  = `Řada ${row + 1}`;
    rowFrame.layoutMode            = 'HORIZONTAL';
    rowFrame.primaryAxisSizingMode = 'FIXED';
    rowFrame.counterAxisSizingMode = 'FIXED';
    rowFrame.itemSpacing           = 0;
    rowFrame.fills                 = [];
    fl(grid, rowFrame, 'FILL', 'FILL', 1);

    for (let col = 0; col < 2; col++) {
      const s = sections[row * 2 + col];
      fl(rowFrame, buildColorBlock(s.label, s.value, s.hint, s.color, s.field), 'FILL', 'FILL');
    }
  }

  return grid;
}
