import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runNuboxQuotesHotSync } from '@/lib/nubox/sync-nubox-orchestrator'

/**
 * TASK-775 Slice 3 — Vercel cron fallback manual.
 *
 * El path scheduler canónico es Cloud Scheduler `ops-nubox-quotes-hot-sync` →
 * ops-worker `POST /nubox/quotes-hot-sync`. NO está scheduleado en vercel.json.
 *
 * Lógica en `src/lib/nubox/sync-nubox-orchestrator.ts`.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const parsePeriods = (request: Request) => {
  const url = new URL(request.url)
  const periodParam = url.searchParams.get('periods') || url.searchParams.get('period')

  return periodParam
    ? periodParam.split(',').map(period => period.trim()).filter(Boolean)
    : undefined
}

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await runNuboxQuotesHotSync({ periods: parsePeriods(request) })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
