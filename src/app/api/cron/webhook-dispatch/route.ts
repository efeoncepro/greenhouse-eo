import { NextResponse } from 'next/server'

import { runWebhookDispatch } from '@/lib/cron-orchestrators'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

/**
 * TASK-775 Slice 7 — Vercel cron fallback manual.
 * Path scheduler canónico: Cloud Scheduler ops-webhook-dispatch → ops-worker.
 * Lógica en src/lib/cron-orchestrators/index.ts (runWebhookDispatch).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  try {
    const result = await runWebhookDispatch()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
