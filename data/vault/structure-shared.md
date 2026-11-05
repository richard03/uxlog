Každý projekt má vlastní složku v `projects/`.

- `projects/<Název projektu>/project.md` – projekt. Frontmatter obsahuje id, rozsah, prioritu, fázi a termín, tělo je `# Název` a pod ním zápisník.
- `projects/<…>/INDEX.md` – rejstřík záznamů projektu (kód, název, soubor, id). Generuje ho aplikace, neupravuj ho.
- `projects/<…>/connections.yaml` – obecné souvislosti mezi záznamy projektu.
- `projects/<…>/<typ>/<KÓD-název>.md` – záznamy podle typu:
{{ENTITY_TYPES}}
- `.uxlog/` – spravuje aplikace (nástroj pro příkazovou řádku, manifest, rozvržení plátna, historie chatu Zápisníku, konfigurace projektu). Neupravuj.
- `.claude/settings.json` a `.claude/skills/uxlog-*` – spravuje aplikace. Vlastní nastavení Claude Code patří do `.claude/settings.local.json`.

Záznam přesuneš do jiného projektu přesunem souboru do složky toho projektu. Nový projekt založíš příkazem `new project`.
