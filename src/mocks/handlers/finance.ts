import { http, HttpResponse } from 'msw'

/**
 * Default happy-path handlers for /api/finance/**.
 *
 * These are intentionally minimal skeletons. Tests should override concrete
 * payloads per-scenario with `server.use(...)`. The goal of the base layer is
 * that a naive fetch inside a test never hits the real network and instead
 * gets a structurally valid envelope.
 */
export const financeHandlers = [
  http.get('*/api/finance/clients', () =>
    HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 50 })
  ),
  http.get('*/api/finance/clients/:clientId', ({ params }) =>
    HttpResponse.json({
      company: { clientId: params.clientId, legalName: 'Mock Client' },
      financialProfile: null,
      summary: { totalIncomeClp: 0, totalExpensesClp: 0 }
    })
  ),
  http.get('*/api/finance/income', () =>
    HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 50 })
  ),
  http.get('*/api/finance/expenses', () =>
    HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 50 })
  ),
  http.get('*/api/finance/exchange-rates', () =>
    HttpResponse.json({ items: [] })
  )
]
