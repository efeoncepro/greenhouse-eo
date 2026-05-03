import { NextResponse } from 'next/server'

import { runHubspotCompaniesSync } from '@/lib/cron-orchestrators'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

/**
 * TASK-775 Slice 7 — Vercel cron fallback manual.
 * Path scheduler canónico: Cloud Scheduler ops-hubspot-companies-sync → ops-worker.
 * Lógica en src/lib/cron-orchestrators/index.ts (runHubspotCompaniesSync).
 */
export const dynamic = 'force-dynamic'

const isTruthy = (value: string | null): boolean =>
  value ? ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase()) : false

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  const url = new URL(request.url)
  const dryRun = isTruthy(url.searchParams.get('dry'))
  const fullResync = isTruthy(url.searchParams.get('full'))

  try {
    const result = await runHubspotCompaniesSync({ dryRun, fullResync })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
