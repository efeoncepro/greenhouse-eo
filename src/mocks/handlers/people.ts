import { http, HttpResponse } from 'msw'

/**
 * Default happy-path handlers for /api/people/**.
 *
 * Structural defaults only — override payloads per-test with `server.use(...)`.
 */
export const peopleHandlers = [
  http.get('*/api/people/meta', () =>
    HttpResponse.json({ departments: [], roles: [], businessLines: [] })
  ),
  http.get('*/api/people/:memberId', ({ params }) =>
    HttpResponse.json({
      memberId: params.memberId,
      fullName: 'Mock Person',
      status: 'active',
      role: null,
      department: null
    })
  ),
  http.get('*/api/people/:memberId/intelligence', ({ params }) =>
    HttpResponse.json({
      memberId: params.memberId,
      nexaInsights: {
        totalAnalyzed: 0,
        lastAnalysis: null,
        runStatus: null,
        insights: []
      }
    })
  ),
  http.get('*/api/people/:memberId/ico-profile', ({ params }) =>
    HttpResponse.json({ memberId: params.memberId, profile: null })
  )
]
