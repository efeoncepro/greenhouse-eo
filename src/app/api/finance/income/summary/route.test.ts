/**
 * TASK-766 Slice 4b — anti-regresión para /api/finance/income/summary.
 *
 * Antes de Slice 4b el endpoint multiplicaba en TS:
 *   `toNumber(row.amount) * rate` (rate venía de income.exchange_rate_to_clp)
 * sobre el SELECT que JOIN-eaba ip.amount con income.exchange_rate_to_clp.
 * Mismo anti-patrón cash-out: cuando ip.currency ≠ i.currency el
 * cashCurrentMonth se infla.
 *
 * Post Slice 4b: el endpoint lee `payment_amount_clp` directo desde la
 * VIEW canónica `income_payments_normalized` (COALESCE + supersede filter).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runQueryMock = vi.fn()
const requireFinanceMock = vi.fn()
const isPostgresEnabledMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  isFinanceSlice2PostgresEnabled: () => isPostgresEnabledMock()
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => requireFinanceMock()
}))

import { GET } from './route'

beforeEach(() => {
  runQueryMock.mockReset()
  requireFinanceMock.mockReset()
  isPostgresEnabledMock.mockReset()
  isPostgresEnabledMock.mockReturnValue(true)
  requireFinanceMock.mockResolvedValue({
    tenant: {
      userId: 'user-test',
      clientId: 'client-test',
      clientName: 'Test',
      tenantType: 'efeonce_internal',
      roleCodes: ['efeonce_admin'],
      primaryRoleCode: 'efeonce_admin',
      routeGroups: ['internal', 'finance'],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      role: 'efeonce_admin',
      projectIds: [],
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/',
      authMode: 'sso'
    },
    errorResponse: null
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

const todayMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

describe('GET /api/finance/income/summary — TASK-766 Slice 4b anti-regresión', () => {
  it('reads payment_amount_clp from income_payments_normalized VIEW (NEVER ip.amount × rate)', async () => {
    // Order: incomeRows (accrual), paymentRows, missingLedger count.
    runQueryMock
      .mockResolvedValueOnce([]) // accrual income
      .mockResolvedValueOnce([
        // Caso paralelo CCA: payment $1.1M CLP cuya invoice subyacente USD.
        // Pre-fix el TS hubiera multiplicado 1_106_321 × 910.55 = $1B.
        { payment_date: `${todayMonth}-15`, payment_amount_clp: '1106321' },
        { payment_date: `${todayMonth}-20`, payment_amount_clp: '2000000' }
      ])
      .mockResolvedValueOnce([{ count: '0' }]) // missing ledger

    const response = await GET()
    const body = await response.json()

    const paymentSelect = runQueryMock.mock.calls[1]?.[0] as string

    expect(paymentSelect).toContain('income_payments_normalized')
    expect(paymentSelect).toContain('payment_amount_clp')

    // Anti-regresión: el SELECT no debe contener el patrón legacy.
    expect(paymentSelect).not.toContain('ip.amount')
    expect(paymentSelect).not.toContain('exchange_rate_to_clp')

    // Mes corriente: 1_106_321 + 2_000_000 = 3_106_321 canónico (no $1B).
    expect(body.cashCurrentMonth.totalAmountClp).toBe(3_106_321)
    expect(body.cashCurrentMonth.totalAmountClp).toBeLessThan(20_000_000)
  })

  it('excludes payment_amount_clp NULL rows (drift) from totals', async () => {
    runQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { payment_date: `${todayMonth}-15`, payment_amount_clp: '1500000' },
        // Drift: non-CLP sin amount_clp → NULL → excluido del SUM.
        { payment_date: `${todayMonth}-20`, payment_amount_clp: null }
      ])
      .mockResolvedValueOnce([{ count: '0' }])

    const response = await GET()
    const body = await response.json()

    expect(body.cashCurrentMonth.totalAmountClp).toBe(1_500_000)
  })

  it('returns 401 without tenant context', async () => {
    requireFinanceMock.mockResolvedValueOnce({ tenant: null, errorResponse: null })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(runQueryMock).not.toHaveBeenCalled()
  })
})
