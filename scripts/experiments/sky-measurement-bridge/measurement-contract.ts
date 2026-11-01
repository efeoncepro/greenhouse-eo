/**
 * TASK-2094 candidate contract. Pure, local experiment: no authority lookup, provider I/O or issuance.
 * Receipts are trusted adapter outputs, NOT client assertions. Production needs independent provenance.
 */
import { createHash } from 'node:crypto'

import {
  canonicalContentScopeRules,
  isPathInContentScope,
  parseSeoContentScopeRules,
  type SeoContentScopeRuleV1
} from '../../../src/lib/growth/seo/content-scope/contracts'
import {
  civilToday, formatCivilDate, isValidTimeZone, parseCivilDate, resolveInsightWindows
} from '../../../src/lib/efeonce-insights/window'

export type Producer = 'ga4' | 'gsc' | 'native_aeo'
export interface BlogScope {
  id: string
  version: number
  status: 'active' | 'deleted'
  exactHost: string
  /** Empty means all paths ONLY inside exactHost. Does not change Berel's v1 contract. */
  paths: SeoContentScopeRuleV1[]
}
export interface Binding {
  organizationId: string
  spaceId: string
  serviceId: string
  bindingId: string
  bindingVersion: number
}
export interface MeasurementWindow {
  start: string
  endExclusive: string
  timeZone: string
  utcStart: string
  utcEndExclusive: string
}
export interface SourceCalendar extends MeasurementWindow {
  alignment: 'same_civil_dates'
}
export interface BlogMeasurementRequest {
  contractVersion: 'blog_measurement_candidate_v1'
  binding: Binding
  scope: BlogScope | null
  currentWindow: MeasurementWindow
  comparisonWindow?: MeasurementWindow
  sources: Record<Producer, { sourceId: string; methodVersion: string; timeZone: string }>
  policy: {
    version: string
    ga4Population: 'blog_entry_sessions' | 'blog_page_activity'
    minGscDetailCoverageRatio: number
    minAeoSuccessRatio: number
    requireComparableComparison: boolean
  }
}
interface ReceiptBase {
  receiptId: string
  role: 'current' | 'comparison'
  binding: Binding
  scopeFingerprint: string
  appliedHost: string
  sourceId: string
  methodVersion: string
  window: MeasurementWindow
  sourceCalendar: SourceCalendar
  queriedAt: string
  value: number | null
  state: 'observed' | 'observed_zero' | 'unknown' | 'partial' | 'unavailable'
  extraction: 'complete' | 'partial' | 'failed'
  qualityVerified: boolean
}
export interface Ga4Receipt extends ReceiptBase {
  producer: 'ga4'
  dataAvailability: DataAvailability
  population: 'blog_entry_sessions' | 'blog_page_activity'
  entryHostVerified: boolean
  metadataReviewed: boolean
  unresolvedQualityReasons: string[]
}
export interface GscReceipt extends ReceiptBase {
  producer: 'gsc'
  dataAvailability: DataAvailability
  providerCompleteness: 'top_rows' | 'complete'
  controls: {
    scopeFingerprint: string
    aggregation: 'byPage'
    requestedCalendar: SourceCalendar
    totalClicks: number
    detailClicks: number
    qualityVerified: boolean
  }
}
export interface AeoReceipt extends ReceiptBase {
  producer: 'native_aeo'
  runId: string
  runState: 'completed' | 'running' | 'failed'
  observedAt: string
  panelFingerprint: string
  plannedObservations: number
  succeededObservations: number
  failedObservations: number
  unknownCitationDestinations: number
  /** Includes classified in-scope citations only; unknowns stay counted above, never silently dropped. */
  blogCitationUrls: string[]
}
export interface ReferralReceipt extends ReceiptBase { producer: 'ga4_referrals' }
export interface DataAvailability {
  /** Civil exclusive boundary through which source availability was verified; not queriedAt. */
  servedThroughExclusive: string
  finality: 'final' | 'provisional' | 'unknown'
  /** Source/adapter attestation instant; final means suitable as-of this instant, not immutable forever. */
  verifiedAt: string
}
export type MeasurementReceipt = Ga4Receipt | GscReceipt | AeoReceipt | ReferralReceipt
export interface MeasurementDecision {
  status: 'complete_candidate' | 'preview_only'
  blockers: string[]
  comparisonEligible: boolean
  comparisonBlockers: string[]
}

const producers: Producer[] = ['ga4', 'gsc', 'native_aeo']
const textPresent = (s: string): boolean => typeof s === 'string' && s.trim().length > 0
const validVersion = (n: number): boolean => Number.isSafeInteger(n) && n > 0
const finiteNonnegative = (n: number): boolean => Number.isFinite(n) && n >= 0
const validRatio = (n: number): boolean => Number.isFinite(n) && n >= 0 && n <= 1
const validZone = isValidTimeZone

const utcInstant = (input: string): number => {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input)) return NaN
  const timestamp = Date.parse(input)


return Number.isFinite(timestamp) && new Date(timestamp).toISOString().replace('.000Z', 'Z') === input.replace('.000Z', 'Z') ? timestamp : NaN
}

const validWindow = (window: MeasurementWindow): boolean => {
  const start = utcInstant(window.utcStart)
  const end = utcInstant(window.utcEndExclusive)

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || !validZone(window.timeZone)) return false

  try {
    // Reuse the real resolver. The synthetic clock only validates a closed interval's correspondence.
    const canonical = resolveInsightWindows(window, { kind: 'none' }, new Date(end + 1)).current

    // The current canonical two-pass resolver can land on the prior civil day in a midnight DST gap.
    // Do not silently certify that boundary; characterize it and require the owning domain to resolve it.
    return utcInstant(canonical.startUtc) === start && utcInstant(canonical.endUtc) === end &&
      formatCivilDate(civilToday(window.timeZone, new Date(start))) === window.start &&
      formatCivilDate(civilToday(window.timeZone, new Date(end))) === window.endExclusive
  } catch { return false }
}

const equalWindow = (a: MeasurementWindow, b: MeasurementWindow): boolean =>
  a.start === b.start && a.endExclusive === b.endExclusive && a.timeZone === b.timeZone &&
  utcInstant(a.utcStart) === utcInstant(b.utcStart) && utcInstant(a.utcEndExclusive) === utcInstant(b.utcEndExclusive)

const equalCalendar = (a: SourceCalendar, b: SourceCalendar): boolean =>
  equalWindow(a, b) && a.alignment === b.alignment

const validBinding = (b: Binding): boolean =>
  [b.organizationId, b.spaceId, b.serviceId, b.bindingId].every(textPresent) && validVersion(b.bindingVersion)

const equalBinding = (a: Binding, b: Binding): boolean =>
  a.organizationId === b.organizationId && a.spaceId === b.spaceId && a.serviceId === b.serviceId &&
  a.bindingId === b.bindingId && a.bindingVersion === b.bindingVersion

const validScope = (scope: BlogScope | null): scope is BlogScope => {
  if (!scope || scope.status !== 'active' || !textPresent(scope.id) || !validVersion(scope.version)) return false
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z0-9]+$/.test(scope.exactHost)) return false

return parseSeoContentScopeRules(scope.paths).ok
}

export const scopeFingerprint = (scope: BlogScope): string =>
  createHash('sha256').update(JSON.stringify({
    id: scope.id, version: scope.version, exactHost: scope.exactHost,
    paths: canonicalContentScopeRules(scope.paths)
  })).digest('hex')

export const isUrlInBlogScope = (url: string, scope: BlogScope): boolean => {
  if (!validScope(scope)) return false

  try {
    const parsed = new URL(url)

    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      parsed.port || parsed.hostname !== scope.exactHost) return false
    // New contract resolves URL dot-segments before applying existing byte-sensitive path rules.
    // The legacy Berel matcher is unchanged; never let /allowed/../outside pass this boundary.

    return scope.paths.length === 0 || isPathInContentScope(parsed.pathname, scope.paths)
  } catch { return false }
}

const receiptIssues = (request: BlogMeasurementRequest, receipt: MeasurementReceipt, producer: Producer, window: MeasurementWindow): string[] => {
  const issues: string[] = []
  const add = (code: string) => issues.push(`${producer}:${code}`)
  const source = request.sources[producer]
  const calendar = receipt.sourceCalendar

  if (!textPresent(receipt.receiptId) || !equalBinding(receipt.binding, request.binding)) add('binding_mismatch')
  if (!request.scope || receipt.scopeFingerprint !== scopeFingerprint(request.scope) ||
    receipt.appliedHost !== request.scope.exactHost) add('scope_mismatch')
  if (receipt.sourceId !== source.sourceId || receipt.methodVersion !== source.methodVersion) add('source_or_method_mismatch')
  if (!validWindow(receipt.window) || !equalWindow(receipt.window, window)) add('window_mismatch')
  if (!validWindow(calendar) || calendar.timeZone !== source.timeZone || calendar.start !== window.start ||
    calendar.endExclusive !== window.endExclusive || calendar.alignment !== 'same_civil_dates') add('calendar_mismatch')
  if (!Number.isFinite(utcInstant(receipt.queriedAt)) ||
    utcInstant(receipt.queriedAt) < Math.max(utcInstant(window.utcEndExclusive), utcInstant(calendar.utcEndExclusive))) add('query_before_period_close')
  if (receipt.extraction !== 'complete') add('extraction_incomplete')
  if (!receipt.qualityVerified) add('quality_unverified')
  if (!['observed', 'observed_zero'].includes(receipt.state)) add('observation_unusable')
  if (receipt.value === null || !finiteNonnegative(receipt.value)) add('value_unusable')
  if (receipt.value === 0 && receipt.state !== 'observed_zero') add('zero_not_verified')
  if (receipt.state === 'observed_zero' && receipt.value !== 0) add('zero_state_mismatch')

  if (receipt.producer === 'ga4' || receipt.producer === 'gsc') {
    const availability = receipt.dataAvailability

    if (!availability) add('data_availability_missing')
    else {
      const verified = utcInstant(availability.verifiedAt)

      if (availability.finality !== 'final') add('data_not_final')
      if (!Number.isFinite(verified) || verified < utcInstant(calendar.utcEndExclusive) ||
        verified > utcInstant(receipt.queriedAt)) add('data_availability_unverified')

      try {
        parseCivilDate(availability.servedThroughExclusive, 'servedThroughExclusive')
        const verificationDay = formatCivilDate(civilToday(source.timeZone, new Date(verified)))

        if (availability.servedThroughExclusive < calendar.endExclusive ||
          availability.servedThroughExclusive > verificationDay) add('data_through_incomplete_or_future')
      } catch { add('data_through_invalid') }
    }
  }

  if (receipt.producer === 'ga4') {
    if (receipt.population !== request.policy.ga4Population) add('population_mismatch')
    if (receipt.population === 'blog_entry_sessions' && !receipt.entryHostVerified) add('entry_host_unverified')
    if (!receipt.metadataReviewed || receipt.unresolvedQualityReasons.length > 0) add('metadata_unresolved')
  }

  if (receipt.producer === 'gsc') {
    const controls = receipt.controls

    if (!controls.qualityVerified || controls.scopeFingerprint !== receipt.scopeFingerprint ||
      controls.aggregation !== 'byPage' || !equalCalendar(controls.requestedCalendar, calendar)) add('controls_invalid')
    if (!finiteNonnegative(controls.totalClicks) || !finiteNonnegative(controls.detailClicks) ||
      controls.detailClicks > controls.totalClicks || receipt.value !== controls.totalClicks) add('controls_inconsistent')
    const ratio = controls.totalClicks > 0 ? controls.detailClicks / controls.totalClicks : 1

    if (!validRatio(ratio) || ratio < request.policy.minGscDetailCoverageRatio) add('detail_coverage_below_policy')
    if (!['complete', 'top_rows'].includes(receipt.providerCompleteness)) add('provider_completeness_unknown')
  }

  if (receipt.producer === 'native_aeo') {
    const instant = utcInstant(receipt.observedAt)

    if (!textPresent(receipt.runId) || receipt.runState !== 'completed' || !Number.isFinite(instant) ||
      instant < utcInstant(window.utcStart) || instant >= utcInstant(window.utcEndExclusive)) add('run_outside_window_or_incomplete')
    if (!textPresent(receipt.panelFingerprint)) add('panel_missing')
    const counts = [receipt.plannedObservations, receipt.succeededObservations, receipt.failedObservations, receipt.unknownCitationDestinations]

    if (!counts.every(n => Number.isSafeInteger(n) && n >= 0) || receipt.plannedObservations === 0 ||
      receipt.succeededObservations + receipt.failedObservations !== receipt.plannedObservations ||
      receipt.succeededObservations === 0) add('panel_accounting_invalid')
    if (receipt.succeededObservations / receipt.plannedObservations < request.policy.minAeoSuccessRatio) add('panel_coverage_below_policy')
    if (receipt.unknownCitationDestinations !== 0) add('citation_destination_unknown')
    if (!request.scope || receipt.blogCitationUrls.some(url => !isUrlInBlogScope(url, request.scope!))) add('citation_outside_scope')
    if (receipt.value !== receipt.blogCitationUrls.length) add('citation_count_mismatch')
  }


return issues
}

export const evaluateBlogMeasurement = (request: BlogMeasurementRequest, receipts: MeasurementReceipt[]): MeasurementDecision => {
  const blockers: string[] = []

  if (request.contractVersion !== 'blog_measurement_candidate_v1') blockers.push('contract_version_invalid')
  if (!validScope(request.scope)) blockers.push('scope_unavailable')
  if (!validBinding(request.binding)) blockers.push('binding_invalid')
  if (!validWindow(request.currentWindow)) blockers.push('window_invalid')
  if (!textPresent(request.policy.version) || !validRatio(request.policy.minGscDetailCoverageRatio) ||
    !validRatio(request.policy.minAeoSuccessRatio) || request.policy.minAeoSuccessRatio === 0 ||
    !['blog_entry_sessions', 'blog_page_activity'].includes(request.policy.ga4Population)) blockers.push('policy_invalid')
  if (producers.some(p => !textPresent(request.sources[p].sourceId) || !textPresent(request.sources[p].methodVersion) ||
    !validZone(request.sources[p].timeZone))) blockers.push('source_config_invalid')
  // Invalid scope/window/config must not fall through to wider data or throw from a downstream helper.
  if (blockers.length > 0) return { status: 'preview_only', blockers, comparisonEligible: false, comparisonBlockers: ['request_invalid'] }

  const assess = (role: 'current' | 'comparison', window: MeasurementWindow): string[] =>
    producers.flatMap(producer => {
      const candidates = receipts.filter(r => r.role === role && r.producer === producer)

      if (candidates.length !== 1) return [`${producer}:${candidates.length === 0 ? 'missing' : 'ambiguous_receipts'}`]

return receiptIssues(request, candidates[0]!, producer, window)
    })

  blockers.push(...assess('current', request.currentWindow))

  const comparisonBlockers = request.comparisonWindow
    ? validWindow(request.comparisonWindow) ? assess('comparison', request.comparisonWindow) : ['comparison_window_invalid']
    : ['comparison_not_requested']

  if (request.comparisonWindow && comparisonBlockers.length === 0) {
    const currentPanel = receipts.find((r): r is AeoReceipt => r.role === 'current' && r.producer === 'native_aeo')
    const previousPanel = receipts.find((r): r is AeoReceipt => r.role === 'comparison' && r.producer === 'native_aeo')

    if (!currentPanel || currentPanel.panelFingerprint !== previousPanel?.panelFingerprint) comparisonBlockers.push('native_aeo:panel_incompatible')
  }

  if (request.policy.requireComparableComparison && comparisonBlockers.length > 0) blockers.push('comparison_required_but_ineligible')

return { status: blockers.length === 0 ? 'complete_candidate' : 'preview_only', blockers,
    comparisonEligible: blockers.length === 0 && comparisonBlockers.length === 0, comparisonBlockers }
}
