import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'

import { syncNotionToConformed } from '@/lib/sync/sync-notion-conformed'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  // ── Readiness gate: check Notion integration status ──
  try {
    const readiness = await checkIntegrationReadiness('notion')

    if (!readiness.ready) {
      console.log(`[sync-conformed] Skipped: Notion upstream not ready — ${readiness.reason}`)

      return NextResponse.json({ skipped: true, reason: readiness.reason })
    }
  } catch (error) {
    console.warn('[sync-conformed] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const result = await syncNotionToConformed()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Conformed sync failed:', error)
    await alertCronFailure('sync-conformed', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
