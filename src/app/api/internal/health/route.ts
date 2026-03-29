import { NextResponse } from 'next/server'

import { getBigQueryMaximumBytesBilled } from '@/lib/cloud/bigquery'
import { getCloudGcpAuthPosture } from '@/lib/cloud/gcp-auth'
import { getCloudPlatformHealthSnapshot } from '@/lib/cloud/health'
import { getCloudPostgresPosture } from '@/lib/cloud/postgres'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = await getCloudPlatformHealthSnapshot()
  const auth = getCloudGcpAuthPosture()
  const postgres = getCloudPostgresPosture()

  return NextResponse.json(
    {
      ok: health.ok,
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      auth,
      postgres,
      bigquery: {
        maximumBytesBilled: getBigQueryMaximumBytesBilled()
      },
      checks: health.checks
    },
    { status: health.ok ? 200 : 503 }
  )
}
