# UXLog Figma Plugin

Figma plugin pro propojení s aplikací UXLog. Aplikace UXLog je nástroj pro správu UX výzkumného a designového procesu. 

Celé rozhraní pluginu je v češtině.

## Cíl

Plugin má uživateli umožnit:
1. **Import dat z YAML do Figmy** - Uživatel vloží YAML exportovaný z UXLogu a plugin z něj vygeneruje vizuální karty na plátno.
2. **Export z vybraných karet z Figmy do YAML** - Uživatel vybere karty na plátně a plugin z nich vytvoří YAML, který lze importovat zpět do UXLogu.
3. **Načtení změn z API a jejich zapsání do Figmy** - plugin přepíše změněná pole aniž by se dotkl nezměněných
4. **Odesílání změn provedených ve Figmě do API** - plugin zjistí co se ve Figmě změnilo a to zapíše do API, aniž by se dotkl nezměněných atributů. 
5. **Nastavení připojení**
   Plugin umožňuje nastavit URL API a API klíč.

Uživatel vždy pracuje jen s daty vybraného projektu. 
Při synchronizaci si může vybrat, které typy entit bude synchronizovat a které ne, ještě před potvrzením akce.


## Co není cílem

Plugin nesmí dělat následující:
- automatickou průběžnou synchronizaci bez zásahu uživatele,
- mazání dat v API,
- vytváření zcela nových entit v API pouze z Figmy, pokud pro ně neexistuje odpovídající záznam nebo jednoznačný sync mechanismus,
- práci mimo aktuální kontext vybraného projektu.

Není nutné, aby první verze pluginu uměla
- řešení konfliktů formou merge editoru,


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
Entity z UXLogu se ve Figmě zobrazují jako karty.

Požadavky na karty:
- každý typ entity má vlastní vizuálně odlišitelnou podobu,
- karta má jasnou hierarchii informací,
- důležité identifikační údaje jsou dobře viditelné,
- text má být přímo editovatelný ve Figmě,
- karta má být čitelná i při delším obsahu,
- prázdné nebo chybějící hodnoty mají být řešeny kultivovaně, ne rozbitím layoutu,
- textové vrstvy nesmí chybět ani pro prázdné hodnoty, aby do nich uživatel mohl zapisovat
- layout má být vhodný pro práci ve Figmě, ne jen pro statické zobrazení.

Doporučený vizuální směr:
- tmavší hlavička se světlým textem,
- světlejší obsahové bloky,
- barevné odlišení podle typu entity,
- štítky nebo jiné vizuální akcenty pro stavové hodnoty,
- u person placeholder pro fotografii nebo avatar.

Přesná vizuální interpretace je na vývojáři, pokud zůstane zachována přehlednost a editovatelnost.

## Zásady synchronizace

Synchronizace má být co nejméně invazivní.
To znamená:
- nemají se přepisovat hodnoty, které se nezměnily,
- plugin má umět rozpoznat lokální změny ve Figmě,
- plugin má umět rozpoznat změny načtené z API,
- před provedením zápisu má být uživateli zřejmé, co se stane.

Pokud dojde ke konfliktu mezi lokální a vzdálenou změnou, plugin musí zvolit předvídatelné chování a toto chování musí být zřejmé uživateli. Není nutné implementovat složitý merge mechanismus, ale konflikt nesmí proběhnout tiše a nepředvídatelně.

Pokud se stejná entita ve Figmě vyskytuje vícekrát, plugin se s tím musí vyrovnat konzistentně. Konkrétní strategie je na implementaci, ale její výsledek musí být předvídatelný. I více výskytů se považuje stále za obraz jedné entity v aplikaci UXLog, pokud odpovídá kód entity.

## Odolnost vůči změnám dat
Plugin musí počítat s tím, že se datový model bude v čase vyvíjet.

Proto platí:
- chybějící pole nesmí rozbít import ani synchronizaci,
- neznámá pole nesmí způsobit pád pluginu,
- neúplná data musí být zpracována co nejbezpečněji,
- plugin má být tolerantní k menším změnám struktury dat.

Není nutné garantovat plnou podporu libovolných budoucích změn, ale implementace má být rozumně robustní.

## Chování při chybách
Plugin musí řešit chyby srozumitelně a prakticky.
To zahrnuje:
- validaci neplatného YAML,
- chybějící nebo neplatné přihlašovací údaje,
- nedostupné API,
- neautorizovaný přístup,
- nečekanou odpověď API,
- data, která nelze bezpečně synchronizovat.

Uživatel má dostat krátkou a srozumitelnou informaci o problému.
Technické detaily musí být k dispozici pro debugging v logu.

## Výkon a použitelnost
Plugin nesmí zbytečně brzdit uživatele při práci ve Figmě.
Požadavky:
- běžné operace mají působit svižně,
- delší operace mají poskytovat průběžnou zpětnou vazbu,
- UI se má přizpůsobovat obsahu tak, aby zbytečně nepřekáželo,
- plugin má respektovat omezení prostředí Figma pluginů.
- Co nejvíce operací by mělo probíhat asynchronně
- Všechny operace se dějí jen nad aktuální stránkou Figmy, ne nad celým Figma souborem.
Velikost pluginu - šířka musí být fixní, výška se může měnit podle situace aby plugin měl vždy co nejmenší velikost a zároveň ukázal vše potřebné, pokud možno bez scrollování.

## Logování a debugování
Plugin musí zaznamenávat chyby a důležité synchronizační události tak, aby bylo možné dohledat:
- co se uživatel pokusil provést,
- zda šlo o import, export nebo sync,
- zda operace uspěla nebo selhala,
- proč případně selhala.

Cílem není zahlcení logu, ale praktická diagnostika problémů.

## Zásady implementace
Vývojář má volnost v technickém řešení, ale výsledná implementace musí splnit tyto zásady:
- být spolehlivá,
- být srozumitelná pro uživatele,
- být odolná vůči neúplným nebo mírně změněným datům,
- respektovat omezení Figma plugin prostředí,
- neprovádět zbytečně destruktivní změny,
- dát uživateli kontrolu před důležitými synchronizačními akcemi.

## Hotovo znamená

Plugin je považován za hotový, pokud:
- uživatel dokáže vložit validní YAML a vytvořit z něj karty na plátně,
- uživatel dokáže vybrané karty exportovat zpět do YAML,
- uživatel dokáže vybrat projekt a načíst jeho data z API,
- uživatel dokáže synchronizovat změny z API do Figmy,
- uživatel dokáže synchronizovat změny z Figmy do API,
- plugin před potvrzením synchronizace ukáže přehled zamýšlených změn,
- plugin se chová předvídatelně i při nevalidních datech nebo chybě spojení,
- plugin neblokuje zbytečně práci ve Figmě,
- plugin poskytuje dost informací pro debugging problémů.

## Poznámka k implementaci
Tento dokument popisuje požadované chování a očekávaný výsledek. Není to závazný technický návrh architektury. Konkrétní implementační rozhodnutí jsou na vývojáři.
