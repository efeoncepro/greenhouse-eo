/**
 * TASK-850 — Preflight check #9: Postgres migrations status.
 *
 * Wraps `pnpm pg:connect:status` to verify there are no pending migrations.
 * Pending migrations + production deploy = race condition (deploy may
 * apply migrations OR may not, depending on which workflow gets there first).
 *
 * Strict severity: pending migrations → error.
 */

import 'server-only'

import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Client } from 'pg'

import { createGoogleAuth } from '@/lib/google-credentials'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const PENDING_REGEX = /(\d+)\s+migration[s]?\s+pending/i

const NO_PENDING_REGEX =
  /(no\s+pending|no\s+migrations\s+to\s+run|migrations\s+complete|todas\s+aplicadas|all\s+applied|0\s+pending)/i

const MIGRATIONS_DIR = 'migrations'

const toIpType = (value: string | undefined) => {
  switch ((value || '').trim().toUpperCase()) {
    case 'PRIVATE':
      return IpAddressTypes.PRIVATE
    case 'PSC':
      return IpAddressTypes.PSC
    default:
      return IpAddressTypes.PUBLIC
  }
}

const normalizeMigrationName = (name: string) => path.basename(name).replace(/\.sql$/i, '')

const listLocalMigrationNames = async (): Promise<readonly string[]> => {
  const files = await readdir(path.resolve(process.cwd(), MIGRATIONS_DIR))

  return files.filter(file => file.endsWith('.sql')).map(normalizeMigrationName).sort()
}

const normalizeSecretValue = (value: string | undefined | null) => {
  const trimmed = value?.trim()

  if (!trimmed) return null

  return trimmed.replace(/^['"]+|['"]+$/g, '').replace(/(?:\\r|\\n)+$/g, '').trim() || null
}

const resolvePostgresPassword = async () => {
  const envPassword = normalizeSecretValue(process.env.GREENHOUSE_POSTGRES_PASSWORD)

  if (envPassword) return envPassword

  const secretRef = process.env.GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF?.trim()

  if (!secretRef) return null

  return normalizeSecretValue(await resolveSecretByRef(secretRef))
}

const createMigrationClient = async () => {
  const password = await resolvePostgresPassword()
  const database = process.env.GREENHOUSE_POSTGRES_DATABASE?.trim()
  const user = process.env.GREENHOUSE_POSTGRES_USER?.trim()

  if (!database || !user || !password) {
    throw new Error('Postgres migration check is not configured. Missing database, user or password.')
  }

  const baseOptions = {
    user,
    password,
    database,
    connectionTimeoutMillis: 15_000
  }

  const instanceConnectionName = process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME?.trim()

  if (instanceConnectionName) {
    const connector = new Connector({
      auth: createGoogleAuth({
        scopes: ['https://www.googleapis.com/auth/sqlservice.admin']
      })
    })

    const connectorOptions = await connector.getOptions({
      instanceConnectionName,
      ipType: toIpType(process.env.GREENHOUSE_POSTGRES_IP_TYPE)
    })

    return {
      client: new Client({
        ...baseOptions,
        ...connectorOptions
      }),
      close: async () => {
        connector.close()
      }
    }
  }

  return {
    client: new Client({
      ...baseOptions,
      host: process.env.GREENHOUSE_POSTGRES_HOST?.trim() || undefined,
      port: Number(process.env.GREENHOUSE_POSTGRES_PORT?.trim() || 5432),
      ssl:
        process.env.GREENHOUSE_POSTGRES_SSL?.trim().toLowerCase() === 'true'
          ? { rejectUnauthorized: false }
          : undefined
    }),
    close: async () => undefined
  }
}

export interface ParsedPgConnectStatus {
  readonly verdict: 'ok' | 'pending' | 'unparsed'
  readonly pendingCount: number
}

/**
 * Pure parser for `pnpm pg:connect:status` stdout. Exposed so unit tests
 * can verify regex behavior without invoking subprocess.
 */
export const parsePgConnectStatusOutput = (stdout: string): ParsedPgConnectStatus => {
  const pendingMatch = stdout.match(PENDING_REGEX)
  const pendingCount = pendingMatch ? Number(pendingMatch[1]) : 0
  const explicitlyClean = NO_PENDING_REGEX.test(stdout)

  if (pendingCount > 0) return { verdict: 'pending', pendingCount }

  if (explicitlyClean || /aplicadas|applied/i.test(stdout)) {
    return { verdict: 'ok', pendingCount: 0 }
  }

  return { verdict: 'unparsed', pendingCount: 0 }
}

export const checkPostgresMigrations = async (
  _input: PreflightInput
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  try {
    const [localMigrations, connection] = await Promise.all([
      listLocalMigrationNames(),
      createMigrationClient()
    ])

    await connection.client.connect()

    try {
      const result = await connection.client.query<{ name: string }>(
        `SELECT name FROM public.pgmigrations ORDER BY name ASC`
      )

      const applied = new Set(result.rows.map(row => normalizeMigrationName(row.name)))
      const pending = localMigrations.filter(name => !applied.has(name))

      if (pending.length > 0) {
        return {
          checkId: 'postgres_migrations',
          severity: 'error',
          status: 'ok',
          observedAt,
          durationMs: Date.now() - observedAtStart,
          summary: `${pending.length} migracion(es) pendientes`,
          error: null,
          evidence: {
            pendingCount: pending.length,
            pendingMigrations: pending.slice(0, 20),
            appliedCount: applied.size,
            localCount: localMigrations.length
          },
          recommendation: 'Aplicar migrations via `pnpm pg:connect:migrate` antes de promover release.'
        }
      }

      return {
        checkId: 'postgres_migrations',
        severity: 'ok',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: 'Migrations al dia',
        error: null,
        evidence: { pendingCount: 0, appliedCount: applied.size, localCount: localMigrations.length },
        recommendation: ''
      }
    } finally {
      await connection.client.end().catch(() => undefined)
      await connection.close().catch(() => undefined)
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'postgres_migrations' }
    })

    return {
      checkId: 'postgres_migrations',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'Postgres migrations check fallo',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Verificar Cloud SQL Connector + GCP WIF/ADC + credenciales Postgres.'
    }
  }
}
