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
   
  var __greenhousePostgresPoolPromise: Promise<Pool> | undefined
   
  var __greenhousePostgresConnector: Connector | undefined

  var __greenhousePostgresResetListeners: Set<GreenhousePostgresResetListener> | undefined
}

type GreenhousePostgresResetReason = {
  source: 'close' | 'pool_error' | 'retryable_error'
  error?: unknown
}

type GreenhousePostgresResetListener = (reason: GreenhousePostgresResetReason) => void

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

export const isGreenhousePostgresRetryableConnectionError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return [
    'ssl alert bad certificate',
    'tls alert bad certificate',
    'connection terminated unexpectedly',
    'the database system is starting up',
    'server closed the connection unexpectedly',
    'connection ended unexpectedly',
    'read etimedout',
    'read econnreset',
    'write epipe'
  ].some(fragment => message.includes(fragment))
}

export const onGreenhousePostgresReset = (listener: GreenhousePostgresResetListener) => {
  globalThis.__greenhousePostgresResetListeners ??= new Set()
  globalThis.__greenhousePostgresResetListeners.add(listener)

  return () => {
    globalThis.__greenhousePostgresResetListeners?.delete(listener)
  }
}

const notifyGreenhousePostgresReset = (reason: GreenhousePostgresResetReason) => {
  for (const listener of globalThis.__greenhousePostgresResetListeners ?? []) {
    try {
      listener(reason)
    } catch (error) {
      console.warn('Greenhouse Postgres reset listener failed.', error)
    }
  }
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
      void closeGreenhousePostgres({ source: 'pool_error', error }).catch(closeError => {
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
    void closeGreenhousePostgres({ source: 'pool_error', error }).catch(closeError => {
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
    if (!isGreenhousePostgresRetryableConnectionError(error)) {
      throw error
    }

    console.warn('Retrying Greenhouse Postgres query after retryable connection failure.', error)
    await closeGreenhousePostgres({ source: 'retryable_error', error }).catch(() => undefined)

    const pool = await getGreenhousePostgresPool()
    const result = await pool.query<T>(text, values)

    return result.rows
  }
}

const acquireGreenhouseTransactionClient = async (attempt = 0): Promise<PoolClient> => {
  let client: PoolClient | null = null

  try {
    const pool = await getGreenhousePostgresPool()

    client = await pool.connect()
    await client.query('BEGIN')

    return client
  } catch (error) {
    if (client) {
      client.release()
    }

    if (attempt > 0 || !isGreenhousePostgresRetryableConnectionError(error)) {
      throw error
    }

    console.warn('Retrying Greenhouse Postgres transaction startup after retryable connection failure.', error)
    await closeGreenhousePostgres({ source: 'retryable_error', error }).catch(() => undefined)

    return acquireGreenhouseTransactionClient(attempt + 1)
  }
}

export const withGreenhousePostgresTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const client = await acquireGreenhouseTransactionClient()

  try {
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

export const closeGreenhousePostgres = async (reason: GreenhousePostgresResetReason = { source: 'close' }) => {
  // Clear references BEFORE closing to prevent concurrent requests from
  // acquiring a pool/connector that is being shut down (race condition fix).
  const poolPromise = globalThis.__greenhousePostgresPoolPromise
  const connector = globalThis.__greenhousePostgresConnector

  globalThis.__greenhousePostgresPoolPromise = undefined
  globalThis.__greenhousePostgresConnector = undefined
  notifyGreenhousePostgresReset(reason)

  if (poolPromise) {
    const pool = await poolPromise

    await pool.end()
  }

  if (connector) {
    connector.close()
  }
}
