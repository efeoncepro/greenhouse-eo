import { existsSync, readdirSync, readFileSync } from 'node:fs'
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
/*
 * Se comparan por SEGMENTO, no por subcadena. Los dominios de UI reales se enumeran completos
 * —`ui-platform` y `ui-ux` incluidos— porque antes entraban de rebote por el `includes` y al cerrar
 * ese agujero habrian dejado de detectarse. `domain.includes('ui')` marcaba como UI a cualquier
 * dominio con «ui» adentro — `build-tooling` disparaba el gate por el «ui» de *b·ui·ld*, y con él
 * `guide`, `suite` o `circuit`. El efecto no era cosmético: una task de tooling quedaba obligada a
 * declarar wireframe, flow y contrato de UI.
 */
const UI_DOMAINS = ['ui', 'ui-ux', 'ui-platform', 'design-system', 'motion', 'accessibility']

const splitDomainSegments = domain =>
  domain
    // Los dominios reales vienen decorados —`` `cross-domain` (`people|hr|ui`) ``—, asi que el
    // separador incluye backticks y parentesis. Sin ellos el ultimo segmento queda como ``ui`)`` y
    // deja de matchear: fue el falso NEGATIVO que este mismo fix introdujo en TASK-969.
    .split(/[|,/()`\s]+/)
    .map(part => part.trim())
    .filter(Boolean)

const UI_IMPACTS = new Set(['copy', 'layout', 'interaction', 'motion', 'primitive', 'flow'])
const UI_READY_VALUES = new Set(['yes', 'no', 'n/a', 'na'])
const MODULAR_PLACEMENT_ADOPTION_ID = 1376
const PREMIUM_UI_READINESS_ADOPTION_ID = 1453
const PREMIUM_DIRECTION_MODES = new Set(['source-led', 'repo-native-benchmark'])

const TOPOLOGY_IMPACTS = new Set([
  'none',
  'portal',
  'public',
  'api',
  'worker',
  'domain-package',
  'ui-package',
  'tooling',
  'cross-runtime'
])

const FUTURE_CANDIDATE_HOMES = new Set([
  'portal',
  'public',
  'api',
  'worker',
  'domain-package',
  'ui-package',
  'remain-shared',
  'undecided'
])

const MODULAR_PLACEMENT_FIELDS = [
  'Topology impact',
  'Current home',
  'Future candidate home',
  'Boundary',
  'Server/browser split',
  'Build impact',
  'Extraction blocker'
]

const PLACEHOLDER_VALUE_RE = /(?:\[.*\]|<.*>|\b(?:tbd|todo|placeholder|verificar)\b)/i

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

const BACKEND_DATA_IMPACTS = new Set([
  'api',
  'db',
  'migration',
  'command',
  'reader',
  'sync',
  'cron',
  'webhook',
  'integration'
])

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

const markdownHeadingBody = (source, heading) => {
  const lines = source.split('\n')
  const normalizedHeading = heading.trim().toLowerCase()
  let start = -1
  let level = 0

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{2,6})\s+(.+?)\s*$/)

    const candidate = match?.[2].trim().toLowerCase() ?? ''

    if (!match || (candidate !== normalizedHeading && !candidate.startsWith(`${normalizedHeading} `))) continue
    start = index + 1
    level = match[1].length
    break
  }

  if (start < 0) return null

  let end = lines.length

  for (let index = start; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{2,6})\s+/)

    if (match && match[1].length <= level) {
      end = index
      break
    }
  }

  return lines.slice(start, end).join('\n').trim()
}

const markdownListField = (source, field) => {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`^\\s*-\\s+${escaped}:\\s*(.*?)\\s*$`, 'im'))

  return match ? stripStatusValue(match[1]).trim() : ''
}

const extractRepoAssetPath = value => {
  const match = value.match(/(?:^|[\s;,(])((?:docs|src|public|scripts)\/[^`\s;,)]*\.(?:md|png|jpe?g|webp|svg|html?))/i)

  return match?.[1] ?? ''
}

const hasSubstantiveMarkdown = body => {
  if (!body) return false

  const meaningful = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ')
    .replace(/[`*_>#|[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  /*
   * Detecta contenido que es sólo un placeholder — SIN confundirse con prosa en español.
   *
   * La versión anterior era `/^(?:tbd|todo|placeholder|verificar|n\/a)(?:\W|$)/i`, y el `i` la volvía
   * un falso positivo garantizado: "Todo el copy visible sale de…" y "Verificar el contraste…" son
   * arranques naturales de un párrafo en español, y una sección de 1.500 caracteres perfectamente
   * substantiva se reportaba como shell vacío. Detectado en TASK-1558, donde el Copy Ledger completo
   * fallaba el gate por empezar con la palabra "Todo".
   *
   * Dos reglas en vez de una, para no perder cobertura:
   *
   * 1. Prefijo en MAYÚSCULAS (`TODO:`, `TBD`, `FIXME`) — así se escribe un stub por convención, y
   *    ninguna palabra española normal aparece así. Sigue atrapando "TODO: definir cuando exista la
   *    dirección visual", que es exactamente lo que la regla vino a frenar.
   * 2. Cualquier caso, pero SÓLO si el placeholder es todo el contenido (`n/a`, `Placeholder.`).
   *    Un párrafo que empieza con una de esas palabras y sigue con algo real no es un placeholder.
   */
  const placeholderPrefix = /^(?:TODO|TBD|FIXME|PLACEHOLDER)\b/.test(meaningful)
  const placeholderWhole = /^(?:tbd|todo|placeholder|verificar|n\/a)\W*$/i.test(meaningful)

  return meaningful.length >= 36 && !placeholderPrefix && !placeholderWhole
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

  const segments = splitDomainSegments(task.domain ?? '')

  return segments.some(segment => UI_DOMAINS.includes(segment))
}

const isBackendDataImpacted = task => {
  if (task.executionProfile === 'backend-data') return true
  if (task.backendImpact && BACKEND_DATA_IMPACTS.has(task.backendImpact)) return true

  const lowerDomain = task.domain ?? ''

  return BACKEND_DATA_DOMAINS.some(domain => lowerDomain.includes(domain))
}

const parseListFields = content => {
  const fields = new Map()

  for (const line of content.split('\n')) {
    const match = line.match(/^\s*-\s+([^:]+):\s*(.*?)\s*$/)

    if (!match) continue
    fields.set(match[1].trim().toLowerCase(), stripStatusValue(match[2]))
  }

  return fields
}

const checkModularPlacementContract = (task, context) => {
  if (!task.idNumber || task.idNumber < MODULAR_PLACEMENT_ADOPTION_ID) return []

  const section = task.sections.get('modular placement contract')
  const severity = blockingSeverity(context)

  if (!section) {
    return [
      finding({
        task,
        rule: 'modular-placement-contract',
        severity,
        message:
          'Missing "## Modular Placement Contract". Follow docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md.'
      })
    ]
  }

  const fields = parseListFields(section.content)
  const findings = []

  for (const field of MODULAR_PLACEMENT_FIELDS) {
    const value = fields.get(field.toLowerCase()) ?? ''

    if (!value) {
      findings.push(
        finding({
          task,
          rule: 'modular-placement-contract',
          severity,
          line: section.line,
          message: `Modular Placement Contract is missing "${field}".`
        })
      )
      continue
    }

    if (PLACEHOLDER_VALUE_RE.test(value)) {
      findings.push(
        finding({
          task,
          rule: 'modular-placement-contract',
          severity,
          line: section.line,
          message: `Modular Placement Contract field "${field}" contains a placeholder: "${value}".`
        })
      )
    }
  }

  const topologyImpact = normalizeStatusValue(fields.get('topology impact') ?? '')
  const futureHome = normalizeStatusValue(fields.get('future candidate home') ?? '')

  if (topologyImpact && !TOPOLOGY_IMPACTS.has(topologyImpact)) {
    findings.push(
      finding({
        task,
        rule: 'modular-placement-contract',
        severity,
        line: section.line,
        message: `Topology impact must be one of ${Array.from(TOPOLOGY_IMPACTS).join(', ')}. Received "${topologyImpact}".`
      })
    )
  }

  if (futureHome && !FUTURE_CANDIDATE_HOMES.has(futureHome)) {
    findings.push(
      finding({
        task,
        rule: 'modular-placement-contract',
        severity,
        line: section.line,
        message:
          `Future candidate home must be one of ${Array.from(FUTURE_CANDIDATE_HOMES).join(', ')}. ` +
          `Received "${futureHome}".`
      })
    )
  }

  return findings
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

  const usesBareNa =
    /\bn\/a\b/.test(lowerContent) && !/additive|repo-only|no production runtime impact|sin impacto/.test(lowerContent)

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
      message: `README next-id marker is "${context.readmeNextId.id}" but registry max+1 is "${context.expectedNextId}".`
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

const checkPremiumUiReadiness = (task, context) => {
  if (!task.idNumber || task.idNumber < PREMIUM_UI_READINESS_ADOPTION_ID || !isUiUxImpacted(task)) return []

  const fields = task.status.fields
  const uiReady = normalizeStatusValue(fields['UI ready'] ?? fields['UI Ready'] ?? '')

  if (uiReady !== 'yes') return []

  const severity = blockingSeverity(context)
  const findings = []
  const wireframePath = stripStatusValue(fields.Wireframe ?? fields.wireframe ?? '')
  const wireframeSource = readRepoFile(context, wireframePath)

  if (!wireframeSource) return []

  const addFinding = message => {
    findings.push(
      finding({
        task,
        rule: 'ui-premium-readiness',
        severity,
        line: task.status.fieldLines.Wireframe ?? task.status.fieldLines.wireframe,
        message
      })
    )
  }

  const directionMode = markdownListField(wireframeSource, 'Visual direction mode').toLowerCase()
  const assetValue = markdownListField(wireframeSource, 'Product Design asset')
  const assetPath = extractRepoAssetPath(assetValue)

  if (!PREMIUM_DIRECTION_MODES.has(directionMode)) {
    addFinding('UI ready: yes requires Visual direction mode: source-led|repo-native-benchmark in the wireframe.')
  }

  if (!assetPath) {
    addFinding('UI ready: yes requires Product Design asset to reference a durable repo file.')
  } else if (!context.repoRoot || !existsSync(join(context.repoRoot, assetPath))) {
    addFinding(`UI ready: yes references missing visual source \"${assetPath}\".`)
  }

  const requiredWireframeSections = [
    'Desktop Target',
    'Mobile Target',
    'Action Hierarchy',
    'Visual Fidelity Mapping',
    'Copy Ledger',
    'State Copy',
    'Accessibility Contract',
    'Implementation Mapping',
    'GVC Scenario Plan',
    'Design Decision Log'
  ]

  for (const heading of requiredWireframeSections) {
    const body = markdownHeadingBody(wireframeSource, heading)

    if (!hasSubstantiveMarkdown(body)) {
      addFinding(
        `UI ready: yes requires substantive \"## ${heading}\" content in the wireframe, not only a heading/table shell.`
      )
    }
  }

  const stateCopy = markdownHeadingBody(wireframeSource, 'State Copy') ?? ''
  const normalizedStateCopy = stateCopy.replace(/`/g, '').toLowerCase()

  for (const state of ['ready', 'loading', 'empty', 'partial', 'error', 'denied']) {
    const stateRow = new RegExp(`\\|\\s*${state}\\s*\\|`)

    if (!stateRow.test(normalizedStateCopy)) {
      addFinding(`State Copy must define the ${state} state with visible copy and recovery behavior.`)
    }
  }

  const gvcPlan = markdownHeadingBody(wireframeSource, 'GVC Scenario Plan') ?? ''
  const normalizedGvcPlan = gvcPlan.replace(/`/g, '').toLowerCase()

  const gvcRequirements = [
    ['Quality profile: premium', /quality profile:\s*premium/],
    ['desktop evidence', /\b(?:desktop|1440|1280|2048)\b/],
    ['390px mobile evidence', /\b390(?:px\b|x\d+|\b)/],
    ['review dossier', /review dossier/],
    ['baseline decision', /baseline/],
    ['scroll-width evidence', /scroll-width|scrollwidth/]
  ]

  for (const [label, pattern] of gvcRequirements) {
    if (!pattern.test(normalizedGvcPlan)) addFinding(`GVC Scenario Plan must declare ${label}.`)
  }

  const contract = sectionContent(task, 'ui/ux contract')
  const contractGvcPlan = markdownHeadingBody(contract, 'GVC scenario plan') ?? ''
  const normalizedContractGvc = contractGvcPlan.replace(/`/g, '').toLowerCase()

  if (!/quality profile:\s*premium/.test(normalizedContractGvc)) {
    addFinding('UI/UX Contract GVC scenario plan must declare Quality profile: premium.')
  }

  if (directionMode === 'repo-native-benchmark' && assetPath.endsWith('.md')) {
    const directionSource = readRepoFile(context, assetPath)

    if (directionSource) {
      for (const heading of ['Decision', 'Desktop target', 'Mobile target', 'Token mapping', 'Anti-patterns']) {
        if (!hasSubstantiveMarkdown(markdownHeadingBody(directionSource, heading))) {
          addFinding(`Repo-native direction \"${assetPath}\" needs substantive \"## ${heading}\".`)
        }
      }
    }
  }

  if (directionMode === 'source-led' && !/surface\s*id|surfaceid/.test(normalizedGvcPlan)) {
    addFinding('Source-led UI requires a baseline surface ID in the GVC Scenario Plan.')
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


/**
 * TASK-1664 — `stale-blocker`
 *
 * 🔴 Cierra una fricción que se acumula sola y que NINGÚN gate detectaba: al completar una task,
 * las que la citaban en `Blocked by` se quedan diciendo que están bloqueadas para siempre.
 *
 * Caso fuente (2026-08-08, EPIC-022): SIETE blockers citados por las hijas del epic estaban todos
 * completos. El backlog llevaba semanas leyéndose como bloqueado sin estarlo — de 15 abiertas, 11
 * se podían tomar ya. Nadie lo vio porque `task:lint` valida la FORMA del campo, no si el blocker
 * sigue vivo, y un `Blocked by` obsoleto no rompe nada: sólo hace que la gente no tome trabajo.
 *
 * Dos direcciones, y la primera es la que importa:
 *
 * 1. **Reversa (error).** Al lintear una task `complete`, busca en TODO el corpus activo quién la
 *    sigue citando. Dispara justo en el momento del cierre — que es el único momento en que el
 *    agente tiene el contexto para arreglarlo y la obligación de hacerlo. Ese es el "sí o sí".
 * 2. **Directa (warning).** Al lintear una task activa, avisa si cita un blocker ya completo. Es
 *    informativa a propósito: no puede romper el trabajo de alguien por una task ajena que otro
 *    cerró mal.
 *
 * La verdad del lifecycle se lee de la CARPETA, no del registry ni del campo `Lifecycle`: la
 * carpeta es lo que el humano ve y lo que `docs:closure-check` ya exige que coincida.
 */
const TASK_REF_RE = /TASK-(\d{3,4})/g

const parseBlockedByIds = task => {
  const raw = task.status?.fields?.['Blocked by'] ?? task.status?.fields?.['blocked by'] ?? ''

  if (!raw) return []
  if (/^`?none`?$/i.test(raw.trim())) return []

  const ids = new Set()

  for (const match of raw.matchAll(TASK_REF_RE)) ids.add(`TASK-${match[1]}`)

  return [...ids]
}

/**
 * ⚠️ Caché a nivel de MÓDULO, no en `context`: `runRules` recibe un objeto nuevo por task
 * (`{ ...context, repoRoot, ... }`), así que memoizar ahí no persiste y el índice se reconstruiría
 * una vez por task — O(n²) sobre un corpus de ~1.600 tasks. Se cachea por `repoRoot` porque los
 * tests crean un repo temporal distinto en cada caso.
 */
const lifecycleIndexCache = new Map()
const activeBlockedByCache = new Map()

const loadTaskLifecycleIndex = context => {
  const cached = lifecycleIndexCache.get(context.repoRoot)

  if (cached) return cached

  const index = new Map()

  for (const lifecycle of ['to-do', 'in-progress', 'complete']) {
    const dir = join(context.repoRoot, 'docs', 'tasks', lifecycle)

    if (!existsSync(dir)) continue

    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith('.md')) continue
      const id = entry.match(/^(TASK-\d{3,4})-/)?.[1]

      if (!id) continue
      index.set(id, { lifecycle, file: `docs/tasks/${lifecycle}/${entry}`, dir })
    }
  }

  lifecycleIndexCache.set(context.repoRoot, index)

  return index
}

const loadActiveBlockedBy = context => {
  const cached = activeBlockedByCache.get(context.repoRoot)

  if (cached) return cached

  const index = loadTaskLifecycleIndex(context)
  const dependents = new Map()

  for (const [id, entry] of index) {
    if (!ACTIVE_TASK_LIFECYCLES.has(entry.lifecycle)) continue

    let source

    try {
      source = readFileSync(join(context.repoRoot, entry.file), 'utf8')
    } catch {
      continue
    }

    const line = source.split(/\r?\n/).find(item => /^-\s*Blocked by:/i.test(item))

    if (!line) continue
    if (/`?none`?\s*$/i.test(line.replace(/^-\s*Blocked by:\s*/i, ''))) continue

    for (const match of line.matchAll(TASK_REF_RE)) {
      const blockerId = `TASK-${match[1]}`

      if (blockerId === id) continue
      if (!dependents.has(blockerId)) dependents.set(blockerId, [])
      dependents.get(blockerId).push({ id, file: entry.file })
    }
  }

  activeBlockedByCache.set(context.repoRoot, dependents)

  return dependents
}

const checkStaleBlocker = (task, context) => {
  if (!task.id) return []

  const findings = []

  // Reversa: esta task está cerrada y alguien todavía la declara como blocker.
  if (task.folderLifecycle === 'complete') {
    const dependents = loadActiveBlockedBy(context).get(task.id) ?? []

    for (const dependent of dependents) {
      findings.push(
        finding({
          task,
          rule: 'stale-blocker',
          severity: blockingSeverity(context),
          message:
            `${task.id} está en complete/ pero ${dependent.id} todavía la declara en "Blocked by" ` +
            `(${dependent.file}). Cerrar una task incluye DESBLOQUEAR a quienes la citaban: quita ` +
            `${task.id} de ese campo (y déjalo en \`none\` si era el único). Un blocker obsoleto no ` +
            'rompe nada — sólo hace que nadie tome trabajo que ya se puede tomar.'
        })
      )
    }

    return findings
  }

  // Directa: esta task activa cita un blocker que ya se cerró.
  if (!ACTIVE_TASK_LIFECYCLES.has(task.folderLifecycle)) return findings

  const index = loadTaskLifecycleIndex(context)
  const line = task.status?.fieldLines?.['Blocked by'] ?? task.status?.fieldLines?.['blocked by']

  for (const blockerId of parseBlockedByIds(task)) {
    const entry = index.get(blockerId)

    if (!entry || entry.lifecycle !== 'complete') continue

    findings.push(
      finding({
        task,
        rule: 'stale-blocker',
        severity: 'warning',
        ...(line ? { line } : {}),
        message:
          `${task.id} declara "Blocked by: ${blockerId}" pero ${blockerId} ya está en complete/. ` +
          'Quítalo del campo; si era el único, déjalo en `none`. Warning y no error a propósito: ' +
          'esta task no debe romperse porque otro cerró mal la suya.'
      })
    )
  }

  return findings
}

export const RULES = [
  {
    id: 'stale-blocker',
    appliesTo: task => task.kind === 'template',
    check: checkStaleBlocker
  },
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
    id: 'modular-placement-contract',
    appliesTo: task => task.kind === 'template' && ACTIVE_TASK_LIFECYCLES.has(task.folderLifecycle),
    check: checkModularPlacementContract
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
    id: 'ui-premium-readiness',
    appliesTo: task => task.kind === 'template',
    check: checkPremiumUiReadiness
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
