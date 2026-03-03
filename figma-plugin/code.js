/**
 * UXLog — Persony (Figma plugin)
 *
 * Layout karty:
 *   [Barevný pruh 6px]
 *   [Foto 300×300 | Jméno + kód + badge + Cílová skupina]  ← Top sekce
 *   [POPIS 400×400 | MOTIVACE 400×400]                     ← Mřížka 2×2
 *   [POTŘEBY 400×400 | PROBLÉMY 400×400]
 */

figma.showUI(__html__, { width: 440, height: 560, title: 'UXLog — Persony' });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate') {
    try {
      await generatePersonaCards(msg.personas, msg.projectName);
      figma.ui.postMessage({ type: 'success', count: msg.personas.length });
    } catch (err) {
      console.error(err);
      figma.ui.postMessage({ type: 'error', message: String(err) });
    }
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
        figma.loadFontAsync({ family: c.family, style: 'Regular'   }),
        figma.loadFontAsync({ family: c.family, style: 'Medium'    }),
        figma.loadFontAsync({ family: c.family, style: c.semibold  }),
        figma.loadFontAsync({ family: c.family, style: 'Bold'      }),
      ]);
      FONTS.family   = c.family;
      FONTS.semibold = c.semibold;
      return;
    } catch (_) { /* zkusíme další */ }
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

const ACCENT = {
  persona:      hex('#6366F1'),
  protopersona: hex('#8B5CF6'),
};

// Barvy 4 bloků — světlé pastelové tóny, černé písmo dobře čitelné
const BLOCK_BG = [
  hex('#d9edf8'), // POPIS
  hex('#fdffb6'), // MOTIVACE
  hex('#e4f1ee'), // POTŘEBY
  hex('#ffd6a5'), // PROBLÉMY
];

const C = {
  white:     { r: 1, g: 1, b: 1 },
  border:    hex('#E2E8F0'),
  text:      hex('#1E293B'),
  muted:     hex('#64748B'),
  emptyBg:   hex('#F8FAFC'),
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

/**
 * Přidá uzel do AL rodiče a nastaví sizing AŽ PO appendChild.
 * layoutSizingH/V + layoutGrow lze nastavit pouze na dítě AL rámce.
 */
function fl(parent, child, h, v, grow) {
  parent.appendChild(child);
  if (h    !== undefined) child.layoutSizingHorizontal = h;
  if (v    !== undefined) child.layoutSizingVertical   = v;
  if (grow !== undefined) child.layoutGrow             = grow;
  return child;
}

// ---------------------------------------------------------------------------
// Rozměry
// ---------------------------------------------------------------------------

const CARD_W    = 800;  // šířka karty = 2 × BLOCK_W
const BLOCK_W   = 400;  // šířka jednoho bloku (= CARD_W / 2)
const BLOCK_H   = 400;  // výška jednoho bloku
const PHOTO_SZ  = 300;  // foto 300 × 300
const PAD       = 28;   // vnitřní odsazení top sekce

// ---------------------------------------------------------------------------
// Hlavní generátor — karty přímo na plátno, bez obalu
// ---------------------------------------------------------------------------

async function generatePersonaCards(personas, projectName) {
  await loadFonts();

  const GAP   = 48;
  const cards = [];

  for (const persona of personas) {
    const card = buildCard(persona);
    figma.currentPage.appendChild(card);
    cards.push(card);
  }

  // Vycentrování řady do viewportu
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
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(CARD_W, 100);
  card.itemSpacing           = 0;
  card.fills                 = [solid(C.white)];
  card.cornerRadius          = 16;
  card.clipsContent          = true;
  card.strokes               = [solid(C.border)];
  card.strokeWeight          = 1;
  card.strokeAlign           = 'INSIDE';
  card.effects = [{
    type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
    color: { r: 0.06, g: 0.09, b: 0.16, a: 0.12 },
    offset: { x: 0, y: 8 }, radius: 32, spread: -4,
  }];

  // Barevný pruh
  const bar = figma.createRectangle();
  bar.name  = 'AccentBar';
  bar.resize(CARD_W, 6);
  bar.fills = [solid(accent)];
  fl(card, bar, 'FILL', 'FIXED');

  // Horní sekce: Foto vlevo | Info vpravo
  fl(card, buildTopSection(persona, accent), 'FILL', 'HUG');

  // Oddělovač před mřížkou
  fl(card, buildDivider(), 'FILL', 'FIXED');

  // 2×2 mřížka barevných bloků
  fl(card, buildBlockGrid(persona, accent), 'FILL', 'HUG');

  return card;
}

// ---------------------------------------------------------------------------
// Horní sekce: Foto vlevo, Info vpravo
// ---------------------------------------------------------------------------

function buildTopSection(persona, accent) {
  const top = figma.createFrame();
  top.name                  = 'Horní sekce';
  top.layoutMode            = 'HORIZONTAL';
  top.primaryAxisSizingMode = 'FIXED';      // šířka = FILL z karty
  top.counterAxisSizingMode = 'AUTO';
  top.paddingLeft           = PAD;
  top.paddingRight          = PAD;
  top.paddingTop            = PAD;
  top.paddingBottom         = PAD;
  top.itemSpacing           = PAD;
  top.fills                 = [];

  // Foto (fixní 300×300)
  fl(top, buildPhoto(persona, accent), 'FIXED', 'FIXED');

  // Info sloupec (FILL šířka, FILL výška = stejná jako fotka)
  fl(top, buildInfoColumn(persona, accent), 'FILL', 'FILL', 1);

  return top;
}

// ---------------------------------------------------------------------------
// Foto placeholder 300×300
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Info sloupec: Jméno + kód + badge + Cílová skupina (dole)
// ---------------------------------------------------------------------------

function buildInfoColumn(persona, accent) {
  const col = figma.createFrame();
  col.name                  = 'Info';
  col.layoutMode            = 'VERTICAL';
  col.primaryAxisSizingMode = 'FIXED';   // výška = FILL (stretch z top sekce)
  col.counterAxisSizingMode = 'FIXED';   // šířka = FILL z top sekce
  col.paddingTop            = 4;
  col.paddingBottom         = 4;
  col.itemSpacing           = 10;
  col.fills                 = [];

  // Jméno
  const nameText = figma.createText();
  nameText.fontName   = { family: FONTS.family, style: FONTS.bold };
  nameText.characters = persona.name || 'Bez jména';
  nameText.fontSize   = 52;
  nameText.fills      = [solid(C.text)];
  fl(col, nameText, 'FILL');

  // Kód + badge
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

  // Spacer — protlačí Cílovou skupinu na dno sloupce
  const spacer = figma.createFrame();
  spacer.name   = 'Spacer';
  spacer.fills  = [];
  spacer.resize(1, 1);
  spacer.layoutMode            = 'HORIZONTAL';
  spacer.primaryAxisSizingMode = 'AUTO';
  spacer.counterAxisSizingMode = 'AUTO';
  fl(col, spacer, 'FILL', undefined, 1);

  // Tenký oddělovač
  const divLine = figma.createRectangle();
  divLine.name   = 'Oddělovač';
  divLine.resize(1, 1);
  divLine.fills  = [solid(C.border)];
  fl(col, divLine, 'FILL', 'FIXED');

  // Cílová skupina
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

// ---------------------------------------------------------------------------
// 2×2 mřížka barevných bloků
// ---------------------------------------------------------------------------

function buildBlockGrid(persona, accent) {
  const sections = [
    { label: 'POPIS',    value: persona.description, hint: 'Popište personu…',               color: BLOCK_BG[0] },
    { label: 'MOTIVACE', value: persona.motivation,  hint: 'Co personu motivuje?',            color: BLOCK_BG[1] },
    { label: 'POTŘEBY',  value: persona.needs,       hint: 'Potřeby a očekávání…',            color: BLOCK_BG[2] },
    { label: 'PROBLÉMY', value: persona.problems,    hint: 'Problémy a frustrující věci…',    color: BLOCK_BG[3] },
  ];

  const grid = figma.createFrame();
  grid.name                  = 'Bloky';
  grid.layoutMode            = 'VERTICAL';
  grid.primaryAxisSizingMode = 'AUTO';
  grid.counterAxisSizingMode = 'FIXED';  // šířka = FILL z karty
  grid.itemSpacing           = 0;
  grid.fills                 = [];

  for (let row = 0; row < 2; row++) {
    const rowFrame = figma.createFrame();
    rowFrame.name                  = `Řada ${row + 1}`;
    rowFrame.layoutMode            = 'HORIZONTAL';
    rowFrame.primaryAxisSizingMode = 'FIXED';   // šířka = FILL z gridu
    rowFrame.counterAxisSizingMode = 'FIXED';   // výška fixní = BLOCK_H
    rowFrame.resize(CARD_W, BLOCK_H);
    rowFrame.itemSpacing           = 0;
    rowFrame.fills                 = [];
    fl(grid, rowFrame, 'FILL', 'FIXED');

    for (let col = 0; col < 2; col++) {
      const s = sections[row * 2 + col];
      fl(rowFrame, buildColorBlock(s.label, s.value, s.hint, s.color), 'FILL', 'FILL');
    }
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Barevný blok (400×400, sytá barva pozadí)
// ---------------------------------------------------------------------------

function buildColorBlock(label, value, hint, bgColor) {
  const block = figma.createFrame();
  block.name                  = label;
  block.layoutMode            = 'VERTICAL';
  block.primaryAxisSizingMode = 'FIXED';   // výška = FILL z řady
  block.counterAxisSizingMode = 'FIXED';   // šířka = FILL z řady
  block.resize(BLOCK_W, BLOCK_H);
  block.paddingLeft           = 28;
  block.paddingRight          = 28;
  block.paddingTop            = 24;
  block.paddingBottom         = 24;
  block.itemSpacing           = 12;
  block.fills                 = [solid(bgColor)];

  // Nadpis sekce (bílý, průhledný)
  const labelText = figma.createText();
  labelText.fontName      = { family: FONTS.family, style: FONTS.semibold };
  labelText.characters    = label;
  labelText.fontSize      = 22;
  labelText.fills         = [solid(C.text)];
  labelText.letterSpacing = { value: 1.5, unit: 'PIXELS' };
  fl(block, labelText, 'FILL');

  // Obsah nebo editovatelný placeholder
  const isEmpty = !value || !value.trim();
  const textNode = figma.createText();
  textNode.name       = 'Text';
  textNode.fontName   = { family: FONTS.family, style: FONTS.regular };
  textNode.characters = isEmpty ? hint : value.trim();
  textNode.fontSize   = 30;
  textNode.fills      = [solid(C.text)];
  textNode.lineHeight = { value: 155, unit: 'PERCENT' };
  fl(block, textNode, 'FILL');

  return block;
}

// ---------------------------------------------------------------------------
// Pomocné komponenty
// ---------------------------------------------------------------------------

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
  valT.characters = value;
  valT.fontSize   = 30;
  valT.fills      = [solid(C.text)];
  stat.appendChild(valT);

  return stat;
}

function buildDivider() {
  const div = figma.createRectangle();
  div.name  = 'Oddělovač';
  div.resize(1, 1);
  div.fills = [solid(C.border)];
  // layoutSizing nastaví fl() po appendChild
  return div;
}
