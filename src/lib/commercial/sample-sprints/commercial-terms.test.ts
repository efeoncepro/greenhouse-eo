import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

import { query, withTransaction } from '@/lib/db'

import {
  CommercialTermsConflictError,
  CommercialTermsValidationError,
  declareCommercialTerms,
  getActiveCommercialTerms
} from './commercial-terms'

import type { ServiceNotEligibleForCommercialTermsError } from './commercial-terms'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>

const buildClient = (responses: Array<{ rows: unknown[] }>) => {
  const queryMock = vi.fn(async (text: string) => {
    if (responses.length > 0) return responses.shift() ?? { rows: [] }
    if (text.includes('engagement_audit_log')) return { rows: [{ audit_id: 'engagement-audit-1' }] }

    return { rows: [] }
  })

  return { query: queryMock }
}

describe('engagement commercial terms helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => {
      return run(buildClient([]))
    })
  })

  it('returns the active terms for a service and date', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        terms_id: '3d0fdf93-9ef0-4894-bfd0-87f7151a1111',
        service_id: 'SVC-HS-123',
        terms_kind: 'success_fee',
        effective_from: '2026-05-01',
        effective_to: null,
        monthly_amount_clp: '0.00',
        success_criteria: { conversion: 'signed_contract' },
        declared_by: 'user-1',
        declared_at: '2026-05-07T06:00:00.000Z',
        reason: 'Approved success fee terms'
      }
    ])

    const terms = await getActiveCommercialTerms('SVC-HS-123', '2026-05-07')

    expect(terms).toEqual({
      termsId: '3d0fdf93-9ef0-4894-bfd0-87f7151a1111',
      serviceId: 'SVC-HS-123',
      termsKind: 'success_fee',
      effectiveFrom: '2026-05-01',
      effectiveTo: null,
      monthlyAmountClp: 0,
      successCriteria: { conversion: 'signed_contract' },
      declaredBy: 'user-1',
      declaredAt: '2026-05-07T06:00:00.000Z',
      reason: 'Approved success fee terms'
    })

    const sql = mockedQuery.mock.calls[0][0] as string

    expect(sql).toContain("s.status != 'legacy_seed_archived'")
    expect(sql).toContain("s.hubspot_sync_status IS DISTINCT FROM 'unmapped'")
  })

  it('returns null when there are no active terms', async () => {
    mockedQuery.mockResolvedValueOnce([])

    await expect(getActiveCommercialTerms('SVC-HS-123', '2026-05-07')).resolves.toBeNull()
  })

  it('declares new terms transactionally', async () => {
    const client = buildClient([
      { rows: [{ service_id: 'SVC-HS-123', active: true, status: 'active', hubspot_sync_status: 'synced' }] },
      { rows: [] },
      { rows: [{ terms_id: 'terms-1' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    const result = await declareCommercialTerms({
      serviceId: 'SVC-HS-123',
      kind: 'committed',
      effectiveFrom: '2026-05-07',
      monthlyAmountClp: 1500000,
      reason: 'Signed commercial terms',
      declaredBy: 'user-1'
    })

    expect(result).toEqual({ termsId: 'terms-1' })
    expect(client.query).toHaveBeenCalledTimes(5)
    const calls = client.query.mock.calls as unknown as Array<[string, unknown[]?]>

    expect(calls[1][0]).toContain('SET effective_to = $2::date')
    expect(calls[2][0]).toContain('INSERT INTO greenhouse_commercial.engagement_commercial_terms')
    expect(calls[3][0]).toContain('INSERT INTO greenhouse_commercial.engagement_audit_log')
    expect(calls[4][0]).toContain('INSERT INTO greenhouse_sync.outbox_events')
  })

  it('rejects TASK-813 legacy archived services before writing', async () => {
    const client = buildClient([
      {
        rows: [
          {
            service_id: 'svc-legacy',
            active: false,
            status: 'legacy_seed_archived',
            hubspot_sync_status: 'legacy_seed_archived'
          }
        ]
      }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      declareCommercialTerms({
        serviceId: 'svc-legacy',
        kind: 'no_cost',
        effectiveFrom: '2026-05-07',
        reason: 'Manual legacy cleanup guard',
        declaredBy: 'user-1'
      })
    ).rejects.toMatchObject({
      name: 'ServiceNotEligibleForCommercialTermsError',
      reasonCode: 'legacy_seed_archived'
    } satisfies Partial<ServiceNotEligibleForCommercialTermsError>)

    expect(client.query).toHaveBeenCalledTimes(1)
  })

  it('rejects unmapped HubSpot services before writing', async () => {
    const client = buildClient([
      { rows: [{ service_id: 'SVC-HS-999', active: true, status: 'active', hubspot_sync_status: 'unmapped' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      declareCommercialTerms({
        serviceId: 'SVC-HS-999',
        kind: 'success_fee',
        effectiveFrom: '2026-05-07',
        successCriteria: { conversion: 'approved' },
        reason: 'Waiting for mapped service',
        declaredBy: 'user-1'
      })
    ).rejects.toMatchObject({
      name: 'ServiceNotEligibleForCommercialTermsError',
      reasonCode: 'unmapped'
    } satisfies Partial<ServiceNotEligibleForCommercialTermsError>)

    expect(client.query).toHaveBeenCalledTimes(1)
  })

  it('maps partial unique index races to a conflict error', async () => {
    const client = buildClient([
      { rows: [{ service_id: 'SVC-HS-123', active: true, status: 'active', hubspot_sync_status: 'synced' }] },
      { rows: [] }
    ])

    client.query.mockImplementationOnce(async () => ({
      rows: [{ service_id: 'SVC-HS-123', active: true, status: 'active', hubspot_sync_status: 'synced' }]
    }))
    client.query.mockImplementationOnce(async () => ({ rows: [] }))
    client.query.mockImplementationOnce(async () => {
      const error = new Error('duplicate key value violates unique constraint')

      Object.assign(error, { code: '23505', constraint: 'engagement_commercial_terms_active_unique' })
      throw error
    })

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      declareCommercialTerms({
        serviceId: 'SVC-HS-123',
        kind: 'no_cost',
        effectiveFrom: '2026-05-07',
        reason: 'Concurrent declaration test',
        declaredBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(CommercialTermsConflictError)
  })

  it('validates success fee criteria and no-cost amounts before opening a transaction', async () => {
    await expect(
      declareCommercialTerms({
        serviceId: 'SVC-HS-123',
        kind: 'success_fee',
        effectiveFrom: '2026-05-07',
        reason: 'Missing criteria test',
        declaredBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(CommercialTermsValidationError)

    await expect(
      declareCommercialTerms({
        serviceId: 'SVC-HS-123',
        kind: 'no_cost',
        effectiveFrom: '2026-05-07',
        monthlyAmountClp: 1,
        reason: 'No cost amount test',
        declaredBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(CommercialTermsValidationError)

    expect(mockedWithTransaction).not.toHaveBeenCalled()
  })
})
