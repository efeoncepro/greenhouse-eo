import { NextResponse } from 'next/server'

import { runEntraProfileSync } from '@/lib/cron-orchestrators'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

/**
 * TASK-775 Slice 7 — Vercel cron fallback manual.
 * Path scheduler canónico: Cloud Scheduler ops-entra-profile-sync → ops-worker.
 * Lógica en src/lib/cron-orchestrators/index.ts (runEntraProfileSync).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  try {
    const result = await runEntraProfileSync()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
