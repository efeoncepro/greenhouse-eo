import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Pool, type PoolClient } from 'pg'

import { createGoogleAuth } from '@/lib/google-credentials'

type GreenhousePostgresConfig = {
  instanceConnectionName: string | null
  ipType: IpAddressTypes
  host: string | null
  port: number
  database: string | null
  user: string | null
  password: string | null
  maxConnections: number
  sslEnabled: boolean
}

declare global {
  // eslint-disable-next-line no-var
  var __greenhousePostgresPoolPromise: Promise<Pool> | undefined
  // eslint-disable-next-line no-var
  var __greenhousePostgresConnector: Connector | undefined
}

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

export const getGreenhousePostgresConfig = (): GreenhousePostgresConfig => ({
  instanceConnectionName: process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME?.trim() || null,
  ipType: toIpType(process.env.GREENHOUSE_POSTGRES_IP_TYPE),
  host: process.env.GREENHOUSE_POSTGRES_HOST?.trim() || null,
  port: Number(process.env.GREENHOUSE_POSTGRES_PORT || 5432),
  database: process.env.GREENHOUSE_POSTGRES_DATABASE?.trim() || null,
  user: process.env.GREENHOUSE_POSTGRES_USER?.trim() || null,
  password: process.env.GREENHOUSE_POSTGRES_PASSWORD || null,
  maxConnections: Number(process.env.GREENHOUSE_POSTGRES_MAX_CONNECTIONS || 15),
  sslEnabled: String(process.env.GREENHOUSE_POSTGRES_SSL || '').toLowerCase() === 'true'
})

export const getGreenhousePostgresMissingConfig = () => {
  const config = getGreenhousePostgresConfig()
  const missing: string[] = []

  if (!config.database) missing.push('GREENHOUSE_POSTGRES_DATABASE')
  if (!config.user) missing.push('GREENHOUSE_POSTGRES_USER')
  if (!config.password) missing.push('GREENHOUSE_POSTGRES_PASSWORD')

  if (!config.instanceConnectionName && !config.host) {
    missing.push('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME or GREENHOUSE_POSTGRES_HOST')
  }

  return missing
}

export const isGreenhousePostgresConfigured = () => getGreenhousePostgresMissingConfig().length === 0

const buildPool = async () => {
  const config = getGreenhousePostgresConfig()

  if (!isGreenhousePostgresConfigured() || !config.database || !config.user || !config.password) {
    throw new Error(`Greenhouse Postgres is not configured. Missing: ${getGreenhousePostgresMissingConfig().join(', ')}`)
  }

  const baseOptions = {
    user: config.user,
    password: config.password,
    database: config.database,
    max: config.maxConnections,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000
  }

  if (config.instanceConnectionName) {
    globalThis.__greenhousePostgresConnector ??= new Connector(
      {
        auth: createGoogleAuth({
          scopes: ['https://www.googleapis.com/auth/sqlservice.admin']
        })
      }
    )

    const connectorOptions = await globalThis.__greenhousePostgresConnector.getOptions({
      instanceConnectionName: config.instanceConnectionName,
      ipType: config.ipType
    })

    return new Pool({
      ...baseOptions,
      ...connectorOptions
    })
  }

  return new Pool({
    ...baseOptions,
    host: config.host || undefined,
    port: config.port,
    ssl: config.sslEnabled ? { rejectUnauthorized: false } : undefined
  })
}

export const getGreenhousePostgresPool = async () => {
  globalThis.__greenhousePostgresPoolPromise ??= buildPool()

  return globalThis.__greenhousePostgresPoolPromise
}

export const runGreenhousePostgresQuery = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
  const pool = await getGreenhousePostgresPool()
  const result = await pool.query<T>(text, values)

  return result.rows
}

export const withGreenhousePostgresTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const pool = await getGreenhousePostgresPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await callback(client)

    await client.query('COMMIT')

    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export const closeGreenhousePostgres = async () => {
  if (globalThis.__greenhousePostgresPoolPromise) {
    const pool = await globalThis.__greenhousePostgresPoolPromise

    await pool.end()
    globalThis.__greenhousePostgresPoolPromise = undefined
  }

  if (globalThis.__greenhousePostgresConnector) {
    globalThis.__greenhousePostgresConnector.close()
    globalThis.__greenhousePostgresConnector = undefined
  }
}
