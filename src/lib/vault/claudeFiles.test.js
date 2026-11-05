import { describe, it, expect } from 'vitest'
import YAML from 'yaml'
import cs from '../../i18n/cs.js'
import { buildClaudeFiles, buildClaudeSettings, entityTypeList, RULES_FILE, CLI_FILE } from './claudeFiles.js'
import { CLAUDE_TEMPLATES } from './claudeTemplates.js'
import { splitFrontmatter } from './format.js'

const files = buildClaudeFiles({ ...CLAUDE_TEMPLATES, cliSource: '// cli', cliHelp: cs.vaultCli.help })
const byPath = Object.fromEntries(files.map((f) => [f.path, f]))

describe('buildClaudeFiles', () => {
  it('vytvoří pravidla, CLAUDE.md (jen vytvořit), nastavení, CLI a skilly', () => {
    expect(Object.keys(byPath)).toEqual(expect.arrayContaining([
      'CLAUDE.md', RULES_FILE, '.claude/settings.json', CLI_FILE,
      '.claude/skills/uxlog-data/SKILL.md', '.claude/skills/uxlog-edit-entity/SKILL.md',
      '.claude/skills/uxlog-research-synthesis/SKILL.md', '.claude/skills/uxlog-review/SKILL.md',
    ]))
    expect(byPath['CLAUDE.md'].createOnly).toBe(true)
    expect(byPath['CLAUDE.md'].content).toContain(`@${RULES_FILE}`)
    expect(files.filter((f) => f.createOnly).map((f) => f.path)).toEqual(['CLAUDE.md'])
  })

  it('pravidla obsahují seznam typů a nápovědu CLI bez nevyplněných značek', () => {
    const rules = byPath[RULES_FILE].content
    expect(rules).toContain('`personas/` – persona (kód PER-NNN)')
    expect(rules).toContain('node .uxlog/bin/uxlog.mjs validate')
    expect(rules).not.toMatch(/\{\{\w+\}\}/)
  })

  it('bez zdroje CLI soubor CLI vynechá', () => {
    expect(buildClaudeFiles({ ...CLAUDE_TEMPLATES }).some((f) => f.path === CLI_FILE)).toBe(false)
  })

  it('skilly mají platný frontmatter s názvem shodným se složkou a popisem', () => {
    const skills = files.filter((f) => f.path.startsWith('.claude/skills/'))
    expect(skills.length).toBeGreaterThanOrEqual(4)
    for (const skill of skills) {
      const { frontmatter } = splitFrontmatter(skill.content)
      const meta = YAML.parse(frontmatter)
      expect(meta.name).toBe(skill.path.split('/')[2])
      expect(typeof meta.description).toBe('string')
      expect(meta.description.length).toBeGreaterThan(50)
      expect(meta.description.length).toBeLessThanOrEqual(1024)
    }
  })

  it('nepřijme skill s názvem mimo uxlog-*', () => {
    const result = buildClaudeFiles({ ...CLAUDE_TEMPLATES, skillTemplates: { 'cizi-skill': 'x', 'uxlog-ok': 'y' } })
    expect(result.map((f) => f.path)).toContain('.claude/skills/uxlog-ok/SKILL.md')
    expect(result.some((f) => f.path.includes('cizi-skill'))).toBe(false)
  })
})

describe('buildClaudeSettings', () => {
  it('nastaví hooky před a po úpravě a zakáže úpravy .uxlog', () => {
    const settings = buildClaudeSettings()
    expect(settings.hooks.PreToolUse[0].matcher).toContain('Edit')
    expect(settings.hooks.PostToolUse[0].hooks[0].command).toBe('node "$CLAUDE_PROJECT_DIR/.uxlog/bin/uxlog.mjs" hook')
    expect(settings.permissions.deny).toContain('Edit(/.uxlog/**)')
  })
})

it('entityTypeList pokrývá všechny typy', () => {
  expect(entityTypeList().split('\n')).toHaveLength(12)
})

describe('pravidla podle rozložení složky', () => {
  const base = { rulesTemplate: 'A\n{{STRUCTURE}}\nB', structureShared: 'sdílená {{ENTITY_TYPES}}', structureProject: 'projektová', rootClaudeMd: 'x' }
  const rules = (input) => buildClaudeFiles(input).find((f) => f.path === '.uxlog/claude/RULES.md').content

  it('výchozí složka dostane popis sdílené struktury (s typy záznamů)', () => {
    expect(rules(base)).toContain('sdílená')
    expect(rules(base)).toContain('personas/')
  })

  it('vlastní složka projektu dostane popis projektové struktury', () => {
    expect(rules({ ...base, layout: 'project' })).toBe('A\nprojektová\nB')
  })
})
