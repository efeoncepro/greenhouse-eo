import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import {
  ClientGraderReportError,
  readClientGraderReport
} from '@/lib/client-portal/readers/curated/growth-ai-visibility'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1243 — `GET /api/client-portal/growth/ai-visibility/report[?runId=...]`
 *
 * 3.er consumer de la parity (EPIC-020 E): un usuario `client_*` autenticado ve el reporte del
 * AI Visibility Grader de SU organización. Consume el BFF curated re-export del reader
 * client-scoped (`@/lib/client-portal/readers/curated/growth-ai-visibility`), que delega en el
 * producer domain `growth` (hoja del DAG). Mismo `buildGraderReport` — sin reimplementación.
 *
 * Auth + scope:
 *   - `requireClientTenantContext`: 401 sin sesión / `client_tenant_required` si no es cliente.
 *   - capability DEDICADA `growth.ai_visibility.report.read_client` (scope `own`).
 *   - La org se deriva server-side del `tenant.organizationId` (NUNCA del browser).
 *   - Tenant boundary duro: el reader sólo resuelve runs de la org del cliente; un run de otra
 *     org responde `grader_run_not_found` (no se revela su existencia).
 *
 * Devuelve el DTO CLIENTE (`ClientGraderReport`) — sin evidencia cruda de provider. Read-only.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.report.read_client', 'read', 'own')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.report.read_client' }
    })
  }

  const organizationId = tenant.organizationId

  if (!organizationId) {
    // Defensive: tenant_type='client' DEBE tener organizationId resuelto en el session callback.
    // Si emerge en runtime, hay drift en auth.ts — no se asume el invariante en el hot path.
    captureWithDomain(new Error('client session missing organizationId'), 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'growth_ai_visibility_report', stage: 'session_validation' },
      extra: { userId: tenant.userId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 500 })
  }

  const runId = new URL(request.url).searchParams.get('runId') ?? undefined

  try {
    const { report } = await readClientGraderReport({ organizationId, runId })

    return NextResponse.json({ report })
  } catch (error) {
    if (error instanceof ClientGraderReportError) {
      // not_found (sin run reportable o run de otra org) y report_unavailable (sin score aún)
      // → 404 honesto; el `reason` desambigua sin revelar existencia de runs ajenos.
      return canonicalErrorResponse('grader_run_not_found', { extra: { reason: error.code } })
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_client_report_route' },
      extra: { organizationId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
