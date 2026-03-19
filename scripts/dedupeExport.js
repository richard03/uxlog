/**
 * Skript pro odstranění duplicit z export.yaml.
 * Načte YAML, ponechá jen první výskyt každého záznamu (podle code/name),
 * a zapíše výstup pomocí toYaml aplikace – zachová správné odsazení pro import.
 */
import { readFileSync, writeFileSync } from 'fs'
import { parseYaml, toYaml } from '../src/lib/yaml.js'

const inputPath = process.argv[2] || 'export2.yaml'
const outputPath = process.argv[3] || 'export.yaml'

const text = readFileSync(inputPath, 'utf-8')
const data = parseYaml(text)

function dedupeByKey(items, keyFn) {
  const seen = new Set()
  return items.filter((item) => {
    const k = keyFn(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

if (data.goals?.length) {
  data.goals = dedupeByKey(data.goals, (x) => x.code ?? '')
}
if (data.stakeholders?.length) {
  data.stakeholders = dedupeByKey(data.stakeholders, (x) => x.name ?? '')
}
if (data.competitions?.length) {
  data.competitions = dedupeByKey(data.competitions, (x) => x.name ?? '')
}
if (data.hypotheses?.length) {
  data.hypotheses = dedupeByKey(data.hypotheses, (x) => x.code ?? '')
}
if (data.personas?.length) {
  data.personas = dedupeByKey(data.personas, (x) => x.code ?? '')
}
if (data.scenarios?.length) {
  data.scenarios = dedupeByKey(data.scenarios, (x) => x.code ?? '')
}
if (data.requirements?.length) {
  data.requirements = dedupeByKey(data.requirements, (x) => x.code ?? '')
}
if (data.activities?.length) {
  data.activities = dedupeByKey(data.activities, (x) => x.typeKey ?? x.id ?? '')
}
if (data.teamMembers?.length) {
  data.teamMembers = dedupeByKey(data.teamMembers, (x) => x.name ?? '')
}
if (data.tasks?.length) {
  data.tasks = dedupeByKey(data.tasks, (x) => x.code ?? '')
}
if (data.bugs?.length) {
  data.bugs = dedupeByKey(data.bugs, (x) => x.code ?? '')
}

const out = toYaml(data)
writeFileSync(outputPath, out, 'utf-8')
console.log(`Zapsáno do ${outputPath}`)
