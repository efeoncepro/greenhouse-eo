import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetFinanceSupplierFromPostgres = vi.fn()
const mockSyncProviderFromFinanceSupplier = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/finance/postgres-store', () => ({
  getFinanceSupplierFromPostgres: (...args: unknown[]) => mockGetFinanceSupplierFromPostgres(...args)
}))

vi.mock('@/lib/providers/canonical', () => ({
  syncProviderFromFinanceSupplier: (...args: unknown[]) => mockSyncProviderFromFinanceSupplier(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import { providerBqSyncProjection } from '@/lib/sync/projections/provider-bq-sync'

describe('providerBqSyncProjection (TASK-771 Slice 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares the canonical contract: domain=finance, triggerEvents=[provider.upserted], maxRetries=3', () => {
    expect(providerBqSyncProjection.name).toBe('provider_bq_sync')
    expect(providerBqSyncProjection.domain).toBe('finance')
    expect(providerBqSyncProjection.triggerEvents).toEqual(['provider.upserted'])
    expect(providerBqSyncProjection.maxRetries).toBe(3)
  })

  it('extracts scope from payload.supplierId', () => {
    expect(providerBqSyncProjection.extractScope({ supplierId: 'figma-inc', providerId: 'figma' })).toEqual({
      entityType: 'finance_supplier',
      entityId: 'figma-inc'
    })
  })

  it('returns null scope when payload has no supplierId (provider not linked to a finance supplier)', () => {
    expect(providerBqSyncProjection.extractScope({ providerId: 'orphan-provider' })).toBeNull()
    expect(providerBqSyncProjection.extractScope({ supplierId: '' })).toBeNull()
    expect(providerBqSyncProjection.extractScope({})).toBeNull()
  })

  it('re-reads supplier from PG and calls syncProviderFromFinanceSupplier with fresh data', async () => {
    mockGetFinanceSupplierFromPostgres.mockResolvedValue({
      supplierId: 'figma-inc',
      providerId: 'figma',
      legalName: 'Figma, Inc',
      tradeName: 'Figma',
      website: 'https://figma.com',
      isActive: true
    })
    mockSyncProviderFromFinanceSupplier.mockResolvedValue({ providerId: 'figma', providerName: 'Figma' })

    const result = await providerBqSyncProjection.refresh(
      { entityType: 'finance_supplier', entityId: 'figma-inc' },
      { supplierId: 'figma-inc', providerId: 'figma' }
    )

    expect(mockGetFinanceSupplierFromPostgres).toHaveBeenCalledWith('figma-inc')
    expect(mockSyncProviderFromFinanceSupplier).toHaveBeenCalledWith({
      supplierId: 'figma-inc',
      providerId: 'figma',
      legalName: 'Figma, Inc',
      tradeName: 'Figma',
      website: 'https://figma.com',
      isActive: true
    })
    expect(result).toContain('provider_bq_sync ok for figma-inc')
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns skip message (no throw) when supplier was deleted from PG between event emission and refresh', async () => {
    mockGetFinanceSupplierFromPostgres.mockResolvedValue(null)

    const result = await providerBqSyncProjection.refresh(
      { entityType: 'finance_supplier', entityId: 'ghost-supplier' },
      { supplierId: 'ghost-supplier' }
    )

    expect(result).toContain('skipped: supplier ghost-supplier not found')
    expect(mockSyncProviderFromFinanceSupplier).not.toHaveBeenCalled()
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('captures + re-throws when PG lookup fails (so reactive consumer routes to retry)', async () => {
    const pgError = new Error('Postgres connection lost')

    mockGetFinanceSupplierFromPostgres.mockRejectedValue(pgError)

    await expect(
      providerBqSyncProjection.refresh(
        { entityType: 'finance_supplier', entityId: 'figma-inc' },
        { supplierId: 'figma-inc' }
      )
    ).rejects.toThrow('Postgres connection lost')

    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      pgError,
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'provider_bq_sync', stage: 'pg_lookup' })
      })
    )
    expect(mockSyncProviderFromFinanceSupplier).not.toHaveBeenCalled()
  })

  it('captures + re-throws when BQ sync fails (so reactive consumer routes to retry / dead-letter)', async () => {
    const bqError = new Error('BigQuery: dataset not found')

    mockGetFinanceSupplierFromPostgres.mockResolvedValue({
      supplierId: 'figma-inc',
      providerId: 'figma',
      legalName: 'Figma, Inc',
      tradeName: 'Figma',
      website: null,
      isActive: true
    })
    mockSyncProviderFromFinanceSupplier.mockRejectedValue(bqError)

    await expect(
      providerBqSyncProjection.refresh(
        { entityType: 'finance_supplier', entityId: 'figma-inc' },
        { supplierId: 'figma-inc' }
      )
    ).rejects.toThrow('BigQuery: dataset not found')

    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      bqError,
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'provider_bq_sync', stage: 'bq_sync' }),
        extra: expect.objectContaining({ supplierId: 'figma-inc', providerId: 'figma' })
      })
    )
  })

  it('returns no-op message when sync returns null (provider id/name unresolvable)', async () => {
    mockGetFinanceSupplierFromPostgres.mockResolvedValue({
      supplierId: 'orphan',
      providerId: null,
      legalName: '',
      tradeName: null,
      website: null,
      isActive: true
    })
    mockSyncProviderFromFinanceSupplier.mockResolvedValue(null)

    const result = await providerBqSyncProjection.refresh(
      { entityType: 'finance_supplier', entityId: 'orphan' },
      { supplierId: 'orphan' }
    )

    expect(result).toContain('no-op for orphan')
  })
})
