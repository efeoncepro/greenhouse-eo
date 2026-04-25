import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockPushIncomeToHubSpot = vi.fn()

vi.mock('@/lib/finance/income-hubspot/push-income-to-hubspot', () => ({
  pushIncomeToHubSpot: (...args: unknown[]) => mockPushIncomeToHubSpot(...args)
}))

import {
  INCOME_HUBSPOT_OUTBOUND_TRIGGER_EVENTS,
  incomeHubSpotOutboundProjection
} from '../income-hubspot-outbound'

describe('incomeHubSpotOutboundProjection', () => {
  it('is registered with canonical name + cost_intelligence domain', () => {
    expect(incomeHubSpotOutboundProjection.name).toBe('income_hubspot_outbound')
    expect(incomeHubSpotOutboundProjection.domain).toBe('cost_intelligence')
  })

  it('triggers on create/update/nubox_synced', () => {
    expect(INCOME_HUBSPOT_OUTBOUND_TRIGGER_EVENTS).toEqual([
      'finance.income.created',
      'finance.income.updated',
      'finance.income.nubox_synced'
    ])
  })

  it('extractScope returns income scope from payload', () => {
    expect(
      incomeHubSpotOutboundProjection.extractScope({ incomeId: 'INC-000001' })
    ).toEqual({ entityType: 'income', entityId: 'INC-000001' })

    // snake_case alias
    expect(
      incomeHubSpotOutboundProjection.extractScope({ income_id: 'INC-000002' })
    ).toEqual({ entityType: 'income', entityId: 'INC-000002' })
  })

  it('extractScope returns null for payloads without an income id', () => {
    expect(incomeHubSpotOutboundProjection.extractScope({})).toBeNull()
    expect(incomeHubSpotOutboundProjection.extractScope({ other: 'field' })).toBeNull()
  })

  it('refresh delegates to pushIncomeToHubSpot and stringifies status', async () => {
    mockPushIncomeToHubSpot.mockResolvedValueOnce({
      incomeId: 'INC-000001',
      status: 'synced',
      hubspotInvoiceId: 'hs-1',
      message: 'Invoice created in HubSpot'
    })

    const message = await incomeHubSpotOutboundProjection.refresh(
      { entityType: 'income', entityId: 'INC-000001' },
      {}
    )

    expect(message).toBe('income_hubspot_outbound INC-000001: synced')
    expect(mockPushIncomeToHubSpot).toHaveBeenCalledWith('INC-000001')
  })
})
