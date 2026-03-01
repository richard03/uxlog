/**
 * UXLog Figma Plugin – Import person do Figma souboru
 * Vytvoří stránku "Personas" (pokud neexistuje) a přidá kartu pro každou personu.
 */

figma.showUI(__html__, { width: 360, height: 320 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'createPersonas' && Array.isArray(msg.personas)) {
    createPersonas(msg.personas);
  }
};

/**
 * Najde nebo vytvoří stránku "Personas".
 */
function getOrCreatePersonasPage() {
  let page = figma.root.children.find((p) => p.name === 'Personas');
  if (!page) {
    page = figma.createPage();
    page.name = 'Personas';
    figma.root.appendChild(page);
  }
  figma.currentPage = page;
  return page;
}

const FONT = { family: 'Inter', style: 'Regular' };
const FONT_BOLD = { family: 'Inter', style: 'Bold' };

/**
 * Vytvoří rámeček pro jednu personu (portrait placeholder, name, description, motivation, needs, problems).
 */
async function createPersonaFrame(persona, x, y) {
  const frame = figma.createFrame();
  frame.name = persona.name || 'Persona';
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.91, b: 0.92 } }];
  frame.strokeWeight = 1;
  frame.cornerRadius = 12;
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.itemSpacing = 12;
  frame.paddingLeft = frame.paddingRight = 20;
  frame.paddingTop = frame.paddingBottom = 16;
  frame.x = x;
  frame.y = y;
  frame.resize(320, 100);

  // Horní řádek: placeholder portrétu + jméno a typ
  const topRow = figma.createFrame();
  topRow.name = 'TopRow';
  topRow.layoutMode = 'HORIZONTAL';
  topRow.primaryAxisSizingMode = 'AUTO';
  topRow.counterAxisSizingMode = 'AUTO';
  topRow.itemSpacing = 12;

  const placeholder = figma.createFrame();
  placeholder.name = 'Portrait';
  placeholder.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.97 } }];
  placeholder.cornerRadius = 32;
  placeholder.resize(64, 64);
  topRow.appendChild(placeholder);

  const nameBlock = figma.createFrame();
  nameBlock.name = 'NameBlock';
  nameBlock.layoutMode = 'VERTICAL';
  nameBlock.primaryAxisSizingMode = 'AUTO';
  nameBlock.counterAxisSizingMode = 'AUTO';
  nameBlock.itemSpacing = 4;

  await figma.loadFontAsync(FONT_BOLD);
  const nameText = figma.createText();
  nameText.fontName = FONT_BOLD;
  nameText.fontSize = 16;
  nameText.characters = persona.name || 'Bez názvu';

  await figma.loadFontAsync(FONT);
  const typeText = figma.createText();
  typeText.fontName = FONT;
  typeText.fontSize = 10;
  typeText.characters = (persona.type || 'prototype').toUpperCase();

  nameBlock.appendChild(nameText);
  nameBlock.appendChild(typeText);
  topRow.appendChild(nameBlock);
  frame.appendChild(topRow);

  const addLabeledText = async (label, value) => {
    if (!value) return;
    await figma.loadFontAsync(FONT);
    const group = figma.createFrame();
    group.name = label;
    group.layoutMode = 'VERTICAL';
    group.primaryAxisSizingMode = 'AUTO';
    group.counterAxisSizingMode = 'AUTO';
    group.itemSpacing = 4;

    const labelText = figma.createText();
    labelText.fontName = FONT;
    labelText.fontSize = 10;
    labelText.characters = label + ':';
    labelText.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.46, b: 0.47 } }];

    const valueText = figma.createText();
    valueText.fontName = FONT;
    valueText.fontSize = 12;
    valueText.characters = value.length > 200 ? value.slice(0, 200) + '…' : value;

    group.appendChild(labelText);
    group.appendChild(valueText);
    frame.appendChild(group);
  };

  await addLabeledText('Description', persona.description);
  await addLabeledText('Motivation', persona.motivation);
  await addLabeledText('Needs', persona.needs);
  await addLabeledText('Problems', persona.problems);

  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  return frame;
}

/**
 * Hlavní funkce – vytvoří persony na stránce Personas.
 */
async function createPersonas(personas) {
  if (personas.length === 0) {
    figma.notify('Žádné persony k importu.');
    return;
  }

  const page = getOrCreatePersonasPage();
  const startX = 0;
  const startY = 0;
  const cardWidth = 340;
  const gap = 24;
  const cols = Math.max(1, Math.floor((page.width - 40) / (cardWidth + gap)));
  let x = startX;
  let y = startY;

  for (let i = 0; i < personas.length; i++) {
    const frame = await createPersonaFrame(personas[i], x, y);
    page.appendChild(frame);
    x += cardWidth + gap;
    if ((i + 1) % cols === 0) {
      x = startX;
      y += 280 + gap;
    }
  }

  figma.viewport.scrollAndZoomIntoView(page.children);
  figma.notify(`Importováno ${personas.length} person`);
}
