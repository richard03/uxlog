/**
 * UXLog — Figma plugin (všechny entity)
 *
 * Podporované typy karet:
 *   persona, hypothesis, scenario, stakeholder, goal, competition, requirement
 */

figma.showUI(__html__, { width: 440, height: 660, title: 'UXLog' });

// ---------------------------------------------------------------------------
// Konfigurace typů entit
// ---------------------------------------------------------------------------

const ENTITY_CONFIGS = {
  hypothesis: {
    yamlKey:     'hypotheses',
    typeName:    'HYPOTÉZA',
    accentHex:   '#10B981',
    cardW: 1000, cardH: 700,
    blockLayout: '2col',
    blocks: [
      { name: 'POPIS',    field: 'description', hint: 'Popište hypotézu…' },
      { name: 'VÝSLEDEK', field: 'explanation',  hint: 'Výsledek testování nebo vyvrácení…' },
    ],
    badges: [
      {
        field: 'status',
        map:      { untested: 'Neověřená', tested: 'Ověřená', refuted: 'Vyvrácená' },
        colorMap: { untested: '#94A3B8',   tested: '#10B981',  refuted: '#EF4444'   },
      },
    ],
  },
  scenario: {
    yamlKey:     'scenarios',
    typeName:    'SCÉNÁŘ',
    accentHex:   '#3B82F6',
    cardW: 1000, cardH: 780,
    blockLayout: '1col',
    blocks: [
      { name: 'POPIS', field: 'description', hint: 'Popište scénář…' },
    ],
    badges: [
      { field: 'type',
        map: { main: 'Hlavní', alternative: 'Alternativní' } },
      { field: 'priority',
        map:      { must: 'Must have', should: 'Should have', could: 'Could have', wont: "Won't have" },
        colorMap: { must: '#EF4444',   should: '#F97316',     could: '#3B82F6',    wont: '#94A3B8'    } },
    ],
    stats: [
      { label: 'Frekvence', fieldA: 'frequencyValue', fieldB: 'frequencyUnit' },
      { label: 'Hodnota',   fieldA: 'valueAmount',    fieldB: 'valueUnit'     },
      { label: 'Uživatelů', fieldA: 'userCount',      fieldB: 'userCountUnit' },
    ],
  },
  stakeholder: {
    yamlKey:     'stakeholders',
    typeName:    'STAKEHOLDER',
    accentHex:   '#F59E0B',
    cardW: 1000, cardH: 600,
    blockLayout: '1col',
    blocks: [
      { name: 'POPIS', field: 'description', hint: 'Popište stakeholdera…' },
    ],
    badges: [
      { field: 'influenceLevel',
        map: { high: 'Vliv: Vysoký', medium: 'Vliv: Střední', low: 'Vliv: Nízký' } },
      { field: 'interestLevel',
        map: { high: 'Zájem: Vysoký', medium: 'Zájem: Střední', low: 'Zájem: Nízký' } },
    ],
  },
  goal: {
    yamlKey:     'goals',
    typeName:    'CÍL',
    accentHex:   '#7C3AED',
    cardW: 1000, cardH: 650,
    blockLayout: '2col',
    blocks: [
      { name: 'POPIS',   field: 'description', hint: 'Popište cíl…' },
      { name: 'METRIKY', field: 'metrics',      hint: 'Jak poznáme, že jsme cíle dosáhli?' },
    ],
  },
  competition: {
    yamlKey:     'competitions',
    typeName:    'KONKURENT',
    accentHex:   '#F43F5E',
    cardW: 1200, cardH: 860,
    blockLayout: '1+3',
    blocks: [
      { name: 'POPIS',         field: 'description', hint: 'Popište konkurenta…' },
      { name: 'SILNÉ STRÁNKY', field: 'strengths',   hint: 'Co dělají dobře?' },
      { name: 'SLABÉ STRÁNKY', field: 'weaknesses',  hint: 'Co dělají špatně?' },
      { name: 'INSPIRACE',     field: 'inspiration', hint: 'Co si od nich vzít?' },
    ],
  },
  requirement: {
    yamlKey:     'requirements',
    typeName:    'POŽADAVEK',
    accentHex:   '#06B6D4',
    cardW: 1000, cardH: 700,
    blockLayout: '3col',
    blocks: [
      { name: 'POPIS',    field: 'description',         hint: 'Popište požadavek…' },
      { name: 'MOTIVACE', field: 'motivation',           hint: 'Co se stane, pokud požadavek nesplníme?' },
      { name: 'PROČ NE',  field: 'wontHaveExplanation', hint: 'Proč tento požadavek nebudeme implementovat?' },
    ],
    badges: [
      { field: 'priority',
        map:      { must: 'Must have', should: 'Should have', could: 'Could have', wont: "Won't have" },
        colorMap: { must: '#EF4444',   should: '#F97316',     could: '#3B82F6',    wont: '#94A3B8'    } },
    ],
  },
};

// ---------------------------------------------------------------------------
// Notifikace o výběru
// ---------------------------------------------------------------------------

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
  figma.ui.postMessage({ type: 'selectionChanged', total, uxlog, counts });
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

/** Přečte textový obsah bloku podle jména (pro generické karty) */
function extractGenericFromCard(card, entityType, base) {
  const config = ENTITY_CONFIGS[entityType];
  if (!config) return base;
  const HINTS = new Set((config.blocks || []).map(b => b.hint));
  const extracted = {};
  for (const { name, field } of (config.blocks || [])) {
    const block = findDescendant(card, n => n.name === name && n.type === 'FRAME');
    if (!block) continue;
    const textNode = findDescendant(block, n => n.name === 'Text' && n.type === 'TEXT');
    if (!textNode) continue;
    const chars = textNode.characters || '';
    extracted[field] = HINTS.has(chars) ? '' : chars;
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
    'Popište personu…', 'Co personu motivuje?',
    'Potřeby a očekávání…', 'Problémy a frustrující věci…',
  ]);

  function readText(node) {
    if (!node || node.type !== 'TEXT') return null;
    const chars = node.characters || '';
    return HINTS.has(chars) ? '' : chars;
  }

  const topSection  = findChild(card, n => n.name === 'Horní sekce');
  const infoCol     = findChild(topSection, n => n.name === 'Info');
  const metaFrame   = findChild(infoCol, n => n.name === 'Meta');
  const valuesFrame = findChild(infoCol, n => n.name === 'Hodnoty');

  const nameNode = findChild(infoCol, n => n.type === 'TEXT');
  const rawName  = nameNode ? nameNode.characters : null;
  const name     = (rawName !== null && rawName !== 'Bez jména') ? rawName : (base.name || '');

  const codeNode = findChild(metaFrame, n => n.type === 'TEXT');
  const code     = codeNode !== null ? codeNode.characters : (base.code || '');

  const badge     = findChild(metaFrame, n => n.name === 'Badge');
  const badgeText = findChild(badge, n => n.type === 'TEXT');
  const status    = badgeText
    ? (badgeText.characters === 'Protopersona' ? 'protopersona' : 'persona')
    : (base.status || 'protopersona');

  function getStatValue(statName) {
    const statFrame = findChild(valuesFrame, n => n.name === statName);
    if (!statFrame) return null;
    const valNode = (statFrame.children || []).find(n => n.type === 'TEXT' && n.fontSize === 30);
    if (!valNode) return null;
    return valNode.characters === '—' ? '' : valNode.characters;
  }

  const _tgs = getStatValue('Velikost'); const targetGroupSize  = _tgs !== null ? _tgs : (base.targetGroupSize  || '');
  const _tgv = getStatValue('Hodnota');  const targetGroupValue = _tgv !== null ? _tgv : (base.targetGroupValue || '');

  const bloky = findChild(card, n => n.name === 'Bloky');

  function getBlockText(rowName, blockName) {
    const row   = findChild(bloky, n => n.name === rowName);
    const block = findChild(row,   n => n.name === blockName);
    if (!block) return null;
    return readText(findChild(block, n => n.name === 'Text'));
  }

  return Object.assign({}, base, {
    name, code, status,
    description: (function(v){ return v !== null ? v : (base.description || ''); })(getBlockText('Řada 1', 'POPIS')),
    motivation:  (function(v){ return v !== null ? v : (base.motivation  || ''); })(getBlockText('Řada 1', 'MOTIVACE')),
    needs:       (function(v){ return v !== null ? v : (base.needs       || ''); })(getBlockText('Řada 2', 'POTŘEBY')),
    problems:    (function(v){ return v !== null ? v : (base.problems    || ''); })(getBlockText('Řada 2', 'PROBLÉMY')),
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

// ---------------------------------------------------------------------------
// Zprávy z UI
// ---------------------------------------------------------------------------

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate') {
    try {
      if (msg.entityType === 'persona') {
        await generatePersonaCards(msg.entities, msg.projects || []);
      } else {
        await generateGenericCards(msg.entities, msg.entityType, msg.projects || []);
      }
      figma.ui.postMessage({ type: 'success', count: msg.entities.length });
    } catch (err) {
      console.error(err);
      figma.ui.postMessage({ type: 'error', message: String(err) });
    }

  } else if (msg.type === 'readSelection') {
    const byType = {};
    const projectsMap = {};
    for (const node of figma.currentPage.selection) {
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
    }
    figma.ui.postMessage({ type: 'selectionData', byType, projects: Object.values(projectsMap) });

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

async function loadFonts() {
  const candidates = [
    { family: 'Inter',          semibold: 'Semi Bold' },
    { family: 'Roboto',         semibold: 'Medium'    },
    { family: 'Open Sans',      semibold: 'SemiBold'  },
    { family: 'Nunito',         semibold: 'SemiBold'  },
    { family: 'Lato',           semibold: 'Bold'      },
    { family: 'Helvetica Neue', semibold: 'Medium'    },
  ];
  for (const c of candidates) {
    try {
      await Promise.all([
        figma.loadFontAsync({ family: c.family, style: 'Regular'  }),
        figma.loadFontAsync({ family: c.family, style: 'Medium'   }),
        figma.loadFontAsync({ family: c.family, style: c.semibold }),
        figma.loadFontAsync({ family: c.family, style: 'Bold'     }),
      ]);
      FONTS.family   = c.family;
      FONTS.semibold = c.semibold;
      return;
    } catch (_) {}
  }
  throw new Error(
    'Nepodařilo se načíst žádný font. ' +
    'Ujistěte se, že máte v dokumentu dostupný font Inter, Roboto nebo Open Sans.'
  );
}

// ---------------------------------------------------------------------------
// Barvy
// ---------------------------------------------------------------------------

function hex(h) {
  return {
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  };
}

// Barvy accent pro persony
const ACCENT = {
  persona:      hex('#6366F1'),
  protopersona: hex('#8B5CF6'),
};

// Pastelové barvy pro bloky
const BLOCK_BG = [
  hex('#d9edf8'), // modrá
  hex('#fdffb6'), // žlutá
  hex('#e4f1ee'), // zelená
  hex('#ffd6a5'), // oranžová
  hex('#fde8ef'), // růžová
];

const C = {
  white:  { r: 1, g: 1, b: 1 },
  border: hex('#E2E8F0'),
  text:   hex('#1E293B'),
  muted:  hex('#64748B'),
};

// ---------------------------------------------------------------------------
// Pomocné funkce
// ---------------------------------------------------------------------------

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function solid(color, opacity) {
  const p = { type: 'SOLID', color };
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

const DROP_SHADOW = {
  type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
  color: { r: 0.06, g: 0.09, b: 0.16, a: 0.12 },
  offset: { x: 0, y: 8 }, radius: 32, spread: -4,
};

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
  div.name  = 'Oddělovač';
  div.resize(1, 1);
  div.fills = [solid(C.border)];
  return div;
}

function buildStat(label, value) {
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
  labelT.fills      = [solid(C.muted)];
  stat.appendChild(labelT);

  const valT = figma.createText();
  valT.fontName   = { family: FONTS.family, style: FONTS.semibold };
  valT.characters = String(value || '—');
  valT.fontSize   = 30;
  valT.fills      = [solid(C.text)];
  stat.appendChild(valT);

  return stat;
}

/** Barevný blok s nadpisem a editovatelným textem */
function buildColorBlock(label, value, hint, bgColor) {
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
  labelText.fills         = [solid(C.text)];
  labelText.letterSpacing = { value: 1.5, unit: 'PIXELS' };
  fl(block, labelText, 'FILL');

  const isEmpty = !value || !value.trim();
  const textNode = figma.createText();
  textNode.name       = 'Text';
  textNode.fontName   = { family: FONTS.family, style: FONTS.regular };
  textNode.characters = isEmpty ? hint : value.trim();
  textNode.fontSize   = 28;
  textNode.fills      = [solid(C.text)];
  textNode.lineHeight = { value: 155, unit: 'PERCENT' };
  fl(block, textNode, 'FILL', 'FILL', 1);

  return block;
}

/** Badge s textem a barevným pozadím */
function buildBadge(label, accentColor, bgOpacity) {
  const op = bgOpacity !== undefined ? bgOpacity : 0.14;
  const badge = figma.createFrame();
  badge.name                  = 'Badge';
  badge.layoutMode            = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.paddingLeft           = 10;
  badge.paddingRight          = 10;
  badge.paddingTop            = 3;
  badge.paddingBottom         = 3;
  badge.cornerRadius          = 20;
  badge.fills                 = [solid(accentColor, op)];

  const text = figma.createText();
  text.fontName   = { family: FONTS.family, style: FONTS.medium };
  text.characters = label;
  text.fontSize   = 20;
  text.fills      = [solid(accentColor)];
  badge.appendChild(text);

  return badge;
}

// ---------------------------------------------------------------------------
// Generická karta (pro všechny entity kromě persony)
// ---------------------------------------------------------------------------

function buildGenericHeader(entity, config, accent) {
  const header = figma.createFrame();
  header.name                  = 'Hlavička';
  header.layoutMode            = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'FIXED';
  header.paddingLeft           = PAD;
  header.paddingRight          = PAD;
  header.paddingTop            = PAD;
  header.paddingBottom         = PAD;
  header.itemSpacing           = 8;
  header.fills                 = [];

  // Typ entity (malý popisek)
  const typeLabel = figma.createText();
  typeLabel.fontName      = { family: FONTS.family, style: FONTS.semibold };
  typeLabel.characters    = config.typeName;
  typeLabel.fontSize      = 18;
  typeLabel.fills         = [solid(accent)];
  typeLabel.letterSpacing = { value: 1.5, unit: 'PIXELS' };
  fl(header, typeLabel, 'FILL');

  // Jméno
  const nameText = figma.createText();
  nameText.name       = 'Název';
  nameText.fontName   = { family: FONTS.family, style: FONTS.bold };
  nameText.characters = entity.name || 'Bez názvu';
  nameText.fontSize   = 44;
  nameText.fills      = [solid(C.text)];
  fl(header, nameText, 'FILL');

  // Meta řádek: kód + badges
  const hasCode   = !!entity.code;
  const hasBadges = (config.badges || []).some(b => !!entity[b.field]);

  if (hasCode || hasBadges) {
    const metaRow = figma.createFrame();
    metaRow.name                  = 'Meta';
    metaRow.layoutMode            = 'HORIZONTAL';
    metaRow.primaryAxisSizingMode = 'AUTO';
    metaRow.counterAxisSizingMode = 'AUTO';
    metaRow.itemSpacing           = 8;
    metaRow.counterAxisAlignItems = 'CENTER';
    metaRow.fills                 = [];

    if (hasCode) {
      const codeText = figma.createText();
      codeText.fontName   = { family: FONTS.family, style: FONTS.medium };
      codeText.characters = entity.code;
      codeText.fontSize   = 22;
      codeText.fills      = [solid(C.muted)];
      metaRow.appendChild(codeText);
    }

    for (const badgeConf of (config.badges || [])) {
      const val = entity[badgeConf.field];
      if (!val) continue;
      const label      = (badgeConf.map && badgeConf.map[val]) || val;
      const colorHex   = badgeConf.colorMap && badgeConf.colorMap[val];
      const badgeColor = colorHex ? hex(colorHex) : accent;
      metaRow.appendChild(buildBadge(label, badgeColor));
    }

    fl(header, metaRow, 'HUG', 'HUG');
  }

  // Statistiky (scénář: frekvence, hodnota, uživatelé)
  if (config.stats && config.stats.length > 0) {
    const statsRow = figma.createFrame();
    statsRow.name                  = 'Statistiky';
    statsRow.layoutMode            = 'HORIZONTAL';
    statsRow.primaryAxisSizingMode = 'AUTO';
    statsRow.counterAxisSizingMode = 'AUTO';
    statsRow.itemSpacing           = 40;
    statsRow.fills                 = [];

    for (const s of config.stats) {
      const valA = entity[s.fieldA] || '—';
      const valB = entity[s.fieldB] ? (' ' + entity[s.fieldB]) : '';
      statsRow.appendChild(buildStat(s.label, valA + valB));
    }

    fl(header, statsRow, 'HUG', 'HUG');
  }

  return header;
}

function buildBlocksArea(entity, config, CWIDTH) {
  const container = figma.createFrame();
  container.name                  = 'Bloky';
  container.layoutMode            = 'VERTICAL';
  container.primaryAxisSizingMode = 'FIXED';
  container.counterAxisSizingMode = 'FIXED';
  container.itemSpacing           = 0;
  container.fills                 = [];

  const blocks = config.blocks || [];
  const layout = config.blockLayout || '1col';

  if (layout === '1col') {
    const b = blocks[0];
    fl(container, buildColorBlock(b.name, entity[b.field] || '', b.hint, BLOCK_BG[0]), 'FILL', 'FILL');

  } else if (layout === '2col') {
    const row = figma.createFrame();
    row.name                  = 'Řada 1';
    row.layoutMode            = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'FIXED';
    row.itemSpacing           = 0;
    row.fills                 = [];
    fl(container, row, 'FILL', 'FILL', 1);
    for (let i = 0; i < Math.min(blocks.length, 2); i++) {
      fl(row, buildColorBlock(blocks[i].name, entity[blocks[i].field] || '', blocks[i].hint, BLOCK_BG[i]), 'FILL', 'FILL');
    }

  } else if (layout === '3col') {
    const row = figma.createFrame();
    row.name                  = 'Řada 1';
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
      fl(row, buildColorBlock(visibleBlocks[i].name, entity[visibleBlocks[i].field] || '', visibleBlocks[i].hint, BLOCK_BG[i % BLOCK_BG.length]), 'FILL', 'FILL');
    }

  } else if (layout === '1+3') {
    // První blok: celá šířka, pevná výška
    const b0   = blocks[0];
    const topB = buildColorBlock(b0.name, entity[b0.field] || '', b0.hint, BLOCK_BG[0]);
    fl(container, topB, 'FILL', 'FIXED');
    topB.resize(CWIDTH, 280);

    // Tři bloky pod ním
    const row = figma.createFrame();
    row.name                  = 'Řada 2';
    row.layoutMode            = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'FIXED';
    row.itemSpacing           = 0;
    row.fills                 = [];
    fl(container, row, 'FILL', 'FILL', 1);
    for (let i = 1; i < Math.min(blocks.length, 4); i++) {
      fl(row, buildColorBlock(blocks[i].name, entity[blocks[i].field] || '', blocks[i].hint, BLOCK_BG[i % BLOCK_BG.length]), 'FILL', 'FILL');
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
  card.fills                 = [solid(C.white)];
  card.cornerRadius          = 16;
  card.clipsContent          = true;
  card.strokes               = [solid(C.border)];
  card.strokeWeight          = 1;
  card.strokeAlign           = 'INSIDE';
  card.effects               = [DROP_SHADOW];

  // Barevný pruh
  const bar = figma.createRectangle();
  bar.name  = 'AccentBar';
  bar.resize(CWIDTH, 6);
  bar.fills = [solid(accent)];
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

async function generateGenericCards(entities, entityType, projects) {
  await loadFonts();
  const config = ENTITY_CONFIGS[entityType];
  if (!config) throw new Error('Neznámý typ entity: ' + entityType);

  const projectMap = {};
  for (const p of (projects || [])) {
    if (p && p.id) projectMap[p.id] = p;
  }

  const GAP   = 48;
  const CWIDTH = config.cardW || 1000;
  const cards  = [];

  for (const entity of entities) {
    const card = buildGenericCard(entity, entityType, config);
    card.setPluginData('uxlogEntityType', entityType);
    card.setPluginData('uxlogEntity',     JSON.stringify(entity));
    const proj = entity.projectId ? projectMap[entity.projectId] : null;
    if (proj) card.setPluginData('uxlogProject', JSON.stringify(proj));
    figma.currentPage.appendChild(card);
    cards.push(card);
  }

  const totalW = cards.length * CWIDTH + (cards.length - 1) * GAP;
  const startX = figma.viewport.center.x - totalW / 2;
  const startY = figma.viewport.center.y - (cards[0] ? cards[0].height / 2 : 0);

  for (let i = 0; i < cards.length; i++) {
    cards[i].x = startX + i * (CWIDTH + GAP);
    cards[i].y = startY;
  }

  figma.viewport.scrollAndZoomIntoView(cards);
  figma.currentPage.selection = cards;
}

// ---------------------------------------------------------------------------
// Persony — původní implementace
// ---------------------------------------------------------------------------

async function generatePersonaCards(personas, projects) {
  await loadFonts();

  const projectMap = {};
  for (const p of projects) {
    if (p && p.id) projectMap[p.id] = p;
  }

  const GAP   = 48;
  const cards = [];

  for (const persona of personas) {
    const card = buildCard(persona);
    // Nové klíče pro jednotnou extrakci
    card.setPluginData('uxlogEntityType', 'persona');
    card.setPluginData('uxlogEntity',     JSON.stringify(persona));
    // Zpětná kompatibilita
    card.setPluginData('uxlogPersona',    JSON.stringify(persona));
    const proj = persona.projectId ? projectMap[persona.projectId] : null;
    if (proj) card.setPluginData('uxlogProject', JSON.stringify(proj));
    figma.currentPage.appendChild(card);
    cards.push(card);
  }

  const totalW = cards.length * CARD_W + (cards.length - 1) * GAP;
  const startX = figma.viewport.center.x - totalW / 2;
  const startY = figma.viewport.center.y - (cards[0] ? cards[0].height / 2 : 0);

  for (let i = 0; i < cards.length; i++) {
    cards[i].x = startX + i * (CARD_W + GAP);
    cards[i].y = startY;
  }

  figma.viewport.scrollAndZoomIntoView(cards);
  figma.currentPage.selection = cards;
}

// ---------------------------------------------------------------------------
// Karta persony
// ---------------------------------------------------------------------------

function buildCard(persona) {
  const isProto = persona.status === 'protopersona';
  const accent  = isProto ? ACCENT.protopersona : ACCENT.persona;

  const card = figma.createFrame();
  card.name                  = [persona.code, persona.name].filter(Boolean).join(' — ') || 'Persona';
  card.layoutMode            = 'VERTICAL';
  card.primaryAxisSizingMode = 'FIXED';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(CARD_W, CARD_H);
  card.itemSpacing           = 0;
  card.fills                 = [solid(C.white)];
  card.cornerRadius          = 16;
  card.clipsContent          = true;
  card.strokes               = [solid(C.border)];
  card.strokeWeight          = 1;
  card.strokeAlign           = 'INSIDE';
  card.effects               = [DROP_SHADOW];

  const bar = figma.createRectangle();
  bar.name  = 'AccentBar';
  bar.resize(CARD_W, 6);
  bar.fills = [solid(accent)];
  fl(card, bar, 'FILL', 'FIXED');

  fl(card, buildTopSection(persona, accent), 'FILL', 'HUG');
  fl(card, buildDivider(), 'FILL', 'FIXED');
  fl(card, buildBlockGrid(persona, accent), 'FILL', 'FILL', 1);

  return card;
}

function buildTopSection(persona, accent) {
  const top = figma.createFrame();
  top.name                  = 'Horní sekce';
  top.layoutMode            = 'HORIZONTAL';
  top.primaryAxisSizingMode = 'FIXED';
  top.counterAxisSizingMode = 'AUTO';
  top.paddingLeft           = PAD;
  top.paddingRight          = PAD;
  top.paddingTop            = PAD;
  top.paddingBottom         = PAD;
  top.itemSpacing           = PAD;
  top.fills                 = [];

  fl(top, buildPhoto(persona, accent), 'FIXED', 'FIXED');
  fl(top, buildInfoColumn(persona, accent), 'FILL', 'FILL', 1);

  return top;
}

function buildPhoto(persona, accent) {
  const img = figma.createFrame();
  img.name                  = 'Foto';
  img.resize(PHOTO_SZ, PHOTO_SZ);
  img.cornerRadius          = 12;
  img.fills                 = [solid(accent, 0.10)];
  img.strokes               = [solid(accent, 0.20)];
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
  initText.fills      = [solid(accent, 0.45)];
  img.appendChild(initText);

  return img;
}

function buildInfoColumn(persona, accent) {
  const col = figma.createFrame();
  col.name                  = 'Info';
  col.layoutMode            = 'VERTICAL';
  col.primaryAxisSizingMode = 'FIXED';
  col.counterAxisSizingMode = 'FIXED';
  col.paddingTop            = 4;
  col.paddingBottom         = 4;
  col.itemSpacing           = 10;
  col.fills                 = [];

  const nameText = figma.createText();
  nameText.fontName   = { family: FONTS.family, style: FONTS.bold };
  nameText.characters = persona.name || 'Bez jména';
  nameText.fontSize   = 52;
  nameText.fills      = [solid(C.text)];
  fl(col, nameText, 'FILL');

  const meta = figma.createFrame();
  meta.name                  = 'Meta';
  meta.layoutMode            = 'HORIZONTAL';
  meta.primaryAxisSizingMode = 'AUTO';
  meta.counterAxisSizingMode = 'AUTO';
  meta.itemSpacing           = 8;
  meta.counterAxisAlignItems = 'CENTER';
  meta.fills                 = [];
  fl(col, meta, 'HUG', 'HUG');

  if (persona.code) {
    const codeText = figma.createText();
    codeText.fontName   = { family: FONTS.family, style: FONTS.medium };
    codeText.characters = persona.code;
    codeText.fontSize   = 28;
    codeText.fills      = [solid(C.muted)];
    fl(meta, codeText, 'HUG', 'HUG');
  }

  const badge = figma.createFrame();
  badge.name                  = 'Badge';
  badge.layoutMode            = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.paddingLeft           = 12;
  badge.paddingRight          = 12;
  badge.paddingTop            = 4;
  badge.paddingBottom         = 4;
  badge.cornerRadius          = 20;
  badge.fills                 = [solid(accent, 0.14)];
  fl(meta, badge, 'HUG', 'HUG');

  const badgeText = figma.createText();
  badgeText.fontName   = { family: FONTS.family, style: FONTS.medium };
  badgeText.characters = persona.status === 'protopersona' ? 'Protopersona' : 'Persona';
  badgeText.fontSize   = 24;
  badgeText.fills      = [solid(accent)];
  badge.appendChild(badgeText);

  // Spacer
  const spacer = figma.createFrame();
  spacer.name   = 'Spacer';
  spacer.fills  = [];
  spacer.resize(1, 1);
  spacer.layoutMode            = 'HORIZONTAL';
  spacer.primaryAxisSizingMode = 'AUTO';
  spacer.counterAxisSizingMode = 'AUTO';
  fl(col, spacer, 'FILL', undefined, 1);

  const divLine = figma.createRectangle();
  divLine.name   = 'Oddělovač';
  divLine.resize(1, 1);
  divLine.fills  = [solid(C.border)];
  fl(col, divLine, 'FILL', 'FIXED');

  const tgLabel = figma.createText();
  tgLabel.fontName      = { family: FONTS.family, style: FONTS.semibold };
  tgLabel.characters    = 'CÍLOVÁ SKUPINA';
  tgLabel.fontSize      = 20;
  tgLabel.fills         = [solid(accent)];
  tgLabel.letterSpacing = { value: 1.2, unit: 'PIXELS' };
  fl(col, tgLabel, 'FILL');

  const statsRow = figma.createFrame();
  statsRow.name                  = 'Hodnoty';
  statsRow.layoutMode            = 'HORIZONTAL';
  statsRow.primaryAxisSizingMode = 'AUTO';
  statsRow.counterAxisSizingMode = 'AUTO';
  statsRow.itemSpacing           = 40;
  statsRow.fills                 = [];
  fl(col, statsRow, 'HUG', 'HUG');

  statsRow.appendChild(buildStat('Velikost', persona.targetGroupSize  || '—'));
  statsRow.appendChild(buildStat('Hodnota',  persona.targetGroupValue || '—'));

  return col;
}

function buildBlockGrid(persona, accent) {
  const sections = [
    { label: 'POPIS',    value: persona.description, hint: 'Popište personu…',             color: BLOCK_BG[0] },
    { label: 'MOTIVACE', value: persona.motivation,  hint: 'Co personu motivuje?',          color: BLOCK_BG[1] },
    { label: 'POTŘEBY',  value: persona.needs,       hint: 'Potřeby a očekávání…',          color: BLOCK_BG[2] },
    { label: 'PROBLÉMY', value: persona.problems,    hint: 'Problémy a frustrující věci…',  color: BLOCK_BG[3] },
  ];

  const grid = figma.createFrame();
  grid.name                  = 'Bloky';
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
      fl(rowFrame, buildColorBlock(s.label, s.value, s.hint, s.color), 'FILL', 'FILL');
    }
  }

  return grid;
}
