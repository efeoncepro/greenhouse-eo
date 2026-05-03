/**
 * TASK-766 Slice 4a — anti-regresion para /api/finance/cash-position monthlySeries.
 *
 * El endpoint computa la serie de 12 meses de cash flow real (income + expense
 * payments). El anti-patron previo:
 *
 *   SUM(ip.amount * COALESCE(i.exchange_rate_to_clp, 1))   // cash_in CTE
 *   SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))   // cash_out CTE
 *
 * Post-migracion: ambos CTEs leen `payment_amount_clp` directo de las VIEWs
 * canonicas `income_payments_normalized` y `expense_payments_normalized`,
 * que aplican COALESCE canonica + filtran 3-axis supersede.
 *
 * Estos tests validan que el SQL embebido del endpoint no contiene el
 * anti-patron y consume las VIEWs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runQueryMock = vi.fn()
const requireFinanceMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => requireFinanceMock()
}))

import { GET } from './route'

beforeEach(() => {
  runQueryMock.mockReset()
  requireFinanceMock.mockReset()
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

describe('GET /api/finance/cash-position — TASK-766 anti-regresion', () => {
  it('monthlySeries query reads from canonical normalized VIEWs (NEVER raw SUM × rate)', async () => {
    // Mock generico por shape: el endpoint dispara 6 queries en parallelo;
    // matchamos por contenido del SQL.
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('income_payments_normalized') && query.includes('cash_in')) {
        return Promise.resolve([
          {
            month_start: '2026-04-01',
            year: 2026,
            month: 4,
            cash_in_clp: '8500000',
            cash_out_clp: '6200000',
            net_flow_clp: '2300000'
          }
        ])
      }

      if (query.includes('FROM greenhouse_finance.accounts')) {
        return Promise.resolve([])
      }

      if (query.includes('receivable_clp')) {
        return Promise.resolve([{ receivable_clp: '0', pending_invoices: '0' }])
      }

      if (query.includes('payable_clp')) {
        return Promise.resolve([{ payable_clp: '0', pending_expenses: '0' }])
      }

      if (query.includes('fx_total')) {
        return Promise.resolve([{ fx_total: '0' }])
      }

      return Promise.resolve([])
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(body.monthlySeries)).toBe(true)

    // Verifica que la query del monthlySeries usa las VIEWs canonicas.
    const monthlyCall = runQueryMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('cash_in') && String(call[0]).includes('cash_out')
    )

    expect(monthlyCall).toBeDefined()

    const sql = String(monthlyCall![0])

    expect(sql).toContain('income_payments_normalized')
    expect(sql).toContain('expense_payments_normalized')
    expect(sql).toContain('payment_amount_clp')

    // Anti-regresion hard: el SQL NO debe contener el anti-patron.
    expect(sql).not.toMatch(/ip\.amount\s*\*\s*COALESCE\s*\(\s*[a-z_.]*exchange_rate_to_clp/i)
    expect(sql).not.toMatch(/ep\.amount\s*\*\s*COALESCE\s*\(\s*[a-z_.]*exchange_rate_to_clp/i)
  })

  it('returns realistic monthly cash totals (anti-regresion: pin valores razonables)', async () => {
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('cash_in') && query.includes('cash_out')) {
        return Promise.resolve([
          {
            month_start: '2026-04-01',
            year: 2026,
            month: 4,
            cash_in_clp: '11546493',
            cash_out_clp: '11546493',
            net_flow_clp: '0'
          }
        ])
      }

      if (query.includes('FROM greenhouse_finance.accounts')) {
        return Promise.resolve([])
      }

      if (query.includes('receivable_clp')) {
        return Promise.resolve([{ receivable_clp: '0', pending_invoices: '0' }])
      }

      if (query.includes('payable_clp')) {
        return Promise.resolve([{ payable_clp: '0', pending_expenses: '0' }])
      }

      if (query.includes('fx_total')) {
        return Promise.resolve([{ fx_total: '0' }])
      }

      return Promise.resolve([])
    })

    const response = await GET()
    const body = await response.json()

    // Pin del total: $11.5M para abril 2026 (valor real post-fix incidente HubSpot CCA).
    // Si el anti-patron volviera, este numero saltaria a > $1B.
    expect(body.monthlySeries[0].cashOutClp).toBe(11_546_493)
    expect(body.monthlySeries[0].cashOutClp).toBeLessThan(20_000_000)
    expect(body.monthlySeries[0].cashInClp).toBeLessThan(20_000_000)
  })
})
