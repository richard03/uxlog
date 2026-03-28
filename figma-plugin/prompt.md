# UXLog Figma Plugin

Figma plugin pro propojení s aplikací UXLog. Aplikace UXLog je nástroj pro správu UX výzkumného a designového procesu. Figma plugin umožňuje vizualizovat výzkumná data jako karty ve Figmě a synchronizovat je s UXLog API.

Celé rozhraní pluginu je v češtině.

## Co plugin dělá

1. **Import z YAML** — uživatel vloží YAML exportovaný z UXLog a plugin z něj vygeneruje vizuální karty na plátno.
2. **Export do YAML** — uživatel vybere karty na plátně a plugin z nich vytvoří YAML, který lze importovat zpět do UXLog.
3. **Synchronizace s API** — obousměrná synchronizace s UXLog REST API. Aplikace UXLog komunikovat s okolím pomocí vlastního REST API, které vytváří na localhostu. Plugin umí tato data číst (pull), odesílat lokální úpravy z Figmy do API (push) a detekovat změny na obou stranách.
4. **Nastavení** — konfigurace připojení k API (URL + API klíč).

## Typy entit
Plugin pracuje se 7 typy entit:

- **Persona** — code, name, status (protopersona/persona), description, motivation, needs, problems, target_group_size, target_group_value
- **Hypothesis** — code, name, description, status (untested/tested/refuted), explanation
- **Scenario** — code, name, description, frequency, value, moscow
- **Stakeholder** — name, description, influence_level, interest_level
- **Goal** — code, name, description, metrics
- **Competition** — name, description, strengths, weaknesses, inspiration
- **Requirement** — code, name, description, motivation, moscow, explanation

Každá entita má UUID a patří do některého Projektu, které uživatel vytváří v aplikaci UXLog.

## Uživatelské rozhraní

V horní části je **stavový indikátor** — barevná animovaná tečka ukazující stav připojení (nepřipojeno, připojování, připojeno, čtení, zápis, chyba). Pod ním jsou 4 záložky:

### Import (YAML → Figma)
Uživatel vloží YAML do textového pole. Pokud YAML obsahuje více projektů, zobrazí se výběr projektu. Pokud YAML obsahuje více typů entit, může také vybrat typ entity a omezit tak import pouze na tuto jednu entitu. U každé entity je v závorce číslo, kolik takových objektů je v importu. Tlačítkem "Generovat" plugin vytvoří vybrané entity na aktuálním plátně.

### Export (Figma → YAML)
Uživatel vybere karty na plátně. Plugin zobrazí, kolik UXLog karet je ve výběru a jakých typů. Tlačítkem "Exportovat" se vygeneruje YAML, který lze zkopírovat do schránky a poté importovat do aplikace UXLog.

### Synchronizace
Když uživatel zvolí Synchronizaci, zobrazí se nabídka tří akcí:
- **API → Figma** — stáhne změny z API a aktualizuje změny v existujících kartách na stránce
- **Figma → API** — odešle změny z lokálně upravených karet na API
- **Vytvořit karty** — vygeneruje nové karty pro vybrané typy entit z API dat

Když uživatel vybere některou z akcí, musí vybrat projekt z dropdownu (seznam projektů se načte z API). Jakmile vybere projekt, má možnost buď provést akci se všemi daty z projektu, nebo vybrat jeden typ entity (např. Persony), s kterým se akce provede. U každého typu entity je v závorce počet instancí.

V případě akcí "API → Figma" a "Figma → API" plugin zobrazí, kolik změn se bude syncronizovat (s možností rozkliknout detail změněných polí).

Teprve pak uživatel akci potvrdí a ta se provede.


### Nastavení
Formulář pro URL a API klíč (Bearer token). Tlačítko "Připojit" ověří údaje a uloží je. Po připojení se zobrazí tlačítko "Odpojit".

## Vizuální podoba karet
Entity z UXLogu se ve Figmě zobrazují v podobě "karet". Každý typ entity má vlastní barevnou paletu a rozložení:

barevnými bloky pro jednotlivé atributy a statistikami
Tmavá hlavička se světlým písmem, obsahuje kód a název instance a štítky (badges pro stav, priorita apod.). Pod ní obsahové bloky v pastelových barvách s tmavým písmem.
Persona navíc obsahuje v hlavičce placeholder na fotografii (obsahuje iniciály persony).

Karty používají auto-layout, font Inter a jsou navrženy tak, aby text šel přímo editovat ve Figmě. Prázdné atributy mají placeholder text.

## Detekce změn
Plugin si u každé karty pamatuje, jaký text v ní byl v okamžiku posledního importu nebo pullu. Pokud došlo ke změně (ať už za běhu pluginu nebo bez něj), plugin tuto změnu detekuje. Tyto změny pak lze pushnout na API.


## API

Plugin komunikuje s REST API přes Bearer token:

- **GET** endpointy pro každý typ entity (personas, hypotheses, scenarios, stakeholders, goals, competitions, requirements) + endpoint pro projekty a kontrolní součty (checksums)
- **PUT** endpoint pro aktualizaci jedné entity
- Podporuje inkrementální stahování pomocí parametru `?since=` (jen entity změněné od posledního pullu)
- Checksums slouží k rychlé detekci, zda se něco změnilo, bez stahování všech dat

Plugin musí co nejvíce věcí dělat asynchronně, aby nebrzdil uživatele při práci ve Figmě.

Rozměry pluginu musí být co nejmenší, aby uživateli neclonil výhled na stránku ve Figmě. Rozměry se průběžně přizpůsobují obsahu - když uživatel klikne na akci a je potřeba zobrazit detaily, okno pluginu se zvětší a poté co to už nebude potřeba, zase se zmenší. Šířka pluginu ale zůstává stále stejná.

Plugin musí počítat s tím, že software se vyvíjí a data nemusí zůstat stále stejná, některé položky nemusí být v budoucnu k dispozici a naopak se mohou objevit položky navíc, a to jak v API tak i ve Figmě.

Plugin nesmí přepisovat položky, které se nezměnily.

Plugin musí do logu zaznamenávat veškeré chyby, ke kterým dojde, tak aby se daly debuggovat.

Syntaxe pluginu musí dodržovat omezení Figmy.