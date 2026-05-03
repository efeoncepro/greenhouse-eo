import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  let resetListener: ((reason: { source: string; error?: unknown }) => void) | null = null

  return {
    closeGreenhousePostgres: vi.fn(async () => undefined),
    getGreenhousePostgresPool: vi.fn(),
    isGreenhousePostgresRetryableConnectionError: vi.fn(),
    onGreenhousePostgresReset: vi.fn((listener: typeof resetListener) => {
      resetListener = listener

      return vi.fn()
    }),
    runGreenhousePostgresQuery: vi.fn(),
    withGreenhousePostgresTransaction: vi.fn(),
    getResetListener: () => resetListener
  }
})

const kyselyMocks = vi.hoisted(() => ({
  Kysely: vi.fn().mockImplementation(function Kysely(config) {
    return { __config: config }
  }),
  PostgresDialect: vi.fn().mockImplementation(function PostgresDialect(config) {
    return { __config: config }
  })
}))

vi.mock('@/lib/postgres/client', () => ({
  closeGreenhousePostgres: mocks.closeGreenhousePostgres,
  getGreenhousePostgresPool: mocks.getGreenhousePostgresPool,
  isGreenhousePostgresRetryableConnectionError: mocks.isGreenhousePostgresRetryableConnectionError,
  onGreenhousePostgresReset: mocks.onGreenhousePostgresReset,
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction: mocks.withGreenhousePostgresTransaction
}))

vi.mock('kysely', () => ({
  Kysely: kyselyMocks.Kysely,
  PostgresDialect: kyselyMocks.PostgresDialect
}))

import { getDb } from '@/lib/db'

describe('Greenhouse DB Kysely pool resilience', () => {
  beforeEach(() => {
    mocks.getResetListener()?.({ source: 'close' })
    mocks.closeGreenhousePostgres.mockClear()
    mocks.getGreenhousePostgresPool.mockReset()
    mocks.isGreenhousePostgresRetryableConnectionError.mockReset()
    kyselyMocks.Kysely.mockClear()
    kyselyMocks.PostgresDialect.mockClear()
  })

  it('clears cached Kysely instance when the Postgres pool resets', async () => {
    const first = await getDb()
    const second = await getDb()

    expect(first).toBe(second)
    expect(kyselyMocks.Kysely).toHaveBeenCalledTimes(1)

    mocks.getResetListener()?.({ source: 'retryable_error' })

    const third = await getDb()

    expect(third).not.toBe(first)
    expect(kyselyMocks.Kysely).toHaveBeenCalledTimes(2)
  })

  it('retries Kysely connection acquisition once after retryable TLS pool failures', async () => {
    const retryableError = new Error('ssl alert bad certificate')

    const firstPool = {
      connect: vi.fn().mockRejectedValueOnce(retryableError)
    }

    const secondClient = {
      query: vi.fn(),
      release: vi.fn()
    }

    const secondPool = {
      connect: vi.fn().mockResolvedValueOnce(secondClient)
    }

    mocks.getGreenhousePostgresPool
      .mockResolvedValueOnce(firstPool)
      .mockResolvedValueOnce(secondPool)
    mocks.isGreenhousePostgresRetryableConnectionError.mockReturnValue(true)

    const db = await getDb() as unknown as {
      __config: {
        dialect: {
          __config: {
            pool: {
              connect: () => Promise<typeof secondClient>
            }
          }
        }
      }
    }

    const client = await db.__config.dialect.__config.pool.connect()

    expect(client).toBe(secondClient)
    expect(firstPool.connect).toHaveBeenCalledTimes(1)
    expect(secondPool.connect).toHaveBeenCalledTimes(1)
    expect(mocks.closeGreenhousePostgres).toHaveBeenCalledWith({
      source: 'retryable_error',
      error: retryableError
    })
  })
})
