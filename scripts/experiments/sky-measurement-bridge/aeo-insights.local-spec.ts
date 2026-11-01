import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GrowthAiVisibilityProviderObservation } from '@/lib/growth/ai-visibility/contracts'
import { buildCitation, buildCitations } from '@/lib/growth/ai-visibility/observation'
import { buildCitationSourceBreakdown } from '@/lib/growth/ai-visibility/report/citation-breakdown'
import { aeoReportAdapter } from '@/lib/efeonce-insights/adapters/aeo-adapter'
import type { AdapterCollectInput } from '@/lib/efeonce-insights/adapters/contract'
import { runInsightGeneration } from '@/lib/efeonce-insights/commands/generation'
import type { EvidenceSnapshotContentV1 } from '@/lib/efeonce-insights/contracts/evidence'
import type { EditorialPlanV1 } from '@/lib/efeonce-insights/contracts/plan'
import type { InsightEditionRecord } from '@/lib/efeonce-insights/stores/records'
import { resolveInsightWindows } from '@/lib/efeonce-insights/window'

import {
  evaluateBlogMeasurement,
  scopeFingerprint,
  type BlogMeasurementRequest,
  type MeasurementReceipt
} from './measurement-contract'

/**
 * TASK-2094: characterization, NOT certification of SKY's requested contract.
 * Real code: citation normalizers/reducer, AEO adapter, GA4 fact adapter, civil
 * windows, generation's validating phase and editorial plan validation.
 * Stubs: upstream readers, persistence/transaction transport, telemetry/outbox.
 * We do not execute collecting/composing, provider calls, rendering or issuance.
 * Tests labelled CURRENT GAP intentionally pass when the existing gap reproduces.
 */
vi.mock('server-only', () => ({}))

const ports = vi.hoisted(() => ({
  readGrader: vi.fn(),
  readGa4: vi.fn(),
  readSnapshot: vi.fn(),
  readPlan: vi.fn(),
  transition: vi.fn(),
  emit: vi.fn(),
  collect: vi.fn(),
  author: vi.fn(),
  cover: vi.fn(),
  capture: vi.fn(),
  withTransaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback({ localStub: true }))
}))

const readerErrors = vi.hoisted(() => ({
  GraderUnavailable: class extends Error {
    readonly code: string

    constructor(code: string) {
      super(code)
      this.code = code
    }
  }
}))

vi.mock('@/lib/growth/ai-visibility/client/command', () => ({
  readClientGraderReport: ports.readGrader,
  ClientGraderReportError: readerErrors.GraderUnavailable
}))
vi.mock('@/lib/growth/analytics-ga4/reader', () => ({ readGa4Analytics: ports.readGa4 }))
vi.mock('@/lib/efeonce-insights/stores/snapshot-store', () => ({ getInsightEvidenceSnapshotByEdition: ports.readSnapshot }))
vi.mock('@/lib/efeonce-insights/stores/plan-store', () => ({ getInsightEditorialPlanByEdition: ports.readPlan }))
vi.mock('@/lib/efeonce-insights/stores/edition-store', () => ({ transitionInsightEditionState: ports.transition }))
vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: ports.withTransaction }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: ports.capture }))
vi.mock('@/lib/efeonce-insights/events', () => ({ publishInsightEditionStateTransitioned: ports.emit }))
// These phases are NOT under test. Stubs throw if the harness enters them.
vi.mock('@/lib/efeonce-insights/adapters/collect-evidence', () => ({ collectInsightEvidence: ports.collect }))
vi.mock('@/lib/efeonce-insights/editorial/author-plan', () => ({ authorEditorialPlan: ports.author }))
vi.mock('@/lib/efeonce-insights/commands/cover-preference', () => ({ resolveInsightCoverForEdition: ports.cover }))

const ORG = 'org-synthetic-sky-measurement'
const NOW = new Date('2026-11-01T12:00:00.000Z')
const PERIOD = { start: '2026-10-01', endExclusive: '2026-11-01', timeZone: 'UTC' }
const WINDOWS = resolveInsightWindows(PERIOD, { kind: 'previous_period' }, NOW)
const EMPTY_EVIDENCE: EvidenceSnapshotContentV1 = { facts: [], sources: [], rejections: [] }

// Synthetic trusted receipts: this tests the candidate gate, NOT real collection or receipt authenticity.
const candidateFixture = (): { request: BlogMeasurementRequest; receipts: MeasurementReceipt[] } => {
  const window = { ...PERIOD, utcStart: WINDOWS.current.startUtc, utcEndExclusive: WINDOWS.current.endUtc }
  const scope = { id: 'synthetic-blog-scope', version: 1, status: 'active' as const, exactHost: 'blog.skyairline.com', paths: [] }
  const binding = { organizationId: ORG, spaceId: 'space-synthetic-seo', serviceId: 'service-synthetic-seo', bindingId: 'binding-synthetic', bindingVersion: 1 }

  const request: BlogMeasurementRequest = {
    contractVersion: 'blog_measurement_candidate_v1', binding, scope, currentWindow: window,
    sources: {
      ga4: { sourceId: 'synthetic-property', methodVersion: 'fixture-v1', timeZone: 'UTC' },
      gsc: { sourceId: 'https://blog.skyairline.com/', methodVersion: 'fixture-v1', timeZone: 'UTC' },
      native_aeo: { sourceId: 'profile-synthetic', methodVersion: 'fixture-v1', timeZone: 'UTC' }
    },
    policy: { version: 'fixture-v1', ga4Population: 'blog_entry_sessions', minGscDetailCoverageRatio: 1, minAeoSuccessRatio: 1, requireComparableComparison: false }
  }

  const base = {
    role: 'current' as const, binding, scopeFingerprint: scopeFingerprint(scope), appliedHost: scope.exactHost,
    methodVersion: 'fixture-v1', window, sourceCalendar: { ...window, alignment: 'same_civil_dates' as const },
    dataAvailability: { servedThroughExclusive: PERIOD.endExclusive, finality: 'final' as const, verifiedAt: NOW.toISOString() },
    queriedAt: NOW.toISOString(), value: 0, state: 'observed_zero' as const, extraction: 'complete' as const, qualityVerified: true
  }

  return {
    request,
    receipts: [
      { ...base, receiptId: 'ga4-fixture', producer: 'ga4', sourceId: request.sources.ga4.sourceId, population: 'blog_entry_sessions', entryHostVerified: true, metadataReviewed: true, unresolvedQualityReasons: [] },
      { ...base, receiptId: 'gsc-fixture', producer: 'gsc', sourceId: request.sources.gsc.sourceId, providerCompleteness: 'top_rows', controls: { scopeFingerprint: base.scopeFingerprint, aggregation: 'byPage', requestedCalendar: base.sourceCalendar, totalClicks: 0, detailClicks: 0, qualityVerified: true } },
      { ...base, receiptId: 'aeo-fixture', producer: 'native_aeo', sourceId: request.sources.native_aeo.sourceId, runId: 'run-synthetic', runState: 'completed', observedAt: '2026-10-20T12:00:00.000Z', panelFingerprint: 'panel-synthetic-v1', plannedObservations: 4, succeededObservations: 4, failedObservations: 0, unknownCitationDestinations: 0, blogCitationUrls: [] }
    ]
  }
}

const input = (overrides: Partial<AdapterCollectInput> = {}): AdapterCollectInput => ({
  organizationId: ORG,
  audience: 'client',
  window: WINDOWS.current,
  comparison: null,
  projectIds: [],
  editorialV2: false,
  ...overrides
})

const nativeReport = (asOfDate = '2026-10-20', status = 'ready') => ({
  report: {
    runId: 'run-synthetic-native',
    gate: { status, reason: 'Synthetic readiness receipt', nextAction: 'Review' },
    overallScore: 61,
    dimensions: [{ key: 'presence', label: 'Presencia', score: 70 }],
    providerPresence: [{ provider: 'openai', resolved: 10, present: 4 }],
    competitiveSov: { brandMentions: 4, competitors: [{ name: 'Competidor sintético', mentions: 6 }] },
    citationInsight: { ownDomainShare: 25, findingsWithCitations: 8, findingsCitingOwnDomain: 2 },
    provenance: {
      asOfDate,
      promptPackVersion: 'pack-fixture-v1',
      scoreVersion: 'score-fixture-v1',
      providersSampled: ['openai'],
      promptCount: 10
    }
  }
})

const observation = (
  status: GrowthAiVisibilityProviderObservation['status'],
  citations: GrowthAiVisibilityProviderObservation['citations'],
  id = 'observation-fixture'
): GrowthAiVisibilityProviderObservation => ({
  observationId: id,
  runId: 'run-synthetic-native',
  promptId: id,
  provider: 'openai',
  model: 'synthetic-model',
  status,
  citations,
  answerTextHash: null,
  answerExcerpt: null,
  usage: {},
  latencyMs: 0,
  providerRequestHash: 'fixture-request',
  rawEvidencePointer: null,
  errorCode: null,
  providerPolicyVersion: 'fixture-policy',
  promptPackVersion: 'pack-fixture-v1',
  createdAt: '2026-10-20T12:00:00.000Z'
})

const edition = (allowPartial = false): InsightEditionRecord => ({
  editionId: 'edition-synthetic', reportId: 'report-synthetic', organizationId: ORG,
  version: 1, audience: 'client', state: 'validating', failedPhase: null,
  request: {
    requestVersion: 'insight_request_v1', organizationId: ORG, projectIds: [], modules: ['aeo'],
    period: PERIOD, comparison: { kind: 'previous_period' }, audience: 'client', locale: 'es-CL',
    depth: 'standard', outputs: ['report_pdf'], brand: { efeoncePackVersion: 'synthetic' }, policy: { allowPartial }
  },
  requestHash: 'synthetic-request-hash', idempotencyKey: null, modules: ['aeo'], outputs: ['report_pdf'],
  periodTimeZone: 'UTC', periodStartUtc: WINDOWS.current.startUtc, periodEndUtc: WINDOWS.current.endUtc,
  supersedesEditionId: null, reviewOwnerUserId: null, issuedAt: null, issuedByUserId: null, issuedHash: null,
  withdrawnAt: null, createdByActorKind: 'member', createdByUserId: 'synthetic-reviewer',
  createdByMemberId: 'synthetic-member', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString()
})

const planFor = (content: EvidenceSnapshotContentV1): EditorialPlanV1 => ({
  planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [],
  chapters: [{
    chapterId: 'aeo', module: 'aeo', title: 'AEO',
    claims: content.facts.length ? [{ claimId: 'fixture-claim', text: 'Dato registrado.', factIds: [content.facts[0]!.factId] }] : [],
    charts: [], tables: [], limits: []
  }],
  actions: [], limits: [], methodology: [], references: []
})

/** Exercises the REAL private runValidating via its public phase runner. */
const validateCurrentImplementation = async (content: EvidenceSnapshotContentV1, allowPartial = false) => {
  const candidate = edition(allowPartial)

  ports.readSnapshot.mockResolvedValue({ ...content, snapshotId: 'snapshot-synthetic', sealedAt: NOW.toISOString() })
  ports.readPlan.mockResolvedValue({ plan: planFor(content), frozenAt: NOW.toISOString() })
  ports.transition.mockImplementation(async (_client: unknown, change: { toState: InsightEditionRecord['state'] }) => ({
    edition: { ...candidate, state: change.toState },
    transition: { transitionId: 'transition-synthetic', fromState: 'validating', toState: change.toState, requiresHumanGate: false },
    idempotent: false
  }))

  const result = await runInsightGeneration(candidate, 'validating')

  expect(ports.collect).not.toHaveBeenCalled()
  expect(ports.author).not.toHaveBeenCalled()
  expect(ports.cover).not.toHaveBeenCalled()

  return result
}

beforeEach(() => {
  vi.clearAllMocks()
  ports.readGrader.mockResolvedValue(nativeReport())
  ports.readGa4.mockResolvedValue({ ok: false, errorCode: 'disabled' })
  ports.collect.mockImplementation(() => { throw new Error('Unexpected collecting phase') })
  ports.author.mockImplementation(() => { throw new Error('Unexpected composing phase') })
  ports.cover.mockImplementation(() => { throw new Error('Unexpected cover resolution') })
})

describe('TASK-2094 — real AEO citation reducers: current behavior', () => {
  it('CURRENT GAP: root and Blog collapse into one own_domain row; failed observations do not inflate it', () => {
    const root = buildCitation({ url: 'https://www.skyairline.com/flights' })!
    const blog = buildCitation({ url: 'https://blog.skyairline.com/viajar' })!
    const observations = [observation('succeeded', [root, blog], 'ok'), observation('failed', [blog], 'failed')]
    const result = buildCitationSourceBreakdown({ subjectDomain: 'blog.skyairline.com', observations })

    expect(result.domains).toEqual([{ domain: 'skyairline.com', count: 2, engines: ['openai'], classification: 'own_domain' }])
    expect(result.totalCitations).toBe(2)
    expect(observations).toHaveLength(2) // Reducer did not preserve a coverage denominator in its output.
    expect(observations[1]!.status).toBe('failed')
  })

  it('CURRENT LIMIT: provider-declared Blog domain preserves unresolved redirect URL, without proving destination', () => {
    const citation = buildCitation({ url: 'https://redirect.invalid/opaque', domain: 'blog.skyairline.com' })

    expect(citation).toEqual({ url: 'https://redirect.invalid/opaque', domain: 'blog.skyairline.com' })
    expect(new URL(citation!.url).hostname).not.toBe(citation!.domain)
    expect(buildCitation({ url: 'not-an-absolute-url' })).toBeNull()
  })

  it('existing protection: failed-only observations produce no evaluable citations, not a measured Blog zero', () => {
    const result = buildCitationSourceBreakdown({
      subjectDomain: 'blog.skyairline.com',
      observations: [observation('failed', [buildCitation({ url: 'https://blog.skyairline.com/viajar' })!])]
    })

    expect(result).toMatchObject({ totalCitations: 0, uniqueDomains: 0, domains: [], reason: 'sin_citas_evaluables' })
  })

  it('CURRENT LIMIT: dedupe is exact raw URL; tracking variants remain separate citations', () => {
    const plain = { url: 'https://blog.skyairline.com/viajar' }
    const tagged = { url: 'https://blog.skyairline.com/viajar?utm_source=synthetic' }
    const result = buildCitations([plain, plain, tagged])

    expect(result.map(citation => citation.url)).toEqual([plain.url, tagged.url])
  })
})

describe('TASK-2094 — real AEO adapter with stubbed upstream reads', () => {
  it('existing protection: asks the owner reader for a run finished inside the resolved UTC window', async () => {
    const result = await aeoReportAdapter.collect(input())

    expect(ports.readGrader).toHaveBeenCalledExactlyOnceWith({
      organizationId: ORG, finishedWithin: { startUtc: WINDOWS.current.startUtc, endUtc: WINDOWS.current.endUtc }
    })
    expect(result.facts.find(fact => fact.metricId === 'citation_share')).toMatchObject({ value: 25, numerator: 2, denominator: 8 })
    expect(result.facts.find(fact => fact.metricId === 'mention_rate.openai')).toMatchObject({ value: 40, numerator: 4, denominator: 10 })
    expect(ports.readGa4).not.toHaveBeenCalled()
  })

  it.each(['insufficient_data', 'review_required'])('existing protection: rejects native report readiness %s', async status => {
    ports.readGrader.mockResolvedValue(nativeReport('2026-10-20', status))
    const result = await aeoReportAdapter.collect(input())

    expect(result.facts).toEqual([])
    expect(result.sources).toEqual([])
    expect(result.rejections).toContainEqual(expect.objectContaining({ module: 'aeo', reason: status }))
  })

  it('existing protection: a reader response outside the requested civil window is rejected', async () => {
    ports.readGrader.mockResolvedValue(nativeReport('2026-09-20'))
    const result = await aeoReportAdapter.collect(input())

    expect(result.facts).toEqual([])
    expect(result.rejections).toContainEqual(expect.objectContaining({ reason: 'unsupported_window' }))
  })

  it('CURRENT GAP: missing native AEO plus successful empty GA4 emits ai_sessions=0 and passes current validation', async () => {
    ports.readGrader.mockRejectedValue(new readerErrors.GraderUnavailable('not_found'))
    ports.readGa4.mockResolvedValue({ ok: true, propertyId: 'synthetic-property', rows: [], rowCount: 0 })
    const content = await aeoReportAdapter.collect(input({ editorialV2: true }))

    expect(content.facts).toHaveLength(1)
    expect(content.facts[0]).toMatchObject({ module: 'aeo', metricId: 'ai_sessions', value: 0, source: 'ga4:property/synthetic-property' })
    expect(content.sources.every(source => source.reader === 'readGa4Analytics')).toBe(true)
    expect(content.rejections).toContainEqual(expect.objectContaining({ module: 'aeo', reason: 'not_connected' }))
    const validation = await validateCurrentImplementation(content)

    expect(validation.outcome).toBe('ready_for_review')
    expect(validation.edition.issuedAt).toBeNull() // Readiness is not automatic issuance.
  })

  it('CURRENT GAP: GA4 AI-referral query has neither Blog landing rules nor host selection', async () => {
    ports.readGa4.mockResolvedValue({
      ok: true, propertyId: 'synthetic-property', rowCount: 1,
      rows: [{ dimensions: { sessionDefaultChannelGroup: 'AI Assistant', sessionSourceMedium: 'chatgpt.com / referral' }, metrics: { sessions: 12, engagedSessions: 8 } }]
    })
    const content = await aeoReportAdapter.collect(input({ editorialV2: true }))

    expect(ports.readGa4).toHaveBeenCalledExactlyOnceWith(ORG, {
      startDate: '2026-10-01', endDate: '2026-10-31',
      dimensions: ['sessionDefaultChannelGroup', 'sessionSourceMedium'], metrics: ['sessions', 'engagedSessions']
    })
    expect(content.facts.find(fact => fact.metricId === 'ai_sessions')).toMatchObject({ value: 12 })
  })

  it('CURRENT GAP: only comparison-window facts satisfy current module presence even with allowPartial=false', async () => {
    ports.readGrader.mockImplementation(async (request: { finishedWithin?: { startUtc: string } }) => {
      if (request.finishedWithin?.startUtc === WINDOWS.comparison!.startUtc || !request.finishedWithin) {
        return nativeReport('2026-09-20')
      }

      throw new readerErrors.GraderUnavailable('not_found')
    })
    const content = await aeoReportAdapter.collect(input({ comparison: WINDOWS.comparison }))

    expect(content.facts.length).toBeGreaterThan(0)
    expect(content.facts.every(fact => fact.window.start === WINDOWS.comparison!.start)).toBe(true)
    expect(content.rejections).toContainEqual(expect.objectContaining({ reason: 'unsupported_window' }))
    expect((await validateCurrentImplementation(content)).outcome).toBe('ready_for_review')
  })

  it('existing protection: no current or comparison facts is rejected with allowPartial=false', async () => {
    const result = await validateCurrentImplementation(EMPTY_EVIDENCE)

    expect(result).toMatchObject({ outcome: 'failed', failedPhase: 'validating', failureCode: 'evidence_rejected' })
  })

  it('existing generic policy: allowPartial=true permits an empty module; this is not Blog completeness', async () => {
    expect((await validateCurrentImplementation(EMPTY_EVIDENCE, true)).outcome).toBe('ready_for_review')
  })
})

describe('TASK-2094 — candidate source gate versus the characterized current gaps', () => {
  it('requires native AEO even when real adapter has populated the AEO chapter with GA4 referrals', async () => {
    ports.readGrader.mockRejectedValue(new readerErrors.GraderUnavailable('not_found'))
    ports.readGa4.mockResolvedValue({ ok: true, propertyId: 'synthetic-property', rows: [], rowCount: 0 })
    const actual = await aeoReportAdapter.collect(input({ editorialV2: true }))
    const fixture = candidateFixture()

    expect(evaluateBlogMeasurement(fixture.request, fixture.receipts).status).toBe('complete_candidate')

    const referral: MeasurementReceipt = {
      ...fixture.receipts[0]!, receiptId: 'referral-from-actual-adapter', producer: 'ga4_referrals',
      value: actual.facts.find(fact => fact.metricId === 'ai_sessions')!.value
    }

    const decision = evaluateBlogMeasurement(fixture.request, [
      ...fixture.receipts.filter(receipt => receipt.producer !== 'native_aeo'), referral
    ])

    expect(decision).toMatchObject({ status: 'preview_only', blockers: ['native_aeo:missing'] })
    expect((await validateCurrentImplementation(actual)).outcome).toBe('ready_for_review')
  })

  it('rejects comparison-only native receipt as current evidence, preserving two other valid current sources', () => {
    const fixture = candidateFixture()

    const receipts = fixture.receipts.map(receipt => receipt.producer === 'native_aeo'
      ? { ...receipt, role: 'comparison' as const }
      : receipt)

    expect(evaluateBlogMeasurement(fixture.request, receipts)).toMatchObject({
      status: 'preview_only', blockers: ['native_aeo:missing']
    })
  })
})
