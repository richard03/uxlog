# Issues

Nálezy z auditu aplikace (2026-11-07), seřazené podle závažnosti. Řeší se postupně jeden po druhém; vyřešený issue se ze souboru smaže.

## Střední

### 5. Bez CSP a se silnými příkazy pro zápis souborů
- **Problém:** `src-tauri/tauri.conf.json` má `"csp": null`. Příkaz `vault_apply` umí zapsat `.mjs`, `.claude/` a `CLAUDE.md` do libovolné absolutní cesty.
- **Dopad:** jakákoli budoucí XSS by vedla ke spuštění kódu přes Claude Code. Dnes žádné `v-html` ani `innerHTML` není, jde o obranu do hloubky.
- **Řešení:** nastavit CSP (`script-src 'self'`, `connect-src` jen na AI API, Flexi a IPC). V Rustu povolit zápis jen do složek, které uživatel vybral v dialogu.

### 6. Obnova databáze ze složky dat proběhne bez ptaní a bez zálohy
- **Problém:** při nesouladu značek synchronizace `syncWithVault` (`src/lib/plugins/vault/index.js`) přepíše projekty složky obsahem složky.
- **Dopad:** zastaralá kopie z cloudu nebo z jiného počítače tiše přebije lokální úpravy. Zápis jde do historie, ale bez zálohy celé databáze.
- **Řešení:** před obnovou uložit snímek dat. Když by se měnilo hodně záznamů nebo mazaly projekty, nejdřív zobrazit potvrzení s počty.

## Nízké

### 12. Natvrdo psané české texty mimo `cs.js`
- **Problém:** chybové hlášky pluginů (`gemini/index.js` a `openai/index.js` po 5, `ai-shared/prompts.js`, `src/cli/uxlog.js`), text „… a N dalších“ v `src/views/ConfigEntitiesView.vue:27`, UI Figma pluginu.
- **Řešení:** přesunout do i18n.

### 13. Neshoda verzí
- **Problém:** `package.json` má verzi 1.1.0, aplikace 1.2.61.
- **Řešení:** srovnat a přidat `package.json` do pravidla o verzích v CLAUDE.md.

### 14. Pevný port HTTP API
- **Problém:** když je port 17842 obsazený, API se tiše nespustí (jen výpis na stderr).
- **Řešení:** zobrazit stav API na obrazovce Konektory.

### 15. Flexi přes `http://`
- **Problém:** konektor dovolí `http://` adresu a pošle na ni Bearer token nešifrovaně.
- **Řešení:** zobrazit varování (výjimka pro localhost).
