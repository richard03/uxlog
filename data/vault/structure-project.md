Tato složka patří jednomu projektu a jeho data jsou přímo v ní. Jiné soubory ve složce (například zdrojový kód) aplikace nečte ani nemění.

- `project.md` – projekt. Frontmatter obsahuje id, rozsah, prioritu, fázi a termín, tělo je `# Název` a pod ním zápisník.
- `INDEX.md` – rejstřík záznamů projektu (kód, název, soubor, id). Generuje ho aplikace, neupravuj ho.
- `connections.yaml` – obecné souvislosti mezi záznamy projektu.
- `<typ>/<KÓD-název>.md` – záznamy podle typu:
{{ENTITY_TYPES}}
- `.uxlog/` – spravuje aplikace (nástroj pro příkazovou řádku, manifest, rozvržení plátna, historie chatu Zápisníku, konfigurace projektu). Neupravuj.
- `.claude/settings.json` a `.claude/skills/uxlog-*` – spravuje aplikace. Vlastní nastavení Claude Code patří do `.claude/settings.local.json`.

Příkazy nepotřebují `--project`, projekt je jen jeden. Další projekt do této složky nepatří.
