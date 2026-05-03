/**
 * TASK-766 Slice 3 — anti-regresión para /api/finance/cash-out summary KPIs.
 *
 * El bug del 2026-05-02 fue causa raíz: el endpoint multiplicaba `ep.amount ×
 * exchange_rate_to_clp` y un solo payment HubSpot CCA ($1.1M CLP × rate USD
 * 910.55) infló el KPI a $1B fantasma (88×).
 *
 * Post-migración (Slice 3): el endpoint delega al helper canónico
 * `sumExpensePaymentsClpForPeriod` que lee desde la VIEW
 * `expense_payments_normalized` (con `payment_amount_clp` resuelto vía
 * COALESCE canónica + 3-axis supersede filter).
 *
 * Estos tests aseguran que cualquier futura regresión rompe build:
 *   - Si vuelve el SUM × rate, los assertions detectan números inflados.
 *   - Si el endpoint deja de usar el helper, mock fallará (no se invoca).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sumExpensePaymentsMock = vi.fn()
const runQueryMock = vi.fn()
const requireFinanceMock = vi.fn()

vi.mock('@/lib/finance/expense-payments-reader', () => ({
  sumExpensePaymentsClpForPeriod: (...args: unknown[]) => sumExpensePaymentsMock(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => requireFinanceMock()
}))

import { GET } from './route'

const buildRequest = (url: string) => new Request(url)

beforeEach(() => {
  sumExpensePaymentsMock.mockReset()
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

describe('GET /api/finance/cash-out — TASK-766 anti-regresión', () => {
  it('uses sumExpensePaymentsClpForPeriod helper (NEVER raw SUM × rate)', async () => {
    runQueryMock
      .mockResolvedValueOnce([{ total: '0' }]) // count
      .mockResolvedValueOnce([]) // detail rows

    sumExpensePaymentsMock.mockResolvedValueOnce({
      totalClp: 11_546_493.17,
      totalPayments: 37,
      unreconciledCount: 37,
      supplierClp: 5_321_241,
      payrollClp: 1_432_644.17,
      fiscalClp: 4_308_114,
      driftCount: 0
    })

    const response = await GET(
      buildRequest('http://localhost/api/finance/cash-out?fromDate=2026-04-01&toDate=2026-05-02')
    )

    expect(sumExpensePaymentsMock).toHaveBeenCalledOnce()
    expect(sumExpensePaymentsMock).toHaveBeenCalledWith({
      fromDate: '2026-04-01',
      toDate: '2026-05-02',
      expenseType: undefined,
      supplierId: undefined,
      isReconciled: undefined
    })

    const body = await response.json()

    // Caso real del incidente: total ≈ $11.5M, NUNCA $1B fantasma.
    expect(body.summary.totalPaidClp).toBe(11_546_493.17)
    expect(body.summary.supplierTotalClp).toBe(5_321_241)
    expect(body.summary.payrollTotalClp).toBe(1_432_644.17)
    expect(body.summary.fiscalTotalClp).toBe(4_308_114)
    expect(body.summary.totalPayments).toBe(37)
    expect(body.summary.driftCount).toBe(0)

    // Anti-regresión hard: cualquier total > $20M en este dataset es bug.
    expect(body.summary.totalPaidClp).toBeLessThan(20_000_000)
  })

  it('forwards filter params to the helper', async () => {
    runQueryMock
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([])

    sumExpensePaymentsMock.mockResolvedValueOnce({
      totalClp: 0,
      totalPayments: 0,
      unreconciledCount: 0,
      supplierClp: 0,
      payrollClp: 0,
      fiscalClp: 0,
      driftCount: 0
    })

    await GET(
      buildRequest(
        'http://localhost/api/finance/cash-out?fromDate=2026-04-01&toDate=2026-05-02&expenseType=supplier&supplierId=sup-1&isReconciled=false'
      )
    )

    expect(sumExpensePaymentsMock).toHaveBeenCalledWith({
      fromDate: '2026-04-01',
      toDate: '2026-05-02',
      expenseType: 'supplier',
      supplierId: 'sup-1',
      isReconciled: false
    })
  })

  it('exposes driftCount in summary so UI can banner anomalies', async () => {
    runQueryMock
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([])

    sumExpensePaymentsMock.mockResolvedValueOnce({
      totalClp: 5_000_000,
      totalPayments: 12,
      unreconciledCount: 3,
      supplierClp: 5_000_000,
      payrollClp: 0,
      fiscalClp: 0,
      driftCount: 2
    })

    const response = await GET(
      buildRequest('http://localhost/api/finance/cash-out?fromDate=2026-04-01&toDate=2026-05-02')
    )

    const body = await response.json()

    expect(body.summary.driftCount).toBe(2)
  })

  it('returns 401 without tenant context', async () => {
    requireFinanceMock.mockResolvedValueOnce({ tenant: null, errorResponse: null })

    const response = await GET(buildRequest('http://localhost/api/finance/cash-out'))

    expect(response.status).toBe(401)
    expect(sumExpensePaymentsMock).not.toHaveBeenCalled()
  })
})
