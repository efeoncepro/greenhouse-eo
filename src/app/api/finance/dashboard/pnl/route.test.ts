/**
 * TASK-766 Slice 4a — anti-regresion para /api/finance/dashboard/pnl.
 *
 * Pre-migracion el query de "collected revenue" multiplicaba
 * `ip.amount × COALESCE(i.exchange_rate_to_clp, 1)` — anti-patron sistemico.
 *
 * Post-migracion el query lee directo de la VIEW canonica
 * `income_payments_normalized` que expone `payment_amount_clp` resuelto
 * via COALESCE canonica y filtra 3-axis supersede.
 *
 * Nota out-of-scope: la query de income (line ~53) sigue computando
 * `partner_share_amount * COALESCE(exchange_rate_to_clp, 1)`. Eso opera
 * sobre income document (no payment) — la lint rule no lo bloquea
 * (regex matchea solo ip.amount/ep.amount). Documentado como TODO en el
 * source. Hoy Efeonce factura 100% CLP por lo que el bug es latente.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runQueryMock = vi.fn()
const requireFinanceMock = vi.fn()
const isPostgresEnabledMock = vi.fn(() => true)
const assertReadyMock = vi.fn(() => Promise.resolve())

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => requireFinanceMock()
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  isFinanceSlice2PostgresEnabled: () => isPostgresEnabledMock(),
  assertFinanceSlice2PostgresReady: () => assertReadyMock()
}))

import { GET } from './route'

const buildRequest = (url: string) => new Request(url)

beforeEach(() => {
  runQueryMock.mockReset()
  requireFinanceMock.mockReset()
  isPostgresEnabledMock.mockReturnValue(true)
  assertReadyMock.mockResolvedValue(undefined)

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

describe('GET /api/finance/dashboard/pnl — TASK-766 anti-regresion', () => {
  it('collected revenue query reads from income_payments_normalized VIEW (NEVER raw SUM × rate)', async () => {
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('collected_clp') && query.includes('payment_count')) {
        return Promise.resolve([{ collected_clp: '8500000', payment_count: '12' }])
      }

      if (query.includes('partner_share_clp')) {
        return Promise.resolve([
          { total_clp: '15000000', record_count: '5', partner_share_clp: '0' }
        ])
      }

      if (query.includes('cost_category')) {
        return Promise.resolve([])
      }

      if (query.includes('payroll_entries')) {
        return Promise.resolve([
          {
            headcount: '0',
            gross_clp: '0',
            gross_usd: '0',
            net_clp: '0',
            net_usd: '0',
            deductions_clp: '0',
            deductions_usd: '0',
            bonuses_clp: '0',
            bonuses_usd: '0'
          }
        ])
      }

      if (query.includes('linked_clp')) {
        return Promise.resolve([{ linked_clp: '0' }])
      }

      if (query.includes('exchange_rates')) {
        return Promise.resolve([{ rate: '910' }])
      }

      return Promise.resolve([])
    })

    const response = await GET(
      buildRequest('http://localhost/api/finance/dashboard/pnl?year=2026&month=4')
    )

    expect(response.status).toBe(200)

    const body = await response.json()

    expect(body.revenue.collectedRevenue).toBe(8_500_000)

    // Anti-regresion: verifica el SQL de la query de collected revenue.
    const collectedCall = runQueryMock.mock.calls.find((call) =>
      String(call[0]).includes('collected_clp')
    )

    expect(collectedCall).toBeDefined()

    const sql = String(collectedCall![0])

    expect(sql).toContain('income_payments_normalized')
    expect(sql).toContain('payment_amount_clp')
    expect(sql).not.toMatch(/ip\.amount\s*\*\s*COALESCE\s*\(\s*[a-z_.]*exchange_rate_to_clp/i)
  })

  it('returns realistic collected revenue total (anti-regresion: pin valor razonable)', async () => {
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('collected_clp') && query.includes('payment_count')) {
        return Promise.resolve([{ collected_clp: '11546493', payment_count: '37' }])
      }

      if (query.includes('partner_share_clp')) {
        return Promise.resolve([
          { total_clp: '11546493', record_count: '37', partner_share_clp: '0' }
        ])
      }

      if (query.includes('payroll_entries')) {
        return Promise.resolve([
          {
            headcount: '0',
            gross_clp: '0',
            gross_usd: '0',
            net_clp: '0',
            net_usd: '0',
            deductions_clp: '0',
            deductions_usd: '0',
            bonuses_clp: '0',
            bonuses_usd: '0'
          }
        ])
      }

      if (query.includes('linked_clp')) {
        return Promise.resolve([{ linked_clp: '0' }])
      }

      if (query.includes('exchange_rates')) {
        return Promise.resolve([{ rate: '910' }])
      }

      return Promise.resolve([])
    })

    const response = await GET(
      buildRequest('http://localhost/api/finance/dashboard/pnl?year=2026&month=4')
    )

    const body = await response.json()

    // Pin: $11.5M no $1B fantasma del anti-patron.
    expect(body.revenue.collectedRevenue).toBe(11_546_493)
    expect(body.revenue.collectedRevenue).toBeLessThan(50_000_000)
  })

  it('returns 401 without tenant context', async () => {
    requireFinanceMock.mockResolvedValueOnce({ tenant: null, errorResponse: null })

    const response = await GET(buildRequest('http://localhost/api/finance/dashboard/pnl'))

    expect(response.status).toBe(401)
    expect(runQueryMock).not.toHaveBeenCalled()
  })
})
