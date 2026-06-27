import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

const ACTIVE_TASK_LIFECYCLES = new Set(['to-do', 'in-progress'])
const REQUIRED_IMPLEMENTATION_SECTIONS = ['detailed spec']
const POLICY_TYPES = new Set(['umbrella', 'policy'])
const SENSITIVE_DOMAINS = ['finance', 'payroll', 'auth', 'identity', 'billing', 'cloud', 'data', 'production']
const UI_DOMAINS = ['ui', 'design-system', 'motion', 'accessibility']
const UI_IMPACTS = new Set(['copy', 'layout', 'interaction', 'motion', 'primitive', 'flow'])
const UI_READY_VALUES = new Set(['yes', 'no', 'n/a', 'na'])

const BACKEND_DATA_DOMAINS = [
  'api',
  'data',
  'db',
  'database',
  'migration',
  'migrations',
  'sync',
  'cron',
  'webhook',
  'webhooks',
  'integration',
  'integrations',
  'finance',
  'payroll',
  'auth',
  'identity',
  'billing',
  'cloud',
  'reliability'
]

const BACKEND_DATA_IMPACTS = new Set(['api', 'db', 'migration', 'command', 'reader', 'sync', 'cron', 'webhook', 'integration'])
const WIREFRAME_PATH_RE = /^docs\/ui\/wireframes\/(?:TASK-\d{3,}(?:\.\d+)?-[^`|\s]+|[a-z0-9][a-z0-9-]*\.md)$/
const FLOW_PATH_RE = /^docs\/ui\/flows\/(?:TASK-\d{3,}(?:\.\d+)?-[^`|\s]+|[a-z0-9][a-z0-9-]*\.md)$/
const MOTION_PATH_RE = /^docs\/ui\/motion\/(?:TASK-\d{3,}(?:\.\d+)?-[^`|\s]+|[a-z0-9][a-z0-9-]*\.md)$/

const FLOW_TRIGGER_RE =
  /\b(drawer|sidecar|modal|dialog|popover|floating surface|floating-surface|deep link|deep-link|cross-route|route change|navigation|navegacion|navegación|pantalla destino|screen transition)\b/i

const MOTION_TRIGGER_RE =
  /\b(motion|microinteraction|microinteractions|microinteraccion|microinteracciones|animation|animated|animacion|animación|transition|transicion|transición|framer|gsap|lottie|reduced motion|reduced-motion|animatedcounter|stagger|layout morph)\b/i

const hasSection = (task, section) => task.sections.has(section)

const sectionLine = (task, section) => task.sections.get(section)?.line

const sectionContent = (task, section) => task.sections.get(section)?.content ?? ''

const stripStatusValue = value => value.replace(/^`(.+)`$/, '$1').trim()

const normalizeStatusValue = value => stripStatusValue(value).toLowerCase()

const hasMarkdownHeading = (source, heading) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return new RegExp(`^#{2,6}\\s+${escaped}\\s*$`, 'im').test(source)
}

const readRepoFile = (context, relativePath) => {
  if (!context.repoRoot || !relativePath || relativePath === 'none' || relativePath === 'n/a') return null

  const absolutePath = join(context.repoRoot, relativePath)

  if (!existsSync(absolutePath)) return null

  return readFileSync(absolutePath, 'utf8')
}

const relevantFlowContent = task =>
  [
    'summary',
    'why this task exists',
    'goal',
    'dependencies & impact',
    'current repo state',
    'scope',
    'detailed spec',
    'acceptance criteria',
    'verification'
  ]
    .map(section => sectionContent(task, section))
    .join('\n')

const relevantMotionContent = task =>
  [
    'summary',
    'why this task exists',
    'goal',
    'dependencies & impact',
    'current repo state',
    'scope',
    'detailed spec',
    'acceptance criteria',
    'verification'
  ]
    .map(section => sectionContent(task, section))
    .join('\n')

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

const isUiUxImpacted = task => {
  if (task.executionProfile === 'ui-ux') return true
  if (task.uiImpact && UI_IMPACTS.has(task.uiImpact)) return true

  const lowerDomain = task.domain ?? ''

  return UI_DOMAINS.some(domain => lowerDomain.includes(domain))
}

const isBackendDataImpacted = task => {
  if (task.executionProfile === 'backend-data') return true
  if (task.backendImpact && BACKEND_DATA_IMPACTS.has(task.backendImpact)) return true

  const lowerDomain = task.domain ?? ''

  return BACKEND_DATA_DOMAINS.some(domain => lowerDomain.includes(domain))
}

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

const checkUiUxContract = task => {
  if (!isUiUxImpacted(task)) return []
  if (hasSection(task, 'ui/ux contract')) return []

  return [
    finding({
      task,
      rule: 'ui-ux-contract',
      severity: 'warning',
      message:
        'Task appears to touch UI/UX but is missing "## UI/UX Contract". Add TASK_UI_UX_ADDENDUM.md or set UI impact to none with rationale.'
    })
  ]
}

const checkUiReadinessGate = (task, context) => {
  const fields = task.status.fields
  const rawUiReady = fields['UI ready'] ?? fields['UI Ready'] ?? fields['ui ready'] ?? ''
  const uiReady = normalizeStatusValue(rawUiReady)
  const severity = context.changed || context.task ? 'error' : 'warning'
  const findings = []

  if (!isUiUxImpacted(task)) {
    if (rawUiReady && !UI_READY_VALUES.has(uiReady)) {
      findings.push(
        finding({
          task,
          rule: 'ui-readiness-gate',
          severity,
          line: task.status.fieldLines['UI ready'] ?? task.status.fieldLines['UI Ready'],
          message: `UI ready must be one of yes, no or n/a. Received "${rawUiReady}".`
        })
      )
    }

    return findings
  }

  if (!rawUiReady) {
    return [
      finding({
        task,
        rule: 'ui-readiness-gate',
        severity: 'warning',
        line: task.status.hasStatus ? task.status.startLine : undefined,
        message:
          'UI task should declare `UI ready: yes|no|n/a` in ## Status. Use `no` until wireframe, implementation mapping, GVC plan and decision log are ready.'
      })
    ]
  }

  if (!UI_READY_VALUES.has(uiReady)) {
    return [
      finding({
        task,
        rule: 'ui-readiness-gate',
        severity,
        line: task.status.fieldLines['UI ready'] ?? task.status.fieldLines['UI Ready'],
        message: `UI ready must be one of yes, no or n/a. Received "${rawUiReady}".`
      })
    ]
  }

  if (uiReady !== 'yes') return []

  if (!hasSection(task, 'ui/ux contract')) {
    findings.push(
      finding({
        task,
        rule: 'ui-readiness-gate',
        severity,
        message: '`UI ready: yes` requires a completed "## UI/UX Contract".'
      })
    )
  } else {
    const contract = sectionContent(task, 'ui/ux contract')
    const requiredContractHeadings = ['Implementation mapping', 'GVC scenario plan', 'Design decision log']

    for (const heading of requiredContractHeadings) {
      if (!hasMarkdownHeading(contract, heading)) {
        findings.push(
          finding({
            task,
            rule: 'ui-readiness-gate',
            severity,
            line: sectionLine(task, 'ui/ux contract'),
            message: `\`UI ready: yes\` requires "### ${heading}" inside "## UI/UX Contract".`
          })
        )
      }
    }
  }

  const wireframe = stripStatusValue(fields.Wireframe ?? fields.wireframe ?? '')
  const wireframeSource = readRepoFile(context, wireframe)

  if (!wireframeSource) {
    findings.push(
      finding({
        task,
        rule: 'ui-readiness-gate',
        severity,
        line: task.status.fieldLines.Wireframe ?? task.status.fieldLines.wireframe,
        message: '`UI ready: yes` requires an existing wireframe file.'
      })
    )
  } else {
    for (const heading of ['Implementation Mapping', 'GVC Scenario Plan', 'Design Decision Log']) {
      if (!hasMarkdownHeading(wireframeSource, heading)) {
        findings.push(
          finding({
            task,
            rule: 'ui-readiness-gate',
            severity,
            line: task.status.fieldLines.Wireframe ?? task.status.fieldLines.wireframe,
            message: `\`UI ready: yes\` requires "${heading}" in the wireframe file.`
          })
        )
      }
    }
  }

  const flow = stripStatusValue(fields.Flow ?? fields.flow ?? '')
  const flowSource = readRepoFile(context, flow)

  if (flow && !['none', 'n/a'].includes(flow.toLowerCase())) {
    if (!flowSource) {
      findings.push(
        finding({
          task,
          rule: 'ui-readiness-gate',
          severity,
          line: task.status.fieldLines.Flow ?? task.status.fieldLines.flow,
          message: '`UI ready: yes` requires the declared flow contract file to exist.'
        })
      )
    } else {
      for (const heading of ['GVC Scenario Plan', 'Design Decision Log']) {
        if (!hasMarkdownHeading(flowSource, heading)) {
          findings.push(
            finding({
              task,
              rule: 'ui-readiness-gate',
              severity,
              line: task.status.fieldLines.Flow ?? task.status.fieldLines.flow,
              message: `\`UI ready: yes\` requires "${heading}" in the flow contract file.`
            })
          )
        }
      }
    }
  }

  const motion = stripStatusValue(fields.Motion ?? fields.motion ?? '')
  const motionSource = readRepoFile(context, motion)

  if (motion && !['none', 'n/a'].includes(motion.toLowerCase())) {
    if (!motionSource) {
      findings.push(
        finding({
          task,
          rule: 'ui-readiness-gate',
          severity,
          line: task.status.fieldLines.Motion ?? task.status.fieldLines.motion,
          message: '`UI ready: yes` requires the declared motion contract file to exist.'
        })
      )
    } else {
      for (const heading of ['GVC / Micro Evidence', 'Design Decision Log']) {
        if (!hasMarkdownHeading(motionSource, heading)) {
          findings.push(
            finding({
              task,
              rule: 'ui-readiness-gate',
              severity,
              line: task.status.fieldLines.Motion ?? task.status.fieldLines.motion,
              message: `\`UI ready: yes\` requires "${heading}" in the motion contract file.`
            })
          )
        }
      }
    }
  }

  return findings
}

const checkUiWireframeContract = (task, context) => {
  if (!isUiUxImpacted(task)) return []

  const rawWireframe = task.status.fields.Wireframe ?? task.status.fields.wireframe ?? ''
  const wireframe = rawWireframe.replace(/^`(.+)`$/, '$1').trim()
  const severity = context.changed || context.task ? 'error' : 'warning'

  if (!wireframe || wireframe === 'none' || wireframe === 'n/a') {
    return [
      finding({
        task,
        rule: 'ui-wireframe-contract',
        severity,
        line: task.status.hasStatus ? task.status.startLine : undefined,
        message:
          'UI task must declare `Wireframe: docs/ui/wireframes/...` in ## Status before implementation. Create/register the wireframe or set UI impact to none with rationale.'
      })
    ]
  }

  if (!WIREFRAME_PATH_RE.test(wireframe)) {
    return [
      finding({
        task,
        rule: 'ui-wireframe-contract',
        severity,
        line: task.status.fieldLines.Wireframe ?? task.status.fieldLines.wireframe,
        message: `Wireframe path "${wireframe}" must point to docs/ui/wireframes/*.md.`
      })
    ]
  }

  if (context.repoRoot && !existsSync(join(context.repoRoot, wireframe))) {
    return [
      finding({
        task,
        rule: 'ui-wireframe-contract',
        severity,
        line: task.status.fieldLines.Wireframe ?? task.status.fieldLines.wireframe,
        message: `Wireframe file "${wireframe}" does not exist. Create it before implementation or correct the path.`
      })
    ]
  }

  return []
}

const checkUiFlowContract = (task, context) => {
  if (!isUiUxImpacted(task)) return []

  const rawFlow = task.status.fields.Flow ?? task.status.fields.flow ?? ''
  const flow = rawFlow.replace(/^`(.+)`$/, '$1').trim()
  const severity = context.changed || context.task ? 'error' : 'warning'
  const flowRequired = task.uiImpact === 'flow'
  const likelyNeedsFlow = FLOW_TRIGGER_RE.test(relevantFlowContent(task))

  if (!flow || flow === 'none' || flow === 'n/a') {
    if (flowRequired) {
      return [
        finding({
          task,
          rule: 'ui-flow-contract',
          severity,
          line: task.status.hasStatus ? task.status.startLine : undefined,
          message:
            'UI flow task must declare `Flow: docs/ui/flows/...` in ## Status before implementation. Create/register the flow contract or reduce UI impact with rationale.'
        })
      ]
    }

    if (likelyNeedsFlow) {
      return [
        finding({
          task,
          rule: 'ui-flow-contract',
          severity: 'warning',
          line: task.status.hasStatus ? task.status.startLine : undefined,
          message:
            'Task text references modal/drawer/sidecar/popover/navigation behavior but Flow is none. Add a flow contract if multiple surfaces or route transitions are in scope.'
        })
      ]
    }

    return []
  }

  if (!FLOW_PATH_RE.test(flow)) {
    return [
      finding({
        task,
        rule: 'ui-flow-contract',
        severity,
        line: task.status.fieldLines.Flow ?? task.status.fieldLines.flow,
        message: `Flow path "${flow}" must point to docs/ui/flows/*.md.`
      })
    ]
  }

  if (context.repoRoot && !existsSync(join(context.repoRoot, flow))) {
    return [
      finding({
        task,
        rule: 'ui-flow-contract',
        severity,
        line: task.status.fieldLines.Flow ?? task.status.fieldLines.flow,
        message: `Flow file "${flow}" does not exist. Create it before implementation or correct the path.`
      })
    ]
  }

  return []
}

const checkUiMotionContract = (task, context) => {
  if (!isUiUxImpacted(task)) return []

  const rawMotion = task.status.fields.Motion ?? task.status.fields.motion ?? ''
  const motion = rawMotion.replace(/^`(.+)`$/, '$1').trim()
  const severity = context.changed || context.task ? 'error' : 'warning'
  const motionRequired = task.uiImpact === 'motion'
  const likelyNeedsMotion = MOTION_TRIGGER_RE.test(relevantMotionContent(task))

  if (!motion || motion === 'none' || motion === 'n/a') {
    if (motionRequired) {
      return [
        finding({
          task,
          rule: 'ui-motion-contract',
          severity,
          line: task.status.hasStatus ? task.status.startLine : undefined,
          message:
            'UI motion task must declare `Motion: docs/ui/motion/...` in ## Status before implementation. Create/register the motion contract or reduce UI impact with rationale.'
        })
      ]
    }

    if (likelyNeedsMotion) {
      return [
        finding({
          task,
          rule: 'ui-motion-contract',
          severity: 'warning',
          line: task.status.hasStatus ? task.status.startLine : undefined,
          message:
            'Task text references motion/microinteraction/animation behavior but Motion is none. Add a motion contract if non-trivial motion or interaction feedback is in scope.'
        })
      ]
    }

    return []
  }

  if (!MOTION_PATH_RE.test(motion)) {
    return [
      finding({
        task,
        rule: 'ui-motion-contract',
        severity,
        line: task.status.fieldLines.Motion ?? task.status.fieldLines.motion,
        message: `Motion path "${motion}" must point to docs/ui/motion/*.md.`
      })
    ]
  }

  if (context.repoRoot && !existsSync(join(context.repoRoot, motion))) {
    return [
      finding({
        task,
        rule: 'ui-motion-contract',
        severity,
        line: task.status.fieldLines.Motion ?? task.status.fieldLines.motion,
        message: `Motion file "${motion}" does not exist. Create it before implementation or correct the path.`
      })
    ]
  }

  return []
}

const checkBackendDataContract = task => {
  if (!isBackendDataImpacted(task)) return []
  if (hasSection(task, 'backend/data contract')) return []

  return [
    finding({
      task,
      rule: 'backend-data-contract',
      severity: 'warning',
      message:
        'Task appears to touch backend/data but is missing "## Backend/Data Contract". Add TASK_BACKEND_DATA_ADDENDUM.md or set Backend impact to none with rationale.'
    })
  ]
}

const isHybridProfileTask = task => {
  return task.uiImpact && task.uiImpact !== 'none' && task.backendImpact && task.backendImpact !== 'none'
}

const checkHybridProfileJustification = task => {
  if (!isHybridProfileTask(task)) return []
  if (hasSection(task, 'hybrid execution justification')) return []

  return [
    finding({
      task,
      rule: 'hybrid-profile-justification',
      severity: 'warning',
      message:
        'Task mixes UI impact and Backend impact but is missing "## Hybrid Execution Justification". Prefer split into a backend-data foundation plus ui-ux consumer, or justify the intentional hybrid scope.'
    })
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
  },
  {
    id: 'ui-ux-contract',
    appliesTo: task => task.kind === 'template',
    check: checkUiUxContract
  },
  {
    id: 'ui-readiness-gate',
    appliesTo: task => task.kind === 'template',
    check: checkUiReadinessGate
  },
  {
    id: 'ui-wireframe-contract',
    appliesTo: task => task.kind === 'template',
    check: checkUiWireframeContract
  },
  {
    id: 'ui-flow-contract',
    appliesTo: task => task.kind === 'template',
    check: checkUiFlowContract
  },
  {
    id: 'ui-motion-contract',
    appliesTo: task => task.kind === 'template',
    check: checkUiMotionContract
  },
  {
    id: 'backend-data-contract',
    appliesTo: task => task.kind === 'template',
    check: checkBackendDataContract
  },
  {
    id: 'hybrid-profile-justification',
    appliesTo: task => task.kind === 'template' && ACTIVE_TASK_LIFECYCLES.has(task.folderLifecycle),
    check: checkHybridProfileJustification
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
