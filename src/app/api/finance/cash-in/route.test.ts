/**
 * TASK-766 Slice 4a — anti-regresion para /api/finance/cash-in summary KPIs.
 *
 * Mismo patron que cash-out (Slice 3): el endpoint multiplicaba `ip.amount ×
 * exchange_rate_to_clp` en SQL embebido — anti-patron sistemico que infla
 * KPIs si payment.currency != income.currency.
 *
 * Post-migracion (Slice 4a): el endpoint delega al helper canonico
 * `sumIncomePaymentsClpForPeriod` que lee desde la VIEW
 * `income_payments_normalized` (con `payment_amount_clp` resuelto via
 * COALESCE canonica + 3-axis supersede filter).
 *
 * Estos tests aseguran que cualquier futura regresion rompe build:
 *   - Si vuelve el SUM × rate, los assertions detectan totales inflados.
 *   - Si el endpoint deja de usar el helper, mock fallara (no se invoca).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sumIncomePaymentsMock = vi.fn()
const runQueryMock = vi.fn()
const requireFinanceMock = vi.fn()

vi.mock('@/lib/finance/income-payments-reader', () => ({
  sumIncomePaymentsClpForPeriod: (...args: unknown[]) => sumIncomePaymentsMock(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => requireFinanceMock()
}))

import { GET } from './route'

const buildRequest = (url: string) => new Request(url)

beforeEach(() => {
  sumIncomePaymentsMock.mockReset()
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

describe('GET /api/finance/cash-in — TASK-766 anti-regresion', () => {
  it('uses sumIncomePaymentsClpForPeriod helper (NEVER raw SUM × rate)', async () => {
    runQueryMock
      .mockResolvedValueOnce([]) // dataQuery
      .mockResolvedValueOnce([{ total: '0' }]) // countQuery

    sumIncomePaymentsMock.mockResolvedValueOnce({
      totalClp: 8_500_000,
      totalPayments: 12,
      unreconciledCount: 5,
      driftCount: 0
    })

    const response = await GET(
      buildRequest('http://localhost/api/finance/cash-in?fromDate=2026-04-01&toDate=2026-05-02')
    )

    expect(sumIncomePaymentsMock).toHaveBeenCalledOnce()
    expect(sumIncomePaymentsMock).toHaveBeenCalledWith({
      fromDate: '2026-04-01',
      toDate: '2026-05-02',
      isReconciled: undefined
    })

    const body = await response.json()

    expect(body.summary.totalCollectedClp).toBe(8_500_000)
    expect(body.summary.totalPayments).toBe(12)
    expect(body.summary.unreconciledCount).toBe(5)
    expect(body.summary.driftCount).toBe(0)

    // Anti-regresion: cualquier total > $1B en este dataset es bug del patron
    // anti-tokenized-fx-math (CLP × rate USD = inflado 1000x).
    expect(body.summary.totalCollectedClp).toBeLessThan(1_000_000_000)
  })

  it('forwards isReconciled filter to the helper', async () => {
    runQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: '0' }])

    sumIncomePaymentsMock.mockResolvedValueOnce({
      totalClp: 0,
      totalPayments: 0,
      unreconciledCount: 0,
      driftCount: 0
    })

    await GET(
      buildRequest(
        'http://localhost/api/finance/cash-in?fromDate=2026-04-01&toDate=2026-05-02&isReconciled=false'
      )
    )

    expect(sumIncomePaymentsMock).toHaveBeenCalledWith({
      fromDate: '2026-04-01',
      toDate: '2026-05-02',
      isReconciled: false
    })
  })

  it('exposes driftCount in summary so UI can banner anomalies', async () => {
    runQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: '0' }])

    sumIncomePaymentsMock.mockResolvedValueOnce({
      totalClp: 4_200_000,
      totalPayments: 7,
      unreconciledCount: 2,
      driftCount: 3
    })

    const response = await GET(
      buildRequest('http://localhost/api/finance/cash-in?fromDate=2026-04-01&toDate=2026-05-02')
    )

    const body = await response.json()

    expect(body.summary.driftCount).toBe(3)
  })

  it('uses direct VIEW query when clientId filter is set (helper does not expose clientId)', async () => {
    // El IIFE summary se evalua antes que Promise.all dispatche dataQuery/countQuery,
    // por lo que el primer call al runQueryMock es del summary, NO del data/count.
    // Mockeamos generico vs query string para evitar acoplar al orden interno.
    runQueryMock.mockImplementation((query: string) => {
      if (query.includes('income_payments_normalized')) {
        return Promise.resolve([
          {
            total_collected_clp: '2500000',
            total_payments: '4',
            unreconciled_count: '1',
            drift_count: '0'
          }
        ])
      }

      if (query.includes('COUNT(*) AS total')) {
        return Promise.resolve([{ total: '0' }])
      }

      return Promise.resolve([])
    })

    const response = await GET(
      buildRequest(
        'http://localhost/api/finance/cash-in?fromDate=2026-04-01&toDate=2026-05-02&clientId=client-xyz'
      )
    )

    // Helper NO debe ser invocado cuando hay clientId.
    expect(sumIncomePaymentsMock).not.toHaveBeenCalled()

    const body = await response.json()

    expect(body.summary.totalCollectedClp).toBe(2_500_000)
    expect(body.summary.totalPayments).toBe(4)
    expect(body.summary.driftCount).toBe(0)

    // El SQL ejecutado para summary debe leer de la VIEW canonica.
    const summaryCall = runQueryMock.mock.calls.find((call) =>
      String(call[0]).includes('income_payments_normalized')
    )

    expect(summaryCall).toBeDefined()
    expect(String(summaryCall![0])).toContain('payment_amount_clp')
    // Sanity: NO debe tener el anti-patron.
    expect(String(summaryCall![0])).not.toMatch(/ip\.amount\s*\*\s*COALESCE/)
  })

  it('returns 401 without tenant context', async () => {
    requireFinanceMock.mockResolvedValueOnce({ tenant: null, errorResponse: null })

    const response = await GET(buildRequest('http://localhost/api/finance/cash-in'))

    expect(response.status).toBe(401)
    expect(sumIncomePaymentsMock).not.toHaveBeenCalled()
  })
})
