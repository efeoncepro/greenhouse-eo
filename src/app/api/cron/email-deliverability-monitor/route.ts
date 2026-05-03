import { NextResponse } from 'next/server'

import { runEmailDeliverabilityMonitor } from '@/lib/email/deliverability-monitor'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

/**
 * TASK-775 Slice 2 — Vercel cron fallback manual.
 *
 * El path scheduler canónico es Cloud Scheduler `ops-email-deliverability-monitor`
 * → ops-worker `POST /email-deliverability-monitor`. Este endpoint Vercel queda
 * como fallback invocable via curl + CRON_SECRET para casos de emergencia o
 * recovery puntual. NO está scheduleado en vercel.json (Vercel custom env no
 * ejecuta crons en staging — Slice 2 lo eliminó del schedule).
 *
 * Toda la lógica vive en `src/lib/email/deliverability-monitor.ts` (single
 * source of truth, reusada también por el handler Cloud Run).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await runEmailDeliverabilityMonitor()

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
