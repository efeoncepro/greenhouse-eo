import { NextResponse } from 'next/server'

import { ensureReactiveSchema, processReactiveEvents } from '@/lib/sync/reactive-consumer'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureReactiveSchema()

    const result = await processReactiveEvents({ domain: 'people' })

    return NextResponse.json({ ...result, domain: 'people' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 })
  }
}
