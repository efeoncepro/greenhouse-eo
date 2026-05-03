import { NextResponse } from 'next/server'

import { runNuboxBalanceSync } from '@/lib/nubox/sync-nubox-balances'

/**
 * TASK-775 Slice 3 — Vercel cron fallback manual.
 *
 * El path scheduler canónico es Cloud Scheduler `ops-nubox-balance-sync` →
 * ops-worker `POST /nubox/balance-sync`. Este endpoint Vercel queda como
 * fallback invocable via curl + CRON_SECRET para casos de emergencia o
 * recovery puntual. NO está scheduleado en vercel.json (Vercel custom env no
 * ejecuta crons en staging — Slice 3 lo eliminó del schedule).
 *
 * Toda la lógica vive en `src/lib/nubox/sync-nubox-balances.ts`.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runNuboxBalanceSync()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
