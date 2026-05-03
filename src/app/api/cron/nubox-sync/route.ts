import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runNuboxSyncOrchestration } from '@/lib/nubox/sync-nubox-orchestrator'

/**
 * TASK-775 Slice 3 — Vercel cron fallback manual.
 *
 * El path scheduler canónico es Cloud Scheduler `ops-nubox-sync` →
 * ops-worker `POST /nubox/sync`. Este endpoint Vercel queda como fallback
 * invocable via curl + CRON_SECRET. NO está scheduleado en vercel.json
 * (Slice 3 lo eliminó del schedule).
 *
 * Lógica en `src/lib/nubox/sync-nubox-orchestrator.ts`.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  const result = await runNuboxSyncOrchestration()

  return NextResponse.json(result)
}
