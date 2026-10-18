import { describe, expect, it, vi } from 'vitest'

import { reconcilePendingHubspotReceipts } from '../reconcile-receipts'
import { createHubSpotFormReceipt, HUBSPOT_SUBMISSION_ID_PROPERTY } from '../receipts'
import type { HubSpotSubmissionEvidence } from '../trace-client'
import type { HubSpotSubmissionQuery } from '../trace-client'
import type { saveHubspotReceiptCheck } from '../receipt-store'

const SOURCE = 'fsub-b2222222-2222-4222-8222-222222222222'
const NATIVE = 'e5555555-5555-4555-8555-555555555555'
const NOW = new Date('2026-10-17T20:05:00Z')

function fixture() {
  const receipt = createHubSpotFormReceipt({ portalId: '48713323', formGuid: 'd4444444-4444-4444-8444-444444444444', submissionIdProperty: HUBSPOT_SUBMISSION_ID_PROPERTY }, SOURCE, new Date('2026-10-17T20:00:00Z'))!
  const candidate = { attemptId: 'fatt-11111111-1111-4111-8111-111111111111', submissionId: SOURCE, createdAt: '2026-10-17T20:00:00Z', receipt }

  const evidence: HubSpotSubmissionEvidence = { status: 'exact_submission', portalId: '48713323', formGuid: receipt.formGuid,
    conversionId: NATIVE, matchedCount: 1, matches: [], pagination: { pages: 1, complete: true, hasMore: false, rowsInspected: 1 } }

  const client = { findFormSubmission: vi.fn<(input: HubSpotSubmissionQuery) => Promise<HubSpotSubmissionEvidence>>(async () => evidence) }
  const save = vi.fn<typeof saveHubspotReceiptCheck>(async () => true)
  const deps = { list: vi.fn(async () => [candidate]), save, client, now: () => NOW }

  return { receipt, candidate, evidence, deps, client, save }
}

describe('GET-only receipt recovery', () => {
  it('persists native conversion ID only with exact and complete occurrence evidence', async () => {
    const f = fixture()

    expect(await reconcilePendingHubspotReceipts(f.deps)).toMatchObject({ checked: 1, verified: 1 })
    expect(f.client.findFormSubmission).toHaveBeenCalledWith(expect.objectContaining({ occurrenceMarker: { name: HUBSPOT_SUBMISSION_ID_PROPERTY, value: SOURCE } }))
    expect(f.client.findFormSubmission.mock.calls[0][0]).not.toHaveProperty('email')
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ nativeSubmissionId: NATIVE, previous: f.receipt,
      receipt: expect.objectContaining({ status: 'verified', checks: 1, paginationComplete: true }) }))
  })
  it.each(['partial', 'not_found', 'unavailable'] as const)('retries GET evidence %s without another POST or changing commercial delivery', async status => {
    const f = fixture()

    f.evidence.status = status
    f.evidence.pagination.complete = status === 'not_found'
    expect(await reconcilePendingHubspotReceipts(f.deps)).toMatchObject({ pending: 1, verified: 0 })
    expect(f.save.mock.calls[0][0]).not.toHaveProperty('nativeSubmissionId')
  })
  it.each(['ambiguous', 'denied'] as const)('keeps terminal evidence %s explicit', async status => {
    const f = fixture()

    f.evidence.status = status
    expect(await reconcilePendingHubspotReceipts(f.deps)).toMatchObject({ terminal: 1, verified: 0 })
    expect(f.save.mock.calls[0][0].receipt.status).toBe(status)
    expect(f.save.mock.calls[0][0]).not.toHaveProperty('nativeSubmissionId')
  })
  it('exhausts after eight read checks', async () => {
    const f = fixture()

    f.receipt.checks = 7
    f.evidence.status = 'not_found'
    expect(await reconcilePendingHubspotReceipts(f.deps)).toMatchObject({ terminal: 1 })
    expect(f.save.mock.calls[0][0].receipt.status).toBe('exhausted')
  })
  it('expires evidence after 24 hours without making an API call', async () => {
    const f = fixture()

    f.candidate.createdAt = '2026-10-16T20:00:00Z'
    expect(await reconcilePendingHubspotReceipts(f.deps)).toMatchObject({ terminal: 1 })
    expect(f.client.findFormSubmission).not.toHaveBeenCalled()
  })
  it('does not report success after a lost CAS or persistence failure', async () => {
    const f = fixture()

    f.save.mockResolvedValue(false)
    expect(await reconcilePendingHubspotReceipts(f.deps)).toMatchObject({ verified: 0, unavailable: 1 })
    f.save.mockRejectedValue(new Error('private provider payload'))
    expect(JSON.stringify(await reconcilePendingHubspotReceipts(f.deps))).not.toContain('private')
  })
  it('bounds the worker to one candidate per tick and isolates read/store exceptions', async () => {
    const f = fixture()

    f.deps.list.mockResolvedValue([f.candidate, f.candidate])
    await reconcilePendingHubspotReceipts(f.deps)
    expect(f.client.findFormSubmission).toHaveBeenCalledTimes(1)
    f.deps.list.mockRejectedValue(new Error('raw database error'))
    expect(await reconcilePendingHubspotReceipts(f.deps)).toEqual({ checked: 0, verified: 0, pending: 0, terminal: 0, unavailable: 1 })
  })
  it('handles thrown read failures as bounded evidence retries', async () => {
    const f = fixture()

    f.client.findFormSubmission.mockRejectedValue(new Error('raw secret'))
    expect(await reconcilePendingHubspotReceipts(f.deps)).toMatchObject({ pending: 1 })
    expect(f.save.mock.calls[0][0].receipt.safeErrorCode).toBe('hubspot_receipt_read_unavailable')
  })
})
