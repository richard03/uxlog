<template>
  <!-- Dokument přes celé okno (meta.fullScreen): bez hlavičky obrazovky a Zápisníku, vlastní lišta nahoře -->
  <div v-if="project" class="doc-page" @keydown="onPageKeydown">
    <div class="doc-toolbar" role="toolbar" :aria-label="t.document.toolbar">
      <div class="doc-search" role="search">
        <input
          ref="searchInput"
          v-model="search.query.value"
          type="search"
          class="doc-search-input"
          :placeholder="t.document.searchPlaceholder"
          :aria-label="t.document.search"
          @keydown.enter.prevent="$event.shiftKey ? search.prev() : search.next()"
          @keydown.esc.prevent="search.clear()"
        />
        <span v-if="search.active.value" class="doc-search-count" aria-live="polite">
          {{ search.count.value ? t.document.searchCount(search.current.value + 1, search.count.value) : t.document.searchNone }}
        </span>
        <AppButton variant="tertiary" size="sm" :disabled="!search.count.value" :aria-label="t.document.searchPrev" :title="t.document.searchPrev" @click="search.prev()">↑</AppButton>
        <AppButton variant="tertiary" size="sm" :disabled="!search.count.value" :aria-label="t.document.searchNext" :title="t.document.searchNext" @click="search.next()">↓</AppButton>
      </div>
      <label class="doc-toggle">
        <input v-model="showEmpty" type="checkbox" />
        {{ t.document.showEmpty }}
      </label>
      <ExportButton
        :get-yaml="toMarkdown"
        :filename="project.name || t.document.title"
        extension="md"
        mime-type="text/markdown"
        :label="t.document.exportMarkdown"
      />
    </div>

    <div ref="scrollEl" class="doc-scroll">
      <div class="doc-layout">
        <!-- Obsah dokumentu (osnova) -->
        <nav v-if="doc?.sections.length" class="doc-toc" :aria-label="t.document.toc">
          <p class="doc-toc-title">{{ t.document.toc }}</p>
          <ul>
            <li v-for="section in doc.sections" :key="section.id">
              <a :href="`#${section.id}`" @click.prevent="scrollToSection(section.id)">
                {{ section.title }} <span class="doc-toc-count">{{ section.items.length }}</span>
              </a>
            </li>
          </ul>
        </nav>

        <article v-if="doc" ref="articleEl" class="doc-article">
          <h1
            v-doc-text="doc.title"
            class="doc-h1 doc-editable"
            contenteditable="plaintext-only"
            spellcheck="true"
            :data-placeholder="t.document.untitled"
            :aria-label="t.document.projectName"
            @keydown="onSingleLineKeydown($event, doc.title)"
            @blur="onBlur($event, doc.title, saveTitle, true)"
          ></h1>
          <ul v-if="doc.meta.length" class="doc-meta">
            <li v-for="m in doc.meta" :key="m.label"><span class="doc-label">{{ m.label }}:</span> {{ m.value }}</li>
          </ul>

          <p v-if="!itemCount" class="doc-empty">{{ t.document.empty }}</p>

          <section v-for="section in doc.sections" :id="section.id" :key="section.id" class="doc-section">
            <h2 class="doc-h2">{{ section.title }}</h2>

            <div v-for="item in section.items" :key="item.key" class="doc-item">
              <div class="doc-h3-row">
                <router-link
                  v-if="item.code"
                  :to="detailRoute(item)"
                  class="doc-code"
                  :title="t.document.openDetail"
                  data-doc-search="off"
                >{{ item.code }}</router-link>
                <h3
                  v-doc-text="item.name"
                  class="doc-h3 doc-editable"
                  contenteditable="plaintext-only"
                  spellcheck="true"
                  :data-placeholder="t.document.untitled"
                  :aria-label="t.document.entityName"
                  @keydown="onSingleLineKeydown($event, item.name)"
                  @blur="onBlur($event, item.name, (text) => saveName(item, text), true)"
                ></h3>
                <router-link
                  v-if="!item.code"
                  :to="detailRoute(item)"
                  class="doc-open"
                  :title="t.document.openDetail"
                  :aria-label="t.document.openDetail"
                  data-doc-search="off"
                >↗</router-link>
              </div>

              <!-- Krátká pole jako vlastnosti -->
              <dl v-if="visibleProps(item).length" class="doc-props">
                <div v-for="field in visibleProps(item)" :key="field.key" class="doc-prop">
                  <dt class="doc-label">{{ field.label }}</dt>
                  <dd>
                    <select
                      v-if="field.type === 'select'"
                      class="doc-select"
                      :value="field.value"
                      :aria-label="field.label"
                      @change="saveField(item, field, $event.target.value)"
                    >
                      <option v-if="!hasOption(field.options, field.value)" :value="field.value">{{ field.value || '—' }}</option>
                      <option v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label || '—' }}</option>
                    </select>
                    <input
                      v-else-if="field.type === 'date'"
                      type="date"
                      class="doc-date"
                      :value="field.value"
                      :aria-label="field.label"
                      @change="saveField(item, field, $event.target.value)"
                    />
                    <template v-else-if="field.type === 'number-unit'">
                      <span
                        v-doc-text="field.value"
                        class="doc-inline doc-editable"
                        contenteditable="plaintext-only"
                        data-placeholder="—"
                        :aria-label="field.label"
                        @keydown="onSingleLineKeydown($event, field.value)"
                        @blur="onBlur($event, field.value, (text) => saveField(item, field, text), true)"
                      ></span>
                      <select
                        class="doc-select"
                        :value="field.unit"
                        :aria-label="`${field.label} – ${t.document.unit}`"
                        @change="saveField(item, field, field.value, $event.target.value)"
                      >
                        <option v-if="!hasOption(field.units, field.unit)" :value="field.unit">{{ field.unit || '—' }}</option>
                        <option v-for="u in field.units" :key="u.value" :value="u.value">{{ u.label }}</option>
                      </select>
                    </template>
                    <span
                      v-else
                      v-doc-text="field.text"
                      class="doc-inline doc-editable"
                      contenteditable="plaintext-only"
                      spellcheck="true"
                      data-placeholder="—"
                      :aria-label="field.label"
                      @keydown="onSingleLineKeydown($event, field.text)"
                      @blur="onBlur($event, field.text, (text) => saveField(item, field, text), true)"
                    ></span>
                  </dd>
                </div>
              </dl>

              <!-- Dlouhá textová pole jako podnadpis + odstavec -->
              <template v-for="field in item.blocks" :key="field.key">
                <div v-if="showEmpty || !field.empty" class="doc-block">
                  <h4 class="doc-h4">{{ field.label }}</h4>
                  <div
                    v-doc-text="field.text"
                    class="doc-p doc-editable"
                    contenteditable="plaintext-only"
                    spellcheck="true"
                    :data-placeholder="t.document.emptyField"
                    :aria-label="field.label"
                    role="textbox"
                    aria-multiline="true"
                    @keydown="onBlockKeydown($event, field.text)"
                    @blur="onBlur($event, field.text, (text) => saveField(item, field, text))"
                  ></div>
                </div>
              </template>
            </div>
          </section>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
// Upravované prvky mají contenteditable="plaintext-only": úprava textu bez formátování
// (vložený text se vloží jako prostý text, Enter vloží zalomení řádku).
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n.js'
import { useProjectDocument } from '../composables/useProjectDocument.js'
import { useDocumentSearch } from '../composables/useDocumentSearch.js'
import AppButton from '../components/AppButton.vue'
import ExportButton from '../components/ExportButton.vue'

const { t } = useI18n()
const route = useRoute()
const projectId = computed(() => String(route.params.id || ''))

const { project, doc, itemCount, showEmpty, saveTitle, saveName, saveField, detailRoute, toMarkdown } = useProjectDocument(projectId)

const scrollEl = ref(null)
const articleEl = ref(null)
const searchInput = ref(null)
const search = useDocumentSearch(articleEl, scrollEl, () => [doc.value, showEmpty.value])

/**
 * Text upravovaného prvku nastaví jen tehdy, když v něm uživatel zrovna nepíše –
 * jinak by překreslení posunulo kurzor (prvek nemá v šabloně žádné potomky).
 */
const vDocText = {
  mounted(el, { value }) {
    el.textContent = value ?? ''
  },
  updated(el, { value }) {
    const text = value ?? ''
    if (document.activeElement !== el && el.textContent !== text) el.textContent = text
  },
}

function hasOption(options, value) {
  return (options || []).some((o) => o.value === value)
}

/** Vlastnosti entity k zobrazení (prázdné jen při zapnutém „Zobrazit prázdná pole“). */
function visibleProps(item) {
  return showEmpty.value ? item.props : item.props.filter((f) => !f.empty)
}

/** Text upravovaného prvku (innerText převede zalomení řádků na \n). */
function readText(el) {
  return el.innerText ?? el.textContent ?? ''
}

/**
 * Po opuštění upravovaného prvku uloží změnu; když se nic neuložilo (beze změny, prázdný název),
 * vrátí v prvku uloženou hodnotu.
 * @param {FocusEvent} event
 * @param {string} stored - hodnota, ze které prvek vznikl
 * @param {(text: string) => boolean} save
 * @param {boolean} [single] - jednořádkové pole
 */
function onBlur(event, stored, save, single = false) {
  const el = event.target
  const text = readText(el)
  const saved = save(single ? text.replace(/\s*\n\s*/g, ' ') : text)
  if (!saved) el.textContent = stored ?? ''
}

/** Jednořádkové pole: Enter potvrdí, Esc vrátí původní text. */
function onSingleLineKeydown(event, stored) {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.target.blur()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.target.textContent = stored ?? ''
    event.target.blur()
  }
}

/** Odstavec: Enter zalomí řádek, Ctrl/Cmd+Enter potvrdí, Esc vrátí původní text. */
function onBlockKeydown(event, stored) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    event.target.blur()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.target.textContent = stored ?? ''
    event.target.blur()
  }
}

/** Ctrl/Cmd+F → hledání v dokumentu (místo hledání prohlížeče). */
function onPageKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    searchInput.value?.focus()
    searchInput.value?.select()
  }
}

/** Ctrl+F i mimo fokus v dokumentu (např. po kliknutí na prázdné místo). */
function onWindowKeydown(event) {
  if (event.defaultPrevented) return
  onPageKeydown(event)
}

function scrollToSection(id) {
  const target = document.getElementById(id)
  const box = scrollEl.value
  if (!target || !box) return
  box.scrollTop += target.getBoundingClientRect().top - box.getBoundingClientRect().top - 16
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  // Rozepsaný text se uloží i při odchodu z obrazovky (po odpojení prvku by blur už nedoběhl)
  const el = document.activeElement
  if (el && articleEl.value?.contains(el)) el.blur()
})
</script>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.doc-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}

.doc-search {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex: 1 1 320px;
  max-width: 520px;
}

.doc-search-input {
  flex: 1;
  min-width: 0;
  padding: 6px var(--space-sm);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 0.9375rem;
}

.doc-search-input:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: -1px;
}

.doc-search-count {
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.doc-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.9rem;
  color: var(--text-muted);
  cursor: pointer;
}

.doc-toolbar > :last-child {
  margin-left: auto;
}

.doc-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.doc-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 760px);
  justify-content: center;
  gap: var(--space-xl);
  padding: var(--space-xl) var(--space-md) 96px;
}

.doc-toc {
  position: sticky;
  top: var(--space-md);
  align-self: start;
  font-size: 0.9rem;
}

.doc-toc-title {
  margin: 0 0 var(--space-sm);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.doc-toc ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.doc-toc a {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 4px var(--space-sm);
  border-radius: var(--radius-sm);
  color: var(--text);
  text-decoration: none;
}

.doc-toc a:hover {
  background: var(--bg-muted);
}

.doc-toc-count {
  color: var(--text-muted);
}

.doc-article {
  min-width: 0;
  line-height: 1.6;
}

.doc-editable {
  border-radius: 4px;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  transition: background var(--transition);
}

.doc-editable:hover {
  background: var(--bg-muted);
}

.doc-editable:focus {
  background: var(--bg-elevated);
  box-shadow: 0 0 0 2px var(--border-focus);
}

.doc-editable:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  font-style: italic;
  font-weight: 400;
}

.doc-h1 {
  margin: 0 0 var(--space-sm);
  font-size: 2rem;
  line-height: 1.25;
}

.doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-lg);
  margin: 0 0 var(--space-lg);
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.doc-label {
  color: var(--text-muted);
  font-weight: 500;
}

.doc-empty {
  color: var(--text-muted);
}

.doc-section {
  margin-top: var(--space-xl);
}

.doc-h2 {
  margin: 0 0 var(--space-md);
  padding-bottom: var(--space-xs);
  border-bottom: 2px solid var(--border);
  font-size: 1.5rem;
}

.doc-item {
  margin-bottom: var(--space-lg);
}

.doc-h3-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.doc-h3 {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 1.2rem;
}

.doc-code {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--accent);
  text-decoration: none;
}

.doc-code:hover,
.doc-open:hover {
  text-decoration: underline;
}

.doc-open {
  flex-shrink: 0;
  color: var(--text-muted);
  text-decoration: none;
}

.doc-props {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 2px var(--space-md);
  margin: var(--space-sm) 0 0;
  font-size: 0.9375rem;
}

.doc-prop {
  display: contents;
}

.doc-prop dd {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin: 0;
  min-width: 0;
}

.doc-inline {
  display: inline-block;
  min-width: 2ch;
  padding: 0 2px;
}

.doc-select,
.doc-date {
  flex: none;
  width: auto;
  max-width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.doc-select:hover,
.doc-date:hover {
  background: var(--bg-muted);
}

.doc-select:focus-visible,
.doc-date:focus-visible {
  outline: 2px solid var(--border-focus);
}

.doc-select option {
  background: var(--bg-elevated);
  color: var(--text);
}

.doc-block {
  margin-top: var(--space-sm);
}

.doc-h4 {
  margin: var(--space-sm) 0 2px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.doc-p {
  margin: 0;
  padding: 2px 4px;
  margin-left: -4px;
}

/* Úzká okna: bez osnovy */
@media (max-width: 900px) {
  .doc-layout {
    grid-template-columns: minmax(0, 1fr);
    padding-top: var(--space-lg);
  }

  .doc-toc {
    display: none;
  }
}
</style>

<style>
/* Zvýraznění výsledků hledání (CSS Custom Highlight API, viz useDocumentSearch) – nesmí být scoped */
::highlight(uxlog-doc-search) {
  background-color: rgba(250, 204, 21, 0.45);
  color: inherit;
}

::highlight(uxlog-doc-search-current) {
  background-color: #f97316;
  color: #ffffff;
}
</style>
