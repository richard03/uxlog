/**
 * Výchozí definice atributů pro všechny typy entit.
 * Obsahuje pouze "body" atributy – název a kód entity se konfigurovat nedají
 * a zůstávají vždy v hlavičce detailu.
 *
 * Každý atribut má:
 *   key        – klíč ve datovém objektu entity
 *   labelKey   – cesta k překladu (tPath) pro výchozí popisek
 *   type       – typ vstupu: text | textarea | url | select | email | tel | number-unit
 *   sortOrder  – výchozí pořadí zobrazení
 *   options?   – pro select: pole { value, labelKey }
 *   valueKey?  – pro number-unit: klíč hodnoty v entitě
 *   unitKey?   – pro number-unit: klíč jednotky v entitě
 *   units?     – pro number-unit: pole { value, labelKey }
 *   visibleWhen? – podmíněná viditelnost: { field, value }
 */

export const ENTITY_FIELD_DEFAULTS = {
  goal: [
    { key: 'description', labelKey: 'goal.description', type: 'textarea', sortOrder: 10 },
    { key: 'metrics', labelKey: 'goal.metrics', type: 'textarea', sortOrder: 20 },
    { key: 'url', labelKey: 'goal.url', type: 'url', sortOrder: 30 },
  ],

  stakeholder: [
    { key: 'description', labelKey: 'stakeholder.description', type: 'textarea', sortOrder: 10 },
    {
      key: 'influenceLevel', labelKey: 'stakeholder.influenceLevel', type: 'select', sortOrder: 20,
      options: [
        { value: '', labelKey: 'stakeholderLevel.' },
        { value: 'high', labelKey: 'stakeholderLevel.high' },
        { value: 'medium', labelKey: 'stakeholderLevel.medium' },
        { value: 'low', labelKey: 'stakeholderLevel.low' },
      ],
    },
    {
      key: 'interestLevel', labelKey: 'stakeholder.interestLevel', type: 'select', sortOrder: 30,
      options: [
        { value: '', labelKey: 'stakeholderLevel.' },
        { value: 'high', labelKey: 'stakeholderLevel.high' },
        { value: 'medium', labelKey: 'stakeholderLevel.medium' },
        { value: 'low', labelKey: 'stakeholderLevel.low' },
      ],
    },
  ],

  competition: [
    { key: 'description', labelKey: 'competition.description', type: 'textarea', sortOrder: 10 },
    { key: 'strengths', labelKey: 'competition.strengths', type: 'textarea', sortOrder: 20 },
    { key: 'weaknesses', labelKey: 'competition.weaknesses', type: 'textarea', sortOrder: 30 },
    { key: 'inspiration', labelKey: 'competition.inspiration', type: 'textarea', sortOrder: 40 },
    { key: 'url', labelKey: 'competition.url', type: 'url', sortOrder: 50 },
  ],

  hypothesis: [
    { key: 'description', labelKey: 'hypothesis.description', type: 'textarea', sortOrder: 10 },
    {
      key: 'status', labelKey: 'hypothesis.status', type: 'select', sortOrder: 20,
      options: [
        { value: 'untested', labelKey: 'hypothesisStatus.untested' },
        { value: 'tested', labelKey: 'hypothesisStatus.tested' },
        { value: 'refuted', labelKey: 'hypothesisStatus.refuted' },
      ],
    },
    { key: 'explanation', labelKey: 'hypothesis.explanation', type: 'textarea', sortOrder: 30 },
    { key: 'url', labelKey: 'hypothesis.url', type: 'url', sortOrder: 40 },
  ],

  persona: [
    {
      key: 'status', labelKey: 'persona.status', type: 'select', sortOrder: 5,
      options: [
        { value: 'protopersona', labelKey: 'personaStatus.protopersona' },
        { value: 'persona', labelKey: 'personaStatus.persona' },
      ],
    },
    { key: 'description', labelKey: 'persona.description', type: 'textarea', sortOrder: 10 },
    { key: 'motivation', labelKey: 'persona.motivation', type: 'textarea', sortOrder: 20 },
    { key: 'needs', labelKey: 'persona.needs', type: 'textarea', sortOrder: 30 },
    { key: 'problems', labelKey: 'persona.problems', type: 'textarea', sortOrder: 40 },
    { key: 'context', labelKey: 'persona.context', type: 'textarea', sortOrder: 50 },
    { key: 'recruitmentCriteria', labelKey: 'persona.recruitmentCriteria', type: 'textarea', sortOrder: 60 },
    { key: 'targetGroupSize', labelKey: 'persona.targetGroupSize', type: 'text', sortOrder: 70 },
    { key: 'targetGroupValue', labelKey: 'persona.targetGroupValue', type: 'text', sortOrder: 80 },
    { key: 'url', labelKey: 'persona.url', type: 'url', sortOrder: 90 },
  ],

  scenario: [
    { key: 'description', labelKey: 'scenario.description', type: 'textarea', sortOrder: 10 },
    {
      key: 'type', labelKey: 'scenario.type', type: 'select', sortOrder: 20,
      options: [
        { value: 'main', labelKey: 'scenario.scenarioType.main' },
        { value: 'secondary', labelKey: 'scenario.scenarioType.secondary' },
        { value: 'error', labelKey: 'scenario.scenarioType.error' },
      ],
    },
    {
      key: 'priority', labelKey: 'scenario.priority', type: 'select', sortOrder: 30,
      options: [
        { value: 'must', labelKey: 'moscow.must' },
        { value: 'should', labelKey: 'moscow.should' },
        { value: 'could', labelKey: 'moscow.could' },
        { value: 'wont', labelKey: 'moscow.wont' },
      ],
    },
    {
      key: 'userCount', labelKey: 'scenario.userCount', type: 'number-unit', sortOrder: 40,
      valueKey: 'userCount', unitKey: 'userCountUnit',
      units: [
        { value: 'daily', labelKey: 'scenario.unit.daily' },
        { value: 'monthly', labelKey: 'scenario.unit.monthly' },
        { value: 'yearly', labelKey: 'scenario.unit.yearly' },
      ],
    },
    {
      key: 'frequency', labelKey: 'scenario.frequency', type: 'number-unit', sortOrder: 50,
      valueKey: 'frequencyValue', unitKey: 'frequencyUnit',
      units: [
        { value: 'daily', labelKey: 'scenario.unit.daily' },
        { value: 'monthly', labelKey: 'scenario.unit.monthly' },
        { value: 'yearly', labelKey: 'scenario.unit.yearly' },
      ],
    },
    {
      key: 'value', labelKey: 'scenario.value', type: 'number-unit', sortOrder: 60,
      valueKey: 'valueAmount', unitKey: 'valueUnit',
      units: [
        { value: 'daily', labelKey: 'scenario.unit.daily' },
        { value: 'monthly', labelKey: 'scenario.unit.monthly' },
        { value: 'yearly', labelKey: 'scenario.unit.yearly' },
      ],
    },
    { key: 'url', labelKey: 'scenario.url', type: 'url', sortOrder: 70 },
  ],

  requirement: [
    { key: 'description', labelKey: 'requirement.description', type: 'textarea', sortOrder: 10 },
    { key: 'motivation', labelKey: 'requirement.motivation', type: 'textarea', sortOrder: 20 },
    {
      key: 'priority', labelKey: 'requirement.priority', type: 'select', sortOrder: 30,
      options: [
        { value: 'must', labelKey: 'moscow.must' },
        { value: 'should', labelKey: 'moscow.should' },
        { value: 'could', labelKey: 'moscow.could' },
        { value: 'wont', labelKey: 'moscow.wont' },
      ],
    },
    {
      key: 'wontHaveExplanation', labelKey: 'requirement.wontHaveExplanation', type: 'textarea', sortOrder: 40,
      visibleWhen: { field: 'priority', value: 'wont' },
    },
    { key: 'url', labelKey: 'requirement.url', type: 'url', sortOrder: 50 },
  ],

  task: [
    { key: 'description', labelKey: 'task.description', type: 'textarea', sortOrder: 10 },
    { key: 'metrics', labelKey: 'task.metrics', type: 'textarea', sortOrder: 20 },
    { key: 'achievability', labelKey: 'task.achievability', type: 'textarea', sortOrder: 30 },
    { key: 'relevance', labelKey: 'task.relevance', type: 'textarea', sortOrder: 40 },
    { key: 'dueDate', labelKey: 'task.dueDate', type: 'text', sortOrder: 50 },
    { key: 'assignee', labelKey: 'task.assignee', type: 'text', sortOrder: 60 },
    { key: 'url', labelKey: 'task.url', type: 'url', sortOrder: 70 },
    {
      key: 'status', labelKey: 'task.status', type: 'select', sortOrder: 80,
      options: [
        { value: 'open', labelKey: 'task.statusOptions.open' },
        { value: 'in_progress', labelKey: 'task.statusOptions.in_progress' },
        { value: 'done', labelKey: 'task.statusOptions.done' },
        { value: 'cancelled', labelKey: 'task.statusOptions.cancelled' },
      ],
    },
  ],

  bug: [
    { key: 'expectedBehavior', labelKey: 'bug.expectedBehavior', type: 'textarea', sortOrder: 10 },
    { key: 'actualBehavior', labelKey: 'bug.actualBehavior', type: 'textarea', sortOrder: 20 },
    { key: 'stepsToReproduce', labelKey: 'bug.stepsToReproduce', type: 'textarea', sortOrder: 30 },
    {
      key: 'severity', labelKey: 'bug.severity', type: 'select', sortOrder: 40,
      options: [
        { value: '', labelKey: 'bug.severityOptions.' },
        { value: 'critical', labelKey: 'bug.severityOptions.critical' },
        { value: 'high', labelKey: 'bug.severityOptions.high' },
        { value: 'medium', labelKey: 'bug.severityOptions.medium' },
        { value: 'low', labelKey: 'bug.severityOptions.low' },
      ],
    },
    {
      key: 'impact', labelKey: 'bug.impact', type: 'select', sortOrder: 50,
      options: [
        { value: '', labelKey: 'bug.impactOptions.' },
        { value: 'high', labelKey: 'bug.impactOptions.high' },
        { value: 'medium', labelKey: 'bug.impactOptions.medium' },
        { value: 'low', labelKey: 'bug.impactOptions.low' },
      ],
    },
    { key: 'url', labelKey: 'bug.url', type: 'url', sortOrder: 60 },
    {
      key: 'status', labelKey: 'bug.status', type: 'select', sortOrder: 70,
      options: [
        { value: 'zadano', labelKey: 'bug.statusOptions.zadano' },
        { value: 'neopravime', labelKey: 'bug.statusOptions.neopravime' },
        { value: 'opraveno', labelKey: 'bug.statusOptions.opraveno' },
      ],
    },
  ],

  teamMember: [
    { key: 'role', labelKey: 'teamMember.role', type: 'text', sortOrder: 10 },
    { key: 'email', labelKey: 'teamMember.email', type: 'email', sortOrder: 20 },
    { key: 'phone', labelKey: 'teamMember.phone', type: 'tel', sortOrder: 30 },
    { key: 'note', labelKey: 'teamMember.note', type: 'textarea', sortOrder: 40 },
  ],
}

/**
 * Seznam entit, které v hlavičce zobrazují kód (vedle názvu).
 * @type {Set<string>}
 */
export const ENTITIES_WITH_CODE = new Set([
  'goal', 'hypothesis', 'persona', 'scenario', 'requirement', 'task', 'bug',
])
