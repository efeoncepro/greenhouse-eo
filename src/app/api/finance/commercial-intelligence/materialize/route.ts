import { NextResponse } from 'next/server'

import { requireFinanceTenantContext , hasRoleCode } from '@/lib/tenant/authorization'
import { materializePipelineSnapshot } from '@/lib/commercial-intelligence/pipeline-materializer'
import { materializeProfitabilitySnapshots } from '@/lib/commercial-intelligence/profitability-materializer'
import { runQuotationLifecycleSweep } from '@/lib/commercial-intelligence/renewal-lifecycle'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * TASK-351 — POST /api/finance/commercial-intelligence/materialize
 *
 * Admin-only endpoint to manually re-hydrate intelligence snapshots.
 *
 * Body:
 *   { quotationId: "Q-123" }         → re-materializes one quote (pipeline + profitability)
 *   { lifecycleSweep: true }         → runs the daily lifecycle sweep
 *   (both flags → pipeline/profitability + sweep)
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasRoleCode(tenant, 'efeonce_admin') && !hasRoleCode(tenant, 'finance_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { quotationId?: string; lifecycleSweep?: boolean } = {}

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const result: {
    pipeline?: { quotationId: string; stage: string } | null
    profitability?: { quotationId: string; periodCount: number } | null
    lifecycle?: { expiredCount: number; renewalDueCount: number; quotationsProcessed: number }
  } = {}

  if (body.quotationId) {
    const pipelineRow = await materializePipelineSnapshot({
      quotationId: body.quotationId,
      sourceEvent: 'manual.api'
    })

    result.pipeline = pipelineRow
      ? { quotationId: pipelineRow.quotationId, stage: pipelineRow.pipelineStage }
      : null

    const profitabilityRows = await materializeProfitabilitySnapshots({
      quotationId: body.quotationId
    })

    result.profitability = {
      quotationId: body.quotationId,
      periodCount: profitabilityRows.length
    }
  }

  if (body.lifecycleSweep) {
    result.lifecycle = await runQuotationLifecycleSweep()
  }

  if (!result.pipeline && !result.profitability && !result.lifecycle) {
    return NextResponse.json(
      { error: 'Provide quotationId or lifecycleSweep:true.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, ...result })
}
