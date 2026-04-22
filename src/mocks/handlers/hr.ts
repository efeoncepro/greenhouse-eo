import { http, HttpResponse } from 'msw'

/**
 * Default happy-path handlers for /api/hr/**.
 *
 * Structural defaults only — override payloads per-test with `server.use(...)`.
 */
export const hrHandlers = [
  http.get('*/api/hr/core/hierarchy', () =>
    HttpResponse.json({ nodes: [], edges: [] })
  ),
  http.get('*/api/hr/core/departments', () =>
    HttpResponse.json({ items: [] })
  ),
  http.get('*/api/hr/core/members', () =>
    HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 50 })
  ),
  http.get('*/api/hr/payroll/periods', () =>
    HttpResponse.json({ items: [] })
  ),
  http.get('*/api/hr/payroll/periods/:periodId', ({ params }) =>
    HttpResponse.json({ periodId: params.periodId, status: 'draft', entries: [] })
  )
]
