/**
 * TASK-766 Slice 4a — anti-regresion para /api/finance/dashboard/summary.
 *
 * Pre-migracion la query de payments computaba per-row:
 *   ROUND(ip.amount * COALESCE(i.exchange_rate_to_clp, 1), 2) AS amount_clp
 *
 * Post-migracion lee directo de la VIEW canonica
 * `income_payments_normalized` que expone `payment_amount_clp` canonico
 * (COALESCE chain) y filtra 3-axis supersede.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runQueryMock = vi.fn()
const requireFinanceMock = vi.fn()
const isPostgresEnabledMock = vi.fn(() => true)
const getCompanyCostMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => requireFinanceMock()
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  isFinanceSlice2PostgresEnabled: () => isPostgresEnabledMock()
}))

vi.mock('@/lib/payroll/total-company-cost', () => ({
  getLatestPeriodCompanyCost: () => getCompanyCostMock()
}))

import { GET } from './route'

beforeEach(() => {
  runQueryMock.mockReset()
  requireFinanceMock.mockReset()
  isPostgresEnabledMock.mockReturnValue(true)
  getCompanyCostMock.mockResolvedValue(null)

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

describe('GET /api/finance/dashboard/summary — TASK-766 anti-regresion', () => {
  it('payments query reads from income_payments_normalized VIEW (NEVER per-row × rate)', async () => {
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('FROM greenhouse_finance.income_payments_normalized')) {
        return Promise.resolve([
          { payment_date: '2026-04-15', amount_clp: '1106321' }
        ])
      }

      if (query.includes('FROM greenhouse_finance.income')) {
        return Promise.resolve([])
      }

      if (query.includes('FROM greenhouse_finance.expenses')) {
        return Promise.resolve([])
      }

      return Promise.resolve([])
    })

    const response = await GET()

    expect(response.status).toBe(200)

    const paymentsCall = runQueryMock.mock.calls.find((call) =>
      String(call[0]).includes('income_payments_normalized')
    )

    expect(paymentsCall).toBeDefined()

    const sql = String(paymentsCall![0])

    expect(sql).toContain('payment_amount_clp')
    expect(sql).not.toMatch(/ip\.amount\s*\*\s*COALESCE/i)
    expect(sql).not.toMatch(/ROUND\s*\(\s*ip\.amount\s*\*/i)
  })

  it('reads payment_amount_clp directly (real value $1.1M, never $1B inflado)', async () => {
    // Mock con el caso del incidente: 1 pago HubSpot CCA $1,106,321 CLP
    // (payment.currency=CLP, expense.currency=USD rate 910.55).
    // El anti-patron lo inflaba a $1,007,363,090. La VIEW lo devuelve correcto.
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('FROM greenhouse_finance.income_payments_normalized')) {
        return Promise.resolve([
          { payment_date: '2026-04-15', amount_clp: '1106321' }
        ])
      }

      if (query.includes('FROM greenhouse_finance.income')) {
        return Promise.resolve([])
      }

      if (query.includes('FROM greenhouse_finance.expenses')) {
        return Promise.resolve([])
      }

      return Promise.resolve([])
    })

    const response = await GET()
    const body = await response.json()

    // Pago de abril aparece en cash flow; total en mes-corriente para income
    // depende del mes calendario actual, pero anti-regresion checkea limites
    // razonables para evitar inflado por anti-patron.
    expect(body.cash.incomeMonth).toBeLessThan(50_000_000)
    expect(body.cash.incomeMonth).toBeGreaterThanOrEqual(0)
  })

  it('handles drift rows (payment_amount_clp NULL) without crashing', async () => {
    // Cuando un payment es non-CLP sin amount_clp persistido, la VIEW
    // devuelve NULL en payment_amount_clp + has_clp_drift=TRUE.
    // El consumer trata NULL como 0 (drift se excluye de totals).
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('FROM greenhouse_finance.income_payments_normalized')) {
        return Promise.resolve([
          { payment_date: '2026-04-15', amount_clp: null }
        ])
      }

      if (query.includes('FROM greenhouse_finance.income')) {
        return Promise.resolve([])
      }

      if (query.includes('FROM greenhouse_finance.expenses')) {
        return Promise.resolve([])
      }

      return Promise.resolve([])
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.cash.incomeMonth).toBe(0)
  })

  it('returns 401 without tenant context', async () => {
    requireFinanceMock.mockResolvedValueOnce({ tenant: null, errorResponse: null })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(runQueryMock).not.toHaveBeenCalled()
  })
})
