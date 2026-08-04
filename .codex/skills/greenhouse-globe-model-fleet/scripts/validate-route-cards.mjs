#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repoRoot = resolve(skillRoot, '..', '..', '..')
const repositoryRoutesDir = join(repoRoot, 'docs', 'architecture', 'creative-studio', 'model-fleet', 'routes')
const bundledRoutesDir = join(skillRoot, 'references', 'routes')
const schemaPath = join(skillRoot, 'references', 'route-card.schema.json')
const args = process.argv.slice(2)
const strictFreshness = args.includes('--strict-freshness')
const asOfArgIndex = args.indexOf('--as-of')
const asOfText = asOfArgIndex >= 0 ? args[asOfArgIndex + 1] : new Date().toISOString().slice(0, 10)
const routesDirArgIndex = args.indexOf('--routes-dir')
const routesDir = resolve(routesDirArgIndex >= 0 ? args[routesDirArgIndex + 1] : (existsSync(repositoryRoutesDir) ? repositoryRoutesDir : bundledRoutesDir))
const dayMs = 86_400_000

const requiredCables = [
  'provider_supported',
  'contract_declared',
  'adapter_wired',
  'transport_verified',
  'output_verified',
  'billing_verified',
  'rights_verified',
  'evaluated',
  'canary_passed',
  'promoted',
  'available',
]

const edgeStates = new Set([
  'verified',
  'proposed',
  'wired',
  'not_started',
  'blocked',
  'unsupported',
  'unknown',
  'stale',
  'gated',
  'not_promoted',
  'available',
])
const lifecycleStates = new Set(['gated', 'not_promoted', 'available', 'unsupported'])
const providerSurfaceStates = new Set(['early_access', 'deferred', 'unsupported', 'candidate'])
const checklistStates = new Set(['open', 'blocked', 'verified', 'deferred'])
const evidenceAuthorities = new Set(['provider_primary', 'runtime_primary', 'repo_primary', 'secondary'])
const identityStates = new Set(['resolved', 'unknown'])
const failures = []
const warnings = []
const scannedFiles = new Set()
const reportedSecretFindings = new Set()

const fail = (file, message) => failures.push(`${file}: ${message}`)
const warn = (file, message) => warnings.push(`${file}: ${message}`)
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0
const isIsoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const asOfMs = isIsoDate(asOfText) ? Date.parse(`${asOfText}T00:00:00Z`) : NaN

if (!Number.isFinite(asOfMs)) {
  console.error(`✗ --as-of must be an ISO date (YYYY-MM-DD): ${asOfText}`)
  process.exit(2)
}

const dateMs = value => Date.parse(`${value}T00:00:00Z`)
const ageDays = value => Math.floor((asOfMs - dateMs(value)) / dayMs)
const addDays = (value, days) => new Date(dateMs(value) + days * dayMs).toISOString().slice(0, 10)

const filesIn = root => {
  if (!existsSync(root)) return []
  const visit = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return visit(path)
    return entry.isFile() ? [path] : []
  })
  return visit(root).sort()
}

const schemaTypeMatches = (value, type) => {
  if (type === 'object') return isObject(value)
  if (type === 'array') return Array.isArray(value)
  if (type === 'string') return typeof value === 'string'
  if (type === 'integer') return Number.isInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (type === 'boolean') return typeof value === 'boolean'
  if (type === 'null') return value === null
  return true
}

const resolveSchemaNode = (node, root) => {
  if (!node?.$ref) return node
  const prefix = '#/$defs/'
  if (!node.$ref.startsWith(prefix)) return null
  return root.$defs?.[node.$ref.slice(prefix.length)] ?? null
}

const validateAgainstSchema = (value, rawNode, path, root, file) => {
  const node = resolveSchemaNode(rawNode, root)
  if (!node) {
    fail(file, `${path}: unsupported or missing schema reference`)
    return
  }
  if ('const' in node && value !== node.const) fail(file, `${path}: must equal ${JSON.stringify(node.const)}`)
  if (node.enum && !node.enum.includes(value)) fail(file, `${path}: value is outside the schema enum`)
  if (node.type) {
    const types = Array.isArray(node.type) ? node.type : [node.type]
    if (!types.some(type => schemaTypeMatches(value, type))) {
      fail(file, `${path}: expected ${types.join(' or ')}`)
      return
    }
  }
  if (typeof value === 'string') {
    if (node.minLength !== undefined && value.length < node.minLength) fail(file, `${path}: string is too short`)
    if (node.pattern && !(new RegExp(node.pattern).test(value))) fail(file, `${path}: string does not match the schema pattern`)
    if (node.format === 'date' && !isIsoDate(value)) fail(file, `${path}: expected YYYY-MM-DD`)
  }
  if (typeof value === 'number' && node.minimum !== undefined && value < node.minimum) fail(file, `${path}: number is below schema minimum`)
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) fail(file, `${path}: array has too few items`)
    if (node.items) value.forEach((entry, index) => validateAgainstSchema(entry, node.items, `${path}[${index}]`, root, file))
  }
  if (isObject(value)) {
    for (const key of node.required ?? []) {
      if (!(key in value)) fail(file, `${path}: missing required field '${key}'`)
    }
    if (node.additionalProperties === false) {
      const allowed = new Set(Object.keys(node.properties ?? {}))
      Object.keys(value).filter(key => !allowed.has(key)).forEach(key => fail(file, `${path}: unexpected field '${key}'`))
    }
    for (const [key, childNode] of Object.entries(node.properties ?? {})) {
      if (key in value) validateAgainstSchema(value[key], childNode, `${path}.${key}`, root, file)
    }
  }
}

const secretPatterns = [
  { rule: 'private-key', regex: new RegExp(`-----BEGIN ${'PRIVATE KEY'}-----`, 'i') },
  { rule: 'bearer-token', regex: new RegExp(`(?:${'bearer'})\\s+[a-z0-9._-]{16,}`, 'i') },
  { rule: 'credential-assignment', regex: new RegExp(`(?:${'api[_-]?key|access[_-]?token|client[_-]?secret'})\\s*[:=]\\s*[^\\s<>{}]{12,}`, 'i') },
  { rule: 'authorization-header', regex: new RegExp(`(?:${'authorization|cookie'})\\s*[:=]\\s*[^\\s<>{}]{12,}`, 'i') },
  { rule: 'live-follow-up-url', regex: new RegExp(`(?:${'status_url|response_url|cancel_url'})\\s*[:=]\\s*https?:\\/\\/`, 'i') },
  { rule: 'signed-url', regex: /https?:\/\/[^\s"'<>]*(?:x-amz-signature|x-goog-signature|signature=|x-goog-credential)/i },
]

const scanText = (file, content) => {
  if (scannedFiles.has(file)) return
  scannedFiles.add(file)
  for (const { rule, regex } of secretPatterns) {
    if (regex.test(content)) {
      const key = `${file}:${rule}`
      if (!reportedSecretFindings.has(key)) {
        reportedSecretFindings.add(key)
        fail(file, `secret-like content detected by rule '${rule}'`)
      }
    }
  }
}

const scanTree = root => filesIn(root).forEach(file => scanText(file, readFileSync(file, 'utf8')))

const resolveLocalReference = (file, rawReference) => {
  if (!isNonEmptyString(rawReference)) return
  const reference = rawReference.trim()
  if (/^(?:https?:|mailto:|data:)/i.test(reference) || reference.startsWith('#')) return
  if (reference.startsWith('efeonce-globe:')) return
  const pathPart = decodeURIComponent(reference.split('#')[0].split('?')[0])
  if (!pathPart) return
  const target = pathPart.startsWith('docs/')
    ? resolve(repoRoot, pathPart)
    : resolve(dirname(file), pathPart)
  const outsideRoot = relative(repoRoot, target).startsWith('..')
  if (outsideRoot) {
    fail(file, `local reference escapes repository root: ${reference}`)
    return
  }
  if (!existsSync(target)) fail(file, `local reference does not resolve: ${reference}`)
  else if (statSync(target).isDirectory()) fail(file, `local reference points to a directory: ${reference}`)
}

const scanMarkdownReferences = file => {
  const content = readFileSync(file, 'utf8')
  const markdownLink = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  for (const match of content.matchAll(markdownLink)) resolveLocalReference(file, match[1])
}

const checkEvidenceRefs = (file, refs, evidence, location, state = null) => {
  if (!Array.isArray(refs)) {
    fail(file, `${location}.evidenceRefs must be an array`)
    return
  }
  refs.forEach(ref => {
    if (!isNonEmptyString(ref)) {
      fail(file, `${location}.evidenceRefs contains an invalid reference`)
      return
    }
    if (!evidence.has(ref)) {
      fail(file, `${location}.evidenceRefs points to missing evidence '${ref}'`)
      return
    }
    const evidenceMeta = evidence.get(ref)
    if (evidenceMeta.stale) {
      const message = `${location} depends on stale evidence '${ref}'`
      if (strictFreshness || state === 'verified' || state === 'available') fail(file, message)
      else warn(file, message)
    }
  })
}

const checkCables = (file, cables, evidence, location, reason = '') => {
  if (!isObject(cables)) {
    fail(file, `${location}.cables must be an object`)
    return
  }
  Object.keys(cables).filter(key => !requiredCables.includes(key)).forEach(key => fail(file, `${location}.cables has unexpected cable '${key}'`))
  for (const cable of requiredCables) {
    const value = cables[cable]
    if (!isObject(value)) {
      fail(file, `${location}.cables.${cable} is required`)
      continue
    }
    if (!edgeStates.has(value.state)) fail(file, `${location}.cables.${cable}.state is invalid: ${value.state}`)
    if (value.state === 'available' && cable !== 'available') fail(file, `${location}.cables.${cable} cannot use available state`)
    if (['unknown', 'unsupported', 'stale', 'blocked'].includes(value.state) && !isNonEmptyString(value.note) && !isNonEmptyString(reason)) {
      fail(file, `${location}.cables.${cable} state '${value.state}' requires a reason`)
    }
    checkEvidenceRefs(file, value.evidenceRefs, evidence, `${location}.cables.${cable}`, value.state)
  }
}

const validateCard = (file, card, schema) => {
  if (!isObject(card)) {
    fail(file, 'root must be an object')
    return
  }
  validateAgainstSchema(card, schema, '$', schema, file)
  const required = ['schemaVersion', 'cardId', 'snapshot', 'authority', 'modelFamily', 'evidence', 'routes', 'providerSurfaces', 'implementationChecklist']
  required.forEach(key => {
    if (!(key in card)) fail(file, `missing root field '${key}'`)
  })
  if (card.schemaVersion !== 'model-route-card.v1') fail(file, 'schemaVersion must be model-route-card.v1')
  if (!/^route-card\/[a-z0-9-]+$/.test(card.cardId ?? '')) fail(file, 'cardId must use route-card/<slug>')
  if (!isObject(card.snapshot)) {
    fail(file, 'snapshot must be an object')
    return
  }
  if (!isIsoDate(card.snapshot.observedAt)) fail(file, 'snapshot.observedAt must be YYYY-MM-DD')
  if (!Number.isInteger(card.snapshot.maxAgeDays) || card.snapshot.maxAgeDays < 1) fail(file, 'snapshot.maxAgeDays must be a positive integer')
  if (card.snapshot.revalidateBeforeUse !== true) fail(file, 'snapshot.revalidateBeforeUse must be true')
  if (isIsoDate(card.snapshot.observedAt)) {
    if (dateMs(card.snapshot.observedAt) > asOfMs) fail(file, 'snapshot.observedAt is in the future relative to --as-of')
    if (ageDays(card.snapshot.observedAt) > card.snapshot.maxAgeDays) {
      const message = `snapshot is ${ageDays(card.snapshot.observedAt)} days old (max ${card.snapshot.maxAgeDays})`
      if (strictFreshness) fail(file, message)
      else warn(file, `${message}; revalidate before implementation`)
    }
  }

  const evidence = new Map()
  if (!Array.isArray(card.evidence) || card.evidence.length === 0) fail(file, 'evidence must be a non-empty array')
  else card.evidence.forEach((entry, index) => {
    const location = `evidence[${index}]`
    if (!isObject(entry)) {
      fail(file, `${location} must be an object`)
      return
    }
    if (!isNonEmptyString(entry.id)) fail(file, `${location}.id is required`)
    else if (evidence.has(entry.id)) fail(file, `duplicate evidence id '${entry.id}'`)
    else evidence.set(entry.id, { stale: false })
    if (!evidenceAuthorities.has(entry.authority)) fail(file, `${location}.authority is invalid`)
    if (!isNonEmptyString(entry.kind)) fail(file, `${location}.kind is required`)
    if (!isIsoDate(entry.observedAt)) fail(file, `${location}.observedAt must be YYYY-MM-DD`)
    if (!isNonEmptyString(entry.reference)) fail(file, `${location}.reference is required`)
    if (entry.revalidateBeforeUse !== true && ['provider_primary', 'secondary'].includes(entry.authority)) fail(file, `${location}.revalidateBeforeUse must be true for provider/secondary evidence`)
    resolveLocalReference(file, entry.reference)
    if (!isIsoDate(entry.observedAt)) return
    if (dateMs(entry.observedAt) > asOfMs) fail(file, `${location}.observedAt is in the future relative to --as-of`)
    let expiresAt = null
    if (entry.expiresAt !== undefined) {
      if (!isIsoDate(entry.expiresAt)) fail(file, `${location}.expiresAt must be YYYY-MM-DD`)
      else expiresAt = entry.expiresAt
    } else if (entry.ttlDays !== undefined) {
      if (!Number.isInteger(entry.ttlDays) || entry.ttlDays < 1) fail(file, `${location}.ttlDays must be a positive integer`)
      else expiresAt = addDays(entry.observedAt, entry.ttlDays)
    } else if (Number.isInteger(card.snapshot.maxAgeDays)) {
      expiresAt = addDays(entry.observedAt, card.snapshot.maxAgeDays)
    }
    if (entry.expiresAt !== undefined && entry.ttlDays !== undefined && expiresAt !== addDays(entry.observedAt, entry.ttlDays)) fail(file, `${location}.expiresAt and ttlDays disagree`)
    if (expiresAt && dateMs(expiresAt) <= dateMs(entry.observedAt)) fail(file, `${location} expiresAt must be after observedAt`)
    const meta = evidence.get(entry.id)
    if (meta && expiresAt && asOfMs >= dateMs(expiresAt)) {
      meta.stale = true
      const message = `${location} expired on ${expiresAt}`
      if (strictFreshness) fail(file, message)
      else warn(file, `${message}; revalidate before implementation`)
    }
  })

  if (!Array.isArray(card.routes) || card.routes.length === 0) fail(file, 'routes must be a non-empty array')
  else {
    const routeIds = new Set()
    const identities = new Set()
    card.routes.forEach((route, index) => {
      const location = `routes[${index}]`
      if (!isObject(route)) {
        fail(file, `${location} must be an object`)
        return
      }
      if (!isNonEmptyString(route.routeId)) fail(file, `${location}.routeId is required`)
      else if (routeIds.has(route.routeId)) fail(file, `duplicate routeId '${route.routeId}'`)
      else routeIds.add(route.routeId)
      ;['kind', 'capability', 'operation', 'provider', 'model', 'endpointId', 'completionDriver'].forEach(key => {
        if (!isNonEmptyString(route[key])) fail(file, `${location}.${key} is required`)
      })
      if (!identityStates.has(route.identityState)) fail(file, `${location}.identityState is invalid`)
      if (route.version === null && route.identityState !== 'unknown') fail(file, `${location} null version requires identityState=unknown`)
      if (route.version !== null && route.identityState !== 'resolved') fail(file, `${location} resolved version requires identityState=resolved`)
      if (route.region !== null && !isNonEmptyString(route.region)) fail(file, `${location}.region must be a string or null`)
      if (route.completionDriver !== route.completion?.driver) fail(file, `${location}.completionDriver must match completion.driver`)
      const identity = [route.routeId, route.capability, route.provider, route.model, route.version ?? 'unknown', route.endpointId, route.region ?? 'unknown', route.completionDriver].join('|')
      if (identities.has(identity)) fail(file, `duplicate exact route identity '${identity}'`)
      identities.add(identity)
      if (!lifecycleStates.has(route.lifecycle)) fail(file, `${location}.lifecycle is invalid`)
      if (!Array.isArray(route.inputs) || route.inputs.length === 0) fail(file, `${location}.inputs must be non-empty`)
      if (!Array.isArray(route.controls)) fail(file, `${location}.controls must be an array`)
      if (!isObject(route.output)) fail(file, `${location}.output must be an object`)
      if (!isObject(route.transport)) fail(file, `${location}.transport must be an object`)
      if (!isObject(route.completion)) fail(file, `${location}.completion must be an object`)
      checkCables(file, route.cables, evidence, location, Array.isArray(route.blockers) ? route.blockers.join('; ') : '')
      checkEvidenceRefs(file, route.evidenceRefs, evidence, location)
      if (!Array.isArray(route.blockers)) fail(file, `${location}.blockers must be an array`)
      if (route.lifecycle === 'available' && route.cables?.available?.state !== 'available') fail(file, `${location} lifecycle available requires available cable state available`)
      if (route.cables?.available?.state === 'available' && route.lifecycle !== 'available') fail(file, `${location} available cable requires lifecycle available`)
    })
  }

  if (!Array.isArray(card.providerSurfaces)) fail(file, 'providerSurfaces must be an array')
  else card.providerSurfaces.forEach((surface, index) => {
    const location = `providerSurfaces[${index}]`
    if (!isObject(surface)) {
      fail(file, `${location} must be an object`)
      return
    }
    ;['surfaceId', 'provider', 'endpointId'].forEach(key => {
      if (!isNonEmptyString(surface[key])) fail(file, `${location}.${key} is required`)
    })
    if (!providerSurfaceStates.has(surface.status)) fail(file, `${location}.status is invalid`)
    checkCables(file, surface.cables, evidence, location, surface.note ?? '')
    checkEvidenceRefs(file, surface.evidenceRefs, evidence, location)
  })

  if (!Array.isArray(card.implementationChecklist) || card.implementationChecklist.length === 0) fail(file, 'implementationChecklist must be non-empty')
  else card.implementationChecklist.forEach((item, index) => {
    const location = `implementationChecklist[${index}]`
    if (!isObject(item)) {
      fail(file, `${location} must be an object`)
      return
    }
    ;['id', 'ownerBoundary'].forEach(key => {
      if (!isNonEmptyString(item[key])) fail(file, `${location}.${key} is required`)
    })
    if (!checklistStates.has(item.status)) fail(file, `${location}.status is invalid`)
    checkEvidenceRefs(file, item.evidenceRefs, evidence, location)
  })
}

let schema = null
try {
  schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
} catch (error) {
  fail(schemaPath, `cannot load route-card.schema.json: ${error.message}`)
}

const bundleRoots = [
  join(repoRoot, '.codex', 'skills', 'greenhouse-globe-model-fleet'),
  join(repoRoot, '.claude', 'skills', 'greenhouse-globe-model-fleet'),
]
bundleRoots.forEach(root => {
  if (!existsSync(root)) fail(root, 'skill mirror directory is missing')
  else {
    scanTree(root)
    filesIn(root).filter(file => file.endsWith('.md')).forEach(scanMarkdownReferences)
  }
})

const cardFiles = filesIn(routesDir).filter(file => file.endsWith('.json'))
if (cardFiles.length === 0) fail(routesDir, 'no route cards found')
for (const file of cardFiles) {
  scanText(file, readFileSync(file, 'utf8'))
  try {
    const card = JSON.parse(readFileSync(file, 'utf8'))
    if (schema) validateCard(file, card, schema)
  } catch (error) {
    fail(file, `invalid JSON or validator error: ${error.message}`)
  }
}

warnings.forEach(message => console.warn(`⚠ ${message}`))
if (failures.length) {
  console.error(`✗ Route card validation failed (${failures.length})`)
  failures.forEach(message => console.error(`- ${message}`))
  process.exit(1)
}

console.log(`✓ Route cards valid: ${cardFiles.map(file => relative(process.cwd(), file)).join(', ')}`)
console.log(`✓ Schema, freshness, references and secret scan passed as of ${asOfText}`)
