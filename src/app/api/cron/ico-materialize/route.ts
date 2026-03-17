import { NextResponse } from 'next/server'

import { materializeMonthlySnapshots } from '@/lib/ico-engine/materialize'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const hasInternalSyncAccess = (request: Request) => {
  const configuredSecret = (process.env.CRON_SECRET || '').trim()
  const authHeader = (request.headers.get('authorization') || '').trim()
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const vercelCronHeader = (request.headers.get('x-vercel-cron') || '').trim()
  const userAgent = (request.headers.get('user-agent') || '').trim()

  if (configuredSecret && bearerToken && bearerToken === configuredSecret) return true

  return vercelCronHeader === '1' || userAgent.startsWith('vercel-cron/')
}

export async function GET(request: Request) {
  if (!hasInternalSyncAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await materializeMonthlySnapshots()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('ICO materialization failed:', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
