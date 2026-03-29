import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { materializeMonthlySnapshots } from '@/lib/ico-engine/materialize'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await materializeMonthlySnapshots()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('ICO materialization failed:', error)
    await alertCronFailure('ico-materialize', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
