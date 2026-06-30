import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { syncAiVisibilityRunToHubSpot } from '@/lib/growth/ai-visibility/hubspot/command'
import { readLeadHandoffStatus } from '@/lib/growth/ai-visibility/hubspot/status'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1242 — HubSpot lead handoff · superficie admin gobernada (Full API Parity).
 *
 *   GET  → estado del handoff de un run (capability `growth.ai_visibility.report.read`).
 *   POST → re-trigger/replay del handoff (capability `growth.ai_visibility.lead_handoff.execute`).
 *
 * El POST NO escribe a HubSpot inline: llama al command gobernado que ENQUEUE el evento; el
 * reactive consumer hace el upsert. Mismo primitive que el auto-trigger y que Nexa/CLI.
 */

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.report.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.report.read' }
    })
  }

  const { runId } = await params

  try {
    return NextResponse.json(await readLeadHandoffStatus(runId))
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_lead_handoff_status_route' }, extra: { runId } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.lead_handoff.execute', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.lead_handoff.execute' }
    })
  }

  const { runId } = await params

  try {
    const result = await syncAiVisibilityRunToHubSpot({ runId, trigger: 'admin_retrigger' })

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_lead_handoff_retry_route' }, extra: { runId } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
