import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { processFailedEmailDeliveries } from '@/lib/email/delivery'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await processFailedEmailDeliveries()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
