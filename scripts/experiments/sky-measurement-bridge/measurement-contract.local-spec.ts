import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/growth/ga4/api-client', () => ({ Ga4ApiError: class extends Error {}, Ga4DataClient: class {} }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/secrets/secret-manager', () => ({ resolveSecretByRef: vi.fn() }))
vi.mock('@/lib/growth/analytics-ga4/connection-store', () => ({ getGa4Connection: vi.fn(), setGa4ConnectionStatus: vi.fn() }))
vi.mock('@/lib/growth/analytics-ga4/flags', () => ({ isGa4Enabled: () => false }))
vi.mock('@/lib/growth/analytics-ga4/oauth-client', () => ({ refreshGa4AccessToken: vi.fn(), resolveGa4OAuthConfig: vi.fn() }))

import { buildGa4LandingMatchFilter } from '../../../src/lib/growth/analytics-ga4/reader'
import { isPathInContentScope, parseSeoContentScopeRules } from '../../../src/lib/growth/seo/content-scope/contracts'
import { civilToday, formatCivilDate, resolveInsightWindows } from '../../../src/lib/efeonce-insights/window'
import {
  evaluateBlogMeasurement, isUrlInBlogScope, scopeFingerprint,
  type BlogMeasurementRequest, type MeasurementReceipt, type MeasurementWindow,
  type AeoReceipt, type Ga4Receipt, type GscReceipt
} from './measurement-contract'

const current: MeasurementWindow = {
  start: '2026-10-01', endExclusive: '2026-11-01', timeZone: 'America/Santiago',
  utcStart: '2026-10-01T03:00:00Z', utcEndExclusive: '2026-11-01T03:00:00Z'
}

const previous: MeasurementWindow = {
  start: '2026-09-01', endExclusive: '2026-10-01', timeZone: 'America/Santiago',
  utcStart: '2026-09-01T04:00:00Z', utcEndExclusive: '2026-10-01T03:00:00Z'
}

const fixture = () => {
  const request: BlogMeasurementRequest = {
    contractVersion: 'blog_measurement_candidate_v1',
    binding: { organizationId: 'org-fixture', spaceId: 'space-blog', serviceId: 'service-blog', bindingId: 'binding-blog', bindingVersion: 1 },
    scope: { id: 'scope-blog', version: 1, status: 'active', exactHost: 'blog.skyairline.com', paths: [] },
    currentWindow: structuredClone(current),
    sources: {
      ga4: { sourceId: 'ga4-fixture', methodVersion: 'entry-host-verified-v1', timeZone: 'America/Santiago' },
      gsc: { sourceId: 'https://blog.skyairline.com/', methodVersion: 'gsc-controls-v1', timeZone: 'America/Los_Angeles' },
      native_aeo: { sourceId: 'aeo-profile-fixture', methodVersion: 'native-citations-v1', timeZone: 'UTC' }
    },
    // Explicit synthetic thresholds; these are NOT an approved account or product policy.
    policy: { version: 'fixture-policy-v1', ga4Population: 'blog_entry_sessions',
      minGscDetailCoverageRatio: 0.8, minAeoSuccessRatio: 0.9, requireComparableComparison: false }
  }

  const fingerprint = scopeFingerprint(request.scope!)

  const common = {
    role: 'current' as const, binding: structuredClone(request.binding), scopeFingerprint: fingerprint,
    appliedHost: 'blog.skyairline.com', window: structuredClone(current), queriedAt: '2026-11-02T12:00:00Z',
    value: 10, state: 'observed' as const, extraction: 'complete' as const, qualityVerified: true,
    dataAvailability: { servedThroughExclusive: current.endExclusive, finality: 'final' as const, verifiedAt: '2026-11-02T12:00:00Z' }
  }

  const ga4: Ga4Receipt = {
    ...common, receiptId: 'receipt-ga4', producer: 'ga4', ...request.sources.ga4,
    sourceCalendar: { ...current, alignment: 'same_civil_dates' },
    population: 'blog_entry_sessions', entryHostVerified: true, metadataReviewed: true, unresolvedQualityReasons: []
  }

  const gsc: GscReceipt = {
    ...common, receiptId: 'receipt-gsc', producer: 'gsc', ...request.sources.gsc,
    sourceCalendar: { ...current, timeZone: 'America/Los_Angeles',
      utcStart: '2026-10-01T07:00:00Z', utcEndExclusive: '2026-11-01T07:00:00Z', alignment: 'same_civil_dates' },
    providerCompleteness: 'top_rows',
    controls: { scopeFingerprint: fingerprint, aggregation: 'byPage',
      requestedCalendar: { ...current, timeZone: 'America/Los_Angeles',
        utcStart: '2026-10-01T07:00:00Z', utcEndExclusive: '2026-11-01T07:00:00Z', alignment: 'same_civil_dates' },
      totalClicks: 10, detailClicks: 8, qualityVerified: true }
  }

  const aeo: AeoReceipt = {
    ...common, receiptId: 'receipt-aeo', producer: 'native_aeo', ...request.sources.native_aeo,
    sourceCalendar: { ...current, timeZone: 'UTC', utcStart: '2026-10-01T00:00:00Z', utcEndExclusive: '2026-11-01T00:00:00Z', alignment: 'same_civil_dates' },
    value: 1, runId: 'run-current', runState: 'completed', observedAt: '2026-10-16T12:00:00Z',
    panelFingerprint: 'panel-v1', plannedObservations: 10, succeededObservations: 10, failedObservations: 0,
    unknownCitationDestinations: 0, blogCitationUrls: ['https://blog.skyairline.com/viajar']
  }


return { request, ga4, gsc, aeo, receipts: [ga4, gsc, aeo] as MeasurementReceipt[] }
}

describe('candidate contract — three independent current producers', () => {
  it('accepts a complete candidate with explicit top-row GSC controls, without demanding impossible query completeness', () => {
    const f = fixture()

    expect(evaluateBlogMeasurement(f.request, f.receipts)).toEqual({
      status: 'complete_candidate', blockers: [], comparisonEligible: false, comparisonBlockers: ['comparison_not_requested']
    })
  })

  it.each(['ga4', 'gsc', 'native_aeo'] as const)('does not substitute another producer for missing %s', producer => {
    const f = fixture()
    const result = evaluateBlogMeasurement(f.request, f.receipts.filter(r => r.producer !== producer))

    expect(result.status).toBe('preview_only')
    expect(result.blockers).toContain(`${producer}:missing`)
  })

  it('GA4 referrals do not satisfy the native AEO requirement', () => {
    const f = fixture()
    const receipts: MeasurementReceipt[] = [f.ga4, f.gsc, { ...f.ga4, producer: 'ga4_referrals' }]

    expect(evaluateBlogMeasurement(f.request, receipts).blockers).toContain('native_aeo:missing')
  })

  it('comparison facts cannot fill the current window', () => {
    const f = fixture()
    const result = evaluateBlogMeasurement(f.request, f.receipts.map(r => ({ ...r, role: 'comparison' })))

    expect(result.blockers).toEqual(['ga4:missing', 'gsc:missing', 'native_aeo:missing'])
  })

  it('fails closed on duplicate candidate receipts instead of choosing latest', () => {
    const f = fixture()

    expect(evaluateBlogMeasurement(f.request, [...f.receipts, { ...f.ga4, receiptId: 'another' }]).blockers)
      .toContain('ga4:ambiguous_receipts')
  })

  it.each(['spaceId', 'serviceId', 'organizationId', 'bindingId'] as const)('rejects wrong %s despite shared host', key => {
    const f = fixture()

    f.ga4.binding = { ...f.ga4.binding, [key]: 'alien' }
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('ga4:binding_mismatch')
  })

  it('rejects stale binding and scope versions', () => {
    const f = fixture()

    f.ga4.binding = { ...f.ga4.binding, bindingVersion: 2 }
    f.gsc.scopeFingerprint = scopeFingerprint({ ...f.request.scope!, version: 2 })
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toEqual(expect.arrayContaining([
      'ga4:binding_mismatch', 'gsc:scope_mismatch', 'gsc:controls_invalid'
    ]))
  })

  it.each([null, { ...fixture().request.scope!, status: 'deleted' as const }])('missing/deleted scope never falls back to site total', scope => {
    const f = fixture()

    f.request.scope = scope
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('scope_unavailable')
  })
})

describe('quality, calendars and populations', () => {
  it('accepts observed zero only with complete verified evidence in all three sources', () => {
    const f = fixture()

    f.receipts.forEach(r => { r.value = 0; r.state = 'observed_zero' })
    f.gsc.controls.totalClicks = 0; f.gsc.controls.detailClicks = 0
    f.aeo.blogCitationUrls = []
    expect(evaluateBlogMeasurement(f.request, f.receipts).status).toBe('complete_candidate')
    f.ga4.qualityVerified = false
    expect(evaluateBlogMeasurement(f.request, f.receipts).status).toBe('preview_only')
  })

  it.each(['unknown', 'partial', 'unavailable'] as const)('keeps %s evidence in preview', state => {
    const f = fixture()

    f.ga4.state = state
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('ga4:observation_unusable')
  })

  it('does not promote an unverified empty API response to observed zero', () => {
    const f = fixture()

    f.ga4.value = 0
    f.ga4.unresolvedQualityReasons = ['empty_reason_or_thresholding']
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toEqual(expect.arrayContaining([
      'ga4:zero_not_verified', 'ga4:metadata_unresolved'
    ]))
  })

  it('refuses partial extraction even with rows on every day', () => {
    const f = fixture()

    f.gsc.extraction = 'partial'
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('gsc:extraction_incomplete')
  })

  it('checks controls and policy rather than asserting top-rows are the full population', () => {
    const f = fixture()

    f.gsc.controls.detailClicks = 7
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('gsc:detail_coverage_below_policy')
    f.gsc.controls.detailClicks = 11
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('gsc:controls_inconsistent')
  })

  it('cannot relabel blog activity as entry sessions or infer the entry hostname', () => {
    const f = fixture()

    f.ga4.population = 'blog_page_activity'
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('ga4:population_mismatch')
    f.ga4.population = 'blog_entry_sessions'; f.ga4.entryHostVerified = false
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('ga4:entry_host_unverified')
  })

  it('checks source calendar close separately from report close', () => {
    const f = fixture()

    f.gsc.queriedAt = '2026-11-01T04:00:00Z'
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('gsc:query_before_period_close')
  })

  it.each(['ga4', 'gsc'] as const)('recent query cannot certify lagging %s data', producer => {
    const f = fixture()

    f[producer].dataAvailability = { ...f[producer].dataAvailability, servedThroughExclusive: '2026-10-30' }
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain(`${producer}:data_through_incomplete_or_future`)
  })

  it.each(['provisional', 'unknown'] as const)('rejects %s finality even after calendar closes', finality => {
    const f = fixture()

    f.gsc.dataAvailability = { ...f.gsc.dataAvailability, finality }
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('gsc:data_not_final')
  })

  it('rejects future data-through and an attestation later than the query', () => {
    const f = fixture()

    f.gsc.dataAvailability = { ...f.gsc.dataAvailability, servedThroughExclusive: '2026-11-20' }
    f.ga4.dataAvailability = { ...f.ga4.dataAvailability, verifiedAt: '2026-11-03T12:00:00Z' }
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toEqual(expect.arrayContaining([
      'gsc:data_through_incomplete_or_future', 'ga4:data_availability_unverified'
    ]))
  })

  it('checks declared UTC against civil timezone, including a DST-changing comparison month', () => {
    const f = fixture()

    f.request.currentWindow = structuredClone(previous)
    f.receipts = []
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).not.toContain('window_invalid')
    f.request.currentWindow.utcStart = '2026-09-01T03:00:00Z'
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('window_invalid')
  })

  it('characterizes the canonical midnight-gap result and fails closed rather than inventing a new resolver', () => {
    const period = { start: '2026-09-06', endExclusive: '2026-09-07', timeZone: 'America/Santiago' }
    const canonical = resolveInsightWindows(period, { kind: 'none' }, new Date('2026-09-10T12:00:00Z')).current

    // Existing two-pass resolver does not throw here: its start falls on the previous civil date.
    expect(formatCivilDate(civilToday(period.timeZone, new Date(canonical.startUtc)))).toBe('2026-09-05')
    const f = fixture()

    f.request.currentWindow = { ...period, utcStart: canonical.startUtc, utcEndExclusive: canonical.endUtc }
    expect(evaluateBlogMeasurement(f.request, []).blockers).toContain('window_invalid')
  })

  it('rejects a shifted producer window and source calendar', () => {
    const f = fixture()

    f.ga4.window = previous
    f.gsc.sourceCalendar.timeZone = 'UTC'
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toEqual(expect.arrayContaining([
      'ga4:window_mismatch', 'gsc:calendar_mismatch'
    ]))
  })
})

describe('exact host and native panel', () => {
  it.each([
    'https://blog.skyairline.com.evil.invalid/a', 'https://sub.blog.skyairline.com/a',
    'https://blog.skyairline.com@evil.invalid/a', 'https://www.skyairline.com/a',
    'https://blog.skyairline.com:444/a', '//blog.skyairline.com/a', 'javascript:alert(1)',
    'https://user:pass@blog.skyairline.com/a'
  ])('rejects URL outside the exact-host contract: %s', url => {
    expect(isUrlInBlogScope(url, fixture().request.scope!)).toBe(false)
  })

  it('allows root, query and normalized host case without broadening paths', () => {
    const scope = fixture().request.scope!

    expect(isUrlInBlogScope('https://BLOG.SKYAIRLINE.COM/', scope)).toBe(true)
    scope.paths = [{ kind: 'prefix', path: '/viajar' }]
    expect(isUrlInBlogScope('https://blog.skyairline.com/viajar?x=1', scope)).toBe(true)
    expect(isUrlInBlogScope('https://blog.skyairline.com/viajar-viejo', scope)).toBe(false)
    expect(isUrlInBlogScope('https://blog.skyairline.com/viajar/../fuera', scope)).toBe(false)
    expect(isUrlInBlogScope('https://blog.skyairline.com/viajar/%2e%2e/fuera', scope)).toBe(false)
  })

  it('unknown redirect destinations cannot silently disappear from native coverage', () => {
    const f = fixture()

    f.aeo.unknownCitationDestinations = 1
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toContain('native_aeo:citation_destination_unknown')
  })

  it('native run must fall inside the half-open current window with a fully accounted panel', () => {
    const f = fixture()

    f.aeo.observedAt = current.utcEndExclusive
    f.aeo.failedObservations = 2
    expect(evaluateBlogMeasurement(f.request, f.receipts).blockers).toEqual(expect.arrayContaining([
      'native_aeo:run_outside_window_or_incomplete', 'native_aeo:panel_accounting_invalid'
    ]))
  })

  it('incompatible comparison panel blocks comparison but not a valid current-only candidate', () => {
    const f = fixture()

    // Use a disjoint comparison window; receipts preserve each source's calendar.
    f.request.comparisonWindow = previous

    const comparison = structuredClone(f.receipts).map(r => {
      r.role = 'comparison'; r.receiptId += '-previous'; r.window = previous
      const zone = r.sourceCalendar.timeZone

      r.sourceCalendar = { ...previous, timeZone: zone, alignment: 'same_civil_dates',
        utcStart: zone === 'UTC' ? '2026-09-01T00:00:00Z' : zone === 'America/Los_Angeles' ? '2026-09-01T07:00:00Z' : previous.utcStart,
        utcEndExclusive: zone === 'UTC' ? '2026-10-01T00:00:00Z' : zone === 'America/Los_Angeles' ? '2026-10-01T07:00:00Z' : previous.utcEndExclusive }
      if (r.producer === 'gsc') r.controls.requestedCalendar = structuredClone(r.sourceCalendar)
      if (r.producer === 'gsc' || r.producer === 'ga4') r.dataAvailability = { ...r.dataAvailability, servedThroughExclusive: previous.endExclusive }
      if (r.producer === 'native_aeo') { r.observedAt = '2026-09-15T12:00:00Z'; r.runId = 'run-before'; r.panelFingerprint = 'panel-changed' }

return r
    })

    const decision = evaluateBlogMeasurement(f.request, [...f.receipts, ...comparison])

    expect(decision.status).toBe('complete_candidate')
    expect(decision.comparisonEligible).toBe(false)
    expect(decision.comparisonBlockers).toEqual(['native_aeo:panel_incompatible'])
    f.request.policy.requireComparableComparison = true
    expect(evaluateBlogMeasurement(f.request, [...f.receipts, ...comparison]).status).toBe('preview_only')
  })

  it.each(['ga4', 'gsc'] as const)('does not certify a comparison when %s availability is provisional or late', producer => {
    const f = fixture()

    f.request.comparisonWindow = previous
    f.request.policy.requireComparableComparison = true

    const comparison = structuredClone(f.receipts).map(r => {
      r.role = 'comparison'; r.receiptId += '-comparison'; r.window = previous
      const canonical = resolveInsightWindows({ ...previous, timeZone: r.sourceCalendar.timeZone }, { kind: 'none' }, new Date(r.queriedAt)).current

      r.sourceCalendar = { start: canonical.start, endExclusive: canonical.endExclusive, timeZone: canonical.timeZone,
        utcStart: canonical.startUtc, utcEndExclusive: canonical.endUtc, alignment: 'same_civil_dates' }
      if (r.producer === 'gsc') r.controls.requestedCalendar = structuredClone(r.sourceCalendar)
      if (r.producer === 'ga4' || r.producer === 'gsc') r.dataAvailability = { ...r.dataAvailability, servedThroughExclusive: previous.endExclusive }
      if (r.producer === 'native_aeo') { r.observedAt = '2026-09-15T12:00:00Z'; r.runId = 'comparison-run' }

return r
    })

    const receipt = comparison.find(r => r.producer === producer) as Ga4Receipt | GscReceipt

    expect(evaluateBlogMeasurement(f.request, [...f.receipts, ...comparison]).status).toBe('complete_candidate')
    receipt.dataAvailability.finality = 'provisional'
    let result = evaluateBlogMeasurement(f.request, [...f.receipts, ...comparison])

    expect(result.comparisonBlockers).toContain(`${producer}:data_not_final`)
    expect(result.status).toBe('preview_only')
    receipt.dataAvailability.finality = 'final'; receipt.dataAvailability.servedThroughExclusive = '2026-09-29'
    result = evaluateBlogMeasurement(f.request, [...f.receipts, ...comparison])
    expect(result.comparisonBlockers).toContain(`${producer}:data_through_incomplete_or_future`)
  })
})

describe('integration with existing Berel/GA4 pure primitives', () => {
  it('characterizes host-blind v1 and verifies candidate adds host without changing legacy behavior', () => {
    const rules = [{ kind: 'prefix' as const, path: '/articulos' }]

    expect(isPathInContentScope('https://other.invalid/articulos/a', rules)).toBe(true)
    expect(isUrlInBlogScope('https://other.invalid/articulos/a', { ...fixture().request.scope!, paths: rules })).toBe(false)
    expect(parseSeoContentScopeRules([])).toEqual({ ok: true, rules: [] })
    expect(parseSeoContentScopeRules([{ kind: 'prefix', path: '/' }]).ok).toBe(false)
  })

  it('retains the real GA4 path-boundary/query filter while demonstrating it cannot express a host', () => {
    const result = buildGa4LandingMatchFilter([{ kind: 'prefix', path: '/articulos' }])!

    const accepts = (path: string) => result.orGroup.expressions.some(({ filter }) =>
      filter.stringFilter.matchType === 'EXACT' ? path === filter.stringFilter.value : path.startsWith(filter.stringFilter.value))

    expect(accepts('/articulos?utm_source=test')).toBe(true)
    expect(accepts('/articulos/a')).toBe(true)
    expect(accepts('/articulos-viejos/a')).toBe(false)
    expect(result.orGroup.expressions.every(e => e.filter.fieldName === 'landingPagePlusQueryString')).toBe(true)
    expect(buildGa4LandingMatchFilter([])).toBeNull()
  })
})
