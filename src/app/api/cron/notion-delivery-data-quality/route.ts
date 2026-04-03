import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runNotionDeliveryDataQualitySweep } from '@/lib/integrations/notion-delivery-data-quality'
import type { NotionParityPeriodField } from '@/lib/space-notion/notion-parity-audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const parsePeriodField = (value: string | null): NotionParityPeriodField => (
  value === 'created_at' ? 'created_at' : 'due_date'
)

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const periodField = parsePeriodField(searchParams.get('periodField'))
    const sourceSyncRunId = searchParams.get('sourceSyncRunId')?.trim() || null

    const result = await runNotionDeliveryDataQualitySweep({
      executionSource: 'cron',
      sourceSyncRunId,
      periodField
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[notion-delivery-data-quality] Cron failed:', error)
    await alertCronFailure('notion-delivery-data-quality', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
