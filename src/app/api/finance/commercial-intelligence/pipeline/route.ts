import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  buildPipelineTotals,
  listPipelineSnapshots
} from '@/lib/commercial-intelligence/intelligence-store'
import type { PipelineStage } from '@/lib/commercial-intelligence/contracts'

export const dynamic = 'force-dynamic'

const ALLOWED_STAGES: ReadonlySet<PipelineStage> = new Set([
  'draft',
  'in_review',
  'sent',
  'approved',
  'converted',
  'rejected',
  'expired'
])

/**
 * TASK-351 — GET /api/finance/commercial-intelligence/pipeline
 *
 * Returns tenant-scoped pipeline snapshots + rolled totals.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const stageParam = searchParams.get('stage')
  const businessLineCode = searchParams.get('businessLineCode')
  const clientIdFilter = searchParams.get('clientId')
  const renewalsDueOnly = searchParams.get('renewalsDueOnly') === 'true'
  const expiredOnly = searchParams.get('expiredOnly') === 'true'

  const stage = stageParam && ALLOWED_STAGES.has(stageParam as PipelineStage)
    ? (stageParam as PipelineStage)
    : null

  const isInternal = tenant.tenantType === 'efeonce_internal'

  const items = await listPipelineSnapshots({
    clientId: isInternal ? clientIdFilter || null : tenant.clientId,
    spaceId: tenant.spaceId ?? null,
    stage,
    businessLineCode,
    renewalsDueOnly,
    expiredOnly
  })

  return NextResponse.json({
    items,
    totals: buildPipelineTotals(items),
    count: items.length
  })
}
