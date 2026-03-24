import { NextResponse } from 'next/server'

import { syncNuboxToRaw } from '@/lib/nubox/sync-nubox-raw'
import { syncNuboxToConformed } from '@/lib/nubox/sync-nubox-conformed'
import { syncNuboxToPostgres } from '@/lib/nubox/sync-nubox-to-postgres'

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

  const results: Record<string, unknown> = {}

  // Phase A — Fetch from Nubox API and archive to BigQuery raw
  try {
    results.raw = await syncNuboxToRaw()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox raw sync failed:', error)
    results.raw = { error: message }
  }

  // Phase B — Transform raw to conformed with identity resolution
  try {
    results.conformed = await syncNuboxToConformed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox conformed sync failed:', error)
    results.conformed = { error: message }
  }

  // Phase C — Project conformed to PostgreSQL operational tables
  try {
    results.postgres = await syncNuboxToPostgres()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox postgres projection failed:', error)
    results.postgres = { error: message }
  }

  return NextResponse.json(results)
}
