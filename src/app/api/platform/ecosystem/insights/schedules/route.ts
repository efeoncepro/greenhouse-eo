import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { listEcosystemInsightSchedulesPayload } from '@/lib/api-platform/resources/ecosystem-insights-read'

export const dynamic = 'force-dynamic'

/** TASK-1848 — lectura de recurrencias por el lane ecosystem (crearlas/activarlas exige una persona). */
export async function GET(request: Request) {
  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.schedules.list', handler: async context => listEcosystemInsightSchedulesPayload({ context, request }) })
}
