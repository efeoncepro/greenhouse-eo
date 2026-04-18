import { beforeEach, describe, expect, it, vi } from 'vitest'

const { executeTakeFirstMock, whereMock, selectFromMock, getDbMock } = vi.hoisted(() => {
  const executeTakeFirstMock = vi.fn()
  const whereMock = vi.fn(() => ({ executeTakeFirst: executeTakeFirstMock }))
  const selectMock = vi.fn(() => ({ where: whereMock }))
  const selectFromMock = vi.fn(() => ({ select: selectMock }))
  const getDbMock = vi.fn(async () => ({ selectFrom: selectFromMock }))

  return { executeTakeFirstMock, whereMock, selectFromMock, getDbMock }
})

vi.mock('@/lib/db', () => ({
  getDb: () => getDbMock()
}))

vi.mock('server-only', () => ({}))

describe('company-lifecycle-store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes unsupported HubSpot stage values to unknown', async () => {
    const { normalizeHubSpotLifecycleStage } = await import('./company-lifecycle-store')

    expect(normalizeHubSpotLifecycleStage('customer')).toBe('customer')
    expect(normalizeHubSpotLifecycleStage(' MarketingQualifiedLead ')).toBe('marketingqualifiedlead')
    expect(normalizeHubSpotLifecycleStage('misterioso')).toBe('unknown')
    expect(normalizeHubSpotLifecycleStage(null)).toBe('unknown')
  })

  it('reads lifecycle stage snapshots from greenhouse_core.clients', async () => {
    executeTakeFirstMock.mockResolvedValueOnce({
      client_id: 'client-1',
      hubspot_company_id: 'hub-1',
      lifecyclestage: 'customer',
      lifecyclestage_source: 'hubspot_sync',
      lifecyclestage_updated_at: '2026-04-18T23:00:00.000Z'
    })

    const { getClientLifecycleStage } = await import('./company-lifecycle-store')
    const result = await getClientLifecycleStage('client-1')

    expect(selectFromMock).toHaveBeenCalledWith('greenhouse_core.clients')
    expect(whereMock).toHaveBeenCalledWith('client_id', '=', 'client-1')
    expect(result).toEqual({
      clientId: 'client-1',
      hubspotCompanyId: 'hub-1',
      stage: 'customer',
      source: 'hubspot_sync',
      updatedAt: '2026-04-18T23:00:00.000Z'
    })
  })
})
