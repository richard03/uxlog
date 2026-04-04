// UXLog Figma Plugin – code.js (Figma sandbox)
// Card generation matches figma-plugin (v1) visual output

// ─────────────────────────────────────────────────────────────────────────────
// Constants – colors
// ─────────────────────────────────────────────────────────────────────────────

var COLOR_BLACK    = '#1E293B';
var COLOR_WHITE    = '#f0f0f0';
var COLOR_GREY     = '#94A3B8';
var COLOR_GREY_3   = '#64748B';
var COLOR_LT_GREY  = '#E2E8F0';
var COLOR_LT_BLUE  = '#d9edf8';
var COLOR_LT_YELLOW = '#fdffb6';
var COLOR_LT_GREEN = '#d4f1de';
var COLOR_LT_ORANGE = '#ffd6a5';
var COLOR_LT_SALMON = '#ffcad4';
var COLOR_LT_APRICOT = '#ffe5d9';
var COLOR_LT_LEMON = '#ffffd1';
var COLOR_LT_LILAC = '#dfccf1';
var COLOR_LT_SKY   = '#a0c4ff';

var COLOR_DK_BLUE   = '#1e3a8a';
var COLOR_DK_GREEN  = '#065f46';
var COLOR_DK_ORANGE = '#9a3412';
var COLOR_DK_VIOLET = '#4c1d95';
var COLOR_DK_RED    = '#991b1b';
var COLOR_DK_TEAL   = '#155e75';
var COLOR_DK_BROWN  = '#412601';

var COLOR_BORDER = COLOR_GREY;
var COLOR_TEXT   = COLOR_BLACK;
var COLOR_MUTED  = COLOR_GREY_3;
var COLOR_HEADER_TEXT  = COLOR_WHITE;
var COLOR_HEADER_MUTED = COLOR_LT_GREY;
var COLOR_SHADOW = { r: 0.06, g: 0.09, b: 0.16, a: 0.12 };

// ─────────────────────────────────────────────────────────────────────────────
// Constants – labels, hints, fallbacks
// ─────────────────────────────────────────────────────────────────────────────

var FALLBACK_NO_NAME  = 'Bez jména';
var FALLBACK_NO_TITLE = 'Bez názvu';
var FALLBACK_EMPTY    = '—';

var DROP_SHADOW = {
  type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
  color: COLOR_SHADOW,
  offset: { x: 0, y: 8 }, radius: 32, spread: -4,
};

var PAD = 56;

// ─────────────────────────────────────────────────────────────────────────────
// Entity configs – matches figma-plugin v1
// ─────────────────────────────────────────────────────────────────────────────

var ENTITY_CONFIGS = {
  hypothesis: {
    typeName: 'HYPOTÉZA',
    headerBgHex: COLOR_DK_BLUE,
    cardW: 1000, cardH: 700,
    blockLayout: '2col',
    blocks: [
      { name: 'POPIS',    field: 'description', hint: 'Co by mohlo selhat?', colorHex: COLOR_LT_ORANGE },
      { name: 'VÝSLEDEK', field: 'explanation',  hint: 'Výsledek testování. Podařilo se hypotézu vyvrátit?', colorHex: COLOR_LT_BLUE },
    ],
    badges: [
      { field: 'status', map: { untested: 'Neověřená', tested: 'Ověřená', refuted: 'Vyvrácená' } },
    ],
  },
  scenario: {
    typeName: 'SCÉNÁŘ',
    headerBgHex: COLOR_DK_GREEN,
    cardW: 1000, cardH: 780,
    blockLayout: '1col',
    blocks: [
      { name: 'POPIS', field: 'description', hint: 'Popište scénář…', colorHex: COLOR_LT_BLUE },
    ],
    badges: [
      { field: 'type', map: { main: 'Hlavní', alternative: 'Alternativní' } },
      { field: 'priority', map: { must: 'Must have', should: 'Should have', could: 'Could have', wont: "Won't have" } },
    ],
    stats: [
      { label: 'Frekvence', fieldA: 'frequencyValue', fieldB: 'frequencyUnit' },
      { label: 'Hodnota',   fieldA: 'valueAmount',    fieldB: 'valueUnit'     },
      { label: 'Uživatelů', fieldA: 'userCount',      fieldB: 'userCountUnit' },
    ],
  },
  stakeholder: {
    typeName: 'STAKEHOLDER',
    headerBgHex: COLOR_DK_ORANGE,
    cardW: 1000, cardH: 600,
    blockLayout: '1col',
    blocks: [
      { name: 'POPIS', field: 'description', hint: 'Kdo to je?', colorHex: COLOR_LT_BLUE },
    ],
    badges: [
      { field: 'influenceLevel', map: { high: 'Vliv: Vysoký', medium: 'Vliv: Střední', low: 'Vliv: Nízký' } },
      { field: 'interestLevel', map: { high: 'Zájem: Vysoký', medium: 'Zájem: Střední', low: 'Zájem: Nízký' } },
    ],
  },
  goal: {
    typeName: 'CÍL',
    headerBgHex: COLOR_DK_VIOLET,
    cardW: 1000, cardH: 650,
    blockLayout: '2col',
    blocks: [
      { name: 'POPIS',   field: 'description', hint: 'Popište cíl…', colorHex: COLOR_LT_BLUE },
      { name: 'METRIKY', field: 'metrics',      hint: 'Jak a kdy poznáme, že jsme cíle dosáhli?', colorHex: COLOR_LT_LILAC },
    ],
  },
  competition: {
    typeName: 'KONKURENT',
    headerBgHex: COLOR_DK_RED,
    cardW: 1200, cardH: 860,
    blockLayout: '1+3',
    blocks: [
      { name: 'POPIS',         field: 'description', hint: 'Kdo to je?', colorHex: COLOR_LT_BLUE },
      { name: 'SILNÉ STRÁNKY', field: 'strengths',   hint: 'Co dělá dobře?', colorHex: COLOR_LT_SALMON },
      { name: 'SLABÉ STRÁNKY', field: 'weaknesses',  hint: 'Co dělá špatně?', colorHex: COLOR_LT_APRICOT },
      { name: 'INSPIRACE',     field: 'inspiration', hint: 'V čem se od něj můžeme poučit?', colorHex: COLOR_LT_LEMON },
    ],
  },
  requirement: {
    typeName: 'POŽADAVEK',
    headerBgHex: COLOR_DK_BROWN,
    cardW: 1000, cardH: 700,
    blockLayout: '3col',
    blocks: [
      { name: 'POPIS',    field: 'description',         hint: 'Popište požadavek, případně i svou představu řešení.', colorHex: COLOR_LT_BLUE },
      { name: 'MOTIVACE', field: 'motivation',           hint: 'K jakým problémům dojde, pokud požadavek nebude splněn?', colorHex: COLOR_LT_ORANGE },
      { name: 'PROČ NE',  field: 'wontHaveExplanation', hint: 'Proč tento požadavek nebudeme implementovat?', colorHex: COLOR_LT_LILAC },
    ],
    badges: [
      { field: 'priority', map: { must: 'Must have', should: 'Should have', could: 'Could have', wont: "Won't have" } },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Reverse map: display text → API value (for badge/mapped fields)
// Built automatically from ENTITY_CONFIGS badges + persona status
// ─────────────────────────────────────────────────────────────────────────────

var REVERSE_DISPLAY_MAP = {};
var FORWARD_DISPLAY_MAP = {};

// Build from all entity configs
(function() {
  var types = Object.keys(ENTITY_CONFIGS);
  for (var ti = 0; ti < types.length; ti++) {
    var cfg = ENTITY_CONFIGS[types[ti]];
    var badges = cfg.badges || [];
    for (var bi = 0; bi < badges.length; bi++) {
      var b = badges[bi];
      var field = b.field;
      if (!REVERSE_DISPLAY_MAP[field]) REVERSE_DISPLAY_MAP[field] = {};
      if (!FORWARD_DISPLAY_MAP[field]) FORWARD_DISPLAY_MAP[field] = {};
      if (b.map) {
        var apiVals = Object.keys(b.map);
        for (var mi = 0; mi < apiVals.length; mi++) {
          var displayVal = b.map[apiVals[mi]];
          REVERSE_DISPLAY_MAP[field][displayVal] = apiVals[mi];
          REVERSE_DISPLAY_MAP[field][displayVal.toLowerCase()] = apiVals[mi];
          FORWARD_DISPLAY_MAP[field][apiVals[mi]] = displayVal;
        }
      }
    }
  }
  // Persona status (not in ENTITY_CONFIGS)
  if (!REVERSE_DISPLAY_MAP['status']) REVERSE_DISPLAY_MAP['status'] = {};
  if (!FORWARD_DISPLAY_MAP['status']) FORWARD_DISPLAY_MAP['status'] = {};
  REVERSE_DISPLAY_MAP['status']['Persona'] = 'persona';
  REVERSE_DISPLAY_MAP['status']['persona'] = 'persona';
  REVERSE_DISPLAY_MAP['status']['Protopersona'] = 'protopersona';
  REVERSE_DISPLAY_MAP['status']['protopersona'] = 'protopersona';
  FORWARD_DISPLAY_MAP['status']['persona'] = 'Persona';
  FORWARD_DISPLAY_MAP['status']['protopersona'] = 'Protopersona';
})();

/** Convert display text back to API value if a mapping exists */
function reverseMapValue(field, displayText) {
  var map = REVERSE_DISPLAY_MAP[field];
  if (map && map[displayText] !== undefined) return map[displayText];
  return displayText;
}

/** Convert API value to display text for badge fields */
function forwardMapValue(field, apiValue) {
  var map = FORWARD_DISPLAY_MAP[field];
  if (map && map[apiValue] !== undefined) return map[apiValue];
  return apiValue;
}

// Persona-specific constants
var PERSONA_W  = 1200;
var PERSONA_H  = 1600;
var PHOTO_SZ   = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Fonts
// ─────────────────────────────────────────────────────────────────────────────

var FONTS = {
  family: 'Inter', regular: 'Regular', medium: 'Medium',
  semibold: 'Semi Bold', bold: 'Bold',
};
var fontsLoaded = false;

async function loadFonts() {
  if (fontsLoaded) return;
  var candidates = [
    { family: 'Inter', regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' },
    { family: 'Inter', regular: 'Regular', medium: 'Medium', semibold: 'SemiBold', bold: 'Bold' },
  ];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    try {
      await figma.loadFontAsync({ family: c.family, style: c.regular });
      await figma.loadFontAsync({ family: c.family, style: c.medium });
      await figma.loadFontAsync({ family: c.family, style: c.semibold });
      await figma.loadFontAsync({ family: c.family, style: c.bold });
      FONTS = c;
      fontsLoaded = true;
      return;
    } catch (e) {}
  }
  throw new Error('Nepodařilo se načíst font Inter.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hex(h) {
  return {
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  };
}

function solid(color, opacity) {
  var c = typeof color === 'string' ? hex(color) : color;
  var p = { type: 'SOLID', color: c };
  if (opacity !== undefined) p.opacity = opacity;
  return p;
}

/** Layout helper: append child and set layout sizing */
function fl(parent, child, h, v, grow) {
  parent.appendChild(child);
  if (h !== undefined) child.layoutSizingHorizontal = h;
  if (v !== undefined) child.layoutSizingVertical = v;
  if (grow !== undefined) child.layoutGrow = grow;
  return child;
}

function setTextUxlogField(textNode, fieldName) {
  if (textNode && textNode.type === 'TEXT' && fieldName) {
    textNode.setPluginData('uxlogField', fieldName);
  }
}

function getInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Store applied value for change detection */
function initAppliedValuesOnCard(card) {
  function walk(node) {
    if (node.type === 'TEXT') {
      var field = node.getPluginData('uxlogField');
      if (field) {
        try { node.setPluginData('uxlogAppliedValue', 'v:' + node.characters); } catch (e) {}
      }
    }
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) walk(children[i]);
  }
  walk(card);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic card building (hypothesis, scenario, stakeholder, goal, competition, requirement)
// ─────────────────────────────────────────────────────────────────────────────

function buildDivider() {
  var div = figma.createRectangle();
  div.name = 'Oddělovač';
  div.resize(1, 1);
  div.fills = [solid(COLOR_BORDER)];
  return div;
}

function buildBadge(label, fieldKey) {
  var badge = figma.createFrame();
  badge.name = 'Badge';
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.paddingLeft = 10;
  badge.paddingRight = 10;
  badge.paddingTop = 3;
  badge.paddingBottom = 3;
  badge.cornerRadius = 20;
  badge.fills = [solid(COLOR_WHITE, 0.14)];

  var text = figma.createText();
  text.fontName = { family: FONTS.family, style: FONTS.medium };
  text.characters = label;
  text.fontSize = 20;
  text.fills = [solid(COLOR_HEADER_TEXT)];
  if (fieldKey) setTextUxlogField(text, fieldKey);
  badge.appendChild(text);

  return badge;
}

function buildColorBlock(label, value, hint, bgColorHex, fieldName) {
  var block = figma.createFrame();
  block.name = label;
  block.layoutMode = 'VERTICAL';
  block.primaryAxisSizingMode = 'AUTO';
  block.counterAxisSizingMode = 'FIXED';
  block.paddingLeft = 56;
  block.paddingRight = 56;
  block.paddingTop = 48;
  block.paddingBottom = 48;
  block.itemSpacing = 12;
  block.fills = [solid(bgColorHex)];

  var labelText = figma.createText();
  labelText.fontName = { family: FONTS.family, style: FONTS.semibold };
  labelText.characters = label;
  labelText.fontSize = 22;
  labelText.fills = [solid(COLOR_TEXT)];
  labelText.letterSpacing = { value: 1.5, unit: 'PIXELS' };
  fl(block, labelText, 'FILL');

  var isEmpty = !value || !value.trim();
  var textNode = figma.createText();
  textNode.name = fieldName || 'Text';
  textNode.fontName = { family: FONTS.family, style: FONTS.regular };
  textNode.characters = isEmpty ? hint : value.trim();
  textNode.fontSize = 28;
  textNode.fills = [solid(COLOR_TEXT)];
  textNode.lineHeight = { value: 155, unit: 'PERCENT' };
  if (fieldName) setTextUxlogField(textNode, fieldName);
  fl(block, textNode, 'FILL', 'HUG');

  return block;
}

function buildStat(label, value, fieldKey) {
  var stat = figma.createFrame();
  stat.name = label;
  stat.layoutMode = 'VERTICAL';
  stat.primaryAxisSizingMode = 'AUTO';
  stat.counterAxisSizingMode = 'AUTO';
  stat.itemSpacing = 2;
  stat.fills = [];

  var labelT = figma.createText();
  labelT.fontName = { family: FONTS.family, style: FONTS.regular };
  labelT.characters = label;
  labelT.fontSize = 22;
  labelT.fills = [solid(COLOR_HEADER_MUTED)];
  stat.appendChild(labelT);

  var valT = figma.createText();
  valT.fontName = { family: FONTS.family, style: FONTS.semibold };
  valT.characters = String(value || FALLBACK_EMPTY);
  valT.fontSize = 30;
  valT.fills = [solid(COLOR_HEADER_TEXT)];
  if (fieldKey) setTextUxlogField(valT, fieldKey);
  stat.appendChild(valT);

  return stat;
}

function buildStatSplit(label, fieldA, fieldB, valA, valB) {
  var stat = figma.createFrame();
  stat.name = label;
  stat.layoutMode = 'VERTICAL';
  stat.primaryAxisSizingMode = 'AUTO';
  stat.counterAxisSizingMode = 'AUTO';
  stat.itemSpacing = 2;
  stat.fills = [];

  var labelT = figma.createText();
  labelT.fontName = { family: FONTS.family, style: FONTS.regular };
  labelT.characters = label;
  labelT.fontSize = 22;
  labelT.fills = [solid(COLOR_HEADER_MUTED)];
  stat.appendChild(labelT);

  var row = figma.createFrame();
  row.name = 'StatValues';
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.itemSpacing = 4;
  row.fills = [];

  var sa = String((valA || '').trim() || FALLBACK_EMPTY);
  var a = figma.createText();
  a.fontName = { family: FONTS.family, style: FONTS.semibold };
  a.characters = sa;
  a.fontSize = 30;
  a.fills = [solid(COLOR_HEADER_TEXT)];
  setTextUxlogField(a, fieldA);
  row.appendChild(a);

  var sb = String((valB || '').trim() || FALLBACK_EMPTY);
  var b = figma.createText();
  b.fontName = { family: FONTS.family, style: FONTS.semibold };
  b.characters = sb === FALLBACK_EMPTY ? '' : sb;
  b.fontSize = 30;
  b.fills = [solid(COLOR_HEADER_TEXT)];
  setTextUxlogField(b, fieldB);
  row.appendChild(b);

  stat.appendChild(row);
  return stat;
}

function buildUrlText(url, inverted) {
  var urlText = figma.createText();
  urlText.name = 'URL';
  urlText.fontName = { family: FONTS.family, style: FONTS.regular };
  urlText.characters = url;
  urlText.fontSize = 22;
  urlText.fills = [solid(inverted ? COLOR_LT_SKY : '#3B82F6')];
  urlText.textDecoration = 'UNDERLINE';
  try { urlText.setRangeHyperlink(0, url.length, { type: 'URL', value: url }); } catch (e) {}
  return urlText;
}

function buildGenericHeader(entity, config) {
  var header = figma.createFrame();
  header.name = 'Hlavička';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'FIXED';
  header.paddingLeft = PAD;
  header.paddingRight = PAD;
  header.paddingTop = PAD;
  header.paddingBottom = PAD;
  header.itemSpacing = 8;
  header.fills = [solid(config.headerBgHex)];

  // Type label
  var typeLabel = figma.createText();
  typeLabel.fontName = { family: FONTS.family, style: FONTS.semibold };
  typeLabel.characters = config.typeName;
  typeLabel.fontSize = 26;
  typeLabel.fills = [solid(COLOR_HEADER_TEXT)];
  typeLabel.letterSpacing = { value: 1.5, unit: 'PIXELS' };
  fl(header, typeLabel, 'FILL');

  // Name
  var nameText = figma.createText();
  nameText.name = 'name';
  nameText.fontName = { family: FONTS.family, style: FONTS.bold };
  nameText.characters = entity.name || FALLBACK_NO_TITLE;
  nameText.fontSize = 44;
  nameText.fills = [solid(COLOR_HEADER_TEXT)];
  setTextUxlogField(nameText, 'name');
  fl(header, nameText, 'FILL');

  // Meta row: code + badges
  var hasCode = !!entity.code;
  var hasBadges = (config.badges || []).some(function(b) { return !!entity[b.field]; });

  if (hasCode || hasBadges) {
    var metaRow = figma.createFrame();
    metaRow.name = 'Meta';
    metaRow.layoutMode = 'HORIZONTAL';
    metaRow.primaryAxisSizingMode = 'AUTO';
    metaRow.counterAxisSizingMode = 'AUTO';
    metaRow.itemSpacing = 8;
    metaRow.counterAxisAlignItems = 'CENTER';
    metaRow.fills = [];

    if (hasCode) {
      var codeText = figma.createText();
      codeText.name = 'code';
      codeText.fontName = { family: FONTS.family, style: FONTS.medium };
      codeText.characters = entity.code;
      codeText.fontSize = 22;
      codeText.fills = [solid(COLOR_HEADER_MUTED)];
      setTextUxlogField(codeText, 'code');
      metaRow.appendChild(codeText);
    }

    var badges = config.badges || [];
    for (var bi = 0; bi < badges.length; bi++) {
      var badgeConf = badges[bi];
      var val = entity[badgeConf.field];
      if (!val) continue;
      var badgeLabel = (badgeConf.map && badgeConf.map[val]) || val;
      metaRow.appendChild(buildBadge(badgeLabel, badgeConf.field));
    }

    fl(header, metaRow, 'HUG', 'HUG');
  }

  // Stats (scenario)
  if (config.stats && config.stats.length > 0) {
    var statsRow = figma.createFrame();
    statsRow.name = 'Statistiky';
    statsRow.layoutMode = 'HORIZONTAL';
    statsRow.primaryAxisSizingMode = 'AUTO';
    statsRow.counterAxisSizingMode = 'AUTO';
    statsRow.itemSpacing = 40;
    statsRow.fills = [];

    for (var si = 0; si < config.stats.length; si++) {
      var s = config.stats[si];
      statsRow.appendChild(buildStatSplit(
        s.label, s.fieldA, s.fieldB,
        entity[s.fieldA] || '', entity[s.fieldB] || ''
      ));
    }

    fl(header, statsRow, 'HUG', 'HUG');
  }

  // URL
  if (entity.url && entity.url.trim()) {
    fl(header, buildUrlText(entity.url.trim(), true), 'HUG');
  }

  return header;
}

function buildBlocksArea(entity, config, CWIDTH) {
  var container = figma.createFrame();
  container.name = 'Bloky';
  container.layoutMode = 'VERTICAL';
  container.primaryAxisSizingMode = 'AUTO';
  container.counterAxisSizingMode = 'FIXED';
  container.itemSpacing = 0;
  container.fills = [];

  var blocks = config.blocks || [];
  var visibleBlocks = blocks.filter(function(b) {
    return b.field !== 'wontHaveExplanation' || entity.priority === 'wont';
  });
  for (var i = 0; i < visibleBlocks.length; i++) {
    var b = visibleBlocks[i];
    fl(container, buildColorBlock(b.name, entity[b.field] || '', b.hint, b.colorHex, b.field), 'FILL', 'HUG');
  }

  return container;
}

function buildGenericCard(entity, entityType, config) {
  var CWIDTH = config.cardW || 1000;

  var card = figma.createFrame();
  card.name = 'UXLog:' + entityType + ':' + (entity.id || 'new');
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(CWIDTH, 100);
  card.itemSpacing = 0;
  card.fills = [solid(COLOR_WHITE)];
  card.cornerRadius = 16;
  card.clipsContent = true;
  card.strokes = [solid(COLOR_BORDER)];
  card.strokeWeight = 1;
  card.strokeAlign = 'INSIDE';
  card.effects = [DROP_SHADOW];

  // Accent bar
  var bar = figma.createRectangle();
  bar.name = 'AccentBar';
  bar.resize(CWIDTH, 6);
  bar.fills = [solid(COLOR_TEXT)];
  fl(card, bar, 'FILL', 'FIXED');

  // Header
  fl(card, buildGenericHeader(entity, config), 'FILL', 'HUG');

  // Divider
  fl(card, buildDivider(), 'FILL', 'FIXED');

  // Blocks
  fl(card, buildBlocksArea(entity, config, CWIDTH), 'FILL', 'HUG');

  // Plugin data
  card.setPluginData('uxlogEntityType', entityType);
  card.setPluginData('uxlogEntityId', String(entity.id || ''));
  card.setPluginData('uxlogEntity', JSON.stringify(entity));
  card.setPluginData('uxlogLastSyncTs', String(Date.now()));

  initAppliedValuesOnCard(card);

  return card;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona card building
// ─────────────────────────────────────────────────────────────────────────────

function buildPhoto(persona) {
  var img = figma.createFrame();
  img.name = 'Foto';
  img.resize(PHOTO_SZ, PHOTO_SZ);
  img.cornerRadius = 12;
  img.fills = [solid(COLOR_WHITE, 0.10)];
  img.strokes = [solid(COLOR_WHITE, 0.20)];
  img.strokeWeight = 2;
  img.strokeAlign = 'INSIDE';
  img.layoutMode = 'HORIZONTAL';
  img.primaryAxisSizingMode = 'FIXED';
  img.counterAxisSizingMode = 'FIXED';
  img.primaryAxisAlignItems = 'CENTER';
  img.counterAxisAlignItems = 'CENTER';

  var initText = figma.createText();
  initText.fontName = { family: FONTS.family, style: FONTS.bold };
  initText.characters = getInitials(persona.name);
  initText.fontSize = 176;
  initText.fills = [solid(COLOR_WHITE, 0.45)];
  img.appendChild(initText);

  return img;
}

function buildInfoColumn(persona) {
  var col = figma.createFrame();
  col.name = 'Info';
  col.layoutMode = 'VERTICAL';
  col.primaryAxisSizingMode = 'FIXED';
  col.counterAxisSizingMode = 'FIXED';
  col.paddingTop = 4;
  col.paddingBottom = 4;
  col.itemSpacing = 10;
  col.fills = [];

  // Type label
  var typeLabel = figma.createText();
  typeLabel.fontName = { family: FONTS.family, style: FONTS.semibold };
  typeLabel.characters = persona.status === 'protopersona' ? 'PROTOPERSONA' : 'PERSONA';
  typeLabel.fontSize = 26;
  typeLabel.fills = [solid(COLOR_WHITE)];
  typeLabel.letterSpacing = { value: 1.2, unit: 'PIXELS' };
  fl(col, typeLabel, 'FILL');

  // Name
  var nameText = figma.createText();
  nameText.name = 'name';
  nameText.fontName = { family: FONTS.family, style: FONTS.bold };
  nameText.characters = persona.name || FALLBACK_NO_NAME;
  nameText.fontSize = 52;
  nameText.fills = [solid(COLOR_WHITE)];
  setTextUxlogField(nameText, 'name');
  fl(col, nameText, 'FILL');

  // Meta: code + badge
  var meta = figma.createFrame();
  meta.name = 'Meta';
  meta.layoutMode = 'HORIZONTAL';
  meta.primaryAxisSizingMode = 'AUTO';
  meta.counterAxisSizingMode = 'AUTO';
  meta.itemSpacing = 8;
  meta.counterAxisAlignItems = 'CENTER';
  meta.fills = [];
  fl(col, meta, 'HUG', 'HUG');

  if (persona.code) {
    var codeText = figma.createText();
    codeText.name = 'code';
    codeText.fontName = { family: FONTS.family, style: FONTS.medium };
    codeText.characters = persona.code;
    codeText.fontSize = 28;
    codeText.fills = [solid(COLOR_GREY)];
    setTextUxlogField(codeText, 'code');
    fl(meta, codeText, 'HUG', 'HUG');
  }

  var badgeLabel = persona.status === 'protopersona' ? 'Protopersona' : 'Persona';
  meta.appendChild(buildBadge(badgeLabel, 'status'));

  // URL
  if (persona.url && persona.url.trim()) {
    fl(col, buildUrlText(persona.url.trim(), true), 'HUG');
  }

  // Spacer
  var spacer = figma.createFrame();
  spacer.name = 'Spacer';
  spacer.fills = [];
  spacer.resize(1, 1);
  spacer.layoutMode = 'HORIZONTAL';
  spacer.primaryAxisSizingMode = 'AUTO';
  spacer.counterAxisSizingMode = 'AUTO';
  fl(col, spacer, 'FILL', undefined, 1);

  // Divider line
  var divLine = figma.createRectangle();
  divLine.name = 'Oddělovač';
  divLine.resize(1, 1);
  divLine.fills = [solid(COLOR_GREY)];
  fl(col, divLine, 'FILL', 'FIXED');

  // Target group
  var tgLabel = figma.createText();
  tgLabel.fontName = { family: FONTS.family, style: FONTS.semibold };
  tgLabel.characters = 'CÍLOVÁ SKUPINA';
  tgLabel.fontSize = 20;
  tgLabel.fills = [solid(COLOR_WHITE)];
  tgLabel.letterSpacing = { value: 1.2, unit: 'PIXELS' };
  fl(col, tgLabel, 'FILL');

  var statsRow = figma.createFrame();
  statsRow.name = 'Hodnoty';
  statsRow.layoutMode = 'HORIZONTAL';
  statsRow.primaryAxisSizingMode = 'AUTO';
  statsRow.counterAxisSizingMode = 'AUTO';
  statsRow.itemSpacing = 40;
  statsRow.fills = [];
  fl(col, statsRow, 'HUG', 'HUG');

  statsRow.appendChild(buildStat('Velikost', persona.targetGroupSize || FALLBACK_EMPTY, 'targetGroupSize'));
  statsRow.appendChild(buildStat('Hodnota', persona.targetGroupValue || FALLBACK_EMPTY, 'targetGroupValue'));

  return col;
}

function buildPersonaBlockGrid(persona) {
  var sections = [
    { label: 'POPIS',    field: 'description', value: persona.description, hint: 'Kdo to je, čím se liší od ostatních?', colorHex: COLOR_LT_BLUE },
    { label: 'MOTIVACE', field: 'motivation',  value: persona.motivation,  hint: 'O co jí jde?', colorHex: COLOR_LT_YELLOW },
    { label: 'POTŘEBY',  field: 'needs',       value: persona.needs,       hint: 'Co potřebuje a co chce?', colorHex: COLOR_LT_GREEN },
    { label: 'PROBLÉMY', field: 'problems',    value: persona.problems,    hint: 'Jaké má problémy a co ji frustruje?', colorHex: COLOR_LT_ORANGE },
  ];

  var grid = figma.createFrame();
  grid.name = 'Bloky';
  grid.layoutMode = 'VERTICAL';
  grid.primaryAxisSizingMode = 'AUTO';
  grid.counterAxisSizingMode = 'FIXED';
  grid.itemSpacing = 0;
  grid.fills = [];

  for (var i = 0; i < sections.length; i++) {
    var sec = sections[i];
    fl(grid, buildColorBlock(sec.label, sec.value || '', sec.hint, sec.colorHex, sec.field), 'FILL', 'HUG');
  }

  return grid;
}

function buildPersonaCard(persona) {
  var card = figma.createFrame();
  card.name = 'UXLog:persona:' + (persona.id || 'new');
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(PERSONA_W, 100);
  card.itemSpacing = 0;
  card.fills = [solid(COLOR_WHITE)];
  card.cornerRadius = 16;
  card.clipsContent = true;
  card.strokes = [solid(COLOR_BORDER)];
  card.strokeWeight = 1;
  card.strokeAlign = 'INSIDE';
  card.effects = [DROP_SHADOW];

  // Accent bar
  var bar = figma.createRectangle();
  bar.name = 'AccentBar';
  bar.resize(PERSONA_W, 6);
  bar.fills = [solid(COLOR_TEXT)];
  fl(card, bar, 'FILL', 'FIXED');

  // Top section (photo + info)
  var top = figma.createFrame();
  top.name = 'Horní sekce';
  top.layoutMode = 'HORIZONTAL';
  top.primaryAxisSizingMode = 'FIXED';
  top.counterAxisSizingMode = 'AUTO';
  top.paddingLeft = PAD;
  top.paddingRight = PAD;
  top.paddingTop = PAD;
  top.paddingBottom = PAD;
  top.itemSpacing = PAD;
  top.fills = [solid(COLOR_TEXT)];

  fl(top, buildPhoto(persona), 'FIXED', 'FIXED');
  fl(top, buildInfoColumn(persona), 'FILL', 'FILL', 1);

  fl(card, top, 'FILL', 'HUG');

  // Divider
  fl(card, buildDivider(), 'FILL', 'FIXED');

  // Block grid
  fl(card, buildPersonaBlockGrid(persona), 'FILL', 'HUG');

  // Plugin data
  card.setPluginData('uxlogEntityType', 'persona');
  card.setPluginData('uxlogEntityId', String(persona.id || ''));
  card.setPluginData('uxlogEntity', JSON.stringify(persona));
  card.setPluginData('uxlogLastSyncTs', String(Date.now()));

  initAppliedValuesOnCard(card);

  return card;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card creation dispatcher
// ─────────────────────────────────────────────────────────────────────────────

async function createCard(entityType, entity) {
  await loadFonts();
  if (entityType === 'persona') {
    return buildPersonaCard(entity);
  }
  var config = ENTITY_CONFIGS[entityType];
  if (!config) return null;
  return buildGenericCard(entity, entityType, config);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading cards from current page
// ─────────────────────────────────────────────────────────────────────────────

function isUxlogCard(node) {
  return node.type === 'FRAME' && node.getPluginData('uxlogEntityType') !== '';
}

function findAllUxlogCards() {
  var cards = [];
  function search(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (isUxlogCard(node)) {
        cards.push(node);
      } else if ('children' in node) {
        search(node.children);
      }
    }
  }
  search(figma.currentPage.children);
  return cards;
}

function findCardsByEntityId(entityId) {
  return findAllUxlogCards().filter(function(c) {
    return c.getPluginData('uxlogEntityId') === entityId;
  });
}

function readCardFields(card) {
  var result = {};
  function walk(node) {
    if (node.type === 'TEXT') {
      var field = node.getPluginData('uxlogField');
      if (field) {
        var text = node.characters.trim();
        // Check for repaired-empty marker (user deleted the text node, hint was placed)
        var applied = node.getPluginData('uxlogAppliedValue');
        if (applied && applied.indexOf('empty:') === 0) {
          var emptyHint = applied.slice(6);
          if (text === emptyHint || text === '') {
            // Hint unchanged or empty — field is still empty
            result[field] = '';
            return;
          }
          // User typed something new — clear marker and treat as real value
          try { node.setPluginData('uxlogAppliedValue', 'v:' + text); } catch (e) {}
        }
        // Check if the text is unchanged from the applied value (hint detection)
        if (applied && applied.indexOf('v:') === 0) {
          var appliedText = applied.slice(2);
          // If text matches applied value, check if entity had empty value
          // (meaning current text is a hint, not user input)
          if (text === appliedText) {
            // Read stored entity to check if field was originally empty
            var storedJson = card.getPluginData('uxlogEntity');
            try {
              var stored = JSON.parse(storedJson || '{}');
              var storedVal = stored[field];
              if (!storedVal || !String(storedVal).trim()) {
                // Original was empty + text hasn't changed = still a hint
                result[field] = '';
                return;
              }
            } catch (e) {}
          }
        }
        result[field] = reverseMapValue(field, text);
      }
    }
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) walk(children[i]);
  }
  walk(card);
  return result;
}

function findNodeByName(root, name) {
  if (root.name === name) return root;
  if ('children' in root) {
    var children = root.children;
    for (var i = 0; i < children.length; i++) {
      var found = findNodeByName(children[i], name);
      if (found) return found;
    }
  }
  return null;
}

function readCardEntity(card) {
  var entityType = card.getPluginData('uxlogEntityType');
  var entityId = card.getPluginData('uxlogEntityId');
  var storedJson = card.getPluginData('uxlogEntity');
  var storedEntity = {};
  try { storedEntity = JSON.parse(storedJson || '{}'); } catch (e) {}

  var cardFields = readCardFields(card);
  var merged = Object.assign({}, storedEntity, cardFields, { id: entityId });
  return { entityType: entityType, entityId: entityId, entity: merged, cardFields: cardFields };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update card from entity (API → Figma)
// ─────────────────────────────────────────────────────────────────────────────

var suppressTextChangeIds = {};

async function updateCardFromEntity(card, entity) {
  await loadFonts();
  var entityType = card.getPluginData('uxlogEntityType');
  var config = entityType === 'persona' ? null : ENTITY_CONFIGS[entityType];

  // Collect all hints for this entity type
  var hints = {};
  if (entityType === 'persona') {
    hints = { description: 'Kdo to je, čím se liší od ostatních?', motivation: 'O co jí jde?', needs: 'Co potřebuje a co chce?', problems: 'Jaké má problémy a co ji frustruje?' };
  } else if (config) {
    var blocks = config.blocks || [];
    for (var bi = 0; bi < blocks.length; bi++) {
      hints[blocks[bi].field] = blocks[bi].hint;
    }
  }

  function walk(node) {
    if (node.type === 'TEXT') {
      var field = node.getPluginData('uxlogField');
      if (field && entity[field] !== undefined) {
        var rawVal = entity[field];
        var isEmpty = !rawVal || !String(rawVal).trim();
        // For badge/mapped fields, convert API value to display text
        var displayVal = isEmpty ? '' : forwardMapValue(field, String(rawVal).trim());
        var newVal = isEmpty ? (hints[field] || FALLBACK_EMPTY) : displayVal;
        if (node.characters !== newVal) {
          suppressTextChangeIds[node.id] = true;
          node.characters = newVal;
          delete suppressTextChangeIds[node.id];
        }
        // Update applied value
        try { node.setPluginData('uxlogAppliedValue', 'v:' + newVal); } catch (e) {}
      }
    }
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) walk(children[i]);
  }

  // Update title
  var nameNode = findNodeByName(card, 'name');
  if (nameNode && nameNode.type === 'TEXT') {
    var newName = entity.name || (entityType === 'persona' ? FALLBACK_NO_NAME : FALLBACK_NO_TITLE);
    if (nameNode.characters !== newName) {
      suppressTextChangeIds[nameNode.id] = true;
      nameNode.characters = newName;
      delete suppressTextChangeIds[nameNode.id];
    }
    try { nameNode.setPluginData('uxlogAppliedValue', 'v:' + newName); } catch (e) {}
  }

  walk(card);

  card.setPluginData('uxlogEntity', JSON.stringify(entity));
  card.setPluginData('uxlogLastSyncTs', String(Date.now()));
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff detection
// ─────────────────────────────────────────────────────────────────────────────

// Fields relevant for diffing per entity type
var DIFF_FIELDS = {
  persona: ['code', 'name', 'status', 'description', 'motivation', 'needs', 'problems', 'targetGroupSize', 'targetGroupValue'],
  hypothesis: ['code', 'name', 'description', 'status', 'explanation'],
  scenario: ['code', 'name', 'description', 'frequencyValue', 'frequencyUnit', 'valueAmount', 'valueUnit', 'userCount', 'userCountUnit', 'priority', 'type'],
  stakeholder: ['name', 'description', 'influenceLevel', 'interestLevel'],
  goal: ['code', 'name', 'description', 'metrics'],
  competition: ['name', 'description', 'strengths', 'weaknesses', 'inspiration'],
  requirement: ['code', 'name', 'description', 'motivation', 'priority', 'wontHaveExplanation'],
};

function normalizeFieldValue(val) {
  if (val == null) return '';
  return String(val).trim();
}

function diffEntities(oldEntity, newEntity, fields) {
  var changes = [];
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var oldVal = normalizeFieldValue(oldEntity[f]);
    var newVal = normalizeFieldValue(newEntity[f]);
    if (oldVal !== newVal) {
      changes.push({ field: f, oldValue: oldVal, newValue: newVal });
    }
  }
  return changes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repair missing text nodes (after user deletes text in Figma)
// ─────────────────────────────────────────────────────────────────────────────

var PERSONA_BLOCKS = [
  { name: 'POPIS',    field: 'description', hint: 'Kdo to je, čím se liší od ostatních?' },
  { name: 'MOTIVACE', field: 'motivation',  hint: 'O co jí jde?' },
  { name: 'POTŘEBY',  field: 'needs',       hint: 'Co potřebuje a co chce?' },
  { name: 'PROBLÉMY', field: 'problems',    hint: 'Jaké má problémy a co ji frustruje?' },
];

/** Find which uxlogField text nodes exist on a card */
function collectExistingFields(card) {
  var existing = {};
  function walk(node) {
    if (node.type === 'TEXT') {
      var f = node.getPluginData('uxlogField');
      if (f) existing[f] = true;
    }
    var ch = node.children || [];
    for (var i = 0; i < ch.length; i++) walk(ch[i]);
  }
  walk(card);
  return existing;
}

/** Find a frame by name recursively */
function findFrameByName(root, name) {
  if (root.type === 'FRAME' && root.name === name) return root;
  if ('children' in root) {
    var ch = root.children;
    for (var i = 0; i < ch.length; i++) {
      var found = findFrameByName(ch[i], name);
      if (found) return found;
    }
  }
  return null;
}

/** Recreate a missing text node inside a block frame */
function recreateBlockTextField(blockFrame, fieldName, hint) {
  var textNode = figma.createText();
  textNode.name = fieldName;
  textNode.fontName = { family: FONTS.family, style: FONTS.regular };
  textNode.characters = hint;
  textNode.fontSize = 28;
  textNode.fills = [solid(COLOR_TEXT)];
  textNode.lineHeight = { value: 155, unit: 'PERCENT' };
  setTextUxlogField(textNode, fieldName);
  fl(blockFrame, textNode, 'FILL', 'FILL', 1);
  // Mark as repaired-empty so readCardFields returns '' instead of hint text
  try { textNode.setPluginData('uxlogAppliedValue', 'empty:' + hint); } catch (e) {}
  return textNode;
}

/** Detect and repair missing text nodes on a card. Returns list of missing field names. */
function repairMissingTextNodes(card) {
  var entityType = card.getPluginData('uxlogEntityType');
  var existing = collectExistingFields(card);
  var missing = [];

  // Get block definitions for this entity type
  var blocks = [];
  if (entityType === 'persona') {
    blocks = PERSONA_BLOCKS;
  } else {
    var cfg = ENTITY_CONFIGS[entityType];
    if (cfg) blocks = cfg.blocks || [];
  }

  // Repair missing block text fields
  for (var bi = 0; bi < blocks.length; bi++) {
    var b = blocks[bi];
    if (!existing[b.field]) {
      var parentFrame = findFrameByName(card, b.name);
      if (parentFrame) {
        recreateBlockTextField(parentFrame, b.field, b.hint);
        missing.push(b.field);
      }
    }
  }

  return missing;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout helper for generated cards
// ─────────────────────────────────────────────────────────────────────────────

function layoutCardsGrid(cards, startX, startY, cardW) {
  var spacing = 300;
  var cols = 5;
  var maxRowH = 0;
  var cx = startX;
  var cy = startY;
  var col = 0;

  for (var i = 0; i < cards.length; i++) {
    cards[i].x = cx;
    cards[i].y = cy;
    var h = cards[i].height;
    if (h > maxRowH) maxRowH = h;
    col++;
    if (col >= cols) {
      col = 0;
      cx = startX;
      cy += maxRowH + spacing;
      maxRowH = 0;
    } else {
      cx += cardW + spacing;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Message handler
// ─────────────────────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 380, height: 520, themeColors: true });

figma.ui.onmessage = async function(msg) {
  try {
    switch (msg.type) {

      case 'generate-cards': {
        var entities = msg.entities;
        await loadFonts();

        var viewport = figma.viewport.center;
        var currentY = viewport.y - 200;
        var startX = viewport.x - 2000;
        var allCreated = [];

        var types = Object.keys(entities);
        for (var ti = 0; ti < types.length; ti++) {
          var entityType = types[ti];
          var items = entities[entityType];
          if (!items || items.length === 0) continue;
          if (entityType !== 'persona' && !ENTITY_CONFIGS[entityType]) continue;

          var cards = [];
          for (var ei = 0; ei < items.length; ei++) {
            var card = await createCard(entityType, items[ei]);
            if (card) {
              figma.currentPage.appendChild(card);
              cards.push(card);
              allCreated.push(card);
            }
          }

          var cardW = entityType === 'persona' ? PERSONA_W : (ENTITY_CONFIGS[entityType] ? ENTITY_CONFIGS[entityType].cardW : 1000);
          layoutCardsGrid(cards, startX, currentY, cardW);

          // Move Y down past last card
          if (cards.length > 0) {
            var maxY = 0;
            for (var ci = 0; ci < cards.length; ci++) {
              var bottom = cards[ci].y + cards[ci].height;
              if (bottom > maxY) maxY = bottom;
            }
            currentY = maxY + 80;
          }
        }

        figma.ui.postMessage({ type: 'generate-cards-done', count: allCreated.length });
        break;
      }

      case 'read-selection': {
        var selection = figma.currentPage.selection;
        var results = [];
        for (var si = 0; si < selection.length; si++) {
          if (isUxlogCard(selection[si])) {
            results.push(readCardEntity(selection[si]));
          }
        }
        figma.ui.postMessage({ type: 'selection-data', cards: results });
        break;
      }

      case 'update-cards': {
        var updates = msg.updates;
        await loadFonts();
        var updatedCount = 0;
        for (var ui = 0; ui < updates.length; ui++) {
          var upd = updates[ui];
          var foundCards = findCardsByEntityId(upd.entityId);
          for (var fi = 0; fi < foundCards.length; fi++) {
            await updateCardFromEntity(foundCards[fi], upd.entity);
            updatedCount++;
          }
        }
        figma.ui.postMessage({ type: 'update-cards-done', count: updatedCount });
        break;
      }

      case 'diff-local-changes': {
        var dlFilterType = msg.entityTypeFilter || '';
        await loadFonts();
        var dlCards = findAllUxlogCards();
        var localDiffs = [];
        for (var di = 0; di < dlCards.length; di++) {
          var dlCard = dlCards[di];
          var dlType = dlCard.getPluginData('uxlogEntityType');
          var dlId = dlCard.getPluginData('uxlogEntityId');
          if (!dlId) continue;
          if (dlFilterType && dlType !== dlFilterType) continue;
          var dlFields = DIFF_FIELDS[dlType];
          if (!dlFields) continue;
          // Repair missing text nodes (deleted by user) before reading
          repairMissingTextNodes(dlCard);
          var dlStored = {};
          try { dlStored = JSON.parse(dlCard.getPluginData('uxlogEntity') || '{}'); } catch (e) {}
          var dlCurrent = readCardFields(dlCard);
          // Any DIFF_FIELDS field not found on card = deleted = empty
          for (var dfi = 0; dfi < dlFields.length; dfi++) {
            if (dlCurrent[dlFields[dfi]] === undefined) {
              dlCurrent[dlFields[dfi]] = '';
            }
          }
          // Merge card fields into entity format
          var dlCurrentEntity = Object.assign({}, dlStored, dlCurrent);
          var dlChanges = diffEntities(dlStored, dlCurrentEntity, dlFields);
          if (dlChanges.length > 0) {
            localDiffs.push({
              entityType: dlType, entityId: dlId,
              changes: dlChanges,
              entity: dlCurrentEntity
            });
          }
        }
        figma.ui.postMessage({ type: 'local-changes', diffs: localDiffs });
        break;
      }

      case 'diff-remote-changes': {
        var apiEntities = msg.apiEntities;
        var drCards = findAllUxlogCards();
        var cardIdx = {};
        for (var dri = 0; dri < drCards.length; dri++) {
          var drEid = drCards[dri].getPluginData('uxlogEntityId');
          if (drEid) {
            if (!cardIdx[drEid]) cardIdx[drEid] = [];
            cardIdx[drEid].push(drCards[dri]);
          }
        }
        var remoteDiffs = [];
        var remoteTypes = Object.keys(apiEntities);
        for (var rti = 0; rti < remoteTypes.length; rti++) {
          var rType = remoteTypes[rti];
          var rFields = DIFF_FIELDS[rType];
          if (!rFields) continue;
          var rItems = apiEntities[rType];
          for (var ri = 0; ri < rItems.length; ri++) {
            var rEntity = rItems[ri];
            var rEid = rEntity.id;
            var rCards = cardIdx[rEid];
            if (!rCards || rCards.length === 0) continue;
            var rStored = {};
            try { rStored = JSON.parse(rCards[0].getPluginData('uxlogEntity') || '{}'); } catch (e) {}
            var rChanges = diffEntities(rStored, rEntity, rFields);
            if (rChanges.length > 0) {
              remoteDiffs.push({
                entityType: rType, entityId: rEid,
                changes: rChanges, entity: rEntity
              });
            }
          }
        }
        figma.ui.postMessage({ type: 'remote-changes', diffs: remoteDiffs });
        break;
      }

      case 'update-stored-entities': {
        var useUpdates = msg.updates;
        for (var usei = 0; usei < useUpdates.length; usei++) {
          var useUpd = useUpdates[usei];
          var useCards = findCardsByEntityId(useUpd.entityId);
          for (var useci = 0; useci < useCards.length; useci++) {
            useCards[useci].setPluginData('uxlogEntity', JSON.stringify(useUpd.entity));
            useCards[useci].setPluginData('uxlogLastSyncTs', String(Date.now()));
          }
        }
        break;
      }

      case 'revert-field': {
        // Revert a single field on a card to its stored (original) value
        var rfEntityId = msg.entityId;
        var rfField = msg.field;
        var rfOriginalValue = msg.originalValue;
        await loadFonts();
        var rfCards = findCardsByEntityId(rfEntityId);
        for (var rfi = 0; rfi < rfCards.length; rfi++) {
          var rfCard = rfCards[rfi];
          var rfEntityType = rfCard.getPluginData('uxlogEntityType');
          var rfConfig = rfEntityType === 'persona' ? null : ENTITY_CONFIGS[rfEntityType];
          // Collect hints
          var rfHints = {};
          if (rfEntityType === 'persona') {
            rfHints = { description: 'Kdo to je, čím se liší od ostatních?', motivation: 'O co jí jde?', needs: 'Co potřebuje a co chce?', problems: 'Jaké má problémy a co ji frustruje?' };
          } else if (rfConfig) {
            var rfBlocks = rfConfig.blocks || [];
            for (var rbi = 0; rbi < rfBlocks.length; rbi++) rfHints[rfBlocks[rbi].field] = rfBlocks[rbi].hint;
          }
          // Walk card to find the text node for this field
          (function walkRevert(node) {
            if (node.type === 'TEXT') {
              var f = node.getPluginData('uxlogField');
              if (f === rfField) {
                var isEmpty = !rfOriginalValue || !String(rfOriginalValue).trim();
                var displayVal = isEmpty ? '' : forwardMapValue(f, String(rfOriginalValue).trim());
                var newText = isEmpty ? (rfHints[f] || FALLBACK_EMPTY) : displayVal;
                if (node.characters !== newText) {
                  suppressTextChangeIds[node.id] = true;
                  node.characters = newText;
                  delete suppressTextChangeIds[node.id];
                }
                try { node.setPluginData('uxlogAppliedValue', 'v:' + newText); } catch (e) {}
              }
            }
            var ch = node.children || [];
            for (var ci = 0; ci < ch.length; ci++) walkRevert(ch[ci]);
          })(rfCard);
        }
        figma.ui.postMessage({ type: 'revert-field-done', entityId: rfEntityId, field: rfField });
        break;
      }

      case 'storage-get': {
        var sVal = await figma.clientStorage.getAsync(msg.key);
        figma.ui.postMessage({ type: 'storage-result', key: msg.key, value: sVal, reqId: msg.reqId });
        break;
      }

      case 'storage-set': {
        await figma.clientStorage.setAsync(msg.key, msg.value);
        break;
      }

      case 'resize-ui': {
        figma.ui.resize(msg.width || 380, msg.height || 520);
        break;
      }

      case 'notify': {
        figma.notify(msg.message, { timeout: msg.timeout || 3000 });
        break;
      }

      default:
        console.log('[UXLog code.js] Unknown message type:', msg.type);
    }
  } catch (err) {
    console.error('[UXLog code.js] Error:', err);
    figma.ui.postMessage({ type: 'error', message: err.message || String(err) });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Selection change → notify UI
// ─────────────────────────────────────────────────────────────────────────────

figma.on('selectionchange', function() {
  var selection = figma.currentPage.selection;
  var uxlogCount = 0;
  var typeCounts = {};
  for (var i = 0; i < selection.length; i++) {
    if (isUxlogCard(selection[i])) {
      uxlogCount++;
      var t = selection[i].getPluginData('uxlogEntityType');
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
  }
  figma.ui.postMessage({
    type: 'selection-changed',
    totalSelected: selection.length,
    uxlogSelected: uxlogCount,
    typeCounts: typeCounts
  });
});
