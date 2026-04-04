import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { materializeAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const cronAuth = requireCronAuth(request)

  if (!cronAuth.authorized) {
    const { tenant, errorResponse } = await requireAdminTenantContext()

    if (!tenant) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

  const periodYear = Number(body.year) || new Date().getFullYear()
  const periodMonth = Number(body.month) || new Date().getMonth() + 1

  if (!Number.isInteger(periodYear) || periodYear < 2024 || periodYear > 2030) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }

  if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
  }

  const result = await materializeAiLlmEnrichments({
    periodYear,
    periodMonth,
    triggerType: 'admin_rematerialize'
  })

  return NextResponse.json({
    period: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    runId: result.run.runId,
    status: result.run.status,
    signalsSeen: result.run.signalsSeen,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
    promptVersion: result.run.promptVersion,
    promptHash: result.run.promptHash
  })
}
