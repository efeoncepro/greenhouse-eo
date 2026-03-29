import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { ensureReactiveSchema, processReactiveEvents } from '@/lib/sync/reactive-consumer'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    await ensureReactiveSchema()

    const result = await processReactiveEvents({ domain: 'finance' })

    return NextResponse.json({ ...result, domain: 'finance' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 })
  }
}
