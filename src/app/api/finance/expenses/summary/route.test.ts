/**
 * TASK-766 Slice 4b — anti-regresión para /api/finance/expenses/summary.
 *
 * Antes de Slice 4b el endpoint multiplicaba en TS:
 *   `toNumber(row.amount) * (toNumber(row.exchange_rate_to_clp) || 1)`
 * sobre el SELECT que JOIN-eaba ep.amount con expenses.exchange_rate_to_clp.
 * Mismo anti-patrón del incidente cash-out (TASK-766 Slice 3): cuando
 * ep.currency ≠ e.currency (caso CCA TASK-714c) el cashCurrentMonth se infla.
 *
 * Post Slice 4b: el endpoint lee `payment_amount_clp` directo desde la
 * VIEW canónica `expense_payments_normalized` (COALESCE canónico + supersede
 * filter automático). Cero math casero TS-side.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runQueryMock = vi.fn()
const requireFinanceMock = vi.fn()
const isPostgresEnabledMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
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

describe('GET /api/finance/expenses/summary — TASK-766 Slice 4b anti-regresión', () => {
  it('reads payment_amount_clp from expense_payments_normalized VIEW (NEVER ep.amount × rate)', async () => {
    // Order: accrual rows, payment rows, missing ledger count.
    runQueryMock
      .mockResolvedValueOnce([]) // accrual expenses
      .mockResolvedValueOnce([
        // Caso CCA del incidente: $1.1M CLP cuya expense base es USD.
        // La VIEW devuelve payment_amount_clp = 1_106_321 canónico.
        // Pre-fix el TS hubiera computado 1_106_321 × 910.55 = $1B fantasma.
        { payment_date: `${todayMonth}-15`, payment_amount_clp: '1106321' },
        { payment_date: `${todayMonth}-20`, payment_amount_clp: '500000' }
      ])
      .mockResolvedValueOnce([{ count: '0' }]) // missing ledger

    const response = await GET()
    const body = await response.json()

    // Verifica que el SELECT lea de la VIEW canónica.
    const paymentSelect = runQueryMock.mock.calls[1]?.[0] as string

    expect(paymentSelect).toContain('expense_payments_normalized')
    expect(paymentSelect).toContain('payment_amount_clp')

    // Anti-regresión: el SELECT NO debe contener el patrón legacy.
    expect(paymentSelect).not.toContain('ep.amount,')
    expect(paymentSelect).not.toContain('exchange_rate_to_clp')

    // El mes corriente debe sumar 1_106_321 + 500_000 = 1_606_321 (canónico,
    // no $1B fantasma).
    expect(body.cashCurrentMonth.totalAmountClp).toBe(1_606_321)
    expect(body.cashCurrentMonth.totalAmountClp).toBeLessThan(20_000_000)
  })

  it('excludes payment_amount_clp NULL rows (drift) from totals', async () => {
    runQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { payment_date: `${todayMonth}-15`, payment_amount_clp: '1000000' },
        // Drift: non-CLP sin amount_clp → NULL → excluido del SUM (mismo
        // criterio que sumExpensePaymentsClpForPeriod).
        { payment_date: `${todayMonth}-20`, payment_amount_clp: null }
      ])
      .mockResolvedValueOnce([{ count: '0' }])

    const response = await GET()
    const body = await response.json()

    expect(body.cashCurrentMonth.totalAmountClp).toBe(1_000_000)
  })

  it('returns 401 without tenant context', async () => {
    requireFinanceMock.mockResolvedValueOnce({ tenant: null, errorResponse: null })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(runQueryMock).not.toHaveBeenCalled()
  })
})
