import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'
import { publishDeliveryPerformanceReportToNotion } from '@/lib/space-notion/notion-performance-report-publication'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const toInteger = (value: string | null): number | null => {
  if (!value) return null

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : null
}

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const readiness = await checkIntegrationReadiness('notion_delivery_performance_reports')

    if (!readiness.ready) {
      console.log(`[notion-delivery-performance-publish] Skipped: ${readiness.reason}`)

      return NextResponse.json({ skipped: true, reason: readiness.reason })
    }
  } catch (error) {
    console.warn('[notion-delivery-performance-publish] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const { searchParams } = new URL(request.url)
    const periodYear = toInteger(searchParams.get('year')) ?? undefined
    const periodMonth = toInteger(searchParams.get('month')) ?? undefined
    const spaceId = searchParams.get('spaceId')?.trim() || undefined
    const force = searchParams.get('force') === 'true'
    const dryRun = searchParams.get('dryRun') === 'true'

    const result = await publishDeliveryPerformanceReportToNotion({
      periodYear,
      periodMonth,
      spaceId,
      force,
      dryRun,
      createdBy: 'cron:notion-delivery-performance-publish'
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[notion-delivery-performance-publish] Cron failed:', error)
    await alertCronFailure('notion-delivery-performance-publish', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
