import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ ready: vi.fn(), pending: vi.fn(), reconcile: vi.fn(), deliver: vi.fn(), insert: vi.fn(), update: vi.fn(), destinations: vi.fn() }))

vi.mock('../store', () => ({ listSubmissionsPendingDispatch: mocks.pending, getConsentSnapshot: vi.fn(async () => null),
  getFormVersionById: vi.fn(async () => null), listDestinationsForVersion: mocks.destinations,
  insertAttempt: mocks.insert, updateSubmissionDeliveryState: mocks.update }))
vi.mock('../destinations/hubspot', () => ({ HUBSPOT_FORMS_ADAPTER_KIND: 'hubspot_forms_secure_submit', deliverToHubSpotForms: mocks.deliver }))
vi.mock('../destinations/hubspot/receipt-store', () => ({ assertHubSpotReceiptStorageReady: mocks.ready }))
vi.mock('../destinations/hubspot/reconcile-receipts', () => ({ reconcilePendingHubspotReceipts: mocks.reconcile }))

import { dispatchPendingSubmissions } from '../dispatch'
import { createHubSpotFormReceipt, HUBSPOT_SUBMISSION_ID_PROPERTY } from '../destinations/hubspot/receipts'

const SOURCE = 'fsub-b2222222-2222-4222-8222-222222222222'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.ready.mockResolvedValue(undefined)
  mocks.pending.mockResolvedValue([])
  mocks.reconcile.mockResolvedValue({ checked: 0, verified: 0, pending: 0, terminal: 0, unavailable: 1 })
})

describe('Forms delivery and evidence recovery isolation', () => {
  it('checks the new schema before any POST and preserves backlog when it is absent', async () => {
    mocks.ready.mockRejectedValue(new Error('receipt storage migration required'))

    await expect(dispatchPendingSubmissions()).rejects.toThrow('receipt storage migration required')
    expect(mocks.pending).not.toHaveBeenCalled()
    expect(mocks.deliver).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('reconciles previously delivered occurrences when the commercial queue is empty', async () => {
    expect(await dispatchPendingSubmissions()).toMatchObject({ processed: 0, hubspotReceipts: { unavailable: 1 } })
    expect(mocks.reconcile).toHaveBeenCalledTimes(1)
    expect(mocks.deliver).not.toHaveBeenCalled()
  })
  it('persists a pending provider receipt with the HTTP attempt while evidence failures leave delivery successful', async () => {
    const receipt = createHubSpotFormReceipt({ portalId: '48713323', formGuid: 'd4444444-4444-4444-8444-444444444444', submissionIdProperty: HUBSPOT_SUBMISSION_ID_PROPERTY }, SOURCE)!

    mocks.pending.mockResolvedValue([{ submission_id: SOURCE, form_version_id: 'fver-1', delivery_attempts: 0, normalized_fields_json: {} }])
    mocks.destinations.mockResolvedValue([{ destination_id: 'fdst-1', provider: 'hubspot', adapter_kind: 'hubspot_forms_secure_submit', adapter_version: 'hsforms-v3-secure-submit', enabled: true, delivery_mode: 'direct' }])
    mocks.deliver.mockResolvedValue({ status: 'succeeded', httpStatus: 200, externalId: 'hsforms-' + SOURCE, retryable: false, providerReceipt: receipt })

    expect(await dispatchPendingSubmissions()).toMatchObject({ processed: 1, delivered: 1, failed: 0, hubspotReceipts: { unavailable: 1 } })
    expect(mocks.deliver).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'succeeded', providerReceipt: receipt }))
    expect(mocks.update).toHaveBeenCalledWith(SOURCE, { status: 'delivered', nextAttemptAt: null })
  })
})
