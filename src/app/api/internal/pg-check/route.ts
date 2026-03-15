import { NextResponse } from 'next/server'

import {
  getGreenhousePostgresConfig,
  getGreenhousePostgresMissingConfig,
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery
} from '@/lib/postgres/client'
import { getGoogleCredentials } from '@/lib/google-credentials'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = getGreenhousePostgresConfig()
  const missing = getGreenhousePostgresMissingConfig()

  const result: Record<string, unknown> = {
    configured: isGreenhousePostgresConfigured(),
    missing,
    connection: {
      hasInstanceConnectionName: Boolean(config.instanceConnectionName),
      hasHost: Boolean(config.host),
      port: config.port,
      database: config.database,
      user: config.user,
      hasPassword: Boolean(config.password),
      sslEnabled: config.sslEnabled,
      maxConnections: config.maxConnections
    }
  }

  try {
    const creds = getGoogleCredentials()

    result.googleCredentials = creds
      ? { hasCredentials: true, projectId: (creds as Record<string, unknown>).project_id }
      : { hasCredentials: false }
  } catch (error) {
    result.googleCredentials = { error: error instanceof Error ? error.message : String(error) }
  }

  try {
    const rows = await runGreenhousePostgresQuery<{ now: string }>('SELECT NOW() AS now')

    result.query = { success: true, serverTime: rows[0]?.now }
  } catch (error) {
    result.query = { success: false, error: error instanceof Error ? error.message : String(error) }
  }

  try {
    const views = await runGreenhousePostgresQuery<{ viewname: string }>(
      `SELECT viewname FROM pg_views WHERE schemaname = 'greenhouse_serving' ORDER BY viewname`
    )

    result.servingViews = views.map(v => v.viewname)
  } catch (error) {
    result.servingViews = { error: error instanceof Error ? error.message : String(error) }
  }

  return NextResponse.json(result, { status: 200 })
}
