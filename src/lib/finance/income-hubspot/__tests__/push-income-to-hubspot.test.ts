import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

const mockUpsertInvoice = vi.fn()

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  upsertHubSpotGreenhouseInvoice: (...args: unknown[]) => mockUpsertInvoice(...args)
}))

const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import { IncomeNotFoundError } from '../types'
import { pushIncomeToHubSpot } from '../push-income-to-hubspot'

const SNAPSHOT_ROW = {
  income_id: 'INC-000001',
  hubspot_invoice_id: null,
  hubspot_company_id: 'company-1',
  hubspot_deal_id: 'deal-1',
  hubspot_sync_attempt_count: 0,
  invoice_number: 'F-001',
  invoice_date: '2026-04-21',
  due_date: '2026-05-21',
  currency: 'CLP',
  subtotal: 100000,
  tax_amount: 19000,
  total_amount: 119000,
  total_amount_clp: 119000,
  exchange_rate_to_clp: 1,
  description: 'Servicios abril'
}

describe('pushIncomeToHubSpot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws IncomeNotFoundError when the row does not exist', async () => {
    mockQuery.mockResolvedValueOnce([])

    await expect(pushIncomeToHubSpot('INC-missing')).rejects.toBeInstanceOf(IncomeNotFoundError)
    expect(mockUpsertInvoice).not.toHaveBeenCalled()
  })

  it('persists skipped_no_anchors trace when the income has neither company nor deal', async () => {
    mockQuery
      .mockResolvedValueOnce([{ ...SNAPSHOT_ROW, hubspot_company_id: null, hubspot_deal_id: null }])
      .mockResolvedValueOnce(undefined) // UPDATE trace

    const result = await pushIncomeToHubSpot('INC-000001')

    expect(result.status).toBe('skipped_no_anchors')
    expect(mockUpsertInvoice).not.toHaveBeenCalled()

    // UPDATE trace with skipped status
    const traceCall = mockQuery.mock.calls[1]

    expect(traceCall[0]).toContain('UPDATE greenhouse_finance.income')
    expect(traceCall[1]).toContain('skipped_no_anchors')

    // Failed event with skipped_no_anchors reason
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'finance.income.hubspot_sync_failed',
        payload: expect.objectContaining({ status: 'skipped_no_anchors' })
      }),
      undefined
    )
  })

  it('records endpoint_not_deployed when Cloud Run route is missing and does not rethrow', async () => {
    mockQuery
      .mockResolvedValueOnce([SNAPSHOT_ROW])
      .mockResolvedValueOnce([]) // line items
      .mockResolvedValueOnce(undefined) // trace UPDATE

    mockUpsertInvoice.mockResolvedValueOnce({
      status: 'endpoint_not_deployed',
      hubspotInvoiceId: null,
      message: 'Cloud Run /invoices not deployed yet'
    })

    const result = await pushIncomeToHubSpot('INC-000001')

    expect(result.status).toBe('endpoint_not_deployed')
    expect(result.message).toContain('not deployed')

    const traceCall = mockQuery.mock.calls[2]

    expect(traceCall[1]).toContain('endpoint_not_deployed')

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'finance.income.hubspot_sync_failed',
        payload: expect.objectContaining({ status: 'endpoint_not_deployed' })
      }),
      undefined
    )
  })

  it('persists synced trace and emits synced event on a successful upsert', async () => {
    mockQuery
      .mockResolvedValueOnce([SNAPSHOT_ROW])
      .mockResolvedValueOnce([]) // line items → synthetic fallback
      .mockResolvedValueOnce(undefined) // trace UPDATE

    mockUpsertInvoice.mockResolvedValueOnce({
      status: 'created',
      hubspotInvoiceId: 'hs-invoice-1'
    })

    const result = await pushIncomeToHubSpot('INC-000001')

    expect(result.status).toBe('synced')
    expect(result.hubspotInvoiceId).toBe('hs-invoice-1')

    const upsertCall = mockUpsertInvoice.mock.calls[0][0]

    expect(upsertCall.incomeId).toBe('INC-000001')
    expect(upsertCall.isBillable).toBe(false)
    expect(upsertCall.associations).toEqual({
      hubspotCompanyId: 'company-1',
      hubspotDealId: 'deal-1'
    })

    // Synthetic line item built from total_amount when no rows in income_line_items.
    expect(upsertCall.lineItems).toHaveLength(1)
    expect(upsertCall.lineItems[0].unitPrice).toBe(119000)

    const traceCall = mockQuery.mock.calls[2]

    expect(traceCall[1]).toContain('synced')
    expect(traceCall[1]).toContain('hs-invoice-1')

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'income',
        aggregateId: 'INC-000001',
        eventType: 'finance.income.hubspot_synced'
      }),
      undefined
    )
  })

  it('uses income_line_items when available instead of synthesizing', async () => {
    mockQuery
      .mockResolvedValueOnce([SNAPSHOT_ROW])
      .mockResolvedValueOnce([
        {
          description: 'Servicio A',
          quantity: 2,
          unit_price: 50000,
          discount_percent: 0,
          is_exempt: false,
          total_amount: 100000
        },
        {
          description: 'Servicio B',
          quantity: 1,
          unit_price: 19000,
          discount_percent: null,
          is_exempt: null,
          total_amount: 19000
        }
      ])
      .mockResolvedValueOnce(undefined)

    mockUpsertInvoice.mockResolvedValueOnce({ status: 'updated', hubspotInvoiceId: 'hs-invoice-2' })

    await pushIncomeToHubSpot('INC-000001')

    const upsertCall = mockUpsertInvoice.mock.calls[0][0]

    expect(upsertCall.lineItems).toHaveLength(2)
    expect(upsertCall.lineItems[0].description).toBe('Servicio A')
    expect(upsertCall.lineItems[1].description).toBe('Servicio B')
  })

  it('persists failed trace and rethrows on Cloud Run 5xx', async () => {
    mockQuery
      .mockResolvedValueOnce([SNAPSHOT_ROW])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)

    mockUpsertInvoice.mockRejectedValueOnce(new Error('HubSpot 503 Service Unavailable'))

    await expect(pushIncomeToHubSpot('INC-000001')).rejects.toThrow(/503/)

    const traceCall = mockQuery.mock.calls[2]

    expect(traceCall[1]).toContain('failed')

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'finance.income.hubspot_sync_failed',
        payload: expect.objectContaining({ status: 'failed' })
      }),
      undefined
    )
  })

  it('increments attempt count on every call', async () => {
    mockQuery
      .mockResolvedValueOnce([{ ...SNAPSHOT_ROW, hubspot_sync_attempt_count: 4 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)

    mockUpsertInvoice.mockResolvedValueOnce({ status: 'updated', hubspotInvoiceId: 'hs-invoice-1' })

    await pushIncomeToHubSpot('INC-000001')

    const traceCall = mockQuery.mock.calls[2]

    expect(traceCall[1]).toContain(5) // attemptCount
  })
})
