import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Pool, type PoolClient } from 'pg'

import { createGoogleAuth } from '@/lib/google-credentials'
import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

type GreenhousePostgresConfig = {
  instanceConnectionName: string | null
  ipType: IpAddressTypes
  host: string | null
  port: number
  database: string | null
  user: string | null
  password: string | null
  passwordSecretRef: string | null
  maxConnections: number
  sslEnabled: boolean
}

export type ResolvedGreenhousePostgresConfig = GreenhousePostgresConfig & {
  passwordSource: SecretResolutionSource
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

const normalizeBoolean = (value: string | undefined) => value?.trim().toLowerCase() === 'true'

const normalizeNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value?.trim() || fallback)

  return Number.isFinite(parsed) ? parsed : fallback
}

const isRetryableConnectionError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return [
    'ssl alert bad certificate',
    'connection terminated unexpectedly',
    'the database system is starting up',
    'server closed the connection unexpectedly',
    'connection ended unexpectedly',
    'read etimedout',
    'read econnreset',
    'write epipe'
  ].some(fragment => message.includes(fragment))
}

export const getGreenhousePostgresConfig = (): GreenhousePostgresConfig => ({
  instanceConnectionName: process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME?.trim() || null,
  ipType: toIpType(process.env.GREENHOUSE_POSTGRES_IP_TYPE),
  host: process.env.GREENHOUSE_POSTGRES_HOST?.trim() || null,
  port: normalizeNumber(process.env.GREENHOUSE_POSTGRES_PORT, 5432),
  database: process.env.GREENHOUSE_POSTGRES_DATABASE?.trim() || null,
  user: process.env.GREENHOUSE_POSTGRES_USER?.trim() || null,
  password: process.env.GREENHOUSE_POSTGRES_PASSWORD || null,
  passwordSecretRef: process.env.GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF?.trim() || null,
  maxConnections: normalizeNumber(process.env.GREENHOUSE_POSTGRES_MAX_CONNECTIONS, 15),
  sslEnabled: normalizeBoolean(process.env.GREENHOUSE_POSTGRES_SSL)
})

export const getGreenhousePostgresMissingConfig = () => {
  const config = getGreenhousePostgresConfig()
  const missing: string[] = []

  if (!config.database) missing.push('GREENHOUSE_POSTGRES_DATABASE')
  if (!config.user) missing.push('GREENHOUSE_POSTGRES_USER')

  if (!config.password && !config.passwordSecretRef) {
    missing.push('GREENHOUSE_POSTGRES_PASSWORD or GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF')
  }

  if (!config.instanceConnectionName && !config.host) {
    missing.push('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME or GREENHOUSE_POSTGRES_HOST')
  }

  return missing
}

export const isGreenhousePostgresConfigured = () => getGreenhousePostgresMissingConfig().length === 0

export const resolveGreenhousePostgresConfig = async (): Promise<ResolvedGreenhousePostgresConfig> => {
  const config = getGreenhousePostgresConfig()

  const passwordResolution = await resolveSecret({
    envVarName: 'GREENHOUSE_POSTGRES_PASSWORD'
  })

  return {
    ...config,
    password: passwordResolution.value,
    passwordSecretRef: passwordResolution.secretRef,
    passwordSource: passwordResolution.source
  }
}

const buildPool = async () => {
  const config = await resolveGreenhousePostgresConfig()

  if (!config.database || !config.user || !config.password) {
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

    const pool = new Pool({
      ...baseOptions,
      ...connectorOptions
    })

    pool.on('error', error => {
      console.error('Greenhouse Postgres pool emitted an error; resetting connector state.', error)
      void closeGreenhousePostgres().catch(closeError => {
        console.error('Unable to close Greenhouse Postgres after pool error.', closeError)
      })
    })

    return pool
  }

  const pool = new Pool({
    ...baseOptions,
    host: config.host || undefined,
    port: config.port,
    ssl: config.sslEnabled ? { rejectUnauthorized: false } : undefined
  })

  pool.on('error', error => {
    console.error('Greenhouse Postgres pool emitted an error; resetting direct connection state.', error)
    void closeGreenhousePostgres().catch(closeError => {
      console.error('Unable to close Greenhouse Postgres after direct pool error.', closeError)
    })
  })

  return pool
}

export const getGreenhousePostgresPool = async () => {
  globalThis.__greenhousePostgresPoolPromise ??= buildPool().catch(error => {
    globalThis.__greenhousePostgresPoolPromise = undefined
    throw error
  })

  return globalThis.__greenhousePostgresPoolPromise
}

export const runGreenhousePostgresQuery = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
  try {
    const pool = await getGreenhousePostgresPool()
    const result = await pool.query<T>(text, values)

    return result.rows
  } catch (error) {
    if (!isRetryableConnectionError(error)) {
      throw error
    }

    console.warn('Retrying Greenhouse Postgres query after retryable connection failure.', error)
    await closeGreenhousePostgres().catch(() => undefined)

    const pool = await getGreenhousePostgresPool()
    const result = await pool.query<T>(text, values)

    return result.rows
  }
}

export const withGreenhousePostgresTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  try {
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
  } catch (error) {
    if (!isRetryableConnectionError(error)) {
      throw error
    }

    console.warn('Retrying Greenhouse Postgres transaction after retryable connection failure.', error)
    await closeGreenhousePostgres().catch(() => undefined)

    const pool = await getGreenhousePostgresPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const result = await callback(client)

      await client.query('COMMIT')

      return result
    } catch (retryError) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw retryError
    } finally {
      client.release()
    }
  }
}

export const closeGreenhousePostgres = async () => {
  // Clear references BEFORE closing to prevent concurrent requests from
  // acquiring a pool/connector that is being shut down (race condition fix).
  const poolPromise = globalThis.__greenhousePostgresPoolPromise
  const connector = globalThis.__greenhousePostgresConnector

  globalThis.__greenhousePostgresPoolPromise = undefined
  globalThis.__greenhousePostgresConnector = undefined

  if (poolPromise) {
    const pool = await poolPromise

    await pool.end()
  }

  if (connector) {
    connector.close()
  }
}
