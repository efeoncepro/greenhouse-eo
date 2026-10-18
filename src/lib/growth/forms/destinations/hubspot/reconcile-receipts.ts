import 'server-only'

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { HubSpotLeadTraceClient } from './trace-client'
import { listPendingHubspotReceipts, saveHubspotReceiptCheck } from './receipt-store'
import { HUBSPOT_RECEIPT_MAX_CHECKS, isNativeHubspotSubmissionId, type HubSpotFormReceipt } from './receipts'

export type HubSpotReceiptSummary = { checked: number; verified: number; pending: number; terminal: number; unavailable: number }
type Candidate = { attemptId: string; submissionId: string; createdAt: Date | string; receipt: HubSpotFormReceipt }
type Dependencies = {
  list: () => Promise<Candidate[]>
  save: typeof saveHubspotReceiptCheck
  client: Pick<HubSpotLeadTraceClient, 'findFormSubmission'>
  now: () => Date
}

/** Never calls a write endpoint. Eventual visibility and verification are separate from delivery. */
export async function reconcilePendingHubspotReceipts(overrides: Partial<Dependencies> = {}): Promise<HubSpotReceiptSummary> {
  const deps: Dependencies = { list: () => listPendingHubspotReceipts(1), save: saveHubspotReceiptCheck,
    client: new HubSpotLeadTraceClient({ tokenProvider: () => getHubSpotAccessToken() }), now: () => new Date(), ...overrides }

  const summary: HubSpotReceiptSummary = { checked: 0, verified: 0, pending: 0, terminal: 0, unavailable: 0 }
  let candidates: Candidate[]

  try { candidates = await deps.list() }
  catch {
    summary.unavailable++

    return summary
  }

  for (const candidate of candidates.slice(0, 1)) {
    const previous = candidate.receipt
    const now = deps.now()
    const checks = previous.checks + 1

    const receipt: HubSpotFormReceipt = { ...previous, checks, checkedAt: now.toISOString(),
      nextCheckAt: new Date(now.getTime() + Math.min(30 * 60_000, 60_000 * 2 ** previous.checks)).toISOString() }

    delete receipt.safeErrorCode
    let nativeSubmissionId: string | undefined

    try {
      const createdAt = new Date(candidate.createdAt).getTime()

      if (!Number.isFinite(createdAt) || now.getTime() - createdAt >= 24 * 60 * 60_000) {
        receipt.status = 'exhausted'
        receipt.safeErrorCode = 'hubspot_receipt_visibility_window_expired'
        receipt.paginationComplete = false
      } else {
        const evidence = await deps.client.findFormSubmission({ formGuid: previous.formGuid,
          occurrenceMarker: { name: previous.markerProperty, value: previous.markerValue },
          // Reader requires finite bounds, but exact markers are never matched by time/email.
          fromMs: 0, toMs: now.getTime(), maxPages: 3, pageSize: 50 })

        receipt.paginationComplete = evidence.pagination.complete

        if (evidence.status === 'exact_submission' && evidence.pagination.complete && evidence.matchedCount === 1 &&
          isNativeHubspotSubmissionId(evidence.conversionId)) {
          receipt.status = 'verified'
          nativeSubmissionId = evidence.conversionId
        } else if (evidence.status === 'ambiguous') receipt.status = 'ambiguous'
        else if (evidence.status === 'denied') receipt.status = 'denied'
        else {
          receipt.status = checks >= HUBSPOT_RECEIPT_MAX_CHECKS ? 'exhausted' : 'pending'
          if (evidence.safeErrorCode) receipt.safeErrorCode = evidence.safeErrorCode
        }
      }
    } catch {
      receipt.status = checks >= HUBSPOT_RECEIPT_MAX_CHECKS ? 'exhausted' : 'pending'
      receipt.safeErrorCode = 'hubspot_receipt_read_unavailable'
      receipt.paginationComplete = false
    }

    try {
      const saved = await deps.save({ attemptId: candidate.attemptId, previous, receipt, ...(nativeSubmissionId ? { nativeSubmissionId } : {}) })

      if (!saved) { summary.unavailable++; continue }
      summary.checked++
      if (receipt.status === 'verified') summary.verified++
      else if (receipt.status === 'pending') summary.pending++
      else summary.terminal++
    } catch { summary.unavailable++ }
  }

  return summary
}
