import { NextResponse } from 'next/server'

import { runEntraWebhookRenew } from '@/lib/cron-orchestrators'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

/**
 * TASK-775 Slice 7 — Vercel cron fallback manual.
 * Path scheduler canónico: Cloud Scheduler ops-entra-webhook-renew → ops-worker.
 * Lógica en src/lib/cron-orchestrators/index.ts (runEntraWebhookRenew).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  try {
    const result = await runEntraWebhookRenew()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
