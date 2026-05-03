import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FinanceValidationError } from '@/lib/finance/shared'

vi.mock('@/lib/finance/shared', async () => {
  const actual = await vi.importActual('@/lib/finance/shared')

  return {
    ...actual,
    getFinanceProjectId: () => {
      throw new Error('Missing GCP_PROJECT or GOOGLE_CLOUD_PROJECT environment variable')
    },
    runFinanceQuery: vi.fn()
  }
})

vi.mock('@/lib/finance/postgres-store', async () => {
  const actual = await vi.importActual('@/lib/finance/postgres-store')

  return {
    ...actual,
    getFinanceEconomicIndicatorAtOrBeforeFromPostgres: vi.fn(async () => {
      throw new FinanceValidationError(
        'Finance Postgres store is not configured in this environment.',
        503,
        { missingConfig: true },
        'FINANCE_POSTGRES_NOT_CONFIGURED'
      )
    }),
    getLatestFinanceEconomicIndicatorFromPostgres: vi.fn(async () => {
      throw new FinanceValidationError(
        'Finance Postgres store is not configured in this environment.',
        503,
        { missingConfig: true },
        'FINANCE_POSTGRES_NOT_CONFIGURED'
      )
    }),
    upsertFinanceEconomicIndicatorInPostgres: vi.fn(async () => undefined)
  }
})

import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'

describe('economic indicator read-through fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves UF from mindicador when Postgres and BigQuery are unavailable', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        serie: [
          { fecha: '2026-04-29T03:00:00.000Z', valor: 39000 },
          { fecha: '2026-04-30T03:00:00.000Z', valor: 39111.11 }
        ]
      })
    } as Response)

    const snapshot = await getHistoricalEconomicIndicatorForPeriod({
      indicatorCode: 'UF',
      periodDate: '2026-04-30'
    })

    expect(snapshot).toMatchObject({
      indicatorCode: 'UF',
      indicatorDate: '2026-04-30',
      value: 39111.11
    })
  })
})
