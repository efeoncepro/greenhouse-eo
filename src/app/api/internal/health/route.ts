import { NextResponse } from 'next/server'

import { getBigQueryMaximumBytesBilled } from '@/lib/cloud/bigquery'
import { getCloudGcpAuthPosture } from '@/lib/cloud/gcp-auth'
import { buildCloudHealthSnapshot, getCloudPlatformHealthSnapshot, getCloudPostureChecks } from '@/lib/cloud/health'
import { getCloudObservabilityPosture, getCloudSentryIncidents } from '@/lib/cloud/observability'
import { getCloudPostgresAccessProfilesPosture, getCloudPostgresPosture } from '@/lib/cloud/postgres'
import { getCloudSecretsPosture } from '@/lib/cloud/secrets'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [runtimeHealth, secrets, observability, sentryIncidents] = await Promise.all([
    getCloudPlatformHealthSnapshot(),
    getCloudSecretsPosture(),
    getCloudObservabilityPosture(),
    getCloudSentryIncidents()
  ])

  const auth = getCloudGcpAuthPosture()

  const postgres = getCloudPostgresPosture()
  const postgresAccessProfiles = getCloudPostgresAccessProfilesPosture(secrets)

  const health = buildCloudHealthSnapshot({
    runtimeChecks: runtimeHealth.runtimeChecks,
    postureChecks: getCloudPostureChecks({
      auth,
      postgres,
      secrets,
      observability
    }),
    timestamp: runtimeHealth.timestamp
  })

  return NextResponse.json(
    {
      ok: health.ok,
      overallStatus: health.overallStatus,
      summary: health.summary,
      timestamp: health.timestamp,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      auth,
      observability,
      sentryIncidents,
      postgres,
      postgresAccessProfiles,
      secrets,
      bigquery: {
        maximumBytesBilled: getBigQueryMaximumBytesBilled()
      },
      runtimeChecks: health.runtimeChecks,
      postureChecks: health.postureChecks,
      checks: health.checks
    },
    { status: health.ok ? 200 : 503 }
  )
}
