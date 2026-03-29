import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { CloudHealthCheck, CloudHealthSnapshot } from '@/lib/cloud/contracts'
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

  return {
    ok: checks.every(check => check.ok),
    checks,
    timestamp: new Date().toISOString()
  }
}
