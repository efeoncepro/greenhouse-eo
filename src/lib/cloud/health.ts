import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type {
  CloudGcpAuthPosture,
  CloudHealthCheck,
  CloudHealthSnapshot,
  CloudObservabilityPosture,
  CloudPostgresPosture,
  CloudPostureCheck,
  CloudSecretsPosture
} from '@/lib/cloud/contracts'
import { getBigQueryQueryOptions } from '@/lib/cloud/bigquery'
import {
  getGreenhousePostgresConfig,
  getGreenhousePostgresMissingConfig,
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery
} from '@/lib/postgres/client'

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then(value => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })

const toErrorSummary = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

const formatCount = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`

const summarizeCloudHealth = ({
  runtimeChecks,
  postureChecks
}: {
  runtimeChecks: CloudHealthCheck[]
  postureChecks: CloudPostureCheck[]
}) => {
  const runtimeFailures = runtimeChecks.filter(check => !check.ok).length
  const postureWarnings = postureChecks.filter(check => check.status !== 'ok').length

  if (runtimeFailures > 0) {
    return `${formatCount(runtimeFailures, 'runtime failing', 'runtime failing')} · ${formatCount(postureWarnings, 'posture warning', 'posture warnings')}`
  }

  if (postureWarnings > 0) {
    return `${formatCount(runtimeChecks.length, 'runtime ok', 'runtime ok')} · ${formatCount(postureWarnings, 'posture warning', 'posture warnings')}`
  }

  return `${formatCount(runtimeChecks.length, 'runtime ok', 'runtime ok')} · posture sin hallazgos`
}

export const buildCloudHealthSnapshot = ({
  runtimeChecks,
  postureChecks,
  timestamp = new Date().toISOString()
}: {
  runtimeChecks: CloudHealthCheck[]
  postureChecks?: CloudPostureCheck[]
  timestamp?: string
}): CloudHealthSnapshot => {
  const normalizedPostureChecks = postureChecks ?? []
  const ok = runtimeChecks.every(check => check.ok)
  const overallStatus = !ok ? 'error' : normalizedPostureChecks.some(check => check.status !== 'ok') ? 'degraded' : 'ok'

  return {
    ok,
    overallStatus,
    summary: summarizeCloudHealth({
      runtimeChecks,
      postureChecks: normalizedPostureChecks
    }),
    runtimeChecks,
    postureChecks: normalizedPostureChecks,
    checks: runtimeChecks,
    timestamp
  }
}

export const getCloudPostureChecks = ({
  auth,
  postgres,
  secrets,
  observability
}: {
  auth: CloudGcpAuthPosture
  postgres: CloudPostgresPosture
  secrets: CloudSecretsPosture
  observability: CloudObservabilityPosture
}): CloudPostureCheck[] => {
  const runtimeSecretEntries = secrets.entries.filter(entry => entry.classification === 'runtime')
  const runtimeSecretSources = new Set(runtimeSecretEntries.map(entry => entry.source))
  const observabilityEnabled = observability.sentry.enabled && observability.slack.enabled

  return [
    {
      name: 'gcp_auth',
      status: auth.mode === 'wif' ? 'ok' : auth.mode === 'unconfigured' ? 'unconfigured' : 'warning',
      summary: auth.summary
    },
    {
      name: 'postgres_posture',
      status: !postgres.configured ? 'unconfigured' : postgres.risks.length > 0 ? 'warning' : 'ok',
      summary: postgres.summary
    },
    {
      name: 'secrets',
      status: runtimeSecretSources.size === 1 && runtimeSecretSources.has('secret_manager')
        ? 'ok'
        : runtimeSecretSources.has('unconfigured')
          ? 'unconfigured'
          : 'warning',
      summary: `Runtime: ${secrets.runtimeSummary}${secrets.toolingSummary !== 'Sin secretos registrados' ? ` · Tooling: ${secrets.toolingSummary}` : ''}`
    },
    {
      name: 'observability',
      status: observabilityEnabled ? 'ok' : observability.sentry.enabled || observability.slack.enabled ? 'warning' : 'unconfigured',
      summary: observability.summary
    }
  ]
}

export const checkCloudPostgresHealth = async ({ timeoutMs = 5000 }: { timeoutMs?: number } = {}): Promise<CloudHealthCheck> => {
  if (!isGreenhousePostgresConfigured()) {
    return {
      name: 'postgres',
      ok: false,
      status: 'not_configured',
      summary: `Missing config: ${getGreenhousePostgresMissingConfig().join(', ')}`,
      details: {
        missing: getGreenhousePostgresMissingConfig()
      }
    }
  }

  const startedAt = Date.now()

  try {
    await withTimeout(runGreenhousePostgresQuery<{ ok: number }>('SELECT 1 AS ok'), timeoutMs)

    const config = getGreenhousePostgresConfig()

    return {
      name: 'postgres',
      ok: true,
      status: 'ok',
      summary: 'Cloud SQL reachable',
      latencyMs: Date.now() - startedAt,
      details: {
        database: config.database,
        instanceConnectionName: config.instanceConnectionName,
        host: config.host,
        maxConnections: config.maxConnections
      }
    }
  } catch (error) {
    return {
      name: 'postgres',
      ok: false,
      status: 'error',
      summary: toErrorSummary(error),
      latencyMs: Date.now() - startedAt
    }
  }
}

export const checkCloudBigQueryHealth = async ({ timeoutMs = 5000 }: { timeoutMs?: number } = {}): Promise<CloudHealthCheck> => {
  const startedAt = Date.now()

  try {
    const client = getBigQueryClient()

    await withTimeout(
      client.query({
        query: 'SELECT 1 AS ok',
        ...getBigQueryQueryOptions({
          maximumBytesBilled: 1_000_000
        })
      }),
      timeoutMs
    )

    return {
      name: 'bigquery',
      ok: true,
      status: 'ok',
      summary: 'BigQuery reachable',
      latencyMs: Date.now() - startedAt,
      details: {
        projectId: getBigQueryProjectId()
      }
    }
  } catch (error) {
    return {
      name: 'bigquery',
      ok: false,
      status: 'error',
      summary: toErrorSummary(error),
      latencyMs: Date.now() - startedAt
    }
  }
}

export const getCloudPlatformHealthSnapshot = async (): Promise<CloudHealthSnapshot> => {
  const checks = await Promise.all([checkCloudPostgresHealth(), checkCloudBigQueryHealth()])

  return buildCloudHealthSnapshot({
    runtimeChecks: checks
  })
}
