import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { syncNuboxToRaw } from '@/lib/nubox/sync-nubox-raw'
import { syncNuboxToConformed } from '@/lib/nubox/sync-nubox-conformed'
import { syncNuboxToPostgres } from '@/lib/nubox/sync-nubox-to-postgres'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  const results: Record<string, unknown> = {}

  // Phase A — Fetch from Nubox API and archive to BigQuery raw
  try {
    results.raw = await syncNuboxToRaw()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox raw sync failed:', error)
    await alertCronFailure('nubox-sync/raw', error)
    results.raw = { error: message }
  }

  // Phase B — Transform raw to conformed with identity resolution
  try {
    results.conformed = await syncNuboxToConformed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox conformed sync failed:', error)
    await alertCronFailure('nubox-sync/conformed', error)
    results.conformed = { error: message }
  }

  // Phase C — Project conformed to PostgreSQL operational tables
  try {
    results.postgres = await syncNuboxToPostgres()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox postgres projection failed:', error)
    await alertCronFailure('nubox-sync/postgres', error)
    results.postgres = { error: message }
  }

  return NextResponse.json(results)
}
