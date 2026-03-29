import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { syncNotionToConformed } from '@/lib/sync/sync-notion-conformed'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await syncNotionToConformed()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Conformed sync failed:', error)
    await alertCronFailure('sync-conformed', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
