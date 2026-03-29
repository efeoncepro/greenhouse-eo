import { NextResponse } from 'next/server'

import { getBigQueryMaximumBytesBilled } from '@/lib/cloud/bigquery'
import { getCloudGcpAuthPosture } from '@/lib/cloud/gcp-auth'
import { buildCloudHealthSnapshot, getCloudPlatformHealthSnapshot, getCloudPostureChecks } from '@/lib/cloud/health'
import { getCloudObservabilityPosture } from '@/lib/cloud/observability'
import { getCloudPostgresPosture } from '@/lib/cloud/postgres'
import { getCloudSecretsPosture } from '@/lib/cloud/secrets'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [runtimeHealth, secrets] = await Promise.all([getCloudPlatformHealthSnapshot(), getCloudSecretsPosture()])
  const auth = getCloudGcpAuthPosture()
  const observability = getCloudObservabilityPosture()
  const postgres = getCloudPostgresPosture()

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
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      auth,
      observability,
      postgres,
      secrets,
      bigquery: {
        maximumBytesBilled: getBigQueryMaximumBytesBilled()
      },
      checks: health.checks
    },
    { status: health.ok ? 200 : 503 }
  )
}
