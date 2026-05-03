/**
 * TASK-766 Slice 4b — anti-regresión para /api/finance/dashboard/cashflow.
 *
 * Antes de Slice 4b el endpoint multiplicaba en TS:
 *   `toNumber(r.amount) * (toNumber(r.exchange_rate_to_clp) || 1)`
 * a partir de un SELECT que JOIN-eaba ip.amount con income.exchange_rate_to_clp.
 * Mismo anti-patrón del incidente cash-out (TASK-766 Slice 3): cuando
 * ip.currency ≠ income.currency (caso CCA TASK-714c) el cashIncome se infla.
 *
 * Post Slice 4b: el endpoint lee `payment_amount_clp` directo de la VIEW
 * canónica `income_payments_normalized` que aplica el COALESCE canónico
 * y filtra 3-axis supersede automáticamente. Cero math casero TS-side.
 *
 * Estos tests detectan regresiones:
 *  - Si vuelve la multiplicación TS, el assertion del caso CCA falla.
 *  - Si el endpoint deja de leer la VIEW canónica, el mock SQL falla.
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

describe('GET /api/finance/dashboard/cashflow — TASK-766 Slice 4b anti-regresión', () => {
  it('reads payment_amount_clp from income_payments_normalized VIEW (NEVER ip.amount × rate)', async () => {
    // Order: pgIncomeAccrual, pgPayments, pgExpenseAccrual, pgExpenseCash.
    runQueryMock
      .mockResolvedValueOnce([]) // accrual income
      .mockResolvedValueOnce([
        // Caso CCA del incidente: payment $1.1M CLP cuyo income subyacente es USD.
        // La VIEW devuelve payment_amount_clp = 1_106_321 (canónico).
        // Pre-fix el TS hubiera computado 1_106_321 × 910.55 = $1B.
        { payment_date: '2026-04-15', payment_amount_clp: '1106321' },
        { payment_date: '2026-04-20', payment_amount_clp: '500000' }
      ])
      .mockResolvedValueOnce([]) // expense accrual
      .mockResolvedValueOnce([]) // expense cash

    const response = await GET()
    const body = await response.json()

    // Verifica que el SELECT lea de la VIEW canónica.
    const incomePaymentsCall = runQueryMock.mock.calls[1]?.[0] as string

    expect(incomePaymentsCall).toContain('income_payments_normalized')
    expect(incomePaymentsCall).toContain('payment_amount_clp')

    // Anti-regresión: el SELECT NO debe contener el patrón legacy.
    expect(incomePaymentsCall).not.toContain('ip.amount')
    expect(incomePaymentsCall).not.toContain('exchange_rate_to_clp')

    // El mes 2026-04 debe sumar 1_106_321 + 500_000 = 1_606_321 (canónico,
    // no $1B fantasma).
    const aprilMonth = body.months.find((m: { period: string }) => m.period === '2026-04')

    expect(aprilMonth).toBeDefined()
    expect(aprilMonth.cashIncome).toBe(1_606_321)

    // Hard ceiling: cualquier total > $20M en este dataset es regresión.
    for (const month of body.months) {
      expect(month.cashIncome).toBeLessThan(20_000_000)
    }
  })

  it('excludes payment_amount_clp NULL rows (drift) from totals', async () => {
    runQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { payment_date: '2026-04-15', payment_amount_clp: '1000000' },
        // Drift: non-CLP sin amount_clp persistido. La VIEW devuelve NULL.
        // Mismo criterio que sumIncomePaymentsClpForPeriod: excluido del SUM.
        { payment_date: '2026-04-20', payment_amount_clp: null }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const response = await GET()
    const body = await response.json()

    const aprilMonth = body.months.find((m: { period: string }) => m.period === '2026-04')

    expect(aprilMonth.cashIncome).toBe(1_000_000)
  })

  it('returns 401 without tenant context', async () => {
    requireFinanceMock.mockResolvedValueOnce({ tenant: null, errorResponse: null })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(runQueryMock).not.toHaveBeenCalled()
  })
})
