// Decision model only: no database, server-only module or production adapter imports.
import { createHash } from 'node:crypto'

import { BLOG } from './fixtures.mjs'

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const fail = code => { throw new Error(code) }
const exactlyOne = (rows, code) => rows.length === 1 ? rows[0] : fail(code)

export function spaceFor(state, spaceId) {
  return exactlyOne(state.spaces.filter(s => s.id === spaceId && s.active), 'space_unavailable')
}

export function authorize(state, subjectId, context, capability = 'read') {
  const space = spaceFor(state, context.spaceId)

  if (space.organizationId !== context.organizationId) fail('forbidden')

  const membership = state.memberships.find(m =>
    m.subjectId === subjectId && m.spaceId === space.id && m.active
  )

  if (!membership?.capabilities.includes(capability) || !state.organizationCapabilities.includes(capability)) {
    fail('forbidden')
  }

  if (context.serviceId && !state.services.some(s =>
    s.id === context.serviceId && s.organizationId === space.organizationId && s.spaceId === space.id && s.active
  )) fail('service_context_mismatch')

  return { ...context, clientId: space.clientId, authorityVersion: state.authorityVersion }
}

export function selectContext(state, subjectId, context) {
  authorize(state, subjectId, context)

  return { subjectId, context: { ...context } }
}

export function refreshContext(state, selection) {
  return authorize(state, selection.subjectId, selection.context)
}

// Models of current predicates, not execution of the production SQL/stores.
export const legacyProjects = (state, clientId) => state.projects.filter(p => p.clientId === clientId)
export const legacySessionCandidates = (state, clientId) => state.spaces.filter(s => s.clientId === clientId && s.active)
export const legacyCompanyCandidates = (state, companyId) => state.spaces.filter(s =>
  state.organizations.some(o => o.id === s.organizationId && o.companyId === companyId)
)
export const legacySourceCandidates = (state, clientId) => state.sources.filter(source =>
  source.enabled && state.spaces.some(s => s.id === source.spaceId && s.clientId === clientId && s.active)
)
export const legacyCacheKey = (context, facet) => `account360:${context.organizationId}:${facet}:1.0.0`

export function readProjects(state, subjectId, context) {
  authorize(state, subjectId, context)

  return state.projects.filter(p => p.spaceId === context.spaceId)
}

export function readCachedProjects(state, subjectId, context, period) {
  const effective = authorize(state, subjectId, context) // permission before cache hit

  const key = JSON.stringify([
    context.organizationId, context.spaceId, context.serviceId ?? null,
    period, subjectId, effective.authorityVersion, 'projects-v1'
  ])

  if (!state.cache.has(key)) state.cache.set(key, readProjects(state, subjectId, context))

  return { key, rows: state.cache.get(key) }
}

export function resolveServiceRoute(state, organizationId, serviceId) {
  const route = exactlyOne(state.routing.filter(r => r.serviceId === serviceId), 'routing_ambiguous')
  const space = spaceFor(state, route.spaceId)
  const service = exactlyOne(state.services.filter(s => s.id === serviceId && s.active), 'service_unavailable')

  if (space.organizationId !== organizationId || service.organizationId !== organizationId) fail('routing_mismatch')

  return { organizationId, spaceId: space.id, serviceId }
}

export function projectSource(state, event) {
  const source = exactlyOne(state.sources.filter(s => s.id === event.sourceId && s.enabled), 'source_ambiguous')
  const space = spaceFor(state, source.spaceId)

  if (space.organizationId !== event.organizationId) fail('forbidden')
  const existing = state.projects.find(p => p.id === event.projectId)

  if (existing && (existing.spaceId !== space.id || existing.sourceId !== source.id)) fail('history_owner_conflict')
  if (existing) return existing
  const row = { id: event.projectId, spaceId: space.id, clientId: space.clientId, sourceId: source.id }

  state.projects.push(row)

  return row
}

function operationalClient(state, service) {
  return spaceFor(state, service.spaceId).clientId
}

export function commercialOwner(state, clientId) {
  const bridge = exactlyOne(state.clients.filter(c => c.id === clientId), 'commercial_owner_unresolved')
  const owner = exactlyOne(state.clients.filter(c => c.id === bridge.commercialOwner), 'commercial_owner_unresolved')

  if (owner.kind !== 'commercial' || owner.commercialOwner !== owner.id || bridge.organizationId !== owner.organizationId) {
    fail('commercial_owner_unresolved')
  }

  return owner.id
}

export function provisionOperatingSpace(state, key, input, foundations) {
  if (!['context', 'routing', 'finance'].every(gate => foundations[gate] === true)) fail('foundations_required')
  const intentHash = digest(input)
  const existing = (state.provisioningLedger ?? []).find(row => row.key === key)

  if (existing) {
    if (existing.intentHash !== intentHash) fail('idempotency_conflict')

    return existing.spaceId
  }

  const ownerId = commercialOwner(state, input.commercialOwner)
  const owner = state.clients.find(c => c.id === ownerId)

  if (owner.organizationId !== input.organizationId) fail('forbidden')
  if (state.spaces.some(s => s.id === input.spaceId)) fail('space_conflict')
  if (state.variant === 'A-prime' && state.clients.some(c => c.id === input.bridgeId)) fail('bridge_conflict')
  if (state.variant === 'B' && input.bridgeId !== ownerId) fail('bridge_conflict')
  // All validations precede mutation; this synchronous model is NOT a DB transaction/concurrency proof.
  if (state.variant === 'A-prime') state.clients.push({
    id: input.bridgeId, organizationId: input.organizationId, commercialOwner: ownerId, kind: 'operating'
  })
  state.spaces.push({ id: input.spaceId, clientId: input.bridgeId, organizationId: input.organizationId, active: false })
  state.provisioningLedger ??= []
  state.provisioningLedger.push({ key, intentHash, spaceId: input.spaceId })

  return input.spaceId
}

export function financialCandidates(state, invoice, normalizeOwner) {
  const services = state.services.filter(s => s.active && s.organizationId === invoice.organizationId)
  const client = normalizeOwner ? commercialOwner(state, invoice.clientId) : invoice.clientId

  if (normalizeOwner && state.clients.find(c => c.id === client)?.organizationId !== invoice.organizationId) {
    fail('commercial_owner_unresolved')
  }

  const candidates = services.filter(s => {
    const serviceClient = operationalClient(state, s)

    return (normalizeOwner ? commercialOwner(state, serviceClient) : serviceClient) === client
  })

  // Reflect client candidates before organization fallback; normalize BEFORE selecting, not after sums.
  return candidates.length ? candidates : services
}

export function attributeInvoice(state, invoice) {
  const candidates = financialCandidates(state, invoice, true)
  const matches = invoice.serviceId ? candidates.filter(s => s.id === invoice.serviceId) : []

  if (invoice.serviceId && matches.length !== 1) fail('attribution_conflict')

  return matches.length === 1
    ? { status: 'attributed', serviceId: matches[0].id, amount: invoice.amount }
    : { status: 'unresolved', candidateServiceIds: candidates.map(s => s.id).sort() }
}

export function consolidateInvoices(state) {
  const seen = new Map()

  for (const invoice of state.invoices) {
    commercialOwner(state, invoice.clientId)
    if (seen.has(invoice.id) && digest(seen.get(invoice.id)) !== digest(invoice)) fail('financial_fact_conflict')
    seen.set(invoice.id, invoice)
  }

  return { count: seen.size, amount: [...seen.values()].reduce((sum, fact) => sum + fact.amount, 0) }
}

export function requireBlogEvidence(receipts, period, scope) {
  if (!scope || scope.host !== BLOG || scope.mode !== 'exact-host') fail('content_scope_required')

  for (const source of ['ga4', 'gsc', 'aeo_run']) {
    exactlyOne(receipts.filter(r =>
      r.source === source && r.host === BLOG && r.period === period && r.status === 'observed' &&
      Number.isFinite(r.count) && r.count >= 0
    ), `required_source_missing:${source}`)
  }

  return { status: 'ready', sources: ['ga4', 'gsc', 'aeo_run'], observedZero: receipts.every(r => r.count === 0) }
}

export function projectBlogUrls(ga4Rows, gscRows, observations, scope) {
  if (!scope || scope.host !== BLOG || scope.mode !== 'exact-host') fail('content_scope_required')

  const matches = raw => {
    try {
      const url = new URL(raw)

      return ['https:', 'http:'].includes(url.protocol) && url.hostname === scope.host &&
        !url.username && !url.password && !url.port
    } catch {
      return false
    }
  }

  const blogObservations = observations.filter(o => o.citations.some(matches))

  return {
    ga4FactIds: ga4Rows.filter(r => matches(r.landingUrl)).map(r => r.id),
    gscFactIds: gscRows.filter(r => matches(r.page)).map(r => r.id),
    aeoCitationRows: observations.flatMap(o => o.citations).filter(matches).length,
    aeoBlogResponses: blogObservations.length,
    aeoDenominator: observations.length
  }
}

export function admitReport(state, subjectId, key, intent) {
  const intentHash = digest([intent.organizationId, intent.spaceId, intent.serviceId, intent.period, intent.scope])
  const existing = state.ledger.find(row => row.key === key && row.organizationId === intent.organizationId)

  if (existing) {
    // Context authority still current, ownership sealed. Mapping changes do not reattribute old editions.
    authorize(state, subjectId, { organizationId: existing.organizationId, spaceId: existing.spaceId }, 'report')
    if (existing.intentHash !== intentHash) fail('idempotency_conflict')

    return { ...existing, replay: true }
  }

  authorize(state, subjectId, intent, 'report')
  const route = resolveServiceRoute(state, intent.organizationId, intent.serviceId)

  if (route.spaceId !== intent.spaceId) fail('routing_mismatch')
  requireBlogEvidence(state.receipts, intent.period, intent.scope)

  const row = {
    id: `edition-${state.ledger.length + 1}`, key, intentHash,
    organizationId: intent.organizationId, spaceId: intent.spaceId, serviceId: intent.serviceId, period: intent.period
  }

  state.ledger.push(row)

  return { ...row, replay: false }
}
