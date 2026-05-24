const REQUIRED_SECTIONS = [
  'summary',
  'why this task exists',
  'goal',
  'architecture alignment',
  'normative docs',
  'dependencies & impact',
  'current repo state',
  'scope',
  'out of scope',
  'rollout plan & risk matrix',
  'acceptance criteria',
  'verification',
  'closing protocol'
]

const REQUIRED_IMPLEMENTATION_SECTIONS = ['detailed spec']
const POLICY_TYPES = new Set(['umbrella', 'policy'])
const SENSITIVE_DOMAINS = ['finance', 'payroll', 'auth', 'identity', 'billing', 'cloud', 'data', 'production']

const hasSection = (task, section) => task.sections.has(section)

const sectionLine = (task, section) => task.sections.get(section)?.line

const sectionContent = (task, section) => task.sections.get(section)?.content ?? ''

const isLightweightImplementation = task => {
  const effort = task.effort ?? ''

  return task.type === 'implementation' && ['low', 'bajo', 'small'].includes(effort)
}

const finding = ({ task, rule, severity, message, line }) => ({
  file: task.file,
  rule,
  severity,
  ...(line ? { line } : {}),
  message
})

const blockingSeverity = context => (context.enforceErrors ? 'error' : 'warning')

const checkRequiredSections = (task, context) => {
  const findings = []
  const missing = REQUIRED_SECTIONS.filter(section => !hasSection(task, section))

  for (const section of missing) {
    findings.push(
      finding({
        task,
        rule: 'required-sections',
        severity: blockingSeverity(context),
        message: `Missing required section "## ${section}".`
      })
    )
  }

  if (task.type === 'implementation' && !isLightweightImplementation(task)) {
    for (const section of REQUIRED_IMPLEMENTATION_SECTIONS) {
      if (!hasSection(task, section)) {
        findings.push(
          finding({
            task,
            rule: 'required-sections',
            severity: blockingSeverity(context),
            message: `Implementation task must include "## ${section}".`
          })
        )
      }
    }
  }

  if (POLICY_TYPES.has(task.type) && !hasSection(task, 'detailed spec')) {
    findings.push(
      finding({
        task,
        rule: 'required-sections',
        severity: 'warning',
        message: 'Policy/umbrella tasks may omit "## Detailed Spec"; keeping this as warning-only.'
      })
    )
  }

  return findings
}

const checkFilesOwned = (task, context) => {
  const hasFilesOwned = task.headings.some(heading => {
    return heading.level === 3 && heading.key === 'files owned'
  })

  if (hasFilesOwned) return []

  return [
    finding({
      task,
      rule: 'files-owned-section',
      severity: task.kind === 'template' ? blockingSeverity(context) : 'warning',
      message: 'Missing "### Files owned" under Dependencies & Impact.'
    })
  ]
}

const checkAcceptanceCriteria = (task, context) => {
  const content = sectionContent(task, 'acceptance criteria')

  if (/- \[[ xX]\]\s+\S+/.test(content)) return []

  return [
    finding({
      task,
      rule: 'acceptance-checkboxes',
      severity: blockingSeverity(context),
      line: sectionLine(task, 'acceptance criteria'),
      message: '"## Acceptance Criteria" must include at least one checkbox item.'
    })
  ]
}

const checkRolloutPlan = (task, context) => {
  const content = sectionContent(task, 'rollout plan & risk matrix')
  const findings = []

  if (!content.trim()) {
    findings.push(
      finding({
        task,
        rule: 'rollout-plan',
        severity: blockingSeverity(context),
        line: sectionLine(task, 'rollout plan & risk matrix'),
        message: '"## Rollout Plan & Risk Matrix" must not be empty.'
      })
    )

    return findings
  }

  const lowerContent = content.toLowerCase()
  const lowerDomain = task.domain ?? ''
  const touchesSensitiveDomain = SENSITIVE_DOMAINS.some(domain => lowerDomain.includes(domain))
  const usesBareNa = /\bn\/a\b/.test(lowerContent) && !/additive|repo-only|no production runtime impact|sin impacto/.test(lowerContent)

  if (task.type === 'implementation' && touchesSensitiveDomain && usesBareNa) {
    findings.push(
      finding({
        task,
        rule: 'rollout-plan',
        severity: 'warning',
        line: sectionLine(task, 'rollout plan & risk matrix'),
        message:
          'Sensitive implementation task uses a bare N/A rollout plan. Add explicit mitigation, rollback, or repo-only rationale.'
      })
    )
  }

  return findings
}

const checkLifecycleFolderParity = (task, context) => {
  if (!task.lifecycle || !task.folderLifecycle) return []

  if (task.lifecycle === task.folderLifecycle) return []

  return [
    finding({
      task,
      rule: 'lifecycle-folder-parity',
      severity: blockingSeverity(context),
      line: task.status.fieldLines.Lifecycle,
      message: `Lifecycle is "${task.lifecycle}" but file lives under "${task.folderLifecycle}".`
    })
  ]
}

const checkRegistryParity = (task, context) => {
  if (!task.id) return []

  const row = context.registryRows.get(task.id)

  if (!row) {
    return [
      finding({
        task,
        rule: 'registry-parity',
        severity: 'warning',
        message: `${task.id} is missing from docs/tasks/TASK_ID_REGISTRY.md. Registry parity is warning-only in V1.`
      })
    ]
  }

  const findings = []

  if (task.lifecycle && row.lifecycle !== task.lifecycle) {
    findings.push(
      finding({
        task,
        rule: 'registry-parity',
        severity: 'warning',
        line: row.line,
        message:
          `${task.id} lifecycle is "${task.lifecycle}" but registry says "${row.lifecycle}". ` +
          'Registry parity is warning-only in V1.'
      })
    )
  }

  if (row.file !== task.file) {
    findings.push(
      finding({
        task,
        rule: 'registry-parity',
        severity: 'warning',
        line: row.line,
        message: `${task.id} file path is "${task.file}" but registry points to "${row.file}".`
      })
    )
  }

  return findings
}

const checkNextIdMarker = (_task, context) => {
  if (!context.isLastTask || !context.readmeNextId || !context.expectedNextId) return []

  if (context.readmeNextId.id === context.expectedNextId) return []

  return [
    {
      file: 'docs/tasks/README.md',
      rule: 'next-id-marker',
      severity: 'warning',
      line: context.readmeNextId.line,
      message:
        `README next-id marker is "${context.readmeNextId.id}" but registry max+1 is "${context.expectedNextId}".`
    }
  ]
}

export const RULES = [
  {
    id: 'required-sections',
    appliesTo: task => task.kind === 'template',
    check: checkRequiredSections
  },
  {
    id: 'files-owned-section',
    appliesTo: task => task.kind === 'template',
    check: checkFilesOwned
  },
  {
    id: 'acceptance-checkboxes',
    appliesTo: task => task.kind === 'template',
    check: checkAcceptanceCriteria
  },
  {
    id: 'rollout-plan',
    appliesTo: task => task.kind === 'template' && task.type === 'implementation',
    check: checkRolloutPlan
  },
  {
    id: 'lifecycle-folder-parity',
    appliesTo: task => task.kind === 'template',
    check: checkLifecycleFolderParity
  },
  {
    id: 'registry-parity',
    appliesTo: task => task.kind === 'template',
    check: checkRegistryParity
  },
  {
    id: 'next-id-marker',
    appliesTo: (_task, context) => context.isLastTask,
    check: checkNextIdMarker
  }
]

export const runRules = (task, context) => {
  const findings = []

  for (const rule of RULES) {
    if (!rule.appliesTo(task, context)) continue
    findings.push(...rule.check(task, context))
  }

  return findings
}
