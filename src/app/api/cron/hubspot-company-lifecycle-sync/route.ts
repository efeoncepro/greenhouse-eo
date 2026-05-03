import { NextResponse } from 'next/server'

import { runHubspotCompanyLifecycleSync } from '@/lib/cron-orchestrators'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

/**
 * TASK-775 Slice 7 — Vercel cron fallback manual.
 * Path scheduler canónico: Cloud Scheduler ops-hubspot-company-lifecycle-sync → ops-worker.
 * Lógica en src/lib/cron-orchestrators/index.ts (runHubspotCompanyLifecycleSync).
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  try {
    const result = await runHubspotCompanyLifecycleSync()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
