#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const VALID_FORMATS = new Set(['human', 'json'])
const VALID_KINDS = new Set(['epic', 'mini'])
const DEFAULT_BASE_BRANCH = 'develop'

const CONFIG = {
  epic: {
    label: 'Epic',
    idPrefix: 'EPIC',
    docsDir: 'epics',
    activeDirs: ['to-do', 'in-progress'],
    lifecycleDirs: ['to-do', 'in-progress', 'complete'],
    registryFile: 'EPIC_ID_REGISTRY.md',
    readmeFile: 'README.md',
    nextIdLabel: 'siguiente ID disponible',
    requiredSections: [
      'status',
      'summary',
      'why this epic exists',
      'outcome',
      'architecture alignment',
      'child tasks',
      'exit criteria',
      'non-goals'
    ],
    requiredStatusFields: ['Lifecycle', 'Priority', 'Impact', 'Effort', 'Status real', 'Domain', 'Owner'],
    requiredCheckboxSections: ['exit criteria'],
    contractAdoptionId: 18
  },
  mini: {
    label: 'Mini task',
    idPrefix: 'MINI',
    docsDir: 'mini-tasks',
    activeDirs: ['to-do', 'in-progress'],
    lifecycleDirs: ['to-do', 'in-progress', 'complete'],
    registryFile: 'MINI_TASK_ID_REGISTRY.md',
    readmeFile: 'README.md',
    nextIdLabel: 'siguiente ID disponible',
    requiredSections: [
      'status',
      'summary',
      'why mini',
      'current state',
      'proposed change',
      'acceptance criteria',
      'verification',
      'notes',
      'follow-ups'
    ],
    requiredStatusFields: ['Lifecycle', 'Priority', 'Impact', 'Effort', 'Domain', 'Type'],
    requiredCheckboxSections: ['acceptance criteria'],
    contractAdoptionId: 5
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const normalizePath = filePath => filePath.split(sep).join('/')

const normalizeHeading = value =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

const stripInlineCode = value => value.trim().replace(/^`(.+)`$/, '$1').trim()

const artifactIdRe = prefix => new RegExp(`${prefix}-\\d{3,}(?:\\.\\d+)?`)

const canonicalFileRe = prefix => new RegExp(`^${prefix}-\\d{3,}-`)

const parseArgs = argv => {
  const options = {
    kind: null,
    format: 'human',
    strict: false,
    changed: false,
    active: false,
    item: null
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--') {
      continue
    }

    if (arg === '--kind') {
      options.kind = argv[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--kind=')) {
      options.kind = arg.slice('--kind='.length)
      continue
    }

    if (arg === '--format') {
      options.format = argv[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length)
      continue
    }

    if (arg === '--strict') {
      options.strict = true
      continue
    }

    if (arg === '--changed') {
      options.changed = true
      continue
    }

    if (arg === '--active') {
      options.active = true
      continue
    }

    if (arg === '--item') {
      options.item = argv[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--item=')) {
      options.item = arg.slice('--item='.length)
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!VALID_KINDS.has(options.kind)) {
    throw new Error(`Invalid --kind "${options.kind}". Expected epic or mini.`)
  }

  if (!VALID_FORMATS.has(options.format)) {
    throw new Error(`Invalid --format "${options.format}". Expected human or json.`)
  }

  const prefix = CONFIG[options.kind].idPrefix

  if (options.item && !new RegExp(`^${prefix}-\\d{3,}(?:\\.\\d+)?$`).test(options.item)) {
    throw new Error(`Invalid --item "${options.item}". Expected ${prefix}-### with 3+ digits.`)
  }

  if (options.changed && options.active) {
    throw new Error('Use either --changed or --active, not both.')
  }

  return options
}

const git = (repoRoot, args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim()

const listMarkdownFiles = dir => {
  if (!existsSync(dir)) return []

  const files = []

  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry)
    const stats = statSync(absolute)

    if (stats.isDirectory()) {
      files.push(...listMarkdownFiles(absolute))
      continue
    }

    if (entry.endsWith('.md')) files.push(absolute)
  }

  return files
}

const listAllFiles = (repoRoot, config) => {
  const root = join(repoRoot, 'docs', config.docsDir)

  return config.lifecycleDirs.flatMap(dir => listMarkdownFiles(join(root, dir))).sort()
}

const listActiveFiles = (repoRoot, config) => {
  const root = join(repoRoot, 'docs', config.docsDir)

  return config.activeDirs.flatMap(dir => listMarkdownFiles(join(root, dir))).sort()
}

const listChangedFiles = (repoRoot, config) => {
  const changed = new Set()
  const docsPath = `docs/${config.docsDir}`

  const baseRef = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : `origin/${DEFAULT_BASE_BRANCH}`

  const addOutput = output => {
    for (const line of output.split('\n')) {
      const trimmed = line.trim()

      if (!trimmed) continue
      if (!new RegExp(`^docs/${config.docsDir}/(to-do|in-progress|complete)/.+\\.md$`).test(trimmed)) continue

      const absolute = join(repoRoot, trimmed)

      if (existsSync(absolute)) changed.add(absolute)
    }
  }

  try {
    addOutput(git(repoRoot, ['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`, '--', docsPath]))
  } catch {
    try {
      addOutput(git(repoRoot, ['diff', '--name-only', '--diff-filter=ACMR', '--', docsPath]))
    } catch {
      // Best-effort local mode.
    }
  }

  for (const args of [
    ['diff', '--name-only', '--diff-filter=ACMR', '--', docsPath],
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', docsPath],
    ['ls-files', '--others', '--exclude-standard', '--', docsPath]
  ]) {
    try {
      addOutput(git(repoRoot, args))
    } catch {
      // Ignore local states that cannot report changed files.
    }
  }

  return Array.from(changed).sort()
}

const lineNumberForOffset = (source, offset) => source.slice(0, offset).split('\n').length

const parseStatus = source => {
  const normalized = source.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const start = lines.findIndex(line => /^##\s+Status\s*$/i.test(line))
  const fields = {}
  const fieldLines = {}

  if (start === -1) return { fields, fieldLines, hasStatus: false }

  let current = null

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^##\s+/.test(line)) break

    const match = line.match(/^-\s+([^:]+):\s*(.*)$/)

    if (match) {
      current = match[1].trim()
      fields[current] = stripInlineCode(match[2] ?? '')
      fieldLines[current] = index + 1
      continue
    }

    if (current && line.trim()) {
      fields[current] = `${fields[current]}\n${line.trim()}`
    }
  }

  return { fields, fieldLines, hasStatus: true }
}

const parseSections = source => {
  const normalized = source.replace(/\r\n/g, '\n')
  const sections = new Map()
  const matches = Array.from(normalized.matchAll(/^##\s+(.+?)\s*$/gm))

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const raw = match[1]
    const key = normalizeHeading(raw)
    const start = match.index + match[0].length
    const end = matches[index + 1]?.index ?? normalized.length

    sections.set(key, {
      raw,
      line: lineNumberForOffset(normalized, match.index),
      content: normalized.slice(start, end).trim()
    })
  }

  return sections
}

const detectLifecycle = relativePath => {
  const parts = relativePath.split('/')
  const docsIndex = parts.indexOf('docs')
  const lifecycle = docsIndex >= 0 ? parts[docsIndex + 2] : null

  return ['to-do', 'in-progress', 'complete'].includes(lifecycle) ? lifecycle : null
}

const parseArtifact = ({ filePath, repoRoot, source, config }) => {
  const relativePath = normalizePath(relative(repoRoot, filePath))
  const filename = basename(filePath)
  const id = filename.match(artifactIdRe(config.idPrefix))?.[0] ?? null
  const idNumber = id ? Number(id.match(new RegExp(`^${config.idPrefix}-(\\d{3,})`))?.[1] ?? 0) : null
  const status = parseStatus(source)
  const sections = parseSections(source)
  const lifecycle = status.fields.Lifecycle ?? status.fields.lifecycle ?? null

  return {
    file: relativePath,
    filePath,
    filename,
    id,
    idNumber,
    kind: canonicalFileRe(config.idPrefix).test(filename) && status.hasStatus ? 'canonical' : 'legacy',
    folderLifecycle: detectLifecycle(relativePath),
    lifecycle: lifecycle ? stripInlineCode(lifecycle) : null,
    status,
    sections,
    source: source.replace(/\r\n/g, '\n')
  }
}

const parseRegistry = (source, config) => {
  const rows = new Map()
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const prefix = config.idPrefix

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const tableMatch = line.match(new RegExp(`^\\|\\s*\`(${prefix}-\\d{3,}(?:\\.\\d+)?)\`\\s*\\|\\s*\`?([^\`|]+)\`?\\s*\\|\\s*\`([^\`]+)\`\\s*\\|`))
    const bulletMatch = line.match(new RegExp(`^-\\s+\`(${prefix}-\\d{3,}(?:\\.\\d+)?)\`\\s+asignado`))

    if (tableMatch) {
      rows.set(tableMatch[1], {
        id: tableMatch[1],
        lifecycle: stripInlineCode(tableMatch[2]),
        file: tableMatch[3],
        line: index + 1
      })
      continue
    }

    if (bulletMatch) {
      rows.set(bulletMatch[1], {
        id: bulletMatch[1],
        lifecycle: null,
        file: null,
        line: index + 1
      })
    }
  }

  return rows
}

const parseNextId = (source, config) => {
  const normalized = source.replace(/\r\n/g, '\n')
  const inlineMatch = normalized.match(new RegExp(`${config.nextIdLabel}:\\s*\`(${config.idPrefix}-(\\d{3,}))\``, 'i'))

  const headingMatch = normalized.match(
    new RegExp(`${config.nextIdLabel}[\\s\\S]{0,120}?\`(${config.idPrefix}-(\\d{3,}))\``, 'i')
  )

  const match = inlineMatch ?? headingMatch

  if (!match) return null

  return {
    id: match[1],
    numeric: Number(match[2]),
    line: lineNumberForOffset(normalized, match.index)
  }
}

const deriveNextId = (registryRows, config) => {
  let max = 0

  for (const id of registryRows.keys()) {
    const match = id.match(new RegExp(`^${config.idPrefix}-(\\d{3,})$`))

    if (!match) continue
    max = Math.max(max, Number(match[1]))
  }

  return `${config.idPrefix}-${String(max + 1).padStart(3, '0')}`
}

const loadContext = (repoRoot, config) => {
  const docsRoot = join(repoRoot, 'docs', config.docsDir)
  const registryPath = join(docsRoot, config.registryFile)
  const readmePath = join(docsRoot, config.readmeFile)
  const registryRows = parseRegistry(readFileSync(registryPath, 'utf8'), config)
  const readmeNextId = parseNextId(readFileSync(readmePath, 'utf8'), config)
  const registryNextId = parseNextId(readFileSync(registryPath, 'utf8'), config)

  return {
    registryRows,
    readmeNextId,
    registryNextId,
    expectedNextId: deriveNextId(registryRows, config)
  }
}

const severity = context => (context.enforceErrors ? 'error' : 'warning')

const finding = ({ artifact, rule, severity: findingSeverity, message, line }) => ({
  file: artifact.file,
  rule,
  severity: findingSeverity,
  ...(line ? { line } : {}),
  message
})

const hasCheckbox = content => /- \[[ xX]\]\s+\S+/.test(content)

const lintArtifact = (artifact, config, context) => {
  const findings = []

  if (artifact.kind !== 'canonical') return findings

  for (const section of config.requiredSections) {
    if (!artifact.sections.has(section)) {
      findings.push(
        finding({
          artifact,
          rule: 'required-sections',
          severity: severity(context),
          message: `Missing required section "## ${section}".`
        })
      )
    }
  }

  for (const field of config.requiredStatusFields) {
    if (!artifact.status.fields[field]) {
      findings.push(
        finding({
          artifact,
          rule: 'required-status-fields',
          severity: severity(context),
          line: artifact.status.hasStatus ? undefined : 1,
          message: `Missing Status field "${field}".`
        })
      )
    }
  }

  if (artifact.lifecycle && artifact.folderLifecycle && artifact.lifecycle !== artifact.folderLifecycle) {
    findings.push(
      finding({
        artifact,
        rule: 'lifecycle-folder-parity',
        severity: severity(context),
        line: artifact.status.fieldLines.Lifecycle,
        message: `Lifecycle is "${artifact.lifecycle}" but file lives under "${artifact.folderLifecycle}".`
      })
    )
  }

  for (const section of config.requiredCheckboxSections) {
    const content = artifact.sections.get(section)?.content ?? ''

    if (!hasCheckbox(content)) {
      findings.push(
        finding({
          artifact,
          rule: 'required-checkboxes',
          severity: severity(context),
          line: artifact.sections.get(section)?.line,
          message: `"## ${section}" must include at least one checkbox item.`
        })
      )
    }
  }

  if (artifact.id) {
    const row = context.registryRows.get(artifact.id)

    if (!row) {
      findings.push(
        finding({
          artifact,
          rule: 'registry-parity',
          severity: 'warning',
          message: `${artifact.id} is missing from docs/${config.docsDir}/${config.registryFile}.`
        })
      )
    } else {
      if (row.lifecycle && artifact.lifecycle && row.lifecycle !== artifact.lifecycle) {
        findings.push(
          finding({
            artifact,
            rule: 'registry-parity',
            severity: 'warning',
            line: row.line,
            message: `${artifact.id} lifecycle is "${artifact.lifecycle}" but registry says "${row.lifecycle}".`
          })
        )
      }

      if (row.file && row.file !== artifact.file) {
        findings.push(
          finding({
            artifact,
            rule: 'registry-parity',
            severity: 'warning',
            line: row.line,
            message: `${artifact.id} file path is "${artifact.file}" but registry points to "${row.file}".`
          })
        )
      }
    }
  }

  return findings
}

const lintNextId = (config, context) => {
  const findings = []

  const virtualArtifact = {
    file: `docs/${config.docsDir}/${config.readmeFile}`
  }

  if (context.readmeNextId && context.readmeNextId.id !== context.expectedNextId) {
    findings.push(
      finding({
        artifact: virtualArtifact,
        rule: 'next-id-marker',
        severity: 'warning',
        line: context.readmeNextId.line,
        message: `README next id is "${context.readmeNextId.id}" but registry implies "${context.expectedNextId}".`
      })
    )
  }

  if (context.registryNextId && context.registryNextId.id !== context.expectedNextId) {
    findings.push(
      finding({
        artifact: {
          file: `docs/${config.docsDir}/${config.registryFile}`
        },
        rule: 'next-id-marker',
        severity: 'warning',
        line: context.registryNextId.line,
        message: `Registry next id is "${context.registryNextId.id}" but assigned IDs imply "${context.expectedNextId}".`
      })
    )
  }

  return findings
}

export const lintOperationalArtifacts = ({ repoRoot, options }) => {
  const config = CONFIG[options.kind]
  const context = loadContext(repoRoot, config)
  const enforceErrors = options.changed || options.active || Boolean(options.item)

  const files = options.item
    ? listAllFiles(repoRoot, config)
    : options.changed
      ? listChangedFiles(repoRoot, config)
      : options.active
        ? listActiveFiles(repoRoot, config)
        : listAllFiles(repoRoot, config)

  const selectedFiles = options.item
    ? files.filter(file => file.includes(`${options.item}-`) || file.endsWith(`${options.item}.md`))
    : files

  const artifacts = selectedFiles.map(filePath =>
    parseArtifact({
      filePath,
      repoRoot,
      source: readFileSync(filePath, 'utf8'),
      config
    })
  )

  const findings = []
  const skipCompletedHistory = !options.changed && !options.active && !options.item
  const skipPreAdoptionActive = !options.changed && !options.item
  let completedHistoricalArtifacts = 0
  let preAdoptionActiveArtifacts = 0

  for (const artifact of artifacts) {
    if (skipCompletedHistory && artifact.folderLifecycle === 'complete') {
      completedHistoricalArtifacts += 1
      continue
    }

    if (skipPreAdoptionActive && artifact.idNumber && artifact.idNumber < config.contractAdoptionId) {
      preAdoptionActiveArtifacts += 1
      continue
    }

    findings.push(...lintArtifact(artifact, config, { ...context, enforceErrors }))
  }

  if (!options.item) findings.push(...lintNextId(config, context))

  const errors = findings.filter(item => item.severity === 'error')
  const warnings = findings.filter(item => item.severity === 'warning')

  return {
    errors,
    warnings,
    summary: {
      kind: options.kind,
      artifactsScanned: artifacts.length,
      canonicalArtifacts: artifacts.filter(artifact => artifact.kind === 'canonical').length,
      legacyArtifacts: artifacts.filter(artifact => artifact.kind === 'legacy').length,
      completedHistoricalArtifacts,
      preAdoptionActiveArtifacts,
      errors: errors.length,
      warnings: warnings.length,
      strict: options.strict,
      changed: options.changed,
      active: options.active,
      enforceErrors,
      item: options.item
    }
  }
}

const formatFinding = item => {
  const location = item.line ? `${item.file}:${item.line}` : item.file

  return `${item.severity.toUpperCase()} ${location} ${item.rule} — ${item.message}`
}

const printHuman = (result, config) => {
  const { summary, errors, warnings } = result

  console.log(`${config.label} lint summary`)
  console.log(
    `- scanned=${summary.artifactsScanned} canonical=${summary.canonicalArtifacts} legacy=${summary.legacyArtifacts} ` +
      `completedHistorical=${summary.completedHistoricalArtifacts} preAdoptionActive=${summary.preAdoptionActiveArtifacts} ` +
      `errors=${summary.errors} warnings=${summary.warnings}`
  )

  if (errors.length > 0) {
    console.log('\nErrors')
    for (const item of errors) console.log(`- ${formatFinding(item)}`)
  }

  if (warnings.length > 0) {
    console.log('\nWarnings')
    for (const item of warnings) console.log(`- ${formatFinding(item)}`)
  }
}

const main = () => {
  const repoRoot = resolve(__dirname, '..', '..')
  const options = parseArgs(process.argv.slice(2))
  const config = CONFIG[options.kind]
  const result = lintOperationalArtifacts({ repoRoot, options })

  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result, config)
  }

  if (result.errors.length > 0 || (options.strict && result.warnings.length > 0)) {
    process.exit(1)
  }
}

if (process.argv[1] === __filename) {
  try {
    main()
  } catch (error) {
    console.error(`[ops-artifact-lint] ${error.message}`)
    process.exit(1)
  }
}
